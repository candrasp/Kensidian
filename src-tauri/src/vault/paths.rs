use std::path::{Path, PathBuf};
use unicode_normalization::UnicodeNormalization;
use crate::constants::PATH_MAX_CHARS;
use crate::error::AppError;
use crate::vault::names::validate_component_name;
use crate::state::VaultSession;

pub fn validate_rel(raw: &str) -> Result<String, AppError> {
    let nfc: String = raw.nfc().collect();
    if nfc.is_empty() {
        return Ok(String::new());
    }

    if nfc.chars().count() > PATH_MAX_CHARS {
        return Err(AppError::InvalidName("path too long".into()));
    }

    if nfc.starts_with('/') || nfc.ends_with('/') || nfc.contains('\\') || nfc.contains("//") {
        return Err(AppError::InvalidName("invalid path separators".into()));
    }

    let mut validated_parts = Vec::new();
    for part in nfc.split('/') {
        if part == "." || part == ".." {
            return Err(AppError::InvalidName("path traversal not allowed".into()));
        }
        let valid = validate_component_name(part)?;
        validated_parts.push(valid);
    }

    Ok(validated_parts.join("/"))
}

fn path_starts_with(child: &Path, parent: &Path) -> bool {
    let child_str = child.to_string_lossy().replace('/', "\\");
    let parent_str = parent.to_string_lossy().replace('/', "\\");
    let clean_child = child_str.trim_start_matches(r"\\?\");
    let clean_parent = parent_str.trim_start_matches(r"\\?\");

    #[cfg(windows)]
    {
        clean_child.to_lowercase().starts_with(&clean_parent.to_lowercase())
    }
    #[cfg(not(windows))]
    {
        clean_child.starts_with(clean_parent)
    }
}

pub fn resolve(session: &VaultSession, rel: &str) -> Result<PathBuf, AppError> {
    let valid_rel = validate_rel(rel)?;
    let target = if valid_rel.is_empty() {
        session.canonical_root.clone()
    } else {
        session.canonical_root.join(&valid_rel)
    };

    if target.exists() {
        let canonical = target.canonicalize()?;
        if !path_starts_with(&canonical, &session.canonical_root) {
            return Err(AppError::Denied("path escapes vault root".into()));
        }
        // Strip UNC prefix agar path konsisten dengan canonical_root
        let clean = canonical.to_string_lossy().trim_start_matches(r"\\?\").to_string();
        return Ok(PathBuf::from(clean));
    }

    let mut ancestor = target.as_path();
    while let Some(parent) = ancestor.parent() {
        if parent.exists() {
            let canonical_parent = parent.canonicalize()?;
            if !path_starts_with(&canonical_parent, &session.canonical_root) {
                return Err(AppError::Denied("path escapes vault root".into()));
            }
            break;
        }
        ancestor = parent;
    }

    Ok(target)
}
