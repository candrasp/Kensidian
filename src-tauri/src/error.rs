use serde::Serialize;
use std::io;
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum IpcErrorCode {
    NotFound,
    Conflict,
    Exists,
    Denied,
    TooLarge,
    InvalidName,
    InvalidInput,
    Io,
    SyncNotConfigured,
    SyncAuth,
    SyncNetwork,
    SyncBusy,
}

#[derive(Debug, Clone, Serialize)]
pub struct IpcError {
    pub code: IpcErrorCode,
    pub message: String,
}

impl IpcError {
    pub fn new(code: IpcErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("not found: {0}")]
    NotFound(String),

    #[error("conflict: {0}")]
    Conflict(String),

    #[error("already exists: {0}")]
    Exists(String),

    #[error("permission denied: {0}")]
    Denied(String),

    #[error("file too large: {0}")]
    TooLarge(String),

    #[error("invalid name or path: {0}")]
    InvalidName(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("io error: {0}")]
    Io(String),

    #[error("sync not configured: {0}")]
    SyncNotConfigured(String),

    #[error("sync auth error: {0}")]
    SyncAuth(String),

    #[error("sync network error: {0}")]
    SyncNetwork(String),

    #[error("sync busy: {0}")]
    SyncBusy(String),
}

impl AppError {
    pub fn code(&self) -> IpcErrorCode {
        match self {
            Self::NotFound(_) => IpcErrorCode::NotFound,
            Self::Conflict(_) => IpcErrorCode::Conflict,
            Self::Exists(_) => IpcErrorCode::Exists,
            Self::Denied(_) => IpcErrorCode::Denied,
            Self::TooLarge(_) => IpcErrorCode::TooLarge,
            Self::InvalidName(_) => IpcErrorCode::InvalidName,
            Self::InvalidInput(_) => IpcErrorCode::InvalidInput,
            Self::Io(_) => IpcErrorCode::Io,
            Self::SyncNotConfigured(_) => IpcErrorCode::SyncNotConfigured,
            Self::SyncAuth(_) => IpcErrorCode::SyncAuth,
            Self::SyncNetwork(_) => IpcErrorCode::SyncNetwork,
            Self::SyncBusy(_) => IpcErrorCode::SyncBusy,
        }
    }
}

impl From<AppError> for IpcError {
    fn from(err: AppError) -> Self {
        Self {
            code: err.code(),
            message: err.to_string(),
        }
    }
}

impl From<io::Error> for AppError {
    fn from(err: io::Error) -> Self {
        match err.kind() {
            io::ErrorKind::NotFound => Self::NotFound(err.to_string()),
            io::ErrorKind::PermissionDenied => Self::Denied(err.to_string()),
            io::ErrorKind::AlreadyExists => Self::Exists(err.to_string()),
            _ => Self::Io(err.to_string()),
        }
    }
}

impl From<io::Error> for IpcError {
    fn from(err: io::Error) -> Self {
        AppError::from(err).into()
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        Self::Io(err.to_string())
    }
}
