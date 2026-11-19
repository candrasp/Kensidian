<script setup lang="ts">
import { ref, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { Plus, ChevronDown, PanelRight, BookOpen, Pencil, Check, MoreVertical } from 'lucide-vue-next'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'reka-ui'
import { useUiStore } from '@/stores/ui'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useToastStore } from '@/stores/toast'
import { ipc } from '@/lib/ipc'
import { t } from '@/lib/i18n/id'
import IconButton from '@/components/ui/IconButton.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import TabItem from './TabItem.vue'
import DeleteConfirmModal from '@/components/modal/DeleteConfirmModal.vue'

const uiStore = useUiStore()
const tabsStore = useTabsStore()
const vaultStore = useVaultStore()
const toastStore = useToastStore()

const isCopied = ref(false)
const deleteModalOpen = ref(false)
const isMoreMenuOpen = ref(false)
const isOtherTabsOpen = ref(false)

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

function copyPath() {
  if (tabsStore.activePath) {
    navigator.clipboard.writeText(tabsStore.activePath)
  }
}

function revealInManager() {
  if (tabsStore.activePath) {
    ipc.revealInFileManager(tabsStore.activePath)
  }
}

async function handleDelete() {
  if (tabsStore.activePath) {
    deleteModalOpen.value = true
  }
}

async function handleConfirmDelete() {
  deleteModalOpen.value = false
  if (tabsStore.activePath) {
    const p = tabsStore.activePath
    await vaultStore.deleteItem(p)
    tabsStore.closeByPath(p)
  }
}

defineEmits<{
  (e: 'new-tab'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const { width: containerWidth } = useElementSize(containerRef)

const maxVisibleTabs = computed(() => {
  if (!containerWidth.value) return 5
  const available = containerWidth.value - 120
  return Math.max(2, Math.min(8, Math.floor(available / 130)))
})

const visibleTabs = computed(() => {
  const tabs = tabsStore.tabs
  const max = maxVisibleTabs.value
  if (tabs.length <= max) return tabs

  const activeIdx = tabs.findIndex((tab) => tab.id === tabsStore.activeId)
  if (activeIdx < max) {
    return tabs.slice(0, max)
  }
  const activeTab = tabs[activeIdx]
  return [...tabs.slice(0, max - 1), activeTab]
})

const hiddenTabs = computed(() => {
  const visibleIds = new Set(visibleTabs.value.map((tab) => tab.id))
  return tabsStore.tabs.filter((tab) => !visibleIds.has(tab.id))
})

function getTabTitle(path: string | null): string {
  if (!path) return t.newTab
  const name = path.split('/').pop() ?? path
  return name.replace(/\.md$/, '')
}

const itemClass = 'rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center text-xs text-fg'
</script>

<template>
  <div v-if="tabsStore.tabs.length >= 1" role="tablist" class="flex h-9 items-end border-b border-line bg-panel px-2 select-none">
    <!-- Area daftar tab horizontal -->
    <div ref="containerRef" class="flex flex-1 items-end overflow-hidden min-w-0 pr-1">
      <TabItem
        v-for="tab in visibleTabs"
        :key="tab.id"
        :tab="tab"
        :active="tab.id === tabsStore.activeId"
        @activate="tabsStore.activate(tab.id)"
        @close="tabsStore.closeTab(tab.id)"
      />

      <!-- Pill +N lainnya -->
      <DropdownMenuRoot v-if="hiddenTabs.length > 0" v-model:open="isOtherTabsOpen">
        <Tooltip :content="t.otherTabsTooltip(hiddenTabs.length)" side="bottom" :disabled="isOtherTabsOpen">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="h-7 px-2 mx-1 mb-0.5 rounded-sm flex items-center gap-1 text-xs text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none shrink-0"
            >
              <span class="font-medium text-accent">{{ t.otherTabsCount(hiddenTabs.length) }}</span>
              <ChevronDown class="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
        </Tooltip>
        <DropdownMenuPortal>
          <DropdownMenuContent side="bottom" align="start" :side-offset="4" class="z-110 min-w-48 max-h-64 overflow-y-auto rounded-sm border border-line bg-panel-alt p-1 shadow-menu">
            <DropdownMenuItem
              v-for="tab in hiddenTabs"
              :key="tab.id"
              class="flex items-center justify-between rounded-sm px-2 py-1.5 text-xs text-fg hover:bg-hover cursor-pointer outline-none select-none"
              @select="tabsStore.activate(tab.id)"
            >
              <span class="truncate flex-1">{{ getTabTitle(tab.path) }}</span>
              <span v-if="tab.dirty" class="h-1.5 w-1.5 rounded-full bg-fg-muted shrink-0 ml-2" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <div class="mb-0.5 ml-0.5">
        <IconButton :icon="Plus" :label="`${t.newTab} (Ctrl+T)`" @click="$emit('new-tab')" />
      </div>
    </div>

    <div class="ml-auto flex items-center gap-0.5 shrink-0 mb-0.5">
      <!-- Tombol dokumen aktif: Salin, Edit/View, More, PanelRight -->
      <template v-if="tabsStore.activePath">
        <Tooltip :content="`${t.copyNoteContent} (Ctrl+Shift+C)`" side="bottom">
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-all duration-150 cursor-pointer select-none mb-0.5 mr-1.5',
              isCopied
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'bg-panel-alt hover:bg-hover text-fg-muted hover:text-fg border border-line',
            ]"
            @click="handleCopyNote"
          >
            <Check v-if="isCopied" class="h-3 w-3 text-emerald-400" :stroke-width="2" />
            <span>{{ isCopied ? 'Tersalin' : 'Salin' }}</span>
          </button>
        </Tooltip>

        <IconButton
          :icon="tabsStore.activeTab?.mode === 'edit' ? BookOpen : Pencil"
          :label="`${tabsStore.activeTab?.mode === 'edit' ? t.toView : t.toEdit} (Ctrl+E)`"
          @click="tabsStore.toggleMode()"
        />

        <DropdownMenuRoot v-model:open="isMoreMenuOpen">
          <DropdownMenuTrigger as-child>
            <IconButton
              :icon="MoreVertical"
              :label="t.more"
              :disable-tooltip="isMoreMenuOpen || deleteModalOpen"
            />
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              side="bottom"
              align="end"
              :side-offset="4"
              class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 shadow-menu"
            >
              <DropdownMenuItem :class="itemClass" @select="copyPath">
                {{ t.copyPath }}
              </DropdownMenuItem>
              <DropdownMenuItem :class="itemClass" @select="revealInManager">
                {{ t.revealInFileManager }}
              </DropdownMenuItem>
              <DropdownMenuSeparator class="my-1 h-px bg-line" />
              <DropdownMenuItem :class="[itemClass, 'text-danger']" @select="handleDelete">
                {{ t.delete }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>

        <div class="w-px h-4 bg-line mx-0.5 self-center" />
      </template>

      <IconButton
        v-if="!uiStore.rightSidebarVisible"
        :icon="PanelRight"
        :label="t.showRightSidebar"
        @click="uiStore.toggleRightSidebar"
      />
    </div>
  </div>

  <DeleteConfirmModal
    :open="deleteModalOpen"
    :paths="tabsStore.activePath ? [tabsStore.activePath] : []"
    @close="deleteModalOpen = false"
    @confirm="handleConfirmDelete"
  />
</template>
