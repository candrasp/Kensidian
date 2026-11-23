use std::fs;
use tauri::Manager;

pub mod commands;
pub mod constants;
pub mod error;
pub mod models;
pub mod state;
pub mod storage;
pub mod vault;

use commands::fs::*;
use commands::note::*;
use commands::search::*;
use commands::store::*;
use commands::vault::*;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from(".kensidian-data"));

            if !data_dir.exists() {
                let _ = fs::create_dir_all(&data_dir);
            }

            app.manage(AppState::new(data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings_load,
            settings_save,
            vault_list_recent,
            vault_remove_recent,
            vault_get_current,
            vault_open,
            vault_create,
            vault_close,
            vault_config_load,
            item_style_set,
            workspace_load,
            workspace_save,
            fs_list_dir,
            vault_list_notes,
            note_read,
            note_write,
            note_create,
            fs_create_folder,
            fs_rename,
            fs_delete,
            reveal_in_file_manager,
            fs_save_asset,
            fs_write_asset,
            fs_import_external,
            search_in_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
