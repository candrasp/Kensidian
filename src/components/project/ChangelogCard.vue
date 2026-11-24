<script setup lang="ts">
import { computed } from 'vue'
import { Tag, ExternalLink } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'

const props = defineProps<{
  filePath: string | null
  content: string
}>()

const tabsStore = useTabsStore()

interface ChangelogRelease {
  version: string
  changes: string[]
}

function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}

const parsedRelease = computed<ChangelogRelease | null>(() => {
  if (!props.content) return null
  const lines = props.content.split('\n')
  let currentVersion = ''
  const changes: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      if (currentVersion) break // Ambil versi paling atas saja
      currentVersion = trimmed.replace(/^##\s*/, '')
    } else if (currentVersion && trimmed.startsWith('- ')) {
      changes.push(cleanMarkdownInline(trimmed.slice(2)))
    }
  }

  if (!currentVersion) return null
  return { version: currentVersion, changes }
})

function openChangelog() {
  if (props.filePath) {
    tabsStore.openPath(props.filePath, { mode: 'view' })
  }
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5">
      <div class="flex items-center gap-2">
        <Tag class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">Versi & Rilis Terakhir</span>
      </div>

      <button
        v-if="filePath"
        type="button"
        class="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
        @click="openChangelog"
      >
        <span>Lihat semua</span>
        <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
      </button>
    </div>

    <div v-if="!parsedRelease" class="text-xs text-fg-muted italic py-1">
      Belum ada catatan rilis di file `CHANGELOG.md`.
    </div>

    <div v-else class="flex flex-col gap-2.5 text-xs">
      <div class="font-mono text-xs font-semibold text-accent">
        {{ parsedRelease.version }}
      </div>

      <div class="flex flex-col gap-2 max-h-48 overflow-y-auto overflow-x-hidden pr-1">
        <div
          v-for="(change, idx) in parsedRelease.changes.slice(0, 6)"
          :key="idx"
          class="flex items-start gap-2 text-xs text-fg leading-relaxed"
        >
          <span class="text-fg-faint mt-0.5 shrink-0 text-xs">•</span>
          <span class="break-words line-clamp-2">{{ change }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
