<script setup lang="ts">
import { ArrowRight, Ban } from 'lucide-vue-next'
import { t } from '@/lib/i18n/id'

defineProps<{
  visible: boolean
  x: number
  y: number
  sourceLabel: string
  targetLabel: string
  isValid: boolean
}>()
</script>

<template>
  <div
    v-if="visible"
    class="fixed pointer-events-none z-120 flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs shadow-lg backdrop-blur-md border"
    :class="isValid ? 'bg-panel-alt/95 border-accent text-fg' : 'bg-panel-alt/95 border-danger/60 text-fg-muted'"
    :style="{ left: `${x + 14}px`, top: `${y + 14}px` }"
  >
    <span class="font-medium truncate max-w-36">{{ sourceLabel }}</span>
    <ArrowRight class="h-3 w-3 shrink-0 text-fg-muted" />
    <span v-if="isValid" class="font-semibold text-accent truncate max-w-36">{{ targetLabel }}</span>
    <span v-else class="flex items-center gap-1 text-danger font-medium">
      <Ban class="h-3 w-3 shrink-0" />
      {{ t.cannotMoveHere }}
    </span>
  </div>
</template>
