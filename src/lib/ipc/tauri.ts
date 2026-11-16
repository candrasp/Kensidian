import type {
  VaultInfo,
  FileEntry,
  NoteRef,
  NoteContent,
  SearchHit,
  BacklinkRef,
  VaultConfig,
  ItemStyle,
  Workspace,
  SyncConfig,
  SyncConfigInput,
  SyncStatus,
} from './types'
import { invoke } from '@tauri-apps/api/core'
import type { Settings } from '@/stores/settings'

export const tauriIpc = {
  settingsLoad: () => invoke<Settings | null>('settings_load'),
  settingsSave: (settings: Settings) => invoke<void>('settings_save', { settings }),
  vaultListRecent: () => invoke<VaultInfo[]>('vault_list_recent'),
  vaultGetCurrent: () => invoke<VaultInfo | null>('vault_get_current'),
  vaultOpen: (path: string) => invoke<VaultInfo>('vault_open', { path }),
  vaultCreate: (parentPath: string, name: string) => invoke<VaultInfo>('vault_create', { parentPath, name }),
  vaultClose: () => invoke<void>('vault_close'),
  vaultConfigLoad: () => invoke<VaultConfig>('vault_config_load'),
  itemStyleSet: (path: string, style: ItemStyle | null) => invoke<void>('item_style_set', { path, style }),
  workspaceLoad: () => invoke<Workspace | null>('workspace_load'),
  workspaceSave: (workspace: Workspace) => invoke<void>('workspace_save', { workspace }),
  fsListDir: (path: string) => invoke<FileEntry[]>('fs_list_dir', { path }),
  vaultListNotes: () => invoke<NoteRef[]>('vault_list_notes'),
  noteRead: (path: string) => invoke<NoteContent>('note_read', { path }),
  noteWrite: (path: string, content: string, expectedMtime: number) =>
    invoke<{ mtime: number }>('note_write', { path, content, expectedMtime }),
  noteCreate: (path: string, content?: string) => invoke<{ mtime: number }>('note_create', { path, content }),
  fsCreateFolder: (path: string) => invoke<void>('fs_create_folder', { path }),
  fsRename: (from: string, to: string) => invoke<void>('fs_rename', { from, to }),
  fsDelete: (path: string, toTrash = true) => invoke<void>('fs_delete', { path, toTrash }),
  revealInFileManager: (path: string) => invoke<void>('reveal_in_file_manager', { path }),
  saveAsset: (srcPath: string) => invoke<string>('fs_save_asset', { srcPath }),
  writeAsset: (fileName: string, data: number[] | Uint8Array) =>
    invoke<string>('fs_write_asset', { fileName, data: Array.from(data) }),
  searchQuery: (query: string, caseSensitive: boolean, limit = 100) =>
    invoke<SearchHit[]>('search_query', { query, caseSensitive, limit }),
  backlinksGet: (path: string) => invoke<BacklinkRef[]>('backlinks_get', { path }),
  backlinksCount: (path: string) => invoke<number>('backlinks_count', { path }),
  syncConfigLoad: () => invoke<SyncConfig>('sync_config_load'),
  syncConfigSave: (config: SyncConfigInput) => invoke<void>('sync_config_save', { config }),
  syncCredentialsSet: (accessKeyId: string, secretAccessKey: string) =>
    invoke<void>('sync_credentials_set', { accessKeyId, secretAccessKey }),
  syncCredentialsClear: () => invoke<void>('sync_credentials_clear'),
  syncTest: () => invoke<void>('sync_test'),
  syncStart: () => invoke<void>('sync_start'),
  syncCancel: () => invoke<void>('sync_cancel'),
  syncStatus: () => invoke<SyncStatus>('sync_status'),
  fsImportExternal: (srcPath: string, vaultDir: string) =>
    invoke<string>('fs_import_external', { srcPath, vaultDir }),
}
