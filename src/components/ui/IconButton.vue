<script setup lang="ts">
import type { Component } from 'vue'
import Tooltip from './Tooltip.vue'

withDefaults(
  defineProps<{
    icon: Component
    label: string
    active?: boolean
    disabled?: boolean
    size?: 's' | 'm'
  }>(),
  {
    active: false,
    disabled: false,
    size: 's',
  }
)

defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()
</script>

<template>
  <Tooltip :content="label">
    <button
      type="button"
      :aria-label="label"
      :disabled="disabled"
      :class="[
        'flex items-center justify-center rounded-sm transition-colors duration-100',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
        size === 'm' ? 'h-8 w-8' : 'h-7 w-7',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        active
          ? 'bg-selected text-fg'
          : disabled
            ? 'text-fg-muted'
            : 'text-fg-muted hover:bg-hover hover:text-fg',
      ]"
      @click="$emit('click', $event)"
    >
      <component :is="icon" class="h-4 w-4" :stroke-width="1.75" />
    </button>
  </Tooltip>
</template>
