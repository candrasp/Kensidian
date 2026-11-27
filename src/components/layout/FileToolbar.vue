<script setup lang="ts">
import {
  SquarePen,
  FolderPlus,
  ArrowUpDown,
  ChevronsDownUp,
  Check,
  Cloud,
} from 'lucide-vue-next'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { useVaultStore } from '@/stores/vault'
import { t } from '@/lib/i18n'
import type { SortOrder } from '@/lib/ipc/types'
import IconButton from '@/components/ui/IconButton.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

const vaultStore = useVaultStore()

const sortOptions: { label: string; value: SortOrder }[] = [
  { label: t.sortNameAsc, value: 'name-asc' },
  { label: t.sortNameDesc, value: 'name-desc' },
  { label: t.sortMtimeDesc, value: 'mtime-desc' },
  { label: t.sortMtimeAsc, value: 'mtime-asc' },
]

async function handleNewNote() {
  vaultStore.triggerCreate('file')
}

async function handleNewFolder() {
  vaultStore.triggerCreate('folder')
}
</script>

<template>
  <div class="flex h-9 items-center justify-between px-2.5 border-b border-line bg-panel shrink-0 select-none">
    <Tooltip :content="t.syncR2" side="bottom" align="start">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-xs text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none min-w-0"
      >
        <Cloud class="h-3.5 w-3.5 shrink-0" :stroke-width="1.75" />
        <span class="truncate">{{ t.syncStatusLocal }}</span>
      </button>
    </Tooltip>

    <div class="flex items-center gap-0.5">
      <IconButton :icon="SquarePen" :label="t.newNote" @click="handleNewNote" />
      <IconButton :icon="FolderPlus" :label="t.newFolder" @click="handleNewFolder" />

      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <IconButton :icon="ArrowUpDown" :label="t.sort" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            align="end"
            :side-offset="4"
            class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 shadow-menu"
          >
            <DropdownMenuItem
              v-for="opt in sortOptions"
              :key="opt.value"
              class="flex items-center justify-between rounded-sm px-2 py-1.5 text-xs text-fg hover:bg-hover cursor-pointer outline-none select-none"
              @select="vaultStore.setSortOrder(opt.value)"
            >
              <span>{{ opt.label }}</span>
              <Check
                v-if="vaultStore.sortOrder === opt.value"
                class="h-3.5 w-3.5 text-accent"
                :stroke-width="1.75"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <IconButton
        :icon="ChevronsDownUp"
        :label="t.collapseAll"
        @click="vaultStore.collapseAll"
      />
    </div>
  </div>
</template>
