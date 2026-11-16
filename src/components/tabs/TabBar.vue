<script setup lang="ts">
import { ref, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { Plus, ChevronDown, PanelRight } from 'lucide-vue-next'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { useUiStore } from '@/stores/ui'
import { useTabsStore } from '@/stores/tabs'
import { t } from '@/lib/i18n/id'
import IconButton from '@/components/ui/IconButton.vue'
import TabItem from './TabItem.vue'

const uiStore = useUiStore()
const tabsStore = useTabsStore()

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
      <DropdownMenuRoot v-if="hiddenTabs.length > 0">
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="h-7 px-2 mx-1 mb-0.5 rounded-sm flex items-center gap-1 text-xs text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none shrink-0"
            :title="t.otherTabsTooltip(hiddenTabs.length)"
          >
            <span class="font-medium text-accent">{{ t.otherTabsCount(hiddenTabs.length) }}</span>
            <ChevronDown class="h-3 w-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
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

    <div class="ml-auto flex items-center gap-1 shrink-0 mb-0.5">
      <IconButton
        :icon="PanelRight"
        :label="uiStore.rightSidebarVisible ? t.hideRightSidebar : t.showRightSidebar"
        :active="uiStore.rightSidebarVisible"
        @click="uiStore.toggleRightSidebar"
      />
    </div>
  </div>
</template>
