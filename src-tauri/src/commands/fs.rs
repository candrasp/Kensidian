use crate::constants::IGNORED_DIRS;
use crate::error::{AppError, IpcError};
use crate::models::FileEntry;
use crate::state::AppState;
use crate::vault::paths::{resolve, validate_rel};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

const PROJECT_SCAN_MAX_DEPTH: usize = 8;

fn dir_has_md(dir: &Path, depth: usize) -> bool {
    if depth > PROJECT_SCAN_MAX_DEPTH {
        return false;
    }
    let Ok(read_dir) = fs::read_dir(dir) else {
        return false;
    };
    for entry in read_dir.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || IGNORED_DIRS.contains(&name.as_str()) {
            continue;
        }
        let Ok(ft) = entry.file_type() else { continue };
        if ft.is_symlink() {
            continue;
        }
        if ft.is_file() && name.ends_with(".md") {
            return true;
        }
        if ft.is_dir() && dir_has_md(&entry.path(), depth + 1) {
            return true;
        }
    }
    false
}

fn should_show_project_dir(dir: &Path) -> bool {
    let Ok(mut read_dir) = fs::read_dir(dir) else {
        return false;
    };
    // Folder yang benar-benar kosong tetap tampil agar folder baru buatan user tidak hilang.
    if read_dir.next().is_none() {
        return true;
    }
    dir_has_md(dir, 0)
}

fn build_file_entry(
    entry: &fs::DirEntry,
    rel_path: String,
    name: String,
    is_dir: bool,
) -> Result<FileEntry, AppError> {
    let metadata = entry.metadata().map_err(AppError::from)?;
    let mtime = metadata
        .modified()
        .unwrap_or(UNIX_EPOCH)
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    Ok(FileEntry {
        path: rel_path,
        name,
        kind: if is_dir { "folder".into() } else { "file".into() },
        mtime,
        size: if is_dir { 0 } else { metadata.len() },
    })
}

fn list_dir_sync(
    target_dir: PathBuf,
    path: String,
    is_project: bool,
) -> Result<Vec<FileEntry>, AppError> {
    if !target_dir.exists() || !target_dir.is_dir() {
        return Err(AppError::NotFound("directory not found".into()));
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(&target_dir).map_err(AppError::from)?.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || IGNORED_DIRS.contains(&name.as_str()) {
            continue;
        }
        let Ok(ft) = entry.file_type() else { continue };
        let is_dir = ft.is_dir();
        if !is_dir && !name.ends_with(".md") {
            continue;
        }
        if is_dir && is_project && !should_show_project_dir(&entry.path()) {
            continue;
        }
        let rel_path = if path.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", path, name)
        };
        entries.push(build_file_entry(&entry, rel_path, name, is_dir)?);
    }

    Ok(entries)
}

#[tauri::command]
pub async fn fs_list_dir(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<FileEntry>, IpcError> {
    let session = state.get_session()?;
    let target_dir = resolve(&session, &path)?;
    let is_project = session.info.is_project;

    tokio::task::spawn_blocking(move || list_dir_sync(target_dir, path, is_project))
        .await
        .map_err(|e| IpcError::from(AppError::Io(e.to_string())))?
        .map_err(IpcError::from)
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

    // Andalkan error OS daripada pre-check exists() untuk menghindari TOCTOU.
    // create_dir_all bersifat idempotent — tidak error jika sudah ada.
    // Jika direktori sudah ada, kembalikan Exists agar konsisten dengan kontrak IPC.
    match fs::create_dir_all(&target) {
        Ok(()) => {}
        Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
            return Err(AppError::Exists("folder already exists".into()).into());
        }
        Err(e) => return Err(AppError::from(e).into()),
    }
    // Jika path yang dibuat ternyata sudah exist sebelumnya (create_dir_all sukses tapi
    // direktori memang sudah ada), anggap sebagai Exists.
    if target.metadata().map(|m| !m.is_dir()).unwrap_or(false) {
        return Err(AppError::Exists("folder already exists".into()).into());
    }
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

    if let Some(parent) = target_to.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(AppError::from)?;
        }
    }

    // Andalkan error OS untuk cek konflik tujuan agar menghindari TOCTOU.
    // fs::rename mengembalikan AlreadyExists (atau ErrorKind::Other di Windows)
    // jika destination sudah ada; tangkap dan petakan ke Exists.
    fs::rename(&target_from, &target_to).map_err(|e| {
        if e.kind() == std::io::ErrorKind::AlreadyExists || target_to.exists() {
            AppError::Exists("destination already exists".into())
        } else {
            AppError::from(e)
        }
    })?;
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

    // Safety guard untuk mode proyek: cegah penghapusan folder source koding
    if target.is_dir() {
        let dir_name = target
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        if IGNORED_DIRS.contains(&dir_name.as_str()) {
            return Err(AppError::Denied("cannot delete protected project directory".into()).into());
        }
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
    // Ambil write_lock agar loop pencarian nama unik + copy tidak terjadi
    // secara konkuren (TOCTOU: dua upload bisa memilih nama yang sama tanpa lock).
    let _lock = session
        .write_lock
        .lock()
        .map_err(|_| AppError::Io("failed to acquire write lock".into()))?;

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
    let mut counter = 1u32;

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

    // Deteksi apakah ada byte non-UTF-8 sebelum tulis.
    // Jika lossy, cetak peringatan ke stderr (tersedia di konsol dev Tauri)
    // agar developer tahu ada karakter yang diganti; konten tetap ditulis
    // dengan replacement character agar file terbentuk dan tidak error diam-diam.
    let content = match String::from_utf8(bytes.clone()) {
        Ok(s) => s,
        Err(_) => {
            eprintln!(
                "[kensidian] fs_import_external: file '{}' bukan UTF-8 murni, \
                 karakter tidak valid diganti dengan \u{FFFD}",
                src.display()
            );
            String::from_utf8_lossy(&bytes).into_owned()
        }
    };
    fs::write(&dest, content.as_bytes()).map_err(AppError::from)?;

    let rel_path = if vault_dir.is_empty() {
        file_name
    } else {
        format!("{}/{}", vault_dir, file_name)
    };

    Ok(rel_path)
}

/// Menyalin file biner (gambar, dll.) ke direktori assets vault.
/// Menerima semua tipe file; nama file dijaga unik dengan counter.
#[tauri::command]
pub async fn fs_write_asset(
    state: State<'_, AppState>,
    src_path: String,
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

    let original_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file")
        .to_string();

    let stem = std::path::Path::new(&original_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let ext = std::path::Path::new(&original_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let assets_dir = session.kensidian_dir().join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir).map_err(AppError::from)?;
    }

    let mut dest_name = if ext.is_empty() {
        stem.to_string()
    } else {
        format!("{}.{}", stem, ext)
    };
    let mut dest_path = assets_dir.join(&dest_name);
    let mut counter = 1u32;
    while dest_path.exists() {
        dest_name = if ext.is_empty() {
            format!("{}_{}", stem, counter)
        } else {
            format!("{}_{}.{}", stem, counter, ext)
        };
        dest_path = assets_dir.join(&dest_name);
        counter += 1;
    }

    fs::copy(&src, &dest_path).map_err(AppError::from)?;
    Ok(dest_name)
}
