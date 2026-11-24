<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, BookOpen, Send, GitCommit, FileDiff } from 'lucide-vue-next'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { ipc } from '@/lib/ipc'
import type { GitStatus } from '@/lib/ipc/types'

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

const completedWork = ref('')
const nextGoal = ref('')
const isSubmitting = ref(false)

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

function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

async function handleSaveDevlog() {
  if (!completedWork.value.trim()) return
  isSubmitting.value = true

  try {
    const today = getTodayString()
    const fileName = `${today}.md`
    const devlogPath = `devlog/${fileName}`

    // 1. Pastikan folder devlog ada
    try {
      await ipc.fsCreateFolder('devlog')
    } catch {
      // Abaikan jika folder devlog sudah ada
    }

    // 2. Baca file devlog yang ada atau buat baru
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
          <h2 class="text-sm font-semibold text-fg">Catat Sesi Koding Hari Ini</h2>
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
        <p class="text-fg-muted">
          Simpan ringkasan sesi sebelum beralih tugas agar tidak lupa sampai mana pekerjaanmu saat kembali.
        </p>

        <!-- Referensi Cepat Git -->
        <div
          v-if="hasGitRef"
          class="flex flex-col gap-1.5 rounded-sm border border-line/70 bg-panel p-2.5"
        >
          <span class="text-[11px] font-medium text-fg-muted">Referensi Git (klik untuk sisipkan):</span>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-if="gitStatus?.lastCommit"
              type="button"
              class="flex items-center gap-1 rounded-xs border border-line bg-panel-alt px-2 py-0.5 text-[11px] text-fg hover:bg-hover transition-colors cursor-pointer max-w-full"
              @click="insertLastCommit"
            >
              <GitCommit class="h-3 w-3 text-accent shrink-0" :stroke-width="1.75" />
              <span class="truncate">+ Commit: {{ gitStatus.lastCommit.message }}</span>
            </button>
            <button
              v-if="gitStatus?.uncommittedFiles && gitStatus.uncommittedFiles.length > 0"
              type="button"
              class="flex items-center gap-1 rounded-xs border border-line bg-panel-alt px-2 py-0.5 text-[11px] text-fg hover:bg-hover transition-colors cursor-pointer"
              @click="insertChangedFiles"
            >
              <FileDiff class="h-3 w-3 text-amber-500 shrink-0" :stroke-width="1.75" />
              <span>+ {{ gitStatus.uncommittedFiles.length }} file diubah</span>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg">Apa yang baru saja kamu selesaikan?</label>
          <textarea
            v-model="completedWork"
            rows="3"
            placeholder="Contoh: Selesai implementasi endpoint auth dan penanganan token expired"
            class="rounded-sm border border-line bg-panel p-2 text-fg focus:border-accent focus:outline-none resize-none text-xs"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="font-medium text-fg">Apa langkah pertama saat kembali nanti? (opsional)</label>
          <input
            v-model="nextGoal"
            type="text"
            placeholder="Contoh: Lanjut buat unit test untuk middleware profile"
            class="rounded-sm border border-line bg-panel px-2 py-1.5 text-fg focus:border-accent focus:outline-none text-xs"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            type="button"
            class="px-3 py-1.5 rounded-sm border border-line text-fg-muted hover:bg-hover hover:text-fg cursor-pointer transition-colors"
            @click="emit('close')"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-accent text-accent-fg font-medium hover:bg-accent-hover cursor-pointer transition-colors disabled:opacity-50"
            :disabled="!completedWork.trim() || isSubmitting"
            @click="handleSaveDevlog"
          >
            <Send class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>Simpan ke Devlog</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
