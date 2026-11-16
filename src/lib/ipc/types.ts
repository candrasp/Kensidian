export type IconRef = { set: 'lucide' | 'fa-brands'; name: string }
export type IconColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray'
export interface ItemStyle { icon?: IconRef; color?: IconColor }

export type NoteMode = 'view' | 'edit'
export type SortOrder = 'name-asc' | 'name-desc' | 'mtime-desc' | 'mtime-asc'

export interface TabState {
  id: string
  path: string | null
  mode: NoteMode
  scrollTop: number
  cursor: { anchor: number; head: number } | null
  history: string[]
  historyIndex: number
  dirty: boolean
  mtime: number | null
}

export interface Workspace {
  version: 1
  leftSidebar: { visible: boolean; width: number; activeTab: 'files' | 'search' | 'bookmarks' }
  rightSidebar: { visible: boolean; width: number; activeTab: 'backlinks' | 'outline' }
  tabs: Omit<TabState, 'dirty' | 'mtime'>[]
  activeTabId: string | null
  expandedFolders: string[]
  sortOrder: SortOrder
  autoReveal: boolean
  recent: string[]
  bookmarks: string[]
}

export interface VaultInfo { path: string; name: string }
export interface FileEntry { path: string; name: string; kind: 'file' | 'folder'; mtime: number; size: number }
export interface NoteRef { path: string; name: string; mtime: number }
export interface NoteContent { content: string; mtime: number; size: number }
export interface SearchHit {
  path: string
  name: string
  line: number
  snippet: string
  ranges: [number, number][]
}
export interface BacklinkRef { path: string; name: string; line: number; context: string }
export interface VaultConfig { itemStyles: Record<string, ItemStyle> }

export type VaultEvent = {
  kind: 'create' | 'modify' | 'delete' | 'rename'
  path: string
  from?: string
  origin: 'self' | 'external'
}

export type IpcErrorCode =
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EXISTS'
  | 'DENIED'
  | 'TOO_LARGE'
  | 'INVALID_NAME'
  | 'IO'
  | 'SYNC_NOT_CONFIGURED'
  | 'SYNC_AUTH'
  | 'SYNC_NETWORK'
  | 'SYNC_BUSY'

export interface IpcError { code: IpcErrorCode; message: string }

export interface SyncConfigInput { endpoint: string; bucket: string; prefix: string }
export interface SyncConfig extends SyncConfigInput { hasCredentials: boolean }
export interface SyncProgress {
  phase: 'scanning' | 'uploading'
  done: number
  total: number
  bytesDone: number
  bytesTotal: number
  current: string | null
}
export interface SyncIssue {
  path: string
  kind: 'too_large' | 'changed_during_sync' | 'read_failed' | 'upload_failed'
}
export interface SyncResult {
  status: 'ok' | 'partial' | 'cancelled' | 'failed'
  error: IpcErrorCode | null
  uploaded: number
  unchanged: number
  bytesUploaded: number
  issues: SyncIssue[]
  startedAt: number
  finishedAt: number
}
export interface SyncStatus {
  running: boolean
  progress: SyncProgress | null
  lastResult: SyncResult | null
}
