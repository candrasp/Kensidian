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

fn update_recent_vaults(app_state: &AppState, info: &VaultInfo) -> Result<(), AppError> {
    let recent_path = app_state.dirs.recent_file();
    let mut list: Vec<VaultInfo> = if recent_path.exists() {
        let content = fs::read_to_string(&recent_path)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    list.retain(|v| !v.path.eq_ignore_ascii_case(&info.path));
    list.insert(0, info.clone());
    list.truncate(RECENT_VAULTS_MAX);

    let json = serde_json::to_string_pretty(&list)?;
    crate::storage::atomic::atomic_write(&recent_path, json.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub async fn vault_open(
    app: AppHandle,
    state: State<'_, AppState>,
    path: String,
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

    let info = VaultInfo {
        path: clean_path.clone(),
        name,
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
                    p.to_string_lossy().contains(".kensidian")
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
    vault_open(app, state, new_dir.to_string_lossy().to_string()).await
}

#[tauri::command]
pub async fn vault_close(state: State<'_, AppState>) -> Result<(), IpcError> {
    let mut session_lock = state
        .session
        .write()
        .map_err(|_| AppError::Io("failed to acquire session write lock".into()))?;
    *session_lock = None;
    Ok(())
}

#[tauri::command]
pub async fn vault_get_current(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<VaultInfo>, IpcError> {
    // Jika sudah ada session aktif, kembalikan langsung
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

    for item in list {
        let p = PathBuf::from(&item.path);
        if p.exists() && p.is_dir() {
            // Restore session secara otomatis
            let info = vault_open(app, state, item.path).await?;
            return Ok(Some(info));
        }
    }
    Ok(None)
}

#[tauri::command]
pub async fn vault_list_recent(state: State<'_, AppState>) -> Result<Vec<VaultInfo>, IpcError> {
    let recent_path = state.dirs.recent_file();
    if !recent_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&recent_path).map_err(AppError::from)?;
    let list: Vec<VaultInfo> = serde_json::from_str(&content).unwrap_or_default();
    Ok(list)
}
