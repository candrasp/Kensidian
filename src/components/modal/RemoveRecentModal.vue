<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { FolderMinus, AlertCircle, X } from 'lucide-vue-next'
import { t } from '@/lib/i18n/id'
import type { VaultInfo } from '@/lib/ipc/types'

const props = defineProps<{
  open: boolean
  vault: VaultInfo | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

function handleKeydown(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  } else if (e.key === 'Enter') {
    e.preventDefault()
    emit('confirm')
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) window.addEventListener('keydown', handleKeydown)
  else window.removeEventListener('keydown', handleKeydown)
})

onMounted(() => {
  if (props.open) window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    v-if="open && vault"
    class="fixed inset-0 z-120 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none"
    @click.self="emit('close')"
  >
    <div class="flex flex-col w-full max-w-sm rounded-lg border border-line bg-panel-alt shadow-2xl p-4 text-xs text-fg">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2 text-fg font-semibold">
          <FolderMinus class="h-4 w-4 text-accent" />
          <span>{{ t.removeRecentVaultTitle }}</span>
        </div>
        <button
          type="button"
          class="h-5 w-5 rounded flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg cursor-pointer"
          @click="emit('close')"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <p class="mt-3 text-fg">
        {{ t.removeRecentVaultDesc(vault.name) }}
      </p>

      <div class="mt-2 rounded border border-line bg-panel px-2.5 py-1.5 truncate text-[11px] font-mono text-fg-muted">
        {{ vault.path }}
      </div>

      <div class="mt-3 flex items-start gap-2 rounded bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-400">
        <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
        <span>{{ t.removeRecentVaultWarning }}</span>
      </div>

      <div class="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded px-3 py-1.5 border border-line bg-panel hover:bg-hover text-fg cursor-pointer transition-colors"
          @click="emit('close')"
        >
          {{ t.cancel }}
        </button>
        <button
          type="button"
          class="rounded px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 font-medium cursor-pointer transition-colors"
          @click="emit('confirm')"
        >
          {{ t.removeRecentVaultAction }}
        </button>
      </div>
    </div>
  </div>
</template>
