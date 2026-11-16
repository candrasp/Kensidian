<script setup lang="ts">
import { onMounted, watch } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import { useVaultStore } from '@/stores/vault'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspace } from '@/composables/useWorkspace'

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()
const workspace = useWorkspace()

onMounted(async () => {
  await settingsStore.load()
  await vaultStore.loadInitial()
  if (vaultStore.current) {
    await workspace.loadWorkspace()
  }
  workspace.setupAutoSave()
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
