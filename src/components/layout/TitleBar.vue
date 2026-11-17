<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Minus,
  Square,
  Copy,
  Check,
  X,
  PanelLeft,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Pencil,
  RotateCw,
  HelpCircle,
} from 'lucide-vue-next'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { APP_NAME } from '@/lib/constants'
import { isTauri } from '@/lib/ipc'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { useUiStore } from '@/stores/ui'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'
import IconButton from '@/components/ui/IconButton.vue'

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()
const uiStore = useUiStore()
const toastStore = useToastStore()
const isMaximized = ref(false)
const isCopied = ref(false)
let unlistenResize: (() => void) | null = null

const activeNoteTitle = computed(() => {
  if (!tabsStore.activePath) return null
  const name = tabsStore.activePath.split('/').pop() ?? tabsStore.activePath
  return name.replace(/\.md$/, '')
})

const windowTitle = computed(() => {
  const parts: string[] = []
  if (activeNoteTitle.value) parts.push(activeNoteTitle.value)
  if (vaultStore.current?.name) parts.push(vaultStore.current.name)
  parts.push(APP_NAME)
  return parts.join(' - ')
})

async function handleCopyNote() {
  if (!tabsStore.activeContent) return
  try {
    await navigator.clipboard.writeText(tabsStore.activeContent)
    isCopied.value = true
    toastStore.success(t.noteContentCopied)
    setTimeout(() => { isCopied.value = false }, 1500)
  } catch {
    toastStore.error('Gagal menyalin catatan')
  }
}

async function handleMinimize() {
  if (isTauri) await getCurrentWindow().minimize()
}

async function handleToggleMaximize() {
  if (!isTauri) {
    isMaximized.value = !isMaximized.value
    return
  }
  const win = getCurrentWindow()
  await win.toggleMaximize()
  isMaximized.value = await win.isMaximized()
}

async function handleClose() {
  if (isTauri) await getCurrentWindow().close()
}

onMounted(async () => {
  if (isTauri) {
    const win = getCurrentWindow()
    await win.setTitle(windowTitle.value)
    isMaximized.value = await win.isMaximized()
    unlistenResize = await win.onResized(async () => {
      isMaximized.value = await win.isMaximized()
    })
  }
})

onUnmounted(() => {
  unlistenResize?.()
})
</script>

<template>
  <header
    data-tauri-drag-region
    class="relative z-50 flex h-(--titlebar-h) w-full select-none items-center justify-between border-b border-line bg-panel text-fg-muted px-1"
    @dblclick="handleToggleMaximize"
  >
    <div class="flex items-center gap-0.5">
      <IconButton :icon="PanelLeft" :label="uiStore.leftSidebarVisible ? t.hideLeftSidebar : t.showLeftSidebar" :active="uiStore.leftSidebarVisible" @click="uiStore.toggleLeftSidebar" />
      <IconButton v-if="tabsStore.activePath" :icon="ArrowLeft" :label="`${t.back} (Alt+←)`" :disabled="!tabsStore.canGoBack" @click="tabsStore.back" />
      <IconButton v-if="tabsStore.activePath" :icon="ArrowRight" :label="`${t.forward} (Alt+→)`" :disabled="!tabsStore.canGoForward" @click="tabsStore.forward" />
      <IconButton v-if="tabsStore.activePath" :icon="RotateCw" :label="t.refreshNote" @click="tabsStore.reloadCurrentNote()" />
      <IconButton :icon="HelpCircle" :label="t.helpAndAbout" @click="uiStore.modal = 'help'" />
    </div>

    <div data-tauri-drag-region class="flex-1 truncate text-center text-xs font-medium text-fg px-2 cursor-default flex items-center justify-center gap-1.5">
      <span v-if="activeNoteTitle" class="text-fg font-semibold">{{ activeNoteTitle }}</span>
      <span v-if="activeNoteTitle && vaultStore.current?.name" class="text-fg-muted font-normal">·</span>
      <span class="text-fg-muted font-normal">{{ vaultStore.current?.name ?? APP_NAME }}</span>
    </div>

    <div class="flex items-center h-full">
      <div v-if="tabsStore.activePath" class="flex items-center gap-1.5 mr-2">
        <button
          type="button"
          :title="`${t.copyNoteContent} (Ctrl+Shift+C)`"
          :class="[
            'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-all duration-150 cursor-pointer select-none',
            isCopied
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'bg-panel-alt hover:bg-hover text-fg-muted hover:text-fg border border-line',
          ]"
          @click="handleCopyNote"
        >
          <Check v-if="isCopied" class="h-3 w-3 text-emerald-400" :stroke-width="2" />
          <span>{{ isCopied ? 'Tersalin' : 'Salin' }}</span>
        </button>
        <IconButton
          :icon="tabsStore.activeTab?.mode === 'edit' ? BookOpen : Pencil"
          :label="`${tabsStore.activeTab?.mode === 'edit' ? t.toView : t.toEdit} (Ctrl+E)`"
          @click="tabsStore.toggleMode()"
        />
      </div>

      <button type="button" :aria-label="t.minimize" class="flex h-full w-[46px] items-center justify-center hover:bg-hover hover:text-fg transition-colors duration-100" @click="handleMinimize">
        <Minus class="h-3.5 w-3.5" :stroke-width="1.75" />
      </button>
      <button type="button" :aria-label="isMaximized ? t.restore : t.maximize" class="flex h-full w-[46px] items-center justify-center hover:bg-hover hover:text-fg transition-colors duration-100" @click="handleToggleMaximize">
        <Copy v-if="isMaximized" class="h-3.5 w-3.5" :stroke-width="1.75" />
        <Square v-else class="h-3.5 w-3.5" :stroke-width="1.75" />
      </button>
      <button type="button" :aria-label="t.close" class="flex h-full w-[46px] items-center justify-center hover:bg-danger hover:text-white transition-colors duration-100" @click="handleClose">
        <X class="h-3.5 w-3.5" :stroke-width="1.75" />
      </button>
    </div>
  </header>
</template>
