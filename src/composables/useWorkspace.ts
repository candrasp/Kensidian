import { watch } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { ipc } from '@/lib/ipc'
import type { Workspace } from '@/lib/ipc/types'

export function useWorkspace() {
  const uiStore = useUiStore()
  const tabsStore = useTabsStore()
  const vaultStore = useVaultStore()
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  async function loadWorkspace() {
    if (!vaultStore.current) return
    try {
      const ws = await ipc.workspaceLoad()
      if (!ws) return

      uiStore.leftSidebarVisible = ws.leftSidebar.visible
      uiStore.leftSidebarWidth = ws.leftSidebar.width
      uiStore.activeSidebarTab = ws.leftSidebar.activeTab
      uiStore.rightSidebarVisible = ws.rightSidebar.visible
      uiStore.rightSidebarWidth = ws.rightSidebar.width
      uiStore.activeRightSidebarTab = ws.rightSidebar.activeTab

      if (ws.tabs && ws.tabs.length > 0) {
        tabsStore.tabs = ws.tabs.map((t) => ({ ...t, dirty: false, mtime: null }))
        tabsStore.activeId = ws.activeTabId ?? ws.tabs[0].id
      }

      vaultStore.sortOrder = ws.sortOrder ?? 'name-asc'
      vaultStore.autoReveal = ws.autoReveal ?? true
      vaultStore.expanded = new Set(ws.expandedFolders ?? [])

      for (const folder of vaultStore.expanded) {
        await vaultStore.loadDir(folder)
      }
    } catch {
      // Abaikan jika workspace belum ada atau korup
    }
  }

  async function saveWorkspace() {
    if (!vaultStore.current) return
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

  function saveWorkspaceDebounced() {
    if (saveTimer) clearTimeout(saveTimer)
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
      saveWorkspace()
    })
  }

  return {
    loadWorkspace,
    saveWorkspace,
    saveWorkspaceDebounced,
    setupAutoSave,
  }
}
