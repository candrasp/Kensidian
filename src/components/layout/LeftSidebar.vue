<script setup lang="ts">
import { useUiStore } from '@/stores/ui'
import SidebarFooter from './SidebarFooter.vue'
import FileToolbar from './FileToolbar.vue'
import FileTree from '@/components/tree/FileTree.vue'

const uiStore = useUiStore()
</script>

<template>
  <aside
    :style="{ width: uiStore.leftSidebarVisible ? `${uiStore.leftSidebarWidth}px` : '0px' }"
    :class="[
      'flex flex-col bg-panel shrink-0 select-none border-r border-line',
      uiStore.leftSidebarVisible ? 'overflow-visible' : 'overflow-hidden border-none',
      'transition-[width] duration-150 ease-[var(--ease-ui)]',
    ]"
  >
    <div class="flex flex-1 flex-col min-h-0 overflow-hidden min-w-0">
      <FileToolbar />
      <FileTree />
    </div>

    <SidebarFooter />
  </aside>
</template>
