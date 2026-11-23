<script setup lang="ts">
import { ref } from 'vue'
import { Folder, ChevronsUpDown, CloudUpload, Settings, FolderOpen, FolderPlus, Check, X } from 'lucide-vue-next'
import {
  DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal,
  DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from 'reka-ui'
import { useVaultStore } from '@/stores/vault'
import { useUiStore } from '@/stores/ui'
import { t } from '@/lib/i18n/id'
import { isTauri } from '@/lib/ipc'
import type { VaultInfo } from '@/lib/ipc/types'
import IconButton from '@/components/ui/IconButton.vue'
import Tooltip from '@/components/ui/Tooltip.vue'
import RemoveRecentModal from '@/components/modal/RemoveRecentModal.vue'

const vaultStore = useVaultStore()
const uiStore = useUiStore()
const menuOpen = ref(false)
const vaultToRemove = ref<VaultInfo | null>(null)

const itemClass = 'rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center gap-2 text-xs text-fg'

async function handleOpenVault() {
  if (!isTauri) return
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true, multiple: false, title: t.openVaultFolder })
  if (selected && typeof selected === 'string') await vaultStore.openVault(selected)
}

async function handleCreateVault() {
  if (!isTauri) return
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true, multiple: false, title: t.createVault })
  if (selected && typeof selected === 'string') await vaultStore.openVault(selected)
}

function handleOpenRecent(path: string) {
  menuOpen.value = false
  vaultStore.openVault(path)
}

function handlePromptRemove(v: VaultInfo) {
  menuOpen.value = false
  vaultToRemove.value = v
}

async function handleConfirmRemove() {
  if (vaultToRemove.value) {
    await vaultStore.removeRecentVault(vaultToRemove.value.path)
    vaultToRemove.value = null
  }
}
</script>

<template>
  <div class="flex flex-col select-none">
    <Tooltip v-if="vaultStore.current" :content="t.currentVault(vaultStore.current.name)" side="bottom" align="start">
      <div class="px-3 py-0.5 text-[11px] text-fg-muted truncate cursor-default">
        {{ t.itemCounts(vaultStore.totalNotes, vaultStore.totalFolders) }}
      </div>
    </Tooltip>

    <footer class="flex h-(--footer-h) items-center justify-between border-t border-line px-2">
      <DropdownMenuRoot v-model:open="menuOpen">
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-fg-muted hover:bg-hover hover:text-fg transition-colors duration-100 cursor-pointer"
          >
            <Folder class="h-4 w-4 shrink-0" :stroke-width="1.75" />
            <ChevronsUpDown class="h-3 w-3 shrink-0 opacity-60" :stroke-width="1.75" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuPortal>
          <DropdownMenuContent side="top" align="start" :side-offset="6" class="z-110 min-w-52 rounded-sm border border-line bg-panel-alt p-1 shadow-menu">
            <template v-if="vaultStore.recentVaults.length > 0">
              <div class="px-2 py-1 text-[11px] font-medium text-fg-faint uppercase tracking-wider">{{ t.welcomeRecentTitle }}</div>
              <div
                v-for="v in vaultStore.recentVaults"
                :key="v.path"
                class="rounded-sm px-2 py-1.5 hover:bg-hover select-none flex items-center justify-between text-xs text-fg group"
              >
                <button type="button" class="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer outline-none" @click="handleOpenRecent(v.path)">
                  <Folder class="h-3.5 w-3.5 text-fg-muted shrink-0" :stroke-width="1.75" />
                  <span class="truncate">{{ v.name }}</span>
                  <Check v-if="v.path === vaultStore.current?.path" class="h-3.5 w-3.5 text-accent shrink-0 ml-auto" :stroke-width="1.75" />
                </button>
                <button
                  type="button"
                  :title="t.removeFromRecent"
                  class="opacity-0 group-hover:opacity-100 p-0.5 ml-1 rounded-xs text-fg-muted hover:text-danger hover:bg-hover transition-opacity cursor-pointer shrink-0"
                  @click="handlePromptRemove(v)"
                >
                  <X class="h-3 w-3" :stroke-width="1.75" />
                </button>
              </div>
              <DropdownMenuSeparator class="my-1 h-px bg-line" />
            </template>

            <DropdownMenuItem :class="itemClass" @select="handleOpenVault">
              <FolderOpen class="h-3.5 w-3.5 text-fg-muted shrink-0" :stroke-width="1.75" />
              <span>{{ t.openVaultFolder }}</span>
            </DropdownMenuItem>

            <DropdownMenuItem :class="itemClass" @select="handleCreateVault">
              <FolderPlus class="h-3.5 w-3.5 text-fg-muted shrink-0" :stroke-width="1.75" />
              <span>{{ t.createVault }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <div class="ml-auto flex items-center gap-0.5">
        <IconButton :icon="CloudUpload" :label="t.syncR2" :disabled="!vaultStore.current" />
        <IconButton :icon="Settings" :label="`${t.settings} (Ctrl+,)`" @click="uiStore.modal = 'settings'" />
      </div>
    </footer>

    <RemoveRecentModal
      :open="!!vaultToRemove"
      :vault="vaultToRemove"
      @close="vaultToRemove = null"
      @confirm="handleConfirmRemove"
    />
  </div>
</template>
