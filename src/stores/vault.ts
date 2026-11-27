import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { VaultInfo, FileEntry, ItemStyle, SortOrder } from '@/lib/ipc/types'
import { ipc, isTauri } from '@/lib/ipc'

function getParentDir(path: string | null): string {
  if (!path) return ''
  const i = path.lastIndexOf('/')
  return i === -1 ? '' : path.slice(0, i)
}

function getAvailableName(existing: Set<string>, base: string, ext = ''): string {
  let name = `${base}${ext}`
  for (let i = 1; existing.has(name.toLowerCase()); i++) name = `${base} ${i}${ext}`
  return name
}

export const useVaultStore = defineStore('vault', () => {
  const current = ref<VaultInfo | null>(null)
  const recentVaults = ref<VaultInfo[]>([])
  const watching = ref(false)
  const indexing = ref(false)

  const tree = shallowRef<Map<string, FileEntry[]>>(new Map())
  const treeVersion = ref(0)
  const expanded = ref<Set<string>>(new Set())
  const itemStyles = ref<Record<string, ItemStyle>>({})
  const sortOrder = ref<SortOrder>('name-asc')
  const autoReveal = ref(true)
  const selectedPath = ref<string | null>(null)
  const totalNotes = ref(0)
  const totalFolders = ref(0)
  const isSwitchingVault = ref(false)
  const requestCreate = ref<{ kind: 'file' | 'folder'; folder?: string; id: number } | null>(null)
  let unlistenVaultChanged: (() => void) | null = null

  function triggerCreate(kind: 'file' | 'folder', folder?: string) {
    requestCreate.value = { kind, folder, id: Date.now() }
  }

  async function updateNotesCount() {
    try {
      const notes = await ipc.vaultListNotes()
      totalNotes.value = notes.length
      const folders = new Set<string>()
      for (const n of notes) {
        const parts = n.path.split('/')
        for (let i = 1; i < parts.length; i++) {
          folders.add(parts.slice(0, i).join('/'))
        }
      }
      for (const [folderPath, entries] of tree.value.entries()) {
        if (folderPath) folders.add(folderPath)
        for (const e of entries) {
          if (e.kind === 'folder') folders.add(e.path)
        }
      }
      totalFolders.value = folders.size
    } catch {
      totalNotes.value = 0
      totalFolders.value = 0
    }
  }

  async function loadInitial() {
    try {
      current.value = await ipc.vaultGetCurrent()
      recentVaults.value = await ipc.vaultListRecent()
      if (current.value) {
        await loadConfig()
        await loadDir('')
        await updateNotesCount()
        await setupListener()
      }
    } catch {
      current.value = null
    }
  }

  async function loadDir(dirPath: string) {
    try {
      const entries = await ipc.fsListDir(dirPath)
      const nextMap = new Map(tree.value)
      nextMap.set(dirPath, entries)
      tree.value = nextMap
      treeVersion.value++
    } catch (e: unknown) {
      const err = e as { code?: string }
      if (err?.code === 'NOT_FOUND') {
        const nextMap = new Map(tree.value)
        nextMap.delete(dirPath)
        tree.value = nextMap
        expanded.value.delete(dirPath)
        treeVersion.value++
      } else {
        console.error('Gagal memuat folder:', dirPath, e)
      }
    }
  }

  async function refresh() {
    await loadDir('')
    for (const folder of expanded.value) {
      await loadDir(folder)
    }
    await updateNotesCount()
  }

  async function toggleExpand(folderPath: string) {
    const nextSet = new Set(expanded.value)
    if (nextSet.has(folderPath)) {
      nextSet.delete(folderPath)
    } else {
      nextSet.add(folderPath)
      if (!tree.value.has(folderPath)) {
        await loadDir(folderPath)
      }
    }
    expanded.value = nextSet
  }

  async function setupListener() {
    if (!isTauri) return
    if (unlistenVaultChanged) {
      unlistenVaultChanged()
      unlistenVaultChanged = null
    }
    const { listen } = await import('@tauri-apps/api/event')
    unlistenVaultChanged = await listen('vault:changed', async () => {
      await refresh()
    })
  }

  let onSwitchHandlers: {
    before?: () => Promise<void>
    after?: () => Promise<void>
  } = {}

  function registerSwitchHandlers(handlers: {
    before?: () => Promise<void>
    after?: () => Promise<void>
  }) {
    onSwitchHandlers = handlers
  }

  function resetVaultState() {
    tree.value = new Map()
    expanded.value = new Set()
    totalNotes.value = 0
    totalFolders.value = 0
    selectedPath.value = null
    treeVersion.value++
  }

  async function openVault(path: string, isProject?: boolean) {
    if (onSwitchHandlers.before) {
      await onSwitchHandlers.before()
    }
    isSwitchingVault.value = true
    unlistenVaultChanged?.()
    unlistenVaultChanged = null
    try {
      const info = await ipc.vaultOpen(path, isProject)
      current.value = info
      recentVaults.value = await ipc.vaultListRecent()
      resetVaultState()
      await loadConfig()
      await loadDir('')
      await updateNotesCount()
      await setupListener()
      if (onSwitchHandlers.after) {
        await onSwitchHandlers.after()
      }
    } catch (e) {
      console.error('Gagal membuka vault:', e)
    } finally {
      setTimeout(() => {
        isSwitchingVault.value = false
      }, 250)
    }
  }

  async function closeVault() {
    unlistenVaultChanged?.(); unlistenVaultChanged = null
    await ipc.vaultClose()
    current.value = null; tree.value = new Map(); expanded.value = new Set(); totalNotes.value = 0; totalFolders.value = 0; treeVersion.value++
  }

  async function removeRecentVault(path: string) {
    try {
      recentVaults.value = await ipc.vaultRemoveRecent(path)
    } catch (e) {
      console.error('Gagal menghapus vault dari riwayat:', e)
    }
  }

  const collapseAll = () => { expanded.value = new Set() }
  const setSortOrder = (order: SortOrder) => { sortOrder.value = order }
  const toggleAutoReveal = () => { autoReveal.value = !autoReveal.value }

  function getTargetFolder(explicit?: string): string {
    if (explicit !== undefined) return explicit
    if (!selectedPath.value) return ''
    if (tree.value.has(selectedPath.value)) return selectedPath.value
    return getParentDir(selectedPath.value)
  }

  async function createEntry(kind: 'file' | 'folder', folder?: string): Promise<string> {
    const parent = getTargetFolder(folder)
    if (parent && !tree.value.has(parent)) await loadDir(parent)
    const list = tree.value.get(parent) ?? []
    const existing = new Set(list.map((e) => e.name.toLowerCase()))
    const isFile = kind === 'file'
    const name = getAvailableName(existing, isFile ? 'Tanpa judul' : 'Folder baru', isFile ? '.md' : '')
    const fullPath = parent ? `${parent}/${name}` : name
    if (isFile) await ipc.noteCreate(fullPath, '')
    else await ipc.fsCreateFolder(fullPath)
    await loadDir(parent)
    if (parent) expanded.value.add(parent)
    selectedPath.value = fullPath
    return fullPath
  }

  const createNote = (folder?: string) => createEntry('file', folder)
  const createFolder = (folder?: string) => createEntry('folder', folder)

  async function renameItem(oldPath: string, newName: string): Promise<string> {
    const parent = getParentDir(oldPath)
    const isMd = oldPath.endsWith('.md')
    const finalName = isMd && !newName.endsWith('.md') ? `${newName}.md` : newName
    const newPath = parent ? `${parent}/${finalName}` : finalName
    if (oldPath !== newPath) {
      await ipc.fsRename(oldPath, newPath)
      await loadDir(parent)
      if (selectedPath.value === oldPath) selectedPath.value = newPath
    }
    return newPath
  }

  async function loadConfig() {
    try {
      const cfg = await ipc.vaultConfigLoad()
      itemStyles.value = cfg.itemStyles ?? {}
    } catch {
      itemStyles.value = {}
    }
  }

  async function setItemStyle(path: string, style: ItemStyle | null) {
    await ipc.itemStyleSet(path, style)
    if (!style) {
      delete itemStyles.value[path]
    } else {
      itemStyles.value[path] = style
    }
    treeVersion.value++
  }

  async function deleteItem(path: string) {
    await ipc.fsDelete(path, true)
    const nextMap = new Map(tree.value)
    for (const key of nextMap.keys()) {
      if (key === path || key.startsWith(path + '/')) {
        nextMap.delete(key)
        expanded.value.delete(key)
      }
    }
    tree.value = nextMap
    await loadDir(getParentDir(path))
    if (selectedPath.value === path) selectedPath.value = null
  }

  async function revealPath(path: string) {
    if (!path) return
    const segments = path.split('/')
    let curr = ''
    for (let i = 0; i < segments.length - 1; i++) {
      curr = curr ? `${curr}/${segments[i]}` : segments[i]
      if (!expanded.value.has(curr)) {
        expanded.value.add(curr)
        if (!tree.value.has(curr)) await loadDir(curr)
      }
    }
  }

  async function moveItem(sourcePath: string, targetFolder: string): Promise<string | null> {
    const fileName = sourcePath.split('/').pop()
    if (!fileName) return null
    if (sourcePath === targetFolder || (targetFolder && targetFolder.startsWith(`${sourcePath}/`))) {
      return null
    }
    const currentParent = getParentDir(sourcePath)
    if (currentParent === targetFolder) return null

    const destPath = targetFolder ? `${targetFolder}/${fileName}` : fileName
    await ipc.fsRename(sourcePath, destPath)

    if (itemStyles.value[sourcePath]) {
      const style = itemStyles.value[sourcePath]
      await setItemStyle(destPath, style)
      await setItemStyle(sourcePath, null)
    }

    await loadDir(currentParent)
    await loadDir(targetFolder)
    if (targetFolder) expanded.value.add(targetFolder)
    if (selectedPath.value === sourcePath) selectedPath.value = destPath
    return destPath
  }

  return {
    current,
    recentVaults,
    watching,
    indexing,
    tree,
    treeVersion,
    expanded,
    itemStyles,
    sortOrder,
    autoReveal,
    selectedPath,
    totalNotes,
    totalFolders,
    updateNotesCount,
    loadInitial,
    loadDir,
    refresh,
    toggleExpand,
    collapseAll,
    setSortOrder,
    toggleAutoReveal,
    createNote,
    createFolder,
    renameItem,
    moveItem,
    deleteItem,
    setItemStyle,
    revealPath,
    openVault,
    closeVault,
    removeRecentVault,
    registerSwitchHandlers,
    isSwitchingVault,
    requestCreate,
    triggerCreate,
  }
})
