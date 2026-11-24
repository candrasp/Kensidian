import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TabState, NoteMode } from '@/lib/ipc/types'
import { PROJECT_DASHBOARD_PATH } from '@/lib/constants'

function createEmptyTab(): TabState {
  return {
    id: crypto.randomUUID(),
    path: null,
    mode: 'view',
    scrollTop: 0,
    scrollLine: 1,
    cursor: null,
    history: [],
    historyIndex: -1,
    dirty: false,
    mtime: null,
  }
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<TabState[]>([createEmptyTab()])
  const activeId = ref<string>(tabs.value[0].id)
  const activeContent = ref<string>('')

  const activeTab = computed(() =>
    tabs.value.find((tab) => tab.id === activeId.value) ?? null
  )

  const activePath = computed(() => activeTab.value?.path ?? null)

  function openNewTab() {
    const newTab = createEmptyTab()
    tabs.value.push(newTab)
    activeId.value = newTab.id
  }

  function openPath(path: string, options?: { newTab?: boolean; mode?: NoteMode }) {
    if (!options?.newTab) {
      const existing = tabs.value.find((t) => t.path === path)
      if (existing) {
        activeId.value = existing.id
        if (options?.mode) existing.mode = options.mode
        return
      }
    }

    const currentTab = activeTab.value
    if (currentTab && !options?.newTab && !currentTab.pinned) {
      if (currentTab.path === null) {
        currentTab.path = path
        currentTab.history = [path]
        currentTab.historyIndex = 0
        if (options?.mode) currentTab.mode = options.mode
        return
      }
      currentTab.history = currentTab.history.slice(0, currentTab.historyIndex + 1)
      currentTab.history.push(path)
      currentTab.historyIndex++
      currentTab.path = path
      if (options?.mode) currentTab.mode = options.mode
      return
    }

    const newTab = createEmptyTab()
    newTab.path = path
    newTab.history.push(path)
    newTab.historyIndex = 0
    if (options?.mode) newTab.mode = options.mode
    tabs.value.push(newTab)
    activeId.value = newTab.id
  }

  function activate(id: string) {
    if (tabs.value.some((t) => t.id === id)) {
      activeId.value = id
    }
  }

  function ensureProjectDashboardTab() {
    const existingIdx = tabs.value.findIndex(
      (t) => t.path === PROJECT_DASHBOARD_PATH || t.id === 'project-dashboard-tab'
    )
    if (existingIdx !== -1) {
      const existing = tabs.value[existingIdx]
      existing.pinned = true
      existing.path = PROJECT_DASHBOARD_PATH
      // Jika bukan di indeks 0, pindahkan ke depan
      if (existingIdx !== 0) {
        tabs.value.splice(existingIdx, 1)
        tabs.value.unshift(existing)
      }
      return
    }
    const dashboardTab: TabState = {
      id: 'project-dashboard-tab',
      path: PROJECT_DASHBOARD_PATH,
      mode: 'view',
      scrollTop: 0,
      scrollLine: 1,
      cursor: null,
      history: [PROJECT_DASHBOARD_PATH],
      historyIndex: 0,
      dirty: false,
      mtime: null,
      pinned: true,
    }
    // Sisipkan di posisi pertama
    tabs.value.unshift(dashboardTab)
    activeId.value = dashboardTab.id
  }

  function closeTab(id: string) {
    const idx = tabs.value.findIndex((t) => t.id === id)
    if (idx === -1) return
    if (tabs.value[idx].pinned) return // Tab pinned (seperti Dashboard) tidak boleh ditutup

    tabs.value.splice(idx, 1)
    if (tabs.value.length === 0) {
      const fallback = createEmptyTab()
      tabs.value.push(fallback)
      activeId.value = fallback.id
    } else if (activeId.value === id) {
      const nextIdx = Math.min(idx, tabs.value.length - 1)
      activeId.value = tabs.value[nextIdx].id
    }
  }

  function renamePath(oldPath: string, newPath: string) {
    for (const tab of tabs.value) {
      if (tab.path === oldPath) {
        tab.path = newPath
      } else if (tab.path && tab.path.startsWith(`${oldPath}/`)) {
        tab.path = `${newPath}${tab.path.slice(oldPath.length)}`
      }
      tab.history = tab.history.map((h) => {
        if (h === oldPath) return newPath
        if (h.startsWith(`${oldPath}/`)) return `${newPath}${h.slice(oldPath.length)}`
        return h
      })
    }
  }

  function setScrollTop(top: number, id?: string) {
    const tab = id ? tabs.value.find((t) => t.id === id) : activeTab.value
    if (tab) tab.scrollTop = top
  }

  function setScrollLine(line: number, id?: string) {
    const tab = id ? tabs.value.find((t) => t.id === id) : activeTab.value
    if (tab) tab.scrollLine = line
  }

  function closeByPath(path: string) {
    const toClose = tabs.value.filter(
      (t) => t.path === path || (t.path && t.path.startsWith(`${path}/`))
    )
    for (const tab of toClose) {
      closeTab(tab.id)
    }
  }

  const canGoBack = computed(() => (activeTab.value?.historyIndex ?? -1) > 0)
  const canGoForward = computed(() => {
    const t = activeTab.value
    return t ? t.historyIndex < t.history.length - 1 : false
  })

  function back() {
    const tab = activeTab.value
    if (!tab || tab.historyIndex <= 0) return
    tab.historyIndex--
    tab.path = tab.history[tab.historyIndex]
  }

  function forward() {
    const tab = activeTab.value
    if (!tab || tab.historyIndex >= tab.history.length - 1) return
    tab.historyIndex++
    tab.path = tab.history[tab.historyIndex]
  }

  function toggleMode(id?: string) {
    const tab = id ? tabs.value.find((t) => t.id === id) : activeTab.value
    if (tab) {
      tab.mode = tab.mode === 'view' ? 'edit' : 'view'
    }
  }

  const reloadTrigger = ref<number>(0)
  function reloadCurrentNote() {
    reloadTrigger.value++
  }

  function resetTabs() {
    const initial = createEmptyTab()
    tabs.value = [initial]
    activeId.value = initial.id
    activeContent.value = ''
  }

  return {
    tabs,
    activeId,
    activeTab,
    activePath,
    activeContent,
    canGoBack,
    canGoForward,
    openNewTab,
    openPath,
    activate,
    closeTab,
    renamePath,
    closeByPath,
    back,
    forward,
    toggleMode,
    setScrollTop,
    setScrollLine,
    reloadTrigger,
    reloadCurrentNote,
    resetTabs,
    ensureProjectDashboardTab,
  }
})
