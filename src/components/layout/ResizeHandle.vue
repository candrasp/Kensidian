<script setup lang="ts">
import { useResizable } from '@/composables/useResizable'

const props = defineProps<{
  side: 'left' | 'right'
  min: number
  max: () => number
  currentWidth: number
}>()

const emit = defineEmits<{
  (e: 'update', width: number): void
  (e: 'commit', width: number): void
  (e: 'reset'): void
}>()

const { isDragging, onPointerDown, onPointerMove, onPointerUp, onDoubleClick } =
  useResizable({
    side: props.side,
    min: props.min,
    max: props.max,
    initial: () => props.currentWidth,
    onUpdate: (w) => emit('update', w),
    onCommit: (w) => emit('commit', w),
    onReset: () => emit('reset'),
  })
</script>

<template>
  <div
    class="relative z-40 w-[5px] -mx-[2px] cursor-col-resize select-none touch-none flex items-center justify-center group"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @dblclick="onDoubleClick"
  >
    <div
      :class="[
        'w-[1px] h-full transition-colors duration-100',
        isDragging ? 'bg-accent' : 'bg-line group-hover:bg-accent',
      ]"
    />
  </div>
</template>
