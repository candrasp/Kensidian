<script setup lang="ts">
import { Folder, Search, Bookmark, PanelLeft } from 'lucide-vue-next'
import { useUiStore, type SidebarTab } from '@/stores/ui'
import { t } from '@/lib/i18n/id'
import IconButton from '@/components/ui/IconButton.vue'

const uiStore = useUiStore()

function selectTab(tab: SidebarTab) {
  uiStore.setSidebarTab(tab)
}
</script>

<template>
  <div
    role="tablist"
    class="flex h-(--header-h) items-center gap-1 px-2 border-b border-line select-none"
  >
    <IconButton
      :icon="Folder"
      :label="t.files"
      :active="uiStore.activeSidebarTab === 'files'"
      @click="selectTab('files')"
    />
    <IconButton
      :icon="Search"
      :label="`${t.search} (Ctrl+Shift+F)`"
      :active="uiStore.activeSidebarTab === 'search'"
      @click="selectTab('search')"
    />
    <IconButton
      :icon="Bookmark"
      :label="t.bookmarks"
      :active="uiStore.activeSidebarTab === 'bookmarks'"
      @click="selectTab('bookmarks')"
    />
    <div class="ml-auto">
      <IconButton
        :icon="PanelLeft"
        :label="t.hideLeftSidebar"
        @click="uiStore.toggleLeftSidebar"
      />
    </div>
  </div>
</template>
