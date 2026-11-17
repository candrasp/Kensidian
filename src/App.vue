<script setup lang="ts">
import { onMounted, watch } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import { useVaultStore } from '@/stores/vault'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspace } from '@/composables/useWorkspace'
import { useUpdater } from '@/composables/useUpdater'

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()
const workspace = useWorkspace()
const updater = useUpdater()

onMounted(async () => {
  await settingsStore.load()
  await vaultStore.loadInitial()
  if (vaultStore.current) {
    await workspace.loadWorkspace()
  }
  workspace.setupAutoSave()

  updater.checkForUpdate()
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
