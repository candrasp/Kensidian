<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { Trash2, AlertTriangle, X } from 'lucide-vue-next'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  open: boolean
  paths: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const previewNames = computed(() => {
  return props.paths.slice(0, 4).map((p) => p.split('/').pop() ?? p)
})

const remainingCount = computed(() => {
  return Math.max(0, props.paths.length - 4)
})

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
    v-if="open"
    class="fixed inset-0 z-120 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    @click.self="emit('close')"
  >
    <div class="flex flex-col w-full max-w-sm rounded-lg border border-line bg-panel-alt shadow-2xl p-4 text-xs text-fg">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2 text-danger font-semibold">
          <Trash2 class="h-4 w-4" />
          <span>{{ t.deleteConfirmTitle }}</span>
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
        {{ paths.length === 1 ? t.deleteSingleDesc(previewNames[0] ?? '') : t.deleteConfirmDesc(paths.length) }}
      </p>

      <div class="mt-2.5 max-h-28 overflow-y-auto rounded border border-line bg-panel px-2.5 py-1.5 space-y-1">
        <div v-for="name in previewNames" :key="name" class="truncate text-fg-muted font-mono text-[11px]">
          • {{ name }}
        </div>
        <div v-if="remainingCount > 0" class="text-fg-faint text-[10px] italic">
          + {{ remainingCount }} item lainnya…
        </div>
      </div>

      <div class="mt-3 flex items-center gap-1.5 text-[11px] text-fg-faint">
        <AlertTriangle class="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span>{{ t.deleteWarning }}</span>
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
          {{ t.delete }}
        </button>
      </div>
    </div>
  </div>
</template>
