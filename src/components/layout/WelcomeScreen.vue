<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpen, FolderPlus, FolderGit2, X } from 'lucide-vue-next'
import { APP_NAME } from '@/lib/constants'
import { useVaultStore } from '@/stores/vault'
import { t } from '@/lib/i18n/id'
import { isTauri } from '@/lib/ipc'
import type { VaultInfo } from '@/lib/ipc/types'
import RemoveRecentModal from '@/components/modal/RemoveRecentModal.vue'

const vaultStore = useVaultStore()
const vaultToRemove = ref<VaultInfo | null>(null)

async function handleConfirmRemove() {
  if (vaultToRemove.value) {
    await vaultStore.removeRecentVault(vaultToRemove.value.path)
    vaultToRemove.value = null
  }
}

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
          class="flex items-center justify-center gap-2 rounded-sm border border-line bg-panel-alt py-2 text-sm font-medium text-fg hover:bg-hover transition-colors duration-100 cursor-pointer"
          @click="handleOpenVault"
        >
          <FolderGit2 class="h-4 w-4 text-accent" :stroke-width="1.75" />
          {{ t.openProjectFolder }}
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
          <div
            v-for="v in vaultStore.recentVaults"
            :key="v.path"
            class="group flex items-center justify-between rounded-sm px-2 py-1.5 text-xs text-left text-fg hover:bg-hover transition-colors duration-100"
          >
            <button
              type="button"
              class="truncate flex-1 text-left cursor-pointer outline-none flex items-center gap-2"
              @click="vaultStore.openVault(v.path)"
            >
              <FolderGit2 v-if="v.isProject" class="h-3.5 w-3.5 text-accent shrink-0" :stroke-width="1.75" />
              <span>{{ v.name }}</span>
              <span v-if="v.isProject" class="text-[9px] px-1 py-0.2 rounded-xs bg-accent-soft text-accent font-medium">Proyek</span>
            </button>
            <button
              type="button"
              :title="t.removeFromRecent"
              class="opacity-0 group-hover:opacity-100 p-0.5 ml-1 rounded-xs text-fg-muted hover:text-danger hover:bg-hover transition-opacity cursor-pointer shrink-0"
              @click="vaultToRemove = v"
            >
              <X class="h-3.5 w-3.5" :stroke-width="1.75" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <RemoveRecentModal
      :open="!!vaultToRemove"
      :vault="vaultToRemove"
      @close="vaultToRemove = null"
      @confirm="handleConfirmRemove"
    />
  </div>
</template>
