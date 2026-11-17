use crate::error::{AppError, IpcError};
use crate::models::VaultInfo;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};

#[derive(Debug, Clone)]
pub struct AppDirs {
    pub data_dir: PathBuf,
}

impl AppDirs {
    pub fn new(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    pub fn settings_file(&self) -> PathBuf {
        self.data_dir.join("settings.json")
    }

    pub fn recent_file(&self) -> PathBuf {
        self.data_dir.join("recent.json")
    }
}

pub struct VaultSession {
    pub info: VaultInfo,
    pub root: PathBuf,
    pub canonical_root: PathBuf,
    pub write_lock: Mutex<()>,
    pub _watcher: Mutex<Option<notify::RecommendedWatcher>>,
}

impl VaultSession {
    pub fn new(info: VaultInfo, root: PathBuf, canonical_root: PathBuf) -> Self {
        Self {
            info,
            root,
            canonical_root,
            write_lock: Mutex::new(()),
            _watcher: Mutex::new(None),
        }
    }

    pub fn kensidian_dir(&self) -> PathBuf {
        self.canonical_root.join(".kensidian")
    }

    pub fn workspace_file(&self) -> PathBuf {
        self.kensidian_dir().join("workspace.json")
    }

    pub fn config_file(&self) -> PathBuf {
        self.kensidian_dir().join("config.json")
    }
}

pub struct AppState {
    pub dirs: AppDirs,
    pub session: RwLock<Option<Arc<VaultSession>>>,
}

impl AppState {
    pub fn new(data_dir: PathBuf) -> Self {
        Self {
            dirs: AppDirs::new(data_dir),
            session: RwLock::new(None),
        }
    }

    pub fn get_session(&self) -> Result<Arc<VaultSession>, IpcError> {
        let lock = self
            .session
            .read()
            .map_err(|_| AppError::Io("failed to acquire session read lock".into()))?;

        match lock.as_ref() {
            Some(session) => Ok(Arc::clone(session)),
            None => Err(AppError::NotFound("vault is not open".into()).into()),
        }
    }
}
