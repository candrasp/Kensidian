<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import type { TabState } from '@/lib/ipc/types'
import { t } from '@/lib/i18n/id'
import Tooltip from '@/components/ui/Tooltip.vue'

const props = defineProps<{
  tab: TabState
  active: boolean
}>()

const emit = defineEmits<{
  (e: 'activate'): void
  (e: 'close'): void
}>()

const title = computed(() => {
  if (!props.tab.path) return t.newTab
  const base = props.tab.path.split('/').pop() || props.tab.path
  return base.replace(/\.md$/, '')
})

function handleAuxClick(e: MouseEvent) {
  if (e.button === 1) {
    e.preventDefault()
    emit('close')
  }
}
</script>

<template>
  <Tooltip :content="tab.path ?? t.newTab" side="bottom">
    <div
      role="tab"
      :aria-selected="active"
      :class="[
        'group relative flex h-8 min-w-[70px] max-w-[160px] shrink items-center justify-between gap-1.5 rounded-t-sm px-3 text-xs select-none cursor-pointer transition-colors duration-100 -mb-px',
        active
          ? 'border-t border-x border-line bg-app text-fg font-medium z-10'
          : 'text-fg-muted hover:bg-hover hover:text-fg border-b border-transparent',
      ]"
      @click="emit('activate')"
      @auxclick="handleAuxClick"
    >
      <span class="truncate">{{ title }}</span>

      <div class="flex items-center shrink-0">
        <span
          v-if="tab.dirty"
          class="h-1.5 w-1.5 rounded-full bg-fg-muted group-hover:hidden"
        />
        <button
          type="button"
          :aria-label="t.closeTab"
          :class="[
            'flex h-4 w-4 items-center justify-center rounded-sm hover:bg-selected hover:text-fg text-fg-muted transition-colors duration-100',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            tab.dirty ? 'hidden group-hover:flex' : '',
          ]"
          @click.stop="emit('close')"
        >
          <X class="h-3 w-3" :stroke-width="1.75" />
        </button>
      </div>

      <!-- Garis pemisah halus antar tab -->
      <div
        v-if="!active"
        class="absolute right-0 top-2 bottom-2 w-px bg-line/60 pointer-events-none group-hover:opacity-0 transition-opacity"
      />
    </div>
  </Tooltip>
</template>
