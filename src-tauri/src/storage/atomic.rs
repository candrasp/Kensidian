use crate::error::AppError;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;

pub fn atomic_write(target_path: &Path, content: &[u8]) -> Result<(), AppError> {
    let parent = target_path
        .parent()
        .ok_or_else(|| AppError::Io("target path has no parent directory".into()))?;

    if !parent.exists() {
        fs::create_dir_all(parent)?;
    }

    let file_name = target_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);

    let tmp_name = format!(".{}.kensidian-{}.tmp", file_name, now);
    let tmp_path = parent.join(&tmp_name);

    {
        let mut file = File::create(&tmp_path)?;
        file.write_all(content)?;
        file.sync_data()?;
    }

    // Coba rename hingga 3x tanpa blocking sleep agar tidak memblok
    // async runtime Tokio. Semua caller sudah memegang write_lock,
    // sehingga serialisasi write sudah terjamin di level aplikasi.
    let mut last_err = None;
    for _ in 0..3 {
        match fs::rename(&tmp_path, target_path) {
            Ok(()) => return Ok(()),
            Err(e) => {
                last_err = Some(e);
            }
        }
    }

    let _ = fs::remove_file(&tmp_path);

    match last_err {
        Some(e) => Err(AppError::from(e)),
        None => Err(AppError::Io("unknown error during atomic rename".into())),
    }
}
