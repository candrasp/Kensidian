pub const APP_NAME: &str = "Kensidian";

pub const NAME_MAX_CHARS: usize = 255;
pub const PATH_MAX_CHARS: usize = 1024;
pub const MAX_NOTE_BYTES: u64 = 10 * 1024 * 1024; // 10 MiB
pub const MAX_JSON_BYTES: u64 = 1024 * 1024; // 1 MiB
pub const RECENT_VAULTS_MAX: usize = 10;

pub const WATCH_DEBOUNCE_MS: u64 = 100;
pub const EVENT_CHUNK_SIZE: usize = 500;
pub const SELF_WRITE_TTL_MS: u64 = 5000;

pub const INDEX_MAX_NOTE_BYTES: u64 = 5 * 1024 * 1024; // 5 MiB
pub const INDEX_MAX_LINE_CHARS: usize = 2000;

pub const SEARCH_MAX_TERMS: usize = 10;
pub const SEARCH_MAX_LIMIT: usize = 500;
pub const SNIPPET_MAX_CHARS: usize = 200;

pub const SYNC_MAX_FILE_BYTES: u64 = 100 * 1024 * 1024; // 100 MiB
pub const SYNC_CONCURRENCY: usize = 4;
pub const SYNC_MAX_ATTEMPTS: usize = 3;
pub const SYNC_ABORT_AFTER_FAILURES: usize = 5;

pub const SYNC_PROGRESS_MS: u64 = 250;
pub const SYNC_MANIFEST_FLUSH_EVERY: usize = 25;
pub const SYNC_URL_EXPIRY_SECS: u64 = 600;
