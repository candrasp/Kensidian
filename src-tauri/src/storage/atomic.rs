use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::thread;
use std::time::Duration;
use crate::error::AppError;

pub fn atomic_write(target_path: &Path, content: &[u8]) -> Result<(), AppError> {
    let parent = target_path.parent().ok_or_else(|| {
        AppError::Io("target path has no parent directory".into())
    })?;

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

    let backoffs = [Duration::from_millis(20), Duration::from_millis(50), Duration::from_millis(100)];
    let mut last_err = None;

    for (i, delay) in backoffs.iter().enumerate() {
        match fs::rename(&tmp_path, target_path) {
            Ok(()) => return Ok(()),
            Err(e) => {
                last_err = Some(e);
                if i < backoffs.len() - 1 {
                    thread::sleep(*delay);
                }
            }
        }
    }

    let _ = fs::remove_file(&tmp_path);

    match last_err {
        Some(e) => Err(AppError::from(e)),
        None => Err(AppError::Io("unknown error during atomic rename".into())),
    }
}
