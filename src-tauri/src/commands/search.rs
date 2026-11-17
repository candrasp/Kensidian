use crate::error::{AppError, IpcError};
use crate::models::SearchHit;
use crate::state::AppState;
use regex::Regex;
use std::fs;
use tauri::State;
use walkdir::WalkDir;

const MAX_RESULTS: usize = 200;
const CONTEXT_CHARS: usize = 80;

#[tauri::command]
pub async fn search_in_vault(
    state: State<'_, AppState>,
    query: String,
    use_regex: bool,
    case_sensitive: bool,
) -> Result<Vec<SearchHit>, IpcError> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let session = state.get_session()?;
    let vault_path = &session.canonical_root;

    let mut results = Vec::new();

    let regex_pattern = if use_regex {
        match if case_sensitive {
            Regex::new(&query)
        } else {
            Regex::new(&format!("(?i){}", query))
        } {
            Ok(re) => Some(re),
            Err(_) => return Err(AppError::InvalidInput("invalid regex pattern".into()).into()),
        }
    } else {
        None
    };

    for entry in WalkDir::new(&vault_path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.') && name != "node_modules"
        })
        .filter_map(|e| e.ok())
    {
        if results.len() >= MAX_RESULTS {
            break;
        }

        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        if let Some(ext) = path.extension() {
            if ext != "md" {
                continue;
            }
        } else {
            continue;
        }

        if let Ok(content) = fs::read_to_string(path) {
            let rel_path = path
                .strip_prefix(&vault_path)
                .unwrap_or(path)
                .to_string_lossy()
                .replace('\\', "/");

            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            for (line_num, line_content) in content.lines().enumerate() {
                if results.len() >= MAX_RESULTS {
                    break;
                }

                let matches = find_matches(line_content, &query, regex_pattern.as_ref(), case_sensitive);

                if !matches.is_empty() {
                    let snippet = create_snippet(line_content, &matches);
                    results.push(SearchHit {
                        path: rel_path.clone(),
                        name: name.clone(),
                        line: line_num + 1,
                        snippet,
                        ranges: matches,
                    });
                }
            }
        }
    }

    Ok(results)
}

fn find_matches(
    line: &str,
    query: &str,
    regex: Option<&Regex>,
    case_sensitive: bool,
) -> Vec<[usize; 2]> {
    let mut matches = Vec::new();

    if let Some(re) = regex {
        for mat in re.find_iter(line) {
            matches.push([mat.start(), mat.end()]);
        }
    } else {
        let search_in = if case_sensitive {
            line.to_string()
        } else {
            line.to_lowercase()
        };
        let search_for = if case_sensitive {
            query.to_string()
        } else {
            query.to_lowercase()
        };

        let mut start = 0;
        while let Some(pos) = search_in[start..].find(&search_for) {
            let abs_pos = start + pos;
            matches.push([abs_pos, abs_pos + query.len()]);
            start = abs_pos + query.len();
        }
    }

    matches
}

fn create_snippet(line: &str, matches: &[[usize; 2]]) -> String {
    if matches.is_empty() {
        return line.chars().take(CONTEXT_CHARS * 2).collect();
    }

    let first_match = matches[0][0];
    let last_match = matches.last().unwrap()[1];

    let start = first_match.saturating_sub(CONTEXT_CHARS);
    let end = (last_match + CONTEXT_CHARS).min(line.len());

    let mut snippet = String::new();
    if start > 0 {
        snippet.push_str("...");
    }
    snippet.push_str(&line[start..end]);
    if end < line.len() {
        snippet.push_str("...");
    }

    snippet
}
