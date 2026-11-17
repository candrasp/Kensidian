use crate::error::{AppError, IpcError};
use crate::models::FileEntry;
use crate::state::AppState;
use crate::vault::paths::{resolve, validate_rel};
use std::fs;
use std::path::PathBuf;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
pub async fn fs_list_dir(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<FileEntry>, IpcError> {
    let session = state.get_session()?;
    let target_dir = resolve(&session, &path)?;

    if !target_dir.exists() || !target_dir.is_dir() {
        return Err(AppError::NotFound("directory not found".into()).into());
    }

    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&target_dir).map_err(AppError::from)?;

    for entry in read_dir.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if file_name.starts_with('.') {
            continue;
        }

        let file_type = match entry.file_type() {
            Ok(ft) => ft,
            Err(_) => continue,
        };

        let is_dir = file_type.is_dir();
        let is_md = file_name.ends_with(".md");

        if !is_dir && !is_md {
            continue;
        }

        let metadata = entry.metadata().map_err(AppError::from)?;
        let mtime = metadata
            .modified()
            .unwrap_or(UNIX_EPOCH)
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let rel_path = if path.is_empty() {
            file_name.clone()
        } else {
            format!("{}/{}", path, file_name)
        };

        entries.push(FileEntry {
            path: rel_path,
            name: file_name,
            kind: if is_dir {
                "folder".into()
            } else {
                "file".into()
            },
            mtime,
            size: if is_dir { 0 } else { metadata.len() },
        });
    }

    Ok(entries)
}

#[tauri::command]
pub async fn fs_create_folder(state: State<'_, AppState>, path: String) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let valid_rel = validate_rel(&path)?;
    if valid_rel.is_empty() {
        return Err(AppError::InvalidName("cannot create root folder".into()).into());
    }

    let target = resolve(&session, &valid_rel)?;
    if target.exists() {
        return Err(AppError::Exists("folder already exists".into()).into());
    }

    fs::create_dir_all(&target).map_err(AppError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn fs_rename(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let target_from = resolve(&session, &from)?;
    let target_to = resolve(&session, &to)?;

    if !target_from.exists() {
        return Err(AppError::NotFound("source path does not exist".into()).into());
    }
    if target_to.exists() {
        return Err(AppError::Exists("destination already exists".into()).into());
    }

    if let Some(parent) = target_to.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(AppError::from)?;
        }
    }

    fs::rename(&target_from, &target_to).map_err(AppError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn fs_delete(
    state: State<'_, AppState>,
    path: String,
    to_trash: Option<bool>,
) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let target = resolve(&session, &path)?;
    if !target.exists() {
        return Err(AppError::NotFound("target does not exist".into()).into());
    }

    if to_trash.unwrap_or(true) {
        trash::delete(&target).map_err(|e| AppError::Io(e.to_string()))?;
    } else if target.is_dir() {
        fs::remove_dir_all(&target).map_err(AppError::from)?;
    } else {
        fs::remove_file(&target).map_err(AppError::from)?;
    }

    Ok(())
}

#[tauri::command]
pub async fn reveal_in_file_manager(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let target = resolve(&session, &path)?;
    if !target.exists() {
        return Err(AppError::NotFound("path not found".into()).into());
    }

    app.opener()
        .reveal_item_in_dir(&target)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn fs_save_asset(
    state: State<'_, AppState>,
    src_path: String,
) -> Result<String, IpcError> {
    let session = state.get_session()?;
    let src = std::path::PathBuf::from(&src_path);
    if !src.exists() || !src.is_file() {
        return Err(AppError::NotFound("source image not found".into()).into());
    }

    let assets_dir = session.kensidian_dir().join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir).map_err(AppError::from)?;
    }

    let original_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image.png");

    let stem = std::path::Path::new(original_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("image");
    let ext = std::path::Path::new(original_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    let mut dest_name = format!("{}.{}", stem, ext);
    let mut dest_path = assets_dir.join(&dest_name);
    let mut counter = 1;

    while dest_path.exists() {
        dest_name = format!("{}_{}.{}", stem, counter, ext);
        dest_path = assets_dir.join(&dest_name);
        counter += 1;
    }

    fs::copy(&src, &dest_path).map_err(AppError::from)?;
    Ok(dest_name)
}

/// Mengimpor file eksternal (dari path absolut OS) ke dalam vault.
/// Mendukung .md, .markdown, .txt — dikonversi ke .md.
/// Jika vault_rel_path sudah ada, otomatis menambahkan counter (file (1).md, dst).
#[tauri::command]
pub async fn fs_import_external(
    state: State<'_, AppState>,
    src_path: String,
    vault_dir: String,
) -> Result<String, IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let src = PathBuf::from(&src_path);
    if !src.exists() || !src.is_file() {
        return Err(AppError::NotFound("source file not found".into()).into());
    }

    let raw_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Catatan baru")
        .to_string();

    let allowed = [".md", ".markdown", ".txt"];
    let lower = raw_name.to_lowercase();
    let is_allowed = allowed.iter().any(|ext| lower.ends_with(ext));
    if !is_allowed {
        return Err(
            AppError::InvalidName("only .md, .markdown, .txt files are supported".into()).into(),
        );
    }

    let base = {
        let p = std::path::Path::new(&raw_name);
        let stem = p
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Catatan baru");
        // strip double extensions like "note.md" stem = "note"
        stem.trim().to_string()
    };

    let target_dir = if vault_dir.is_empty() {
        session.canonical_root.clone()
    } else {
        let valid = validate_rel(&vault_dir)?;
        resolve(&session, &valid)?
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(AppError::from)?;
    }

    let mut file_name = format!("{}.md", base);
    let mut dest = target_dir.join(&file_name);
    let mut counter = 1u32;
    while dest.exists() {
        file_name = format!("{} ({}).md", base, counter);
        dest = target_dir.join(&file_name);
        counter += 1;
    }

    let bytes = fs::read(&src).map_err(AppError::from)?;
    let content = String::from_utf8_lossy(&bytes);
    fs::write(&dest, content.as_bytes()).map_err(AppError::from)?;

    let rel_path = if vault_dir.is_empty() {
        file_name
    } else {
        format!("{}/{}", vault_dir, file_name)
    };

    Ok(rel_path)
}

#[tauri::command]
pub async fn fs_write_asset(
    state: State<'_, AppState>,
    src_path: String,
    vault_dir: String,
) -> Result<String, IpcError> {
    let session = state.get_session()?;
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

    let src = PathBuf::from(&src_path);
    if !src.exists() || !src.is_file() {
        return Err(AppError::NotFound("source file not found".into()).into());
    }

    let raw_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Catatan baru")
        .to_string();

    let allowed = [".md", ".markdown", ".txt"];
    let lower = raw_name.to_lowercase();
    let is_allowed = allowed.iter().any(|ext| lower.ends_with(ext));
    if !is_allowed {
        return Err(
            AppError::InvalidName("only .md, .markdown, .txt files are supported".into()).into(),
        );
    }

    let base = {
        let p = std::path::Path::new(&raw_name);
        let stem = p
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Catatan baru");
        // strip double extensions like "note.md" stem = "note"
        stem.trim().to_string()
    };

    let target_dir = if vault_dir.is_empty() {
        session.canonical_root.clone()
    } else {
        let valid = validate_rel(&vault_dir)?;
        resolve(&session, &valid)?
    };

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(AppError::from)?;
    }

    let mut file_name = format!("{}.md", base);
    let mut dest = target_dir.join(&file_name);
    let mut counter = 1u32;
    while dest.exists() {
        file_name = format!("{} ({}).md", base, counter);
        dest = target_dir.join(&file_name);
        counter += 1;
    }

    let bytes = fs::read(&src).map_err(AppError::from)?;
    let content = String::from_utf8_lossy(&bytes);
    fs::write(&dest, content.as_bytes()).map_err(AppError::from)?;

    let rel_path = if vault_dir.is_empty() {
        file_name
    } else {
        format!("{}/{}", vault_dir, file_name)
    };

    Ok(rel_path)
}
