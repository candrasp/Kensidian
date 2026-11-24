use crate::error::{AppError, IpcError};
use crate::models::{GitCommitInfo, GitStatus};
use crate::state::AppState;
use std::process::Command;
use tauri::State;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

fn build_git_command(args: &[&str], current_dir: &std::path::Path) -> Command {
    let mut cmd = Command::new("git");
    cmd.args(args).current_dir(current_dir);
    #[cfg(windows)]
    {
        // 0x08000000 = CREATE_NO_WINDOW agar tidak muncul command prompt popup
        cmd.creation_flags(0x08000000);
    }
    cmd
}

#[tauri::command]
pub async fn project_get_git_status(state: State<'_, AppState>) -> Result<GitStatus, IpcError> {
    let session = state.get_session()?;
    let root = &session.canonical_root;

    if !root.join(".git").exists() {
        return Ok(GitStatus {
            is_git: false,
            branch: String::new(),
            uncommitted_count: 0,
            uncommitted_files: Vec::new(),
            last_commit: None,
            ahead: 0,
            behind: 0,
        });
    }

    // 1. Ambil branch aktif
    let branch_output = build_git_command(&["branch", "--show-current"], root)
        .output()
        .map_err(|e| AppError::Io(format!("failed to run git: {}", e)))?;

    // Periksa exit code — git bisa gagal (mis. repo korup).
    let mut branch = if branch_output.status.success() {
        String::from_utf8_lossy(&branch_output.stdout).trim().to_string()
    } else {
        String::new()
    };

    if branch.is_empty() {
        // Coba rev-parse short HEAD jika detached HEAD
        if let Ok(head_out) = build_git_command(&["rev-parse", "--short", "HEAD"], root).output() {
            if head_out.status.success() {
                let short_head = String::from_utf8_lossy(&head_out.stdout).trim().to_string();
                if !short_head.is_empty() {
                    branch = format!("HEAD ({})", short_head);
                } else {
                    branch = "HEAD".to_string();
                }
            }
        }
    }

    // 2. Ambil file uncommitted — gunakan -z (NUL-terminated) agar nama file
    //    dengan spasi, tab, atau karakter khusus diparsing dengan benar.
    //    Format per entry: "XY\0PATH\0" atau "XY\0ORIG\0DEST\0" (untuk rename).
    let status_output = build_git_command(&["status", "--porcelain", "-z"], root)
        .output()
        .map_err(|e| AppError::Io(format!("failed to run git status: {}", e)))?;

    let mut uncommitted_files: Vec<String> = Vec::new();
    if status_output.status.success() {
        // Bytes NUL-terminated; pisahkan pada setiap NUL.
        let raw = &status_output.stdout;
        let mut iter = raw.split(|&b| b == 0);
        while let Some(entry) = iter.next() {
            if entry.len() < 3 {
                continue;
            }
            // Byte [0..2] = status XY, byte [2] = spasi, sisanya = path
            let path_bytes = &entry[3..];
            if path_bytes.is_empty() {
                continue;
            }
            let path_str = String::from_utf8_lossy(path_bytes).trim().to_string();
            if path_str.is_empty() {
                continue;
            }
            // Status 'R' (rename) → entry berikutnya adalah path asal; lewati.
            let xy = &entry[..2];
            if xy[0] == b'R' || xy[1] == b'R' {
                // Konsumsi path asal (entry NUL berikutnya)
                iter.next();
            }
            uncommitted_files.push(path_str);
        }
    }
    let uncommitted_count = uncommitted_files.len();

    // 3. Ambil commit terakhir: %H|%s|%an|%ct
    let log_output = build_git_command(&["log", "-1", "--format=%h|%s|%an|%ct"], root).output();
    let last_commit = match log_output {
        Ok(out) if out.status.success() => {
            let log_str = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let parts: Vec<&str> = log_str.split('|').collect();
            if parts.len() >= 4 {
                let timestamp = parts[3].parse::<i64>().unwrap_or(0);
                Some(GitCommitInfo {
                    hash: parts[0].to_string(),
                    message: parts[1].to_string(),
                    author: parts[2].to_string(),
                    timestamp,
                })
            } else {
                None
            }
        }
        _ => None,
    };

    // 4. Ambil status ahead/behind terhadap upstream (jika ada)
    let mut ahead = 0usize;
    let mut behind = 0usize;
    if let Ok(rev_out) =
        build_git_command(&["rev-list", "--left-right", "--count", "HEAD...@{u}"], root).output()
    {
        if rev_out.status.success() {
            let rev_str = String::from_utf8_lossy(&rev_out.stdout);
            let mut parts = rev_str.split_whitespace();
            ahead = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
            behind = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0);
        }
    }

    Ok(GitStatus {
        is_git: true,
        branch,
        uncommitted_count,
        uncommitted_files,
        last_commit,
        ahead,
        behind,
    })
}

#[tauri::command]
pub async fn project_open_terminal(state: State<'_, AppState>) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let root = &session.canonical_root;

    #[cfg(target_os = "windows")]
    {
        let spawned = Command::new("cmd")
            .args(&["/c", "start", "powershell"])
            .current_dir(root)
            .spawn();

        if spawned.is_err() {
            Command::new("powershell")
                .current_dir(root)
                .spawn()
                .map_err(|e| AppError::Io(format!("failed to open terminal: {}", e)))?;
        }
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .args(&["-a", "Terminal"])
            .arg(root)
            .spawn()
            .map_err(|e| AppError::Io(format!("failed to open terminal: {}", e)))?;
    }

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        Command::new("x-terminal-emulator")
            .arg("--working-directory")
            .arg(root)
            .spawn()
            .map_err(|e| AppError::Io(format!("failed to open terminal: {}", e)))?;
    }

    Ok(())
}
