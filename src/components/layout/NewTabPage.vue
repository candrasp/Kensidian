<script setup lang="ts">
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { t } from '@/lib/i18n/id'

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()

async function handleNewNote() {
  const p = await vaultStore.createNote()
  tabsStore.openPath(p, { mode: 'edit' })
}

function handleClose() {
  tabsStore.closeTab(tabsStore.activeId)
}
</script>

<template>
  <div class="flex h-full w-full flex-col items-center justify-center gap-3 select-none text-[15px]">
    <button
      type="button"
      class="text-accent hover:underline cursor-pointer"
      @click="handleNewNote"
    >
      {{ t.newNote }} <span class="text-xs text-fg-faint ml-1 font-mono">(Ctrl+N)</span>
    </button>

    <button
      type="button"
      class="text-accent hover:underline cursor-pointer"
      @click="handleClose"
    >
      {{ t.closeTab }} <span class="text-xs text-fg-faint ml-1 font-mono">(Ctrl+W)</span>
    </button>
  </div>
</template>
