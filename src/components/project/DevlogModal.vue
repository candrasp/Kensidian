<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, BookOpen, Send, GitCommit, FileDiff, Sparkles, Copy, Check } from 'lucide-vue-next'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { useToastStore } from '@/stores/toast'
import { ipc } from '@/lib/ipc'
import type { GitStatus } from '@/lib/ipc/types'
import { getTodayString, getTimeString, buildDevlogAgentPrompt } from '@/lib/projectDevlog'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  open: boolean
  branch: string
  gitStatus?: GitStatus | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()
const toastStore = useToastStore()

const completedWork = ref('')
const nextGoal = ref('')
const isSubmitting = ref(false)
const promptCopied = ref(false)

async function handleCopyAgentPrompt() {
  try {
    await navigator.clipboard.writeText(buildDevlogAgentPrompt(props.branch))
    promptCopied.value = true
    toastStore.success(t.devlogPromptCopied)
    setTimeout(() => {
      promptCopied.value = false
    }, 1800)
  } catch {
    toastStore.error(t.copyPromptFailed)
  }
}

const hasGitRef = computed(() => {
  return Boolean(
    props.gitStatus?.isGit &&
      (props.gitStatus.lastCommit || props.gitStatus.uncommittedFiles.length > 0),
  )
})

function appendToCompleted(text: string) {
  const current = completedWork.value.trim()
  completedWork.value = current ? `${current}; ${text}` : text
}

function insertLastCommit() {
  if (props.gitStatus?.lastCommit?.message) {
    appendToCompleted(props.gitStatus.lastCommit.message)
  }
}

function insertChangedFiles() {
  const files = props.gitStatus?.uncommittedFiles || []
  if (files.length === 0) return
  const preview = files.slice(0, 5).join(', ')
  const suffix = files.length > 5 ? ` (+${files.length - 5} lainnya)` : ''
  appendToCompleted(`Ubah: ${preview}${suffix}`)
}

async function handleSaveDevlog() {
  if (!completedWork.value.trim()) return
  isSubmitting.value = true

  try {
    const today = getTodayString()
    const fileName = `${today}.md`
    const devlogPath = `devlog/${fileName}`

    try {
      await ipc.fsCreateFolder('devlog')
    } catch {
      // Abaikan jika folder devlog sudah ada
    }

    let existingContent = ''
    let mtime = 0
    try {
      const currentNote = await ipc.noteRead(devlogPath)
      existingContent = currentNote.content
      mtime = currentNote.mtime
    } catch {
      existingContent = `# Devlog — ${today}\n\n`
    }

    const sessionEntry = `\n### Sesi ${getTimeString()} (Branch: \`${props.branch || 'main'}\`)\n` +
      `- **Selesai:** ${completedWork.value.trim()}\n` +
      (nextGoal.value.trim() ? `- **Langkah berikutnya:** ${nextGoal.value.trim()}\n` : '')

    const newContent = existingContent + sessionEntry

    if (mtime > 0) {
      await ipc.noteWrite(devlogPath, newContent, mtime)
    } else {
      await ipc.noteCreate(devlogPath, newContent)
    }

    await vaultStore.loadDir('')
    await vaultStore.loadDir('devlog')

    completedWork.value = ''
    nextGoal.value = ''
    emit('saved')
    emit('close')

    tabsStore.openPath(devlogPath, { mode: 'view' })
  } catch (err) {
    console.error('Gagal menyimpan devlog:', err)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-110 flex items-center justify-center bg-scrim backdrop-blur-xs select-none p-4"
    @click.self="emit('close')"
  >
    <div class="flex flex-col w-full max-w-md rounded-lg border border-line bg-panel-alt shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-100">
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-panel">
        <div class="flex items-center gap-2">
          <BookOpen class="h-4 w-4 text-accent" :stroke-width="1.75" />
          <h2 class="text-sm font-semibold text-fg">{{ t.devlogModalTitle }}</h2>
        </div>
        <button
          type="button"
          class="h-6 w-6 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg cursor-pointer transition-colors"
          @click="emit('close')"
        >
          <X class="h-4 w-4" :stroke-width="1.75" />
        </button>
      </div>

      <div class="p-4 flex flex-col gap-3.5 text-xs">
        <div class="flex items-center justify-between gap-3 rounded-sm border border-accent/35 bg-accent-soft px-3 py-2">
          <div class="flex items-center gap-2 min-w-0">
            <Sparkles class="h-3.5 w-3.5 text-accent shrink-0" :stroke-width="1.75" />
            <span class="text-[11px] font-medium text-fg">{{ t.devlogAutoAi }}</span>
          </div>
          <button
            type="button"
            class="flex items-center gap-1.5 shrink-0 rounded-sm bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg hover:bg-accent-hover transition-colors cursor-pointer"
            @click="handleCopyAgentPrompt"
          >
            <Check v-if="promptCopied" class="h-3 w-3" :stroke-width="2" />
            <Copy v-else class="h-3 w-3" :stroke-width="1.75" />
            <span>{{ promptCopied ? t.copiedExclaim : t.copyPromptBtn }}</span>
          </button>
        </div>

        <p class="text-fg-muted">
          {{ t.devlogModalDesc }}
        </p>

        <!-- Referensi Cepat Git -->
        <div
          v-if="hasGitRef"
          class="flex flex-col gap-1.5 rounded-sm border border-line/70 bg-panel p-2.5"
        >
          <span class="text-[11px] font-medium text-fg-muted">{{ t.devlogGitRefLabel }}</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-if="gitStatus?.lastCommit"
              type="button"
              class="flex items-center gap-1 rounded-xs border border-line bg-panel-alt px-2 py-0.5 text-[11px] text-fg hover:bg-hover transition-colors cursor-pointer max-w-full"
              @click="insertLastCommit"
            >
              <GitCommit class="h-3 w-3 text-accent shrink-0" :stroke-width="1.75" />
              <span class="truncate">{{ t.devlogCommitPrefix(gitStatus.lastCommit.message) }}</span>
            </button>
            <button
              v-if="gitStatus?.uncommittedFiles && gitStatus.uncommittedFiles.length > 0"
              type="button"
              class="flex items-center gap-1 rounded-xs border border-line bg-panel-alt px-2 py-0.5 text-[11px] text-fg hover:bg-hover transition-colors cursor-pointer"
              @click="insertChangedFiles"
            >
              <FileDiff class="h-3 w-3 text-amber-500 shrink-0" :stroke-width="1.75" />
              <span>{{ t.devlogFilesChanged(gitStatus.uncommittedFiles.length) }}</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg">{{ t.devlogCompletedLabel }}</label>
          <textarea
            v-model="completedWork"
            rows="3"
            :placeholder="t.devlogCompletedPlaceholder"
            class="rounded-sm border border-line bg-panel p-2 text-fg focus:border-accent focus:outline-none resize-none text-xs"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg">{{ t.devlogNextLabel }}</label>
          <input
            v-model="nextGoal"
            type="text"
            :placeholder="t.devlogNextPlaceholder"
            class="rounded-sm border border-line bg-panel px-2 py-1.5 text-fg focus:border-accent focus:outline-none text-xs"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            class="px-3 py-1.5 rounded-sm border border-line text-fg-muted hover:bg-hover hover:text-fg cursor-pointer transition-colors"
            @click="emit('close')"
          >
            {{ t.cancel }}
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-accent text-accent-fg font-medium hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50"
            :disabled="!completedWork.trim() || isSubmitting"
            @click="handleSaveDevlog"
          >
            <Send class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>{{ t.devlogSaveBtn }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
