use std::fs;
use tauri::State;
use crate::error::{AppError, IpcError};
use crate::models::{ItemStyle, VaultConfig};
use crate::state::AppState;
use crate::storage::atomic::atomic_write;

#[tauri::command]
pub async fn settings_load(state: State<'_, AppState>) -> Result<Option<serde_json::Value>, IpcError> {
    let settings_path = state.dirs.settings_file();
    if !settings_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&settings_path).map_err(AppError::from)?;
    let val: serde_json::Value = serde_json::from_str(&content).map_err(AppError::from)?;
    Ok(Some(val))
}

#[tauri::command]
pub async fn settings_save(state: State<'_, AppState>, settings: serde_json::Value) -> Result<(), IpcError> {
    let settings_path = state.dirs.settings_file();
    let json = serde_json::to_string_pretty(&settings).map_err(AppError::from)?;
    atomic_write(&settings_path, json.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub async fn workspace_load(state: State<'_, AppState>) -> Result<Option<serde_json::Value>, IpcError> {
    let session = state.get_session()?;
    let ws_path = session.workspace_file();
    if !ws_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&ws_path).map_err(AppError::from)?;
    let val: serde_json::Value = serde_json::from_str(&content).map_err(AppError::from)?;
    Ok(Some(val))
}

#[tauri::command]
pub async fn workspace_save(state: State<'_, AppState>, workspace: serde_json::Value) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let ws_path = session.workspace_file();
    let json = serde_json::to_string_pretty(&workspace).map_err(AppError::from)?;
    atomic_write(&ws_path, json.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub async fn vault_config_load(state: State<'_, AppState>) -> Result<VaultConfig, IpcError> {
    let session = state.get_session()?;
    let cfg_path = session.config_file();
    if !cfg_path.exists() {
        return Ok(VaultConfig::default());
    }
    let content = fs::read_to_string(&cfg_path).map_err(AppError::from)?;
    let val: VaultConfig = serde_json::from_str(&content).unwrap_or_default();
    Ok(val)
}

#[tauri::command]
pub async fn item_style_set(
    state: State<'_, AppState>,
    path: String,
    style: Option<ItemStyle>,
) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let _lock = session.write_lock.lock().map_err(|_| {
        AppError::Io("failed to acquire write lock".into())
    })?;

    let cfg_path = session.config_file();
    let mut config: VaultConfig = if cfg_path.exists() {
        let content = fs::read_to_string(&cfg_path).map_err(AppError::from)?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        VaultConfig::default()
    };

    match style {
        Some(s) => { config.item_styles.insert(path, s); }
        None => { config.item_styles.remove(&path); }
    }

    let json = serde_json::to_string_pretty(&config).map_err(AppError::from)?;
    atomic_write(&cfg_path, json.as_bytes())?;
    Ok(())
}
