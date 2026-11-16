<script setup lang="ts">
import { computed } from 'vue'
import { Hash } from 'lucide-vue-next'
import { t } from '@/lib/i18n/id'
import type { HeadingItem } from '@/lib/markdown/render'

const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  (e: 'select-heading', heading: HeadingItem): void
}>()

const headings = computed<HeadingItem[]>(() => {
  const result: HeadingItem[] = []
  if (!props.content) return result

  let inCodeBlock = false
  const lines = props.content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
      result.push({ level, text, id, line: i + 1 })
    }
  }
  return result
})
</script>

<template>
  <div class="flex-1 flex flex-col overflow-y-auto select-none p-2 text-xs">
    <div v-if="headings.length === 0" class="p-4 text-center text-fg-faint">
      <p class="text-xs">{{ t.noHeadings }}</p>
    </div>

    <div v-else class="flex flex-col gap-0.5">
      <button
        v-for="item in headings"
        :key="`${item.line}-${item.text}`"
        type="button"
        :style="{ paddingLeft: `calc(8px + ${(item.level - 1) * 12}px)` }"
        class="flex items-center gap-1.5 py-1.5 pr-2 rounded-sm text-left text-fg/80 hover:bg-hover hover:text-fg transition-colors duration-100 cursor-pointer outline-none focus-visible:bg-hover"
        @click="emit('select-heading', item)"
      >
        <Hash
          class="shrink-0 opacity-40"
          :class="item.level <= 2 ? 'h-3.5 w-3.5 text-accent' : 'h-3 w-3'"
          :stroke-width="1.75"
        />
        <span
          class="truncate flex-1"
          :class="item.level === 1 ? 'font-semibold text-fg' : item.level === 2 ? 'font-medium' : ''"
        >
          {{ item.text }}
        </span>
      </button>
    </div>
  </div>
</template>
