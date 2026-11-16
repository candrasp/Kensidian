<script setup lang="ts">
import { useToastStore, type ToastKind } from '@/stores/toast'
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-vue-next'

const toastStore = useToastStore()

function getIcon(kind: ToastKind) {
  switch (kind) {
    case 'success': return CheckCircle2
    case 'warning': return AlertTriangle
    case 'error': return AlertCircle
    default: return Info
  }
}

function getKindClass(kind: ToastKind) {
  switch (kind) {
    case 'success': return 'border-success/40 text-success bg-panel'
    case 'warning': return 'border-warning/40 text-warning bg-panel'
    case 'error': return 'border-danger/40 text-danger bg-panel'
    default: return 'border-line text-fg bg-panel'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed right-4 bottom-4 z-120 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
      <div
        v-for="item in toastStore.toasts"
        :key="item.id"
        :class="[
          'pointer-events-auto flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs shadow-modal transition-all animate-in fade-in slide-in-from-bottom-2 duration-150',
          getKindClass(item.kind),
        ]"
      >
        <component :is="getIcon(item.kind)" class="h-4 w-4 shrink-0" :stroke-width="1.75" />
        <span class="flex-1 text-fg leading-snug">{{ item.message }}</span>
        <button
          type="button"
          class="h-4 w-4 rounded-xs text-fg-muted hover:text-fg cursor-pointer transition-colors shrink-0"
          @click="toastStore.dismiss(item.id)"
        >
          <X class="h-3.5 w-3.5" :stroke-width="1.75" />
        </button>
      </div>
    </div>
  </Teleport>
</template>
