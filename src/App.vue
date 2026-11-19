<script setup lang="ts">
import { onMounted } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkspace } from '@/composables/useWorkspace'
import { useUpdater } from '@/composables/useUpdater'

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const workspace = useWorkspace()
const updater = useUpdater()

vaultStore.registerSwitchHandlers({
  before: async () => {
    workspace.cancelPendingSave()
    await workspace.saveWorkspace()
    tabsStore.resetTabs()
  },
  after: async () => {
    await workspace.loadWorkspace()
  },
})

onMounted(async () => {
  await settingsStore.load()
  await vaultStore.loadInitial()
  if (vaultStore.current) {
    await workspace.loadWorkspace()
  }
  workspace.setupAutoSave()

  try {
    const update = await updater.checkForUpdate()
    if (update) {
      uiStore.modal = 'update'
    }
  } catch {
    // Abaikan kegagalan auto-check saat startup tanpa mengganggu user
  }
})
</script>

<template>
  <AppShell />
</template>
