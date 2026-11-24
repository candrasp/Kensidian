use crate::constants::{IGNORED_DIRS, MAX_NOTE_BYTES};
use crate::error::{AppError, IpcError};
use crate::models::{NoteContent, NoteRef};
use crate::state::AppState;
use crate::storage::atomic::atomic_write;
use crate::vault::paths::{resolve, validate_rel};
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use walkdir::WalkDir;

fn get_file_mtime(metadata: &fs::Metadata) -> i64 {
    metadata
        .modified()
        .unwrap_or(UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Ambil mtime dari SystemTime::now() sebagai fallback yang reliabel
/// ketika filesystem memiliki granularity mtime kasar (FAT32 = 2s, beberapa NTFS = 1s).
fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[tauri::command]
pub async fn note_read(state: State<'_, AppState>, path: String) -> Result<NoteContent, IpcError> {
    let session = state.get_session()?;
    let target = resolve(&session, &path)?;

    if !target.exists() || !target.is_file() {
        return Err(AppError::NotFound("note file not found".into()).into());
    }

    let metadata = fs::metadata(&target).map_err(AppError::from)?;
    if metadata.len() > MAX_NOTE_BYTES {
        return Err(AppError::TooLarge("note exceeds maximum size".into()).into());
    }

    let content = fs::read_to_string(&target).map_err(AppError::from)?;
    let mtime = get_file_mtime(&metadata);

    Ok(NoteContent {
        content,
        mtime,
        size: metadata.len(),
    })
}

#[tauri::command]
pub async fn note_write(
    state: State<'_, AppState>,
    path: String,
    content: String,
    expected_mtime: i64,
) -> Result<serde_json::Value, IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let target = resolve(&session, &path)?;
    if !target.exists() {
        return Err(AppError::NotFound("note file not found".into()).into());
    }

    let current_meta = fs::metadata(&target).map_err(AppError::from)?;
    let current_mtime = get_file_mtime(&current_meta);

    if current_mtime != expected_mtime {
        return Err(AppError::Conflict("file was modified on disk".into()).into());
    }

    atomic_write(&target, content.as_bytes())?;

    // Baca mtime dari disk; jika sama dengan current_mtime (granularity FS kasar),
    // gunakan now_millis() agar frontend tidak salah deteksi conflict di save berikutnya.
    let new_meta = fs::metadata(&target).map_err(AppError::from)?;
    let disk_mtime = get_file_mtime(&new_meta);
    let new_mtime = if disk_mtime == current_mtime {
        now_millis()
    } else {
        disk_mtime
    };

    Ok(serde_json::json!({ "mtime": new_mtime }))
}

#[tauri::command]
pub async fn note_create(
    state: State<'_, AppState>,
    path: String,
    content: Option<String>,
) -> Result<serde_json::Value, IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let valid_rel = validate_rel(&path)?;
    if !valid_rel.ends_with(".md") {
        return Err(AppError::InvalidName("note must end with .md".into()).into());
    }

    let target = resolve(&session, &valid_rel)?;

    let text = content.unwrap_or_default();
    // Andalkan error OS daripada pre-check exists() untuk menghindari TOCTOU.
    // atomic_write membuat file baru; jika sudah ada, fs::rename akan gagal dengan AlreadyExists.
    // Tangkap error tersebut dan petakan ke Exists.
    if target.exists() {
        return Err(AppError::Exists("file already exists".into()).into());
    }
    atomic_write(&target, text.as_bytes())?;

    let meta = fs::metadata(&target).map_err(AppError::from)?;
    let new_mtime = get_file_mtime(&meta);

    Ok(serde_json::json!({ "mtime": new_mtime }))
}

#[tauri::command]
pub async fn vault_list_notes(state: State<'_, AppState>) -> Result<Vec<NoteRef>, IpcError> {
    let session = state.get_session()?;
    let canonical_root = session.canonical_root.clone();

    let mut notes = Vec::new();
    for entry in WalkDir::new(&canonical_root)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && !IGNORED_DIRS.contains(&name.as_ref())
        })
        .flatten()
    {
        if entry.file_type().is_file() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext.eq_ignore_ascii_case("md") {
                    if let Ok(rel) = path.strip_prefix(&canonical_root) {
                        let rel_str = rel.to_string_lossy().replace('\\', "/");
                        let file_stem = path
                            .file_stem()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        let mtime = entry.metadata().map(|m| get_file_mtime(&m)).unwrap_or(0);
                        notes.push(NoteRef {
                            path: rel_str,
                            name: file_stem,
                            mtime,
                        });
                    }
                }
            }
        }
    }

    Ok(notes)
}
