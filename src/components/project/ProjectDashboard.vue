<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { PlusCircle, FolderOpen, Terminal } from 'lucide-vue-next'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
} from 'reka-ui'
import { useVaultStore } from '@/stores/vault'
import { ipc } from '@/lib/ipc'
import type { GitStatus } from '@/lib/ipc/types'
import { detectProjectStack, type ProjectStackInfo } from '@/lib/projectStack'
import GitStatusCard from './GitStatusCard.vue'
import RoadmapCard, { type DocumentTarget } from './RoadmapCard.vue'
import LastSessionCard, { type SessionData } from './LastSessionCard.vue'
import ChangelogCard from './ChangelogCard.vue'
import DevlogModal from './DevlogModal.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

const vaultStore = useVaultStore()

const gitStatus = ref<GitStatus | null>(null)
const loadingGit = ref(false)
const showDevlogModal = ref(false)

const documents = ref<DocumentTarget[]>([])
const selectedDocPath = ref<string | null>(null)

const lastSession = ref<SessionData | null>(null)
const changelogContent = ref('')
const changelogPath = ref<string | null>(null)
const stackInfo = ref<ProjectStackInfo>({ stacks: [], dependencies: [] })

const projectTitle = computed(() => vaultStore.current?.name || 'Proyek Kensidian')

async function loadGit() {
  loadingGit.value = true
  try {
    gitStatus.value = await ipc.projectGetGitStatus()
  } catch (err) {
    console.error('Gagal memuat status git:', err)
  } finally {
    loadingGit.value = false
  }
}

async function loadTargetDocuments() {
  const candidates = [
    { name: 'Roadmap', path: 'ROADMAP.md' },
    { name: 'Roadmap Baru', path: 'ROADMAP-BARU.md' },
    { name: 'Todo Proyek', path: 'TODO-PROJEK.md' },
    { name: 'Todo', path: 'TODO.md' },
    { name: 'Bug & Audit', path: 'BUG.md' },
    { name: 'Readme', path: 'README.md' },
  ]

  const docs: DocumentTarget[] = []
  for (const c of candidates) {
    try {
      const note = await ipc.noteRead(c.path)
      if (note.content) {
        docs.push({ name: c.name, path: c.path, content: note.content })
      }
    } catch {
      // Abaikan jika berkas tidak ada
    }
  }

  documents.value = docs
  if (docs.length > 0 && !selectedDocPath.value) {
    selectedDocPath.value = docs[0].path
  }
}

async function loadLastSession() {
  try {
    const entries = await ipc.fsListDir('devlog')
    const mdFiles = entries
      .filter((e) => e.kind === 'file' && e.name.endsWith('.md'))
      .sort((a, b) => b.name.localeCompare(a.name))

    if (mdFiles.length > 0) {
      const latest = mdFiles[0]
      const note = await ipc.noteRead(latest.path)
      const lines = note.content.split('\n')

      let timeStr = latest.name.replace(/\.md$/, '')
      let branch = ''
      let completed = ''
      let next = ''

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim()
        if (line.startsWith('- **Langkah berikutnya:**') && !next) {
          next = line.replace('- **Langkah berikutnya:**', '').trim()
        } else if (line.startsWith('- **Selesai:**') && !completed) {
          completed = line.replace('- **Selesai:**', '').trim()
        } else if (line.startsWith('### Sesi ')) {
          const match = line.match(/### Sesi ([^ ]+)(?: \(Branch: `([^`]+)`\))?/)
          if (match) {
            timeStr += ` (${match[1]})`
            if (match[2]) branch = match[2]
          }
          break
        }
      }

      if (completed) {
        lastSession.value = {
          timeStr,
          branch,
          completed,
          next,
          filePath: latest.path,
        }
      }
    }
  } catch {
    lastSession.value = null
  }
}

async function loadChangelog() {
  try {
    const note = await ipc.noteRead('CHANGELOG.md')
    changelogContent.value = note.content
    changelogPath.value = 'CHANGELOG.md'
  } catch {
    changelogContent.value = ''
  }
}

async function loadTechStack() {
  stackInfo.value = await detectProjectStack()
}

let lastRefreshAt = 0

async function refreshAll() {
  lastRefreshAt = Date.now()
  await Promise.all([
    loadGit(),
    loadTargetDocuments(),
    loadLastSession(),
    loadChangelog(),
    loadTechStack(),
  ])
}

function handleWindowFocus() {
  if (Date.now() - lastRefreshAt > 2000) {
    refreshAll()
  }
}

function openInFileManager() {
  ipc.revealInFileManager('')
}

function openTerminal() {
  ipc.projectOpenTerminal()
}

onMounted(() => {
  refreshAll()
  window.addEventListener('focus', handleWindowFocus)
})

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus)
})
</script>

<template>
  <div class="project-dashboard flex-1 h-full overflow-y-auto bg-app px-8 py-7 flex flex-col gap-6 select-none">
    <!-- Header Proyek -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line/70 pb-5 w-full max-w-6xl mx-auto">
      <div class="flex flex-col gap-1.5 min-w-0">
        <div class="flex items-baseline gap-2.5 flex-wrap">
          <h1 class="text-xl font-semibold text-fg tracking-tight">{{ projectTitle }}</h1>
          <span class="text-[11px] font-medium text-accent">Mode Proyek</span>
        </div>

        <div class="flex items-center gap-1.5 text-xs text-fg-muted flex-wrap">
          <span class="font-mono truncate max-w-md text-fg-muted">{{ vaultStore.current?.path }}</span>

          <template v-if="stackInfo.stacks.length > 0 || stackInfo.dependencies.length > 0">
            <span class="text-fg-faint mx-1">·</span>
            <span v-if="stackInfo.stacks.length > 0" class="text-[11px] text-fg-muted">
              {{ stackInfo.stacks.slice(0, 5).join(' · ') }}
            </span>
            <PopoverRoot v-if="stackInfo.dependencies.length > 0">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="text-[11px] text-fg-muted hover:text-fg hover:underline transition-colors cursor-pointer ml-1"
                >
                  ({{ stackInfo.dependencies.length }} deps)
                </button>
              </PopoverTrigger>
              <PopoverPortal>
                <PopoverContent
                  side="bottom"
                  align="start"
                  :side-offset="6"
                  class="z-110 w-72 max-h-64 overflow-y-auto rounded-sm border border-line bg-panel-alt p-2.5 shadow-menu text-xs"
                >
                  <div class="text-[11px] font-semibold text-fg pb-1.5 mb-1.5 border-b border-line">
                    Dependencies ({{ stackInfo.dependencies.length }})
                  </div>
                  <div class="flex flex-col gap-1">
                    <div
                      v-for="dep in stackInfo.dependencies"
                      :key="`${dep.source}-${dep.name}`"
                      class="flex items-center justify-between gap-2 py-0.5 text-[11px]"
                    >
                      <span class="font-mono text-fg truncate">{{ dep.name }}</span>
                      <span class="font-mono text-fg-muted shrink-0">{{ dep.version }}</span>
                    </div>
                  </div>
                </PopoverContent>
              </PopoverPortal>
            </PopoverRoot>
          </template>
        </div>
      </div>

      <!-- Quick Action Buttons -->
      <div class="flex items-center gap-2 shrink-0">
        <Tooltip content="Buka folder di File Manager" side="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
            @click="openInFileManager"
          >
            <FolderOpen class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>Folder</span>
          </button>
        </Tooltip>
        <Tooltip content="Buka terminal di root proyek" side="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
            @click="openTerminal"
          >
            <Terminal class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>Terminal</span>
          </button>
        </Tooltip>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover transition-colors cursor-pointer"
          @click="showDevlogModal = true"
        >
          <PlusCircle class="h-3.5 w-3.5" :stroke-width="1.75" />
          <span>Catat Sesi Koding</span>
        </button>
      </div>
    </div>

    <!-- Grid Kartu Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 items-start gap-5 w-full max-w-6xl mx-auto">
      <!-- Kartu Git Status (Kolom Kiri) -->
      <GitStatusCard :status="gitStatus" :loading="loadingGit" @refresh="loadGit" />

      <!-- Kartu Sesi Terakhir (Kolom Kanan) -->
      <LastSessionCard :session="lastSession" @record-next="showDevlogModal = true" />

      <!-- Kartu Target & Roadmap (Bisa pilih file) -->
      <RoadmapCard
        :documents="documents"
        :selected-path="selectedDocPath"
        @select="selectedDocPath = $event"
      />

      <!-- Kartu Changelog -->
      <ChangelogCard :file-path="changelogPath" :content="changelogContent" />
    </div>

    <!-- Modal Catat Sesi -->
    <DevlogModal
      :open="showDevlogModal"
      :branch="gitStatus?.branch || 'main'"
      :git-status="gitStatus"
      @close="showDevlogModal = false"
      @saved="refreshAll"
    />
  </div>
</template>
