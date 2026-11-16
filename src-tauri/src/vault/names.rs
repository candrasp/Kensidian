use unicode_normalization::UnicodeNormalization;
use crate::constants::NAME_MAX_CHARS;
use crate::error::AppError;

const FORBIDDEN_CHARS: &[char] = &['<', '>', ':', '"', '|', '?', '*'];

const WINDOWS_RESERVED_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

pub fn validate_component_name(name: &str) -> Result<String, AppError> {
    let nfc: String = name.nfc().collect();

    if nfc.is_empty() || nfc.chars().count() > NAME_MAX_CHARS {
        return Err(AppError::InvalidName("empty or too long component name".into()));
    }

    if nfc.starts_with('.') {
        return Err(AppError::InvalidName("name cannot start with a dot".into()));
    }

    if nfc.ends_with('.') || nfc.ends_with(' ') {
        return Err(AppError::InvalidName("name cannot end with dot or space".into()));
    }

    if nfc.contains(|c: char| c.is_control() || FORBIDDEN_CHARS.contains(&c) || c == '/' || c == '\\') {
        return Err(AppError::InvalidName("name contains forbidden characters".into()));
    }

    let stem = match nfc.split('.').next() {
        Some(s) => s.to_uppercase(),
        None => nfc.to_uppercase(),
    };

    if WINDOWS_RESERVED_NAMES.contains(&stem.as_str()) {
        return Err(AppError::InvalidName("name is a reserved device name".into()));
    }

    Ok(nfc)
}
