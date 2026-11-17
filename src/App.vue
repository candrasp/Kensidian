<script setup lang="ts">
import { onMounted, watch } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import { useVaultStore } from '@/stores/vault'
import { useSettingsStore } from '@/stores/settings'
import { useUiStore } from '@/stores/ui'
import { useWorkspace } from '@/composables/useWorkspace'
import { useUpdater } from '@/composables/useUpdater'

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const workspace = useWorkspace()
const updater = useUpdater()

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

watch(
  () => vaultStore.current?.path,
  async (newPath, oldPath) => {
    if (newPath && newPath !== oldPath) {
      await workspace.loadWorkspace()
    }
  }
)
</script>

<template>
  <AppShell />
</template>
