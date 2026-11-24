import { watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { ipc } from '@/lib/ipc'
import type { Workspace, TabState } from '@/lib/ipc/types'
import { PROJECT_DASHBOARD_PATH } from '@/lib/constants'

function sanitizeTabs(rawTabs: Workspace['tabs'], activeTabId: string | null, validNotes: Set<string> | null) {
  const seenIds = new Set<string>()
  const filtered: TabState[] = []

  for (const t of rawTabs) {
    if (!t.path || t.path === PROJECT_DASHBOARD_PATH || (validNotes ? validNotes.has(t.path) : true)) {
      const id = seenIds.has(t.id) ? crypto.randomUUID() : t.id
      seenIds.add(id)
      filtered.push({
        ...t,
        id,
        dirty: false,
        mtime: null,
        pinned: t.path === PROJECT_DASHBOARD_PATH ? true : t.pinned,
      })
    }
  }

  if (filtered.length === 0) return null
  const activeId = filtered.some((t) => t.id === activeTabId) ? activeTabId! : filtered[0].id
  return { tabs: filtered, activeId }
}

function applyUiState(ws: Workspace, ui: ReturnType<typeof useUiStore>) {
  ui.leftSidebarVisible = ws.leftSidebar.visible
  ui.leftSidebarWidth = ws.leftSidebar.width
  ui.activeSidebarTab = ws.leftSidebar.activeTab
  ui.rightSidebarVisible = ws.rightSidebar.visible
  ui.rightSidebarWidth = ws.rightSidebar.width
  ui.activeRightSidebarTab = ws.rightSidebar.activeTab
}

async function restoreTabsState(
  rawTabs: Workspace['tabs'],
  activeTabId: string | null,
  tabs: ReturnType<typeof useTabsStore>
) {
  if (!rawTabs || rawTabs.length === 0) return
  let validNotes: Set<string> | null = null
  try {
    const notes = await ipc.vaultListNotes()
    validNotes = new Set(notes.map((n) => n.path))
  } catch {
    // Abaikan kegagalan list notes
  }
  const sanitized = sanitizeTabs(rawTabs, activeTabId, validNotes)
  if (sanitized) {
    tabs.tabs = sanitized.tabs
    tabs.activeId = sanitized.activeId
  } else {
    tabs.resetTabs()
  }
}

export function useWorkspace() {
  const uiStore = useUiStore()
  const tabsStore = useTabsStore()
  const vaultStore = useVaultStore()
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let isLoading = false

  async function loadWorkspace() {
    if (!vaultStore.current) return
    cancelPendingSave()
    isLoading = true
    tabsStore.resetTabs()
    try {
      const ws = await ipc.workspaceLoad()
      if (!ws) return
      applyUiState(ws, uiStore)
      await restoreTabsState(ws.tabs, ws.activeTabId, tabsStore)
      vaultStore.sortOrder = ws.sortOrder ?? 'name-asc'
      vaultStore.autoReveal = ws.autoReveal ?? true
      vaultStore.expanded = new Set(ws.expandedFolders ?? [])
      for (const folder of vaultStore.expanded) await vaultStore.loadDir(folder)
    } catch {
      // Abaikan jika workspace belum ada atau korup
    } finally {
      setTimeout(() => {
        isLoading = false
      }, 100)
    }
  }

  async function saveWorkspace() {
    if (!vaultStore.current || isLoading || vaultStore.isSwitchingVault) return
    const ws: Workspace = {
      version: 1,
      leftSidebar: {
        visible: uiStore.leftSidebarVisible,
        width: uiStore.leftSidebarWidth,
        activeTab: uiStore.activeSidebarTab,
      },
      rightSidebar: {
        visible: uiStore.rightSidebarVisible,
        width: uiStore.rightSidebarWidth,
        activeTab: uiStore.activeRightSidebarTab,
      },
      tabs: tabsStore.tabs.map(({ id, path, mode, scrollTop, scrollLine, cursor, history, historyIndex }) => ({
        id,
        path,
        mode,
        scrollTop,
        scrollLine,
        cursor,
        history,
        historyIndex,
      })),
      activeTabId: tabsStore.activeId,
      expandedFolders: Array.from(vaultStore.expanded),
      sortOrder: vaultStore.sortOrder,
      autoReveal: vaultStore.autoReveal,
      recent: [],
      bookmarks: [],
    }

    try {
      await ipc.workspaceSave(ws)
    } catch {
      // Abaikan error penyimpanan
    }
  }

  function cancelPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  function saveWorkspaceDebounced() {
    if (vaultStore.isSwitchingVault) return
    cancelPendingSave()
    saveTimer = setTimeout(() => {
      saveWorkspace()
    }, 500)
  }

  function setupAutoSave() {
    watch(
      [
        () => tabsStore.tabs.map((t) => t.path),
        () => tabsStore.activeId,
        () => uiStore.leftSidebarVisible,
        () => uiStore.leftSidebarWidth,
        () => uiStore.activeSidebarTab,
        () => uiStore.rightSidebarVisible,
        () => uiStore.rightSidebarWidth,
        () => uiStore.activeRightSidebarTab,
        () => vaultStore.expanded.size,
        () => vaultStore.sortOrder,
        () => vaultStore.autoReveal,
      ],
      () => {
        saveWorkspaceDebounced()
      }
    )

    window.addEventListener('beforeunload', () => {
      if (!vaultStore.isSwitchingVault) saveWorkspace()
    })
  }

  return {
    loadWorkspace,
    saveWorkspace,
    saveWorkspaceDebounced,
    cancelPendingSave,
    setupAutoSave,
  }
}
