use crate::constants::RECENT_VAULTS_MAX;
use crate::error::{AppError, IpcError};
use crate::models::VaultInfo;
use crate::state::{AppState, VaultSession};
use crate::vault::names::validate_component_name;
use notify::{RecursiveMode, Watcher};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

fn normalize_path_str(raw: &str) -> String {
    let p = PathBuf::from(raw);
    let canonical = p.canonicalize().unwrap_or(p);
    // Strip UNC verbatim prefix Windows (\\?\) agar path konsisten.
    // replace '/' → '\' hanya dilakukan di Windows; di platform lain
    // backslash bisa menjadi bagian nama file yang valid.
    #[cfg(windows)]
    {
        canonical
            .to_string_lossy()
            .trim_start_matches(r"\\?\")
            .replace('/', "\\")
            .to_string()
    }
    #[cfg(not(windows))]
    {
        canonical.to_string_lossy().into_owned()
    }
}

fn update_recent_vaults(app_state: &AppState, info: &VaultInfo) -> Result<(), AppError> {
    let recent_path = app_state.dirs.recent_file();
    let raw_list: Vec<VaultInfo> = if recent_path.exists() {
        let content = fs::read_to_string(&recent_path)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    let target_norm = normalize_path_str(&info.path);
    let mut list: Vec<VaultInfo> = Vec::new();
    list.push(VaultInfo {
        path: target_norm.clone(),
        name: info.name.clone(),
        is_project: info.is_project,
    });

    for item in raw_list {
        let norm = normalize_path_str(&item.path);
        if !norm.eq_ignore_ascii_case(&target_norm)
            && !list.iter().any(|v| v.path.eq_ignore_ascii_case(&norm))
        {
            list.push(VaultInfo {
                path: norm,
                name: item.name,
                is_project: item.is_project,
            });
        }
    }
    list.truncate(RECENT_VAULTS_MAX);

    let json = serde_json::to_string_pretty(&list)?;
    crate::storage::atomic::atomic_write(&recent_path, json.as_bytes())?;
    Ok(())
}

const PROJECT_MARKERS: &[&str] = &[
    ".git",
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "composer.json",
    "pubspec.yaml",
    "Gemfile",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "CMakeLists.txt",
    "Makefile",
    "Package.swift",
];

fn detect_project_dir(path: &std::path::Path) -> bool {
    PROJECT_MARKERS.iter().any(|marker| path.join(marker).exists())
}

#[tauri::command]
pub async fn vault_open(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
    is_project: Option<bool>,
) -> Result<VaultInfo, IpcError> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() || !path_buf.is_dir() {
        return Err(AppError::NotFound("directory does not exist".into()).into());
    }

    let canonical = path_buf.canonicalize().map_err(AppError::from)?;
    let name = canonical
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Vault")
        .to_string();

    let clean_path = canonical
        .to_string_lossy()
        .trim_start_matches(r"\\?\")
        .to_string();

    let detected_project = detect_project_dir(&path_buf);
    let config_path = path_buf.join(".kensidian").join("config.json");
    let mut vault_config: crate::models::VaultConfig = if config_path.exists() {
        fs::read_to_string(&config_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        Default::default()
    };

    let final_is_project = is_project.unwrap_or(false) || vault_config.is_project || detected_project;

    let info = VaultInfo {
        path: clean_path.clone(),
        name,
        is_project: final_is_project,
    };

    // Gunakan PathBuf dari clean_path (tanpa UNC prefix) sebagai canonical_root
    // agar path_starts_with check di resolve() konsisten.
    let canonical_root = PathBuf::from(&clean_path);

    let session = Arc::new(VaultSession::new(
        info.clone(),
        path_buf.clone(),
        canonical_root,
    ));
    let kensidian_dir = session.kensidian_dir();
    if !kensidian_dir.exists() {
        fs::create_dir_all(&kensidian_dir).map_err(AppError::from)?;
    }

    if is_project == Some(true) && !vault_config.is_project {
        vault_config.is_project = true;
        if let Ok(json) = serde_json::to_string_pretty(&vault_config) {
            let _ = crate::storage::atomic::atomic_write(&session.config_file(), json.as_bytes());
        }
    }

    let assets_dir = kensidian_dir.join("assets");
    if !assets_dir.exists() {
        let _ = fs::create_dir_all(&assets_dir);
    }

    // Set asset protocol scope: izinkan root vault dan assets, larang file internal
    let scope = app.asset_protocol_scope();
    let _ = scope.allow_directory(&canonical, true);
    if let Ok(c_assets) = assets_dir.canonicalize() {
        let _ = scope.allow_directory(&c_assets, true);
    }
    let _ = scope.allow_directory(&assets_dir, true);
    let _ = scope.forbid_file(kensidian_dir.join("config.json"));
    let _ = scope.forbid_file(kensidian_dir.join("workspace.json"));
    let _ = scope.forbid_file(kensidian_dir.join("sync.json"));
    let _ = scope.forbid_file(kensidian_dir.join("sync-manifest.json"));
    let _ = scope.forbid_file(kensidian_dir.join("index.db"));

    // Setup file watcher untuk vault:changed event
    let app_handle = app.clone();
    let mut watcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let dominated_by_tmp = event.paths.iter().any(|p| {
                    let clean = p
                        .to_string_lossy()
                        .trim_start_matches(r"\\?\")
                        .to_string();
                    clean.contains(".kensidian")
                        || p.file_name()
                            .map(|n| n.to_string_lossy().starts_with('.'))
                            .unwrap_or(false)
                });
                if !dominated_by_tmp {
                    let _ = app_handle.emit("vault:changed", ());
                }
            }
        })
        .ok();

    if let Some(ref mut w) = watcher {
        let _ = w.watch(&canonical, RecursiveMode::Recursive);
    }
    if let Ok(mut w_lock) = session._watcher.lock() {
        *w_lock = watcher;
    }

    {
        let mut session_lock = state
            .session
            .write()
            .map_err(|_| AppError::Io("failed to acquire session write lock".into()))?;

        // Drop watcher lama secara eksplisit sebelum session di-replace,
        // agar tidak ada watcher duplikat yang tetap mengirim vault:changed.
        if let Some(old_session) = session_lock.as_ref() {
            if let Ok(mut w) = old_session._watcher.lock() {
                *w = None;
            }
        }

        *session_lock = Some(session);
    }

    let _ = update_recent_vaults(&state, &info);
    Ok(info)
}

#[tauri::command]
pub async fn vault_create(
    app: AppHandle,
    state: State<'_, AppState>,
    parent_path: String,
    name: String,
) -> Result<VaultInfo, IpcError> {
    let valid_name = validate_component_name(&name)?;
    let parent = PathBuf::from(&parent_path);
    if !parent.exists() || !parent.is_dir() {
        return Err(AppError::NotFound("parent directory does not exist".into()).into());
    }

    let new_dir = parent.join(valid_name);
    if new_dir.exists() {
        return Err(AppError::Exists("directory already exists".into()).into());
    }

    fs::create_dir_all(&new_dir).map_err(AppError::from)?;
    vault_open(app, state, new_dir.to_string_lossy().to_string(), None).await
}

#[tauri::command]
pub async fn vault_close(state: State<'_, AppState>) -> Result<(), IpcError> {
    let mut session_lock = state
        .session
        .write()
        .map_err(|_| AppError::Io("failed to acquire session write lock".into()))?;

    // Drop watcher eksplisit agar file watcher berhenti sebelum session dibuang.
    if let Some(old_session) = session_lock.as_ref() {
        if let Ok(mut w) = old_session._watcher.lock() {
            *w = None;
        }
    }

    *session_lock = None;
    Ok(())
}

#[tauri::command]
pub async fn vault_get_current(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<VaultInfo>, IpcError> {
    // Jika sudah ada session aktif, kembalikan langsung tanpa buka vault baru.
    if let Ok(session) = state.get_session() {
        return Ok(Some(session.info.clone()));
    }

    // Coba restore vault terakhir dari recent.json
    let recent_path = state.dirs.recent_file();
    if !recent_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&recent_path).map_err(AppError::from)?;
    let list: Vec<VaultInfo> = serde_json::from_str(&content).unwrap_or_default();

    // Ambil path vault pertama yang masih ada sebelum memanggil vault_open,
    // agar kita tidak memegang referensi apapun ke state saat vault_open
    // mengambil write-lock pada session (mencegah potensi deadlock di masa depan
    // jika RwLock diubah menjadi non-re-entrant yang lebih ketat).
    let target_path = list.into_iter().find_map(|item| {
        let norm = normalize_path_str(&item.path);
        let p = PathBuf::from(&norm);
        if p.exists() && p.is_dir() {
            Some(norm)
        } else {
            None
        }
    });

    match target_path {
        Some(path) => {
            let info = vault_open(app, state, path, None).await?;
            Ok(Some(info))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn vault_list_recent(state: State<'_, AppState>) -> Result<Vec<VaultInfo>, IpcError> {
    let recent_path = state.dirs.recent_file();
    if !recent_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&recent_path).map_err(AppError::from)?;
    let raw_list: Vec<VaultInfo> = serde_json::from_str(&content).unwrap_or_default();
    let mut list: Vec<VaultInfo> = Vec::new();

    for item in raw_list {
        let norm = normalize_path_str(&item.path);
        let p = PathBuf::from(&norm);
        if p.exists() && p.is_dir() && !list.iter().any(|v| v.path.eq_ignore_ascii_case(&norm)) {
            list.push(VaultInfo {
                path: norm,
                name: item.name,
                is_project: item.is_project,
            });
        }
    }
    Ok(list)
}

#[tauri::command]
pub async fn vault_remove_recent(
    state: State<'_, AppState>,
    path: String,
) -> Result<Vec<VaultInfo>, IpcError> {
    let recent_path = state.dirs.recent_file();
    if !recent_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&recent_path).map_err(AppError::from)?;
    let raw_list: Vec<VaultInfo> = serde_json::from_str(&content).unwrap_or_default();
    let target_norm = normalize_path_str(&path);

    let mut list: Vec<VaultInfo> = Vec::new();
    for item in raw_list {
        let norm = normalize_path_str(&item.path);
        if !norm.eq_ignore_ascii_case(&target_norm)
            && !list.iter().any(|v| v.path.eq_ignore_ascii_case(&norm))
        {
            let p = PathBuf::from(&norm);
            if p.exists() && p.is_dir() {
                list.push(VaultInfo {
                    path: norm,
                    name: item.name,
                    is_project: item.is_project,
                });
            }
        }
    }

    let json = serde_json::to_string_pretty(&list).map_err(AppError::from)?;
    crate::storage::atomic::atomic_write(&recent_path, json.as_bytes()).map_err(AppError::from)?;
    Ok(list)
}
