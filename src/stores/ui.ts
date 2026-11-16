import { defineStore } from 'pinia'
import { ref } from 'vue'

export type SidebarTab = 'files' | 'search' | 'bookmarks'
export type RightSidebarTab = 'backlinks' | 'outline'

const DEFAULT_LEFT_WIDTH = 220
const DEFAULT_RIGHT_WIDTH = 280

export const useUiStore = defineStore('ui', () => {
  const leftSidebarVisible = ref(true)
  const leftSidebarWidth = ref(DEFAULT_LEFT_WIDTH)
  const activeSidebarTab = ref<SidebarTab>('files')

  const rightSidebarVisible = ref(false)
  const rightSidebarWidth = ref(DEFAULT_RIGHT_WIDTH)
  const activeRightSidebarTab = ref<RightSidebarTab>('backlinks')

  const focusMode = ref(false)
  const formatToolbarVisible = ref(false)
  const modal = ref<string | null>(null)

  function toggleFormatToolbar() {
    formatToolbarVisible.value = !formatToolbarVisible.value
  }

  function toggleLeftSidebar() {
    leftSidebarVisible.value = !leftSidebarVisible.value
  }

  function setLeftSidebarWidth(w: number) {
    leftSidebarWidth.value = Math.max(160, Math.min(480, w))
  }

  function resetLeftSidebarWidth() {
    leftSidebarWidth.value = DEFAULT_LEFT_WIDTH
  }

  function toggleRightSidebar() {
    rightSidebarVisible.value = !rightSidebarVisible.value
  }

  function setRightSidebarWidth(w: number) {
    rightSidebarWidth.value = Math.max(200, Math.min(480, w))
  }

  function resetRightSidebarWidth() {
    rightSidebarWidth.value = DEFAULT_RIGHT_WIDTH
  }

  function setSidebarTab(tab: SidebarTab) {
    activeSidebarTab.value = tab
    if (!leftSidebarVisible.value) {
      leftSidebarVisible.value = true
    }
  }

  function toggleFocusMode() {
    focusMode.value = !focusMode.value
  }

  return {
    leftSidebarVisible,
    leftSidebarWidth,
    activeSidebarTab,
    rightSidebarVisible,
    rightSidebarWidth,
    activeRightSidebarTab,
    focusMode,
    formatToolbarVisible,
    modal,
    toggleLeftSidebar,
    setLeftSidebarWidth,
    resetLeftSidebarWidth,
    toggleRightSidebar,
    setRightSidebarWidth,
    resetRightSidebarWidth,
    setSidebarTab,
    toggleFocusMode,
    toggleFormatToolbar,
  }
})
