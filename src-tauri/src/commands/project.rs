use crate::error::{AppError, IpcError};
use crate::models::{GitCommitInfo, GitStatus, IdeInfo};
use crate::state::AppState;
use std::path::{Path, PathBuf};
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

fn normalize_remote_url(raw: &str) -> Option<String> {
    let trimmed = raw.trim().trim_end_matches(".git");
    let url = if let Some(rest) = trimmed.strip_prefix("git@") {
        rest.split_once(':')
            .map(|(host, path)| format!("https://{}/{}", host, path.trim_start_matches('/')))?
    } else if let Some(rest) = trimmed.strip_prefix("ssh://") {
        let without_user = rest.split_once('@').map(|(_, h)| h).unwrap_or(rest);
        format!("https://{}", without_user)
    } else {
        trimmed.to_string()
    };

    if url.starts_with("https://") || url.starts_with("http://") {
        Some(url)
    } else {
        None
    }
}

const MAX_UNCOMMITTED_FILES_RETURNED: usize = 200;

const HEAVY_UNIGNORED_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".next",
    ".nuxt",
    ".gradle",
];

fn parse_porcelain_z(raw: &[u8]) -> Vec<String> {
    let mut files = Vec::new();
    let mut iter = raw.split(|&b| b == 0);
    while let Some(entry) = iter.next() {
        if entry.len() < 3 {
            continue;
        }
        let path_bytes = &entry[3..];
        if path_bytes.is_empty() {
            continue;
        }
        let path_str = String::from_utf8_lossy(path_bytes).trim().to_string();
        if path_str.is_empty() {
            continue;
        }
        let xy = &entry[..2];
        if xy[0] == b'R' || xy[1] == b'R' {
            iter.next();
        }
        files.push(path_str);
    }
    files
}

fn detect_unignored_heavy_dirs(entries: &[String]) -> Vec<String> {
    let mut found = Vec::new();
    for entry in entries {
        let Some(trimmed) = entry.strip_suffix('/') else {
            continue;
        };
        let dir_name = trimmed.rsplit('/').next().unwrap_or(trimmed);
        if HEAVY_UNIGNORED_DIRS.contains(&dir_name) && !found.iter().any(|d| d == trimmed) {
            found.push(trimmed.to_string());
        }
    }
    found
}

fn collect_git_status_sync(root: &Path, cached_remote: Option<Option<String>>) -> Result<(GitStatus, Option<String>), AppError> {
    if !root.join(".git").exists() {
        return Ok((
            GitStatus {
                is_git: false,
                branch: String::new(),
                uncommitted_count: 0,
                uncommitted_files: Vec::new(),
                last_commit: None,
                ahead: 0,
                behind: 0,
                remote_url: None,
                has_gitignore: false,
                unignored_heavy_dirs: Vec::new(),
            },
            None,
        ));
    }

    let has_gitignore = root.join(".gitignore").exists();

    let branch_output = build_git_command(&["branch", "--show-current"], root)
        .output()
        .map_err(|e| AppError::Io(format!("failed to run git: {}", e)))?;

    let mut branch = if branch_output.status.success() {
        String::from_utf8_lossy(&branch_output.stdout).trim().to_string()
    } else {
        String::new()
    };

    if branch.is_empty() {
        if let Ok(head_out) = build_git_command(&["rev-parse", "--short", "HEAD"], root).output() {
            if head_out.status.success() {
                let short_head = String::from_utf8_lossy(&head_out.stdout).trim().to_string();
                branch = if short_head.is_empty() {
                    "HEAD".to_string()
                } else {
                    format!("HEAD ({})", short_head)
                };
            }
        }
    }

    // Tahap 1: jalankan mode default (-unormal) untuk deteksi cepat folder berat untracked
    let status_output = build_git_command(&["status", "--porcelain", "-z"], root)
        .output()
        .map_err(|e| AppError::Io(format!("failed to run git status: {}", e)))?;

    let mut uncommitted_files = if status_output.status.success() {
        parse_porcelain_z(&status_output.stdout)
    } else {
        Vec::new()
    };

    let unignored_heavy_dirs = detect_unignored_heavy_dirs(&uncommitted_files);

    // Tahap 2: ekspansi penuh (-uall) hanya jika aman (tidak ada folder berat untracked)
    if unignored_heavy_dirs.is_empty() && status_output.status.success() {
        if let Ok(full_out) = build_git_command(&["status", "--porcelain", "-z", "-uall"], root).output() {
            if full_out.status.success() {
                uncommitted_files = parse_porcelain_z(&full_out.stdout);
            }
        }
    }

    let uncommitted_count = uncommitted_files.len();
    uncommitted_files.truncate(MAX_UNCOMMITTED_FILES_RETURNED);

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

    let resolved_remote = match cached_remote {
        Some(cached) => cached,
        None => build_git_command(&["remote", "get-url", "origin"], root)
            .output()
            .ok()
            .filter(|out| out.status.success())
            .and_then(|out| normalize_remote_url(&String::from_utf8_lossy(&out.stdout))),
    };

    Ok((
        GitStatus {
            is_git: true,
            branch,
            uncommitted_count,
            uncommitted_files,
            last_commit,
            ahead,
            behind,
            remote_url: resolved_remote.clone(),
            has_gitignore,
            unignored_heavy_dirs,
        },
        resolved_remote,
    ))
}

#[tauri::command]
pub async fn project_get_git_status(state: State<'_, AppState>) -> Result<GitStatus, IpcError> {
    let session = state.get_session()?;
    let root = session.canonical_root.clone();
    let cached_remote = session.git_remote_url.lock().ok().and_then(|g| g.clone());

    let (status, resolved_remote) = tokio::task::spawn_blocking(move || {
        collect_git_status_sync(&root, cached_remote.clone())
    })
    .await
    .map_err(|e| AppError::Io(format!("git status task failed: {}", e)))??;

    if status.is_git {
        if let Ok(mut guard) = session.git_remote_url.lock() {
            if guard.is_none() {
                *guard = Some(resolved_remote);
            }
        }
    }

    Ok(status)
}

#[tauri::command]
pub async fn project_init_git(state: State<'_, AppState>) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let root = session.canonical_root.clone();

    tokio::task::spawn_blocking(move || -> Result<(), AppError> {
        if root.join(".git").exists() {
            return Ok(());
        }
        let output = build_git_command(&["init"], &root)
            .output()
            .map_err(|e| AppError::Io(format!("failed to run git init: {}", e)))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(AppError::Io(format!("git init failed: {}", stderr)));
        }
        Ok(())
    })
    .await
    .map_err(|e| AppError::Io(format!("git init task failed: {}", e)))??;

    Ok(())
}

#[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
fn spawn_linux_terminal(root: &std::path::Path) -> Result<(), AppError> {
    let root_str = root.to_string_lossy();
    let candidates: &[(&str, &[&str])] = &[
        ("x-terminal-emulator", &["--working-directory", &root_str]),
        ("gnome-terminal", &["--working-directory", &root_str]),
        ("konsole", &["--workdir", &root_str]),
        ("xfce4-terminal", &["--working-directory", &root_str]),
        ("alacritty", &["--working-directory", &root_str]),
        ("kitty", &["--directory", &root_str]),
        ("wezterm", &["start", "--cwd", &root_str]),
        ("lxterminal", &["--working-directory", &root_str]),
    ];

    for (bin, args) in candidates {
        if Command::new(bin).args(*args).current_dir(root).spawn().is_ok() {
            return Ok(());
        }
    }

    Err(AppError::Io("no supported terminal emulator found".into()))
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
        spawn_linux_terminal(root)?;
    }

    Ok(())
}

struct IdeSpec {
    id: &'static str,
    name: &'static str,
    clis: &'static [&'static str],
    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    mac_app: &'static str,
    #[cfg_attr(not(target_os = "windows"), allow(dead_code))]
    win_fallbacks: &'static [&'static str],
}

const SUPPORTED_IDES: &[IdeSpec] = &[
    IdeSpec { id: "agy", name: "Antigravity", clis: &["agy", "antigravity-ide"], mac_app: "Antigravity.app", win_fallbacks: &["Antigravity IDE\\bin\\antigravity-ide.cmd", "Antigravity\\bin\\agy.cmd", "Antigravity IDE\\Antigravity IDE.exe"] },
    IdeSpec { id: "cursor", name: "Cursor", clis: &["cursor"], mac_app: "Cursor.app", win_fallbacks: &["cursor\\bin\\cursor.cmd", "Cursor\\Cursor.exe"] },
    IdeSpec { id: "code", name: "VS Code", clis: &["code"], mac_app: "Visual Studio Code.app", win_fallbacks: &["Microsoft VS Code\\bin\\code.cmd"] },
    IdeSpec { id: "windsurf", name: "Windsurf", clis: &["windsurf"], mac_app: "Windsurf.app", win_fallbacks: &["Windsurf\\bin\\windsurf.cmd", "Windsurf\\Windsurf.exe"] },
    IdeSpec { id: "trae", name: "Trae", clis: &["trae"], mac_app: "Trae.app", win_fallbacks: &["Trae\\bin\\trae.cmd", "Trae\\Trae.exe"] },
    IdeSpec { id: "kiro", name: "Kiro", clis: &["kiro"], mac_app: "Kiro.app", win_fallbacks: &["Kiro\\bin\\kiro.cmd", "Kiro\\Kiro.exe"] },
    IdeSpec { id: "zed", name: "Zed", clis: &["zed"], mac_app: "Zed.app", win_fallbacks: &["Zed\\Zed.exe"] },
    IdeSpec { id: "idea", name: "IntelliJ IDEA", clis: &["idea"], mac_app: "IntelliJ IDEA.app", win_fallbacks: &[] },
    IdeSpec { id: "webstorm", name: "WebStorm", clis: &["webstorm"], mac_app: "WebStorm.app", win_fallbacks: &[] },
    IdeSpec { id: "pycharm", name: "PyCharm", clis: &["pycharm"], mac_app: "PyCharm.app", win_fallbacks: &[] },
    IdeSpec { id: "rustrover", name: "RustRover", clis: &["rustrover"], mac_app: "RustRover.app", win_fallbacks: &[] },
    IdeSpec { id: "goland", name: "GoLand", clis: &["goland"], mac_app: "GoLand.app", win_fallbacks: &[] },
    IdeSpec { id: "phpstorm", name: "PhpStorm", clis: &["phpstorm"], mac_app: "PhpStorm.app", win_fallbacks: &[] },
    IdeSpec { id: "clion", name: "CLion", clis: &["clion"], mac_app: "CLion.app", win_fallbacks: &[] },
    IdeSpec { id: "fleet", name: "JetBrains Fleet", clis: &["fleet"], mac_app: "Fleet.app", win_fallbacks: &[] },
];

#[cfg(target_os = "windows")]
fn resolve_windows_fallback(spec: &IdeSpec) -> Option<PathBuf> {
    let local_app_data = std::env::var_os("LOCALAPPDATA")?;
    let base = PathBuf::from(local_app_data);
    let programs = base.join("Programs");
    for rel in spec.win_fallbacks {
        let candidate = programs.join(rel);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    let toolbox_scripts = base.join("JetBrains").join("Toolbox").join("scripts");
    for cli in spec.clis {
        for ext in ["cmd", "bat", "exe"] {
            let candidate = toolbox_scripts.join(format!("{}.{}", cli, ext));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn resolve_macos_app(app_name: &str) -> Option<PathBuf> {
    let system_app = Path::new("/Applications").join(app_name);
    if system_app.is_dir() {
        return Some(system_app);
    }
    if let Some(home) = std::env::var_os("HOME") {
        let user_app = PathBuf::from(home).join("Applications").join(app_name);
        if user_app.is_dir() {
            return Some(user_app);
        }
    }
    None
}

fn resolve_cli_in_path(cli: &str) -> Option<PathBuf> {
    let path_var = std::env::var_os("PATH")?;
    for dir in std::env::split_paths(&path_var) {
        #[cfg(target_os = "windows")]
        {
            for ext in ["exe", "cmd", "bat"] {
                let candidate = dir.join(format!("{}.{}", cli, ext));
                if candidate.is_file() {
                    return Some(candidate);
                }
            }
            let plain = dir.join(cli);
            if plain.is_file() {
                return Some(plain);
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            use std::os::unix::fs::PermissionsExt;
            let candidate = dir.join(cli);
            if let Ok(meta) = std::fs::metadata(&candidate) {
                if meta.is_file() && (meta.permissions().mode() & 0o111 != 0) {
                    return Some(candidate);
                }
            }
        }
    }
    None
}

fn spawn_ide_process(bin: &Path, root: &Path) -> Result<(), AppError> {
    #[cfg(target_os = "windows")]
    {
        let is_script = bin
            .extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e.eq_ignore_ascii_case("cmd") || e.eq_ignore_ascii_case("bat"));
        let mut cmd = if is_script {
            let mut c = Command::new("cmd");
            // /S /C dengan kutip luar ekstra mencegah cmd.exe menghapus tanda kutip pada path yang mengandung spasi
            c.raw_arg(format!("/S /C \"\"{}\" \"{}\"\"", bin.display(), root.display()));
            c
        } else {
            let mut c = Command::new(bin);
            c.arg(root);
            c
        };
        cmd.creation_flags(0x08000000);
        cmd.spawn()
            .map_err(|e| AppError::Io(format!("failed to open IDE: {}", e)))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new(bin)
            .arg(root)
            .spawn()
            .map_err(|e| AppError::Io(format!("failed to open IDE: {}", e)))?;
    }

    Ok(())
}

fn resolve_ide_binary(spec: &IdeSpec) -> Option<PathBuf> {
    for cli in spec.clis {
        if let Some(bin) = resolve_cli_in_path(cli) {
            return Some(bin);
        }
    }
    #[cfg(target_os = "windows")]
    if let Some(bin) = resolve_windows_fallback(spec) {
        return Some(bin);
    }
    None
}

#[tauri::command]
pub async fn project_detect_ides() -> Result<Vec<IdeInfo>, IpcError> {
    let found = SUPPORTED_IDES
        .iter()
        .filter(|spec| {
            if resolve_ide_binary(spec).is_some() {
                return true;
            }
            #[cfg(target_os = "macos")]
            if resolve_macos_app(spec.mac_app).is_some() {
                return true;
            }
            false
        })
        .map(|spec| IdeInfo {
            id: spec.id.to_string(),
            name: spec.name.to_string(),
        })
        .collect();
    Ok(found)
}

#[tauri::command]
pub async fn project_open_ide(
    state: State<'_, AppState>,
    ide_id: String,
) -> Result<(), IpcError> {
    let session = state.get_session()?;
    let spec = SUPPORTED_IDES
        .iter()
        .find(|s| s.id == ide_id)
        .ok_or_else(|| AppError::InvalidName("unsupported IDE identifier".into()))?;

    if let Some(bin) = resolve_ide_binary(spec) {
        spawn_ide_process(&bin, &session.canonical_root)?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    if let Some(app_path) = resolve_macos_app(spec.mac_app) {
        Command::new("open")
            .arg("-a")
            .arg(&app_path)
            .arg(&session.canonical_root)
            .spawn()
            .map_err(|e| AppError::Io(format!("failed to open IDE: {}", e)))?;
        return Ok(());
    }

    Err(AppError::NotFound(format!("IDE '{}' not found", spec.name)).into())
}
