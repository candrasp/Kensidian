<script setup lang="ts">
import { FolderOpen, FolderPlus } from 'lucide-vue-next'
import { APP_NAME } from '@/lib/constants'
import { useVaultStore } from '@/stores/vault'
import { t } from '@/lib/i18n/id'
import { isTauri } from '@/lib/ipc'

const vaultStore = useVaultStore()

async function handleOpenVault() {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      directory: true,
      multiple: false,
      title: t.openVaultFolder,
    })
    if (selected && typeof selected === 'string') {
      await vaultStore.openVault(selected)
    }
  } else {
    await vaultStore.openVault('/mock/vault')
  }
}

async function handleCreateVault() {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const selected = await open({
      directory: true,
      multiple: false,
      title: t.createVault,
    })
    if (selected && typeof selected === 'string') {
      await vaultStore.openVault(selected)
    }
  } else {
    await vaultStore.openVault('/mock/new-vault')
  }
}
</script>

<template>
  <div class="flex flex-1 items-center justify-center p-4 bg-app text-fg select-none">
    <div class="w-[440px] rounded-lg border border-line bg-panel p-8 shadow-modal text-center">
      <h1 class="text-2xl font-semibold text-fg tracking-tight">{{ APP_NAME }}</h1>
      <p class="mt-2 text-sm text-fg-muted">{{ t.welcomeSubtitle }}</p>

      <div class="mt-6 flex flex-col gap-3">
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-sm bg-accent py-2 text-sm font-medium text-accent-fg hover:bg-accent-hover transition-colors duration-100 cursor-pointer"
          @click="handleOpenVault"
        >
          <FolderOpen class="h-4 w-4" :stroke-width="1.75" />
          {{ t.openVaultFolder }}
        </button>

        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-sm border border-line bg-transparent py-2 text-sm font-medium text-fg hover:bg-hover transition-colors duration-100 cursor-pointer"
          @click="handleCreateVault"
        >
          <FolderPlus class="h-4 w-4" :stroke-width="1.75" />
          {{ t.createVault }}
        </button>
      </div>

      <div v-if="vaultStore.recentVaults.length > 0" class="mt-6 text-left">
        <h2 class="text-xs font-medium text-fg-muted uppercase tracking-wider mb-2">
          {{ t.welcomeRecentTitle }}
        </h2>
        <div class="flex flex-col gap-1">
          <button
            v-for="v in vaultStore.recentVaults"
            :key="v.path"
            type="button"
            class="truncate rounded-sm px-2 py-1.5 text-xs text-left text-fg hover:bg-hover transition-colors duration-100 cursor-pointer"
            @click="vaultStore.openVault(v.path)"
          >
            {{ v.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
