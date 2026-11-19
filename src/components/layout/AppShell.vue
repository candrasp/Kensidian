<script setup lang="ts">
import { shallowRef, watch, onMounted, onUnmounted } from 'vue'
import { EditorView } from '@codemirror/view'
import { useVaultStore } from '@/stores/vault'
import { useUiStore } from '@/stores/ui'
import { useTabsStore } from '@/stores/tabs'
import { ipc } from '@/lib/ipc'
import TitleBar from './TitleBar.vue'
import LeftSidebar from './LeftSidebar.vue'
import RightSidebar from './RightSidebar.vue'
import ResizeHandle from './ResizeHandle.vue'
import TabBar from '@/components/tabs/TabBar.vue'
import StatusBar from './StatusBar.vue'
import WelcomeScreen from './WelcomeScreen.vue'
import EditorPane from '@/components/editor/EditorPane.vue'
import FormatToolbar from '@/components/editor/FormatToolbar.vue'
import EditorContextMenu from '@/components/editor/EditorContextMenu.vue'
import NewTabPage from './NewTabPage.vue'
import ModalHost from '@/components/modal/ModalHost.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'

const vaultStore = useVaultStore()
const uiStore = useUiStore()
const tabsStore = useTabsStore()
const toastStore = useToastStore()

const maxLeftSidebar = () => Math.min(480, window.innerWidth - 420)
const maxRightSidebar = () => Math.min(480, window.innerWidth - 420)
const editorView = shallowRef<EditorView | null>(null)

function handleScrollToHeading(heading: { text: string; line: number }) {
  if (editorView.value) {
    const lineObj = editorView.value.state.doc.line(Math.min(heading.line, editorView.value.state.doc.lines))
    editorView.value.dispatch({
      selection: { anchor: lineObj.from },
      effects: EditorView.scrollIntoView(lineObj.from, { y: 'start', yMargin: 20 }),
    })
    editorView.value.focus()
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  if (mod && key === 'b') { e.preventDefault(); uiStore.toggleLeftSidebar() }
  else if (mod && key === 'o') { e.preventDefault(); uiStore.modal = uiStore.modal === 'quick-switcher' ? null : 'quick-switcher' }
  else if (mod && e.key === ',') { e.preventDefault(); uiStore.modal = uiStore.modal === 'settings' ? null : 'settings' }
  else if (mod && key === 'e') { e.preventDefault(); tabsStore.toggleMode() }
  else if (mod && e.shiftKey && key === 'f') { e.preventDefault(); uiStore.modal = uiStore.modal === 'search' ? null : 'search' }
  else if (mod && e.shiftKey && key === 't') { e.preventDefault(); uiStore.toggleFormatToolbar() }
  else if (mod && e.shiftKey && key === 'c') {
    e.preventDefault()
    if (tabsStore.activeContent) {
      navigator.clipboard.writeText(tabsStore.activeContent)
      toastStore.success(t.noteContentCopied)
    }
  }
}

onMounted(() => window.addEventListener('keydown', handleGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleGlobalKeydown))

watch(
  [() => tabsStore.activePath, () => tabsStore.reloadTrigger],
  async ([path]) => {
    if (!path) {
      tabsStore.activeContent = ''
      return
    }
    try {
      const res = await ipc.noteRead(path)
      const tab = tabsStore.activeTab
      if (tab && tab.path === path) {
        tab.mtime = res.mtime
        tab.dirty = false
      }
      tabsStore.activeContent = res.content
    } catch {
      tabsStore.activeContent = ''
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-app text-fg overflow-hidden">
    <TitleBar />

    <WelcomeScreen v-if="vaultStore.current === null" />

    <div v-else class="flex flex-1 min-h-0 relative">
      <LeftSidebar />

      <ResizeHandle
        v-if="uiStore.leftSidebarVisible"
        side="left" :min="160" :max="maxLeftSidebar" :current-width="uiStore.leftSidebarWidth"
        @update="uiStore.setLeftSidebarWidth" @commit="uiStore.setLeftSidebarWidth" @reset="uiStore.resetLeftSidebarWidth"
      />

      <main class="flex flex-1 flex-col min-w-0 min-h-0 relative bg-app">
        <TabBar @new-tab="tabsStore.openNewTab" />
        <FormatToolbar v-if="tabsStore.activePath && tabsStore.activeTab?.mode === 'edit'" :view="editorView" />

        <div class="relative flex-1 min-h-0">
          <EditorContextMenu v-if="tabsStore.activePath" :mode="tabsStore.activeTab?.mode ?? 'view'" :view="editorView">
            <EditorPane
              :content="tabsStore.activeContent"
              :path="tabsStore.activePath"
              :mode="tabsStore.activeTab?.mode ?? 'view'"
              @update:content="tabsStore.activeContent = $event"
              @view="editorView = $event"
            />
          </EditorContextMenu>
          <NewTabPage v-else />
        </div>

        <StatusBar
          :visible="Boolean(tabsStore.activePath)"
          :char-count="tabsStore.activeContent.length"
          :word-count="tabsStore.activeContent.trim() ? tabsStore.activeContent.trim().split(/\s+/).length : 0"
        />
      </main>

      <ResizeHandle
        v-if="uiStore.rightSidebarVisible"
        side="right" :min="200" :max="maxRightSidebar" :current-width="uiStore.rightSidebarWidth"
        @update="uiStore.setRightSidebarWidth" @commit="uiStore.setRightSidebarWidth" @reset="uiStore.resetRightSidebarWidth"
      />

      <RightSidebar
        v-if="uiStore.rightSidebarVisible"
        :content="tabsStore.activeContent"
        @select-heading="handleScrollToHeading"
      />
    </div>

    <ModalHost />
    <ToastHost />
  </div>
</template>
