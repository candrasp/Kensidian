<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Pencil,
  MoreVertical,
} from 'lucide-vue-next'
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from 'reka-ui'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { t } from '@/lib/i18n/id'
import { ipc } from '@/lib/ipc'
import IconButton from '@/components/ui/IconButton.vue'

const tabsStore = useTabsStore()
const vaultStore = useVaultStore()

const itemClass = 'rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center text-xs text-fg'

function copyPath() {
  if (tabsStore.activePath) {
    navigator.clipboard.writeText(tabsStore.activePath)
  }
}

function revealInManager() {
  if (tabsStore.activePath) {
    ipc.revealInFileManager(tabsStore.activePath)
  }
}

async function handleDelete() {
  if (tabsStore.activePath) {
    const p = tabsStore.activePath
    await vaultStore.deleteItem(p)
    tabsStore.closeByPath(p)
  }
}
</script>

<template>
  <header
    v-if="tabsStore.activePath"
    class="flex h-(--header-h) items-center justify-between px-3 bg-app select-none shrink-0"
  >
    <div class="flex items-center gap-0.5">
      <IconButton
        :icon="ArrowLeft"
        :label="`${t.back} (Ctrl+Alt+←)`"
        :disabled="!tabsStore.canGoBack"
        @click="tabsStore.back"
      />
      <IconButton
        :icon="ArrowRight"
        :label="`${t.forward} (Ctrl+Alt+→)`"
        :disabled="!tabsStore.canGoForward"
        @click="tabsStore.forward"
      />
    </div>

    <div class="flex items-center gap-0.5">
      <IconButton
        :icon="tabsStore.activeTab?.mode === 'edit' ? BookOpen : Pencil"
        :label="`${tabsStore.activeTab?.mode === 'edit' ? t.toView : t.toEdit} (Ctrl+E)`"
        @click="tabsStore.toggleMode()"
      />

      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <IconButton :icon="MoreVertical" :label="t.more" />
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            side="bottom"
            align="end"
            :side-offset="4"
            class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 shadow-menu"
          >
            <DropdownMenuItem :class="itemClass" @select="copyPath">
              {{ t.copyPath }}
            </DropdownMenuItem>
            <DropdownMenuItem :class="itemClass" @select="revealInManager">
              {{ t.revealInFileManager }}
            </DropdownMenuItem>
            <DropdownMenuSeparator class="my-1 h-px bg-line" />
            <DropdownMenuItem :class="[itemClass, 'text-danger']" @select="handleDelete">
              {{ t.delete }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  </header>
</template>
