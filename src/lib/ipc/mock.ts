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
  SyncStatus,
  GitStatus,
} from './types'
import { IpcException } from './index'
import type { Settings } from '@/stores/settings'

const delay = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms))

let mockSettings: Settings | null = null
let currentVault: VaultInfo | null = { path: '/mock/vault', name: 'Catatan Mock' }
let mockRecentVaults: VaultInfo[] = [{ path: '/mock/vault', name: 'Catatan Mock' }]
const mockFiles = new Map<string, string>([
  ['Catatan Awal.md', '# Selamat Datang di Kensidian\n\nIni adalah catatan contoh [[Referensi]].'],
  ['Referensi.md', '# Referensi\n\nTautan kembali ke [[Catatan Awal]].\n- [ ] Daftar tugas\n- [x] Selesai'],
  ['Folder/Sub Catatan.md', '# Sub Catatan\n\nCatatan di dalam subfolder.'],
])
let itemStyles: Record<string, ItemStyle> = {}
let workspaceState: Workspace | null = null

export const mockIpc = {
  settingsLoad: async (): Promise<Settings | null> => {
    await delay()
    return mockSettings
  },
  settingsSave: async (s: Settings): Promise<void> => {
    await delay()
    mockSettings = { ...s }
  },
  vaultListRecent: async (): Promise<VaultInfo[]> => {
    await delay()
    return [...mockRecentVaults]
  },
  vaultRemoveRecent: async (path: string): Promise<VaultInfo[]> => {
    await delay()
    mockRecentVaults = mockRecentVaults.filter((v) => v.path !== path)
    return [...mockRecentVaults]
  },
  vaultGetCurrent: async (): Promise<VaultInfo | null> => {
    await delay()
    return currentVault
  },
  vaultOpen: async (path: string): Promise<VaultInfo> => {
    await delay()
    currentVault = { path, name: path.split('/').pop() || 'Vault' }
    return currentVault
  },
  vaultCreate: async (parentPath: string, name: string): Promise<VaultInfo> => {
    await delay()
    currentVault = { path: `${parentPath}/${name}`, name }
    return currentVault
  },
  vaultClose: async (): Promise<void> => {
    await delay()
    currentVault = null
  },
  vaultConfigLoad: async (): Promise<VaultConfig> => {
    await delay()
    return { itemStyles }
  },
  itemStyleSet: async (path: string, style: ItemStyle | null): Promise<void> => {
    await delay()
    if (!style) delete itemStyles[path]
    else itemStyles[path] = style
  },
  workspaceLoad: async (): Promise<Workspace | null> => {
    await delay()
    return workspaceState
  },
  workspaceSave: async (w: Workspace): Promise<void> => {
    await delay()
    workspaceState = { ...w }
  },
  fsListDir: async (path: string): Promise<FileEntry[]> => {
    await delay()
    const prefix = path ? `${path}/` : ''
    const entries: FileEntry[] = []
    const folders = new Set<string>()

    for (const filePath of mockFiles.keys()) {
      if (filePath.startsWith(prefix)) {
        const rest = filePath.slice(prefix.length)
        const parts = rest.split('/')
        if (parts.length > 1) {
          folders.add(parts[0])
        } else {
          entries.push({
            path: filePath,
            name: parts[0],
            kind: 'file',
            mtime: Date.now(),
            size: mockFiles.get(filePath)?.length || 0,
          })
        }
      }
    }
    for (const f of folders) {
      entries.unshift({
        path: prefix ? `${prefix}${f}` : f,
        name: f,
        kind: 'folder',
        mtime: Date.now(),
        size: 0,
      })
    }
    return entries
  },
  vaultListNotes: async (): Promise<NoteRef[]> => {
    await delay()
    const notes: NoteRef[] = []
    for (const p of mockFiles.keys()) {
      if (p.endsWith('.md')) {
        const name = p.split('/').pop()?.replace(/\.md$/, '') || p
        notes.push({ path: p, name, mtime: Date.now() })
      }
    }
    return notes
  },
  noteRead: async (path: string): Promise<NoteContent> => {
    await delay()
    const content = mockFiles.get(path)
    if (content === undefined) throw new IpcException('NOT_FOUND', 'File tidak ditemukan')
    return { content, mtime: Date.now(), size: content.length }
  },
  noteWrite: async (path: string, content: string): Promise<{ mtime: number }> => {
    await delay()
    mockFiles.set(path, content)
    return { mtime: Date.now() }
  },
  noteCreate: async (path: string, content = ''): Promise<{ mtime: number }> => {
    await delay()
    if (mockFiles.has(path)) throw new IpcException('EXISTS', 'File sudah ada')
    mockFiles.set(path, content)
    return { mtime: Date.now() }
  },
  fsCreateFolder: async (): Promise<void> => {
    await delay()
  },
  fsRename: async (from: string, to: string): Promise<void> => {
    await delay()
    const c = mockFiles.get(from)
    if (c !== undefined) {
      mockFiles.delete(from)
      mockFiles.set(to, c)
    }
  },
  fsDelete: async (path: string): Promise<void> => {
    await delay()
    mockFiles.delete(path)
  },
  revealInFileManager: async (): Promise<void> => {
    await delay()
  },
  saveAsset: async (srcPath: string): Promise<string> => {
    await delay()
    return srcPath.split(/[/\\]/).pop() || 'image.png'
  },
  writeAsset: async (fileName: string): Promise<string> => {
    await delay()
    return fileName
  },
  searchInVault: async (query: string, useRegex: boolean, caseSensitive: boolean): Promise<SearchHit[]> => {
    await delay()
    const hits: SearchHit[] = []
    const searchQuery = caseSensitive ? query : query.toLowerCase()

    for (const [p, text] of mockFiles.entries()) {
      const lines = text.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const searchLine = caseSensitive ? line : line.toLowerCase()

        if (useRegex) {
          try {
            const re = new RegExp(query, caseSensitive ? '' : 'i')
            const match = re.exec(searchLine)
            if (match) {
              hits.push({
                path: p,
                name: p.split('/').pop() || p,
                line: i + 1,
                snippet: line.slice(0, 100),
                ranges: [[match.index, match.index + match[0].length]],
              })
            }
          } catch {
            // Invalid regex, skip
          }
        } else if (searchLine.includes(searchQuery)) {
          const idx = searchLine.indexOf(searchQuery)
          hits.push({
            path: p,
            name: p.split('/').pop() || p,
            line: i + 1,
            snippet: line.slice(0, 100),
            ranges: [[idx, idx + query.length]],
          })
        }
      }
    }
    return hits
  },
  backlinksGet: async (): Promise<BacklinkRef[]> => {
    await delay()
    return []
  },
  backlinksCount: async (): Promise<number> => {
    await delay()
    return 0
  },
  syncConfigLoad: async (): Promise<SyncConfig> => ({
    endpoint: '',
    bucket: '',
    prefix: '',
    hasCredentials: false,
  }),
  syncConfigSave: async (): Promise<void> => {},
  syncCredentialsSet: async (): Promise<void> => {},
  syncCredentialsClear: async (): Promise<void> => {},
  syncTest: async (): Promise<void> => {},
  syncStart: async (): Promise<void> => {},
  syncCancel: async (): Promise<void> => {},
  syncStatus: async (): Promise<SyncStatus> => ({
    running: false,
    progress: null,
    lastResult: null,
  }),
  fsImportExternal: async (_srcPath: string, _vaultDir: string): Promise<string> => {
    await delay()
    return 'Catatan baru.md'
  },
  projectGetGitStatus: async (): Promise<GitStatus> => {
    await delay()
    return {
      isGit: true,
      branch: 'main',
      uncommittedCount: 2,
      uncommittedFiles: ['TODO-PROJEK.md', 'src/components/project/ProjectDashboard.vue'],
      lastCommit: {
        hash: 'a1b2c3d',
        message: 'feat: add initial project mode setup',
        author: 'Developer',
        timestamp: Math.floor(Date.now() / 1000) - 3600,
      },
      ahead: 1,
      behind: 0,
    }
  },
  projectOpenTerminal: async (): Promise<void> => {},
}
