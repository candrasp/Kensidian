<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Minus,
  Square,
  Copy,
  X,
  PanelLeft,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  HelpCircle,
} from 'lucide-vue-next'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { APP_NAME, PROJECT_DASHBOARD_PATH } from '@/lib/constants'
import { isTauri } from '@/lib/ipc'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { useUiStore } from '@/stores/ui'
import { t } from '@/lib/i18n/id'
import { modKey, altKey, fmt } from '@/lib/platform'
import IconButton from '@/components/ui/IconButton.vue'

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()
const uiStore = useUiStore()
const isMaximized = ref(false)
let unlistenResize: (() => void) | null = null

const activeNoteTitle = computed(() => {
  if (!tabsStore.activePath) return null
  if (tabsStore.activePath === PROJECT_DASHBOARD_PATH) return 'Dashboard'
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
      <IconButton :icon="PanelLeft" :label="`${uiStore.leftSidebarVisible ? t.hideLeftSidebar : t.showLeftSidebar} (${fmt(modKey, 'B')})`" :active="uiStore.leftSidebarVisible" @click="uiStore.toggleLeftSidebar" />
      <IconButton v-if="tabsStore.activePath && tabsStore.activePath !== PROJECT_DASHBOARD_PATH" :icon="ArrowLeft" :label="`${t.back} (${fmt(altKey, '←')})`" :disabled="!tabsStore.canGoBack" @click="tabsStore.back" />
      <IconButton v-if="tabsStore.activePath && tabsStore.activePath !== PROJECT_DASHBOARD_PATH" :icon="ArrowRight" :label="`${t.forward} (${fmt(altKey, '→')})`" :disabled="!tabsStore.canGoForward" @click="tabsStore.forward" />
      <IconButton v-if="tabsStore.activePath && tabsStore.activePath !== PROJECT_DASHBOARD_PATH" :icon="RotateCw" :label="t.refreshNote" @click="tabsStore.reloadCurrentNote()" />
      <IconButton :icon="HelpCircle" :label="t.helpAndAbout" @click="uiStore.modal = 'help'" />
    </div>

    <div data-tauri-drag-region class="flex-1 truncate text-center text-xs font-medium text-fg px-2 cursor-default flex items-center justify-center gap-1.5">
      <span v-if="activeNoteTitle" class="text-fg font-semibold">{{ activeNoteTitle }}</span>
      <span v-if="activeNoteTitle && vaultStore.current?.name" class="text-fg-muted font-normal">·</span>
      <span class="text-fg-muted font-normal">{{ vaultStore.current?.name ?? APP_NAME }}</span>
    </div>

    <div class="flex items-center h-full">
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
