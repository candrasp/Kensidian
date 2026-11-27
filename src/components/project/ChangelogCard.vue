<script setup lang="ts">
import { ref, computed } from 'vue'
import { Tag, ExternalLink, FilePlus2, Copy, Check } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useToastStore } from '@/stores/toast'
import { ipc } from '@/lib/ipc'
import { getDocSpec, getDocTemplate, buildDocAgentPrompt } from '@/lib/projectDocsGuide'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  filePath: string | null
  content: string
}>()

const emit = defineEmits<{
  (e: 'created'): void
}>()

const tabsStore = useTabsStore()
const vaultStore = useVaultStore()
const toastStore = useToastStore()
const copiedPrompt = ref(false)

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

async function createChangelog() {
  const spec = getDocSpec('CHANGELOG.md')
  if (!spec) return
  try {
    await ipc.noteCreate(spec.filename, getDocTemplate(spec))
    await vaultStore.loadDir('')
    emit('created')
    tabsStore.openPath(spec.filename, { mode: 'edit' })
  } catch {
    toastStore.error(t.createFileFailed('CHANGELOG.md'))
  }
}

async function copyPrompt() {
  const spec = getDocSpec('CHANGELOG.md')
  if (!spec) return
  try {
    await navigator.clipboard.writeText(buildDocAgentPrompt(spec, vaultStore.current?.name || t.projectBadge))
    copiedPrompt.value = true
    toastStore.success(t.promptCopied('CHANGELOG.md'))
    setTimeout(() => { copiedPrompt.value = false }, 1800)
  } catch {
    toastStore.error(t.copyPromptFailed)
  }
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5 h-full">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5 shrink-0">
      <div class="flex items-center gap-2">
        <Tag class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">{{ t.changelogCardTitle }}</span>
      </div>

      <button
        v-if="filePath"
        type="button"
        class="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
        @click="openChangelog"
      >
        <span>{{ t.viewAll }}</span>
        <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
      </button>
    </div>

    <div v-if="!parsedRelease" class="flex flex-col gap-2.5 py-1">
      <span class="text-xs text-fg-muted italic">{{ t.changelogEmpty }}</span>
      <div class="flex items-center gap-2">
        <button v-if="!filePath" type="button" class="flex items-center gap-1 rounded-sm border border-line bg-panel-alt px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-hover cursor-pointer" @click="createChangelog">
          <FilePlus2 class="h-3 w-3" :stroke-width="1.75" />
          <span>{{ t.createChangelogBtn }}</span>
        </button>
        <button type="button" class="flex items-center gap-1 rounded-sm border border-line bg-panel-alt px-2.5 py-1 text-[11px] text-fg-muted hover:bg-hover hover:text-fg cursor-pointer" @click="copyPrompt">
          <Check v-if="copiedPrompt" class="h-3 w-3 text-success" :stroke-width="2" />
          <Copy v-else class="h-3 w-3" :stroke-width="1.75" />
          <span>{{ copiedPrompt ? t.copiedExclaim : t.copyAgentPrompt }}</span>
        </button>
      </div>
    </div>

    <div v-else class="flex flex-col gap-2.5 text-xs flex-1 min-h-0">
      <div class="font-mono text-xs font-semibold text-accent shrink-0">
        {{ parsedRelease.version }}
      </div>

      <div class="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
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
