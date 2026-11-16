<script setup lang="ts">
import { ListOrdered, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { t } from '@/lib/i18n/id'
import IconButton from '@/components/ui/IconButton.vue'
import OutlinePane from '@/components/editor/OutlinePane.vue'
import type { HeadingItem } from '@/lib/markdown/render'

defineProps<{
  content: string
}>()

const emit = defineEmits<{
  (e: 'select-heading', heading: HeadingItem): void
}>()

const uiStore = useUiStore()
</script>

<template>
  <aside
    :style="{ width: `${uiStore.rightSidebarWidth}px` }"
    class="flex flex-col bg-panel shrink-0 select-none border-l border-line"
  >
    <div class="flex h-9 items-center justify-between px-3 border-b border-line text-xs font-medium text-fg">
      <div class="flex items-center gap-1.5 text-fg">
        <ListOrdered class="h-3.5 w-3.5 text-accent" :stroke-width="1.75" />
        <span>{{ t.outline }}</span>
      </div>
      <IconButton
        :icon="X"
        :label="t.close"
        @click="uiStore.toggleRightSidebar"
      />
    </div>

    <OutlinePane
      :content="content"
      @select-heading="emit('select-heading', $event)"
    />
  </aside>
</template>
