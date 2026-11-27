<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { FolderOpen, Terminal, BookMarked, Code2, ChevronDown } from 'lucide-vue-next'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'reka-ui'
import { useVaultStore } from '@/stores/vault'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'
import { ipc, isTauri } from '@/lib/ipc'
import type { GitStatus, VaultEvent, IdeInfo } from '@/lib/ipc/types'
import { detectProjectStack, type ProjectStackInfo } from '@/lib/projectStack'
import { detectProjectCommands, type ProjectCommand } from '@/lib/projectCommands'
import GitStatusCard from './GitStatusCard.vue'
import RoadmapCard, { type DocumentTarget } from './RoadmapCard.vue'
import LastSessionCard from './LastSessionCard.vue'
import { parseDevlogContent, type DevlogFile } from '@/lib/projectDevlog'
import ChangelogCard from './ChangelogCard.vue'
import DevlogModal from './DevlogModal.vue'
import ProjectDocsModal from './ProjectDocsModal.vue'
import ProjectCliPopover from './ProjectCliPopover.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

const vaultStore = useVaultStore()
const toastStore = useToastStore()

const gitStatus = ref<GitStatus | null>(null)
const loadingGit = ref(false)
const initializingGit = ref(false)
const availableIdes = ref<IdeInfo[]>([])
const ideMenuOpen = ref(false)
const showDevlogModal = ref(false)
const showDocsModal = ref(false)

const documents = ref<DocumentTarget[]>([])
const selectedDocPath = ref<string | null>(null)

const devlogFiles = ref<DevlogFile[]>([])
const selectedDevlogPath = ref<string | null>(null)
const changelogContent = ref('')
const changelogPath = ref<string | null>(null)
const stackInfo = ref<ProjectStackInfo>({ stacks: [], packageManager: null, isMonorepo: false, dependencies: [] })
const projectCommands = ref<ProjectCommand[]>([])

const projectTitle = computed(() => vaultStore.current?.name || t.projectDefaultTitle)

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

async function initGit() {
  initializingGit.value = true
  try {
    await ipc.projectInitGit()
    toastStore.success(t.gitInitSuccess)
    await loadGit()
  } catch {
    toastStore.error(t.gitInitFailed)
  } finally {
    initializingGit.value = false
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
        if (c.path === 'README.md' && !/^\s*[-*]\s+\[[ xX]\]/m.test(note.content)) continue
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

    const loaded: DevlogFile[] = []
    for (const file of mdFiles) {
      const note = await ipc.noteRead(file.path)
      const sessions = parseDevlogContent(note.content)
      if (sessions.length > 0) {
        loaded.push({ name: file.name.replace(/\.md$/, ''), path: file.path, sessions })
      }
    }
    devlogFiles.value = loaded
    if (loaded.length > 0 && !loaded.some((f) => f.path === selectedDevlogPath.value)) {
      selectedDevlogPath.value = loaded[0].path
    }
  } catch {
    devlogFiles.value = []
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
  projectCommands.value = await detectProjectCommands(stackInfo.value.packageManager)
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

async function openTerminal() {
  try {
    await ipc.projectOpenTerminal()
  } catch {
    toastStore.error(t.openTerminalFailed)
  }
}

async function loadIdes() {
  try {
    availableIdes.value = await ipc.projectDetectIdes()
  } catch {
    availableIdes.value = []
  }
}

async function openIde(ideId: string) {
  try {
    await ipc.projectOpenIde(ideId)
  } catch {
    toastStore.error(t.openIdeFailed)
  }
}

const TARGET_DOC_PATHS = new Set([
  'ROADMAP.md',
  'ROADMAP-BARU.md',
  'TODO-PROJEK.md',
  'TODO.md',
  'BUG.md',
  'README.md',
])

let unlistenVault: (() => void) | null = null
let vaultRefreshTimer: ReturnType<typeof setTimeout> | null = null
let pendingDevlog = false
let pendingDocs = false
let pendingChangelog = false
let isDisposed = false

function scheduleSelectiveRefresh() {
  if (vaultRefreshTimer) clearTimeout(vaultRefreshTimer)
  vaultRefreshTimer = setTimeout(() => {
    const tasks: Promise<void>[] = []
    if (pendingDevlog) { pendingDevlog = false; tasks.push(loadLastSession()) }
    if (pendingDocs) { pendingDocs = false; tasks.push(loadTargetDocuments()) }
    if (pendingChangelog) { pendingChangelog = false; tasks.push(loadChangelog()) }
    if (tasks.length > 0) void Promise.all(tasks)
  }, 250)
}

function handleVaultEvents(events: VaultEvent[]) {
  let matched = false
  for (const ev of events) {
    for (const p of [ev.path, ev.from]) {
      if (!p) continue
      if (p === 'devlog' || p.startsWith('devlog/')) { pendingDevlog = true; matched = true }
      else if (p === 'CHANGELOG.md') { pendingChangelog = true; matched = true }
      else if (TARGET_DOC_PATHS.has(p)) { pendingDocs = true; matched = true }
    }
  }
  if (matched) scheduleSelectiveRefresh()
}

onMounted(async () => {
  refreshAll()
  void loadIdes()
  window.addEventListener('focus', handleWindowFocus)
  if (isTauri) {
    const { listen } = await import('@tauri-apps/api/event')
    const unlisten = await listen<VaultEvent[]>('vault:changed', (e) => handleVaultEvents(e.payload))
    if (isDisposed) unlisten()
    else unlistenVault = unlisten
  }
})

onUnmounted(() => {
  isDisposed = true
  window.removeEventListener('focus', handleWindowFocus)
  if (vaultRefreshTimer) clearTimeout(vaultRefreshTimer)
  unlistenVault?.()
})
</script>

<template>
  <div class="project-dashboard flex-1 h-full overflow-y-auto bg-app px-8 py-7 flex flex-col gap-6 select-none">
    <!-- Header Proyek -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-line/70 pb-5 w-full max-w-6xl mx-auto">
      <div class="flex flex-col gap-1.5 min-w-0">
        <div class="flex items-baseline gap-2.5 flex-wrap">
          <h1 class="text-xl font-semibold text-fg tracking-tight">{{ projectTitle }}</h1>
          <span class="text-[11px] font-medium text-accent">{{ t.projectMode }}</span>
          <span v-if="stackInfo.isMonorepo" class="text-[11px] text-fg-muted">{{ t.projectMonorepo }}</span>
        </div>

        <div class="flex items-center gap-1.5 text-xs text-fg-muted flex-wrap">
          <span class="font-mono truncate max-w-md text-fg-muted">{{ vaultStore.current?.path }}</span>

          <template v-if="stackInfo.stacks.length > 0 || stackInfo.dependencies.length > 0">
            <span class="text-fg-faint">·</span>
            <span v-if="stackInfo.stacks.length > 0" class="text-[11px] text-fg-muted">
              {{ stackInfo.stacks.slice(0, 5).join(' · ') }}
            </span>
            <span v-if="stackInfo.stacks.length > 0 && stackInfo.packageManager" class="text-fg-faint">·</span>
            <span v-if="stackInfo.packageManager" class="text-[11px] text-fg-muted">
              via {{ stackInfo.packageManager }}
            </span>
            <span v-if="(stackInfo.stacks.length > 0 || stackInfo.packageManager) && stackInfo.dependencies.length > 0" class="text-fg-faint">·</span>
            <PopoverRoot v-if="stackInfo.dependencies.length > 0">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="text-[11px] text-fg-muted hover:text-fg hover:underline transition-colors cursor-pointer"
                >
                  {{ t.projectDepsCount(stackInfo.dependencies.length) }}
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
                    {{ t.projectDepsTitle(stackInfo.dependencies.length) }}
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
        <Tooltip :content="t.openFolderTooltip" side="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
            @click="openInFileManager"
          >
            <FolderOpen class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>{{ t.folderBtn }}</span>
          </button>
        </Tooltip>
        <Tooltip :content="t.openTerminalTooltip" side="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
            @click="openTerminal"
          >
            <Terminal class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>{{ t.terminalBtn }}</span>
          </button>
        </Tooltip>
        <Tooltip v-if="availableIdes.length === 1" :content="t.openInIdeTooltip(availableIdes[0].name)" side="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
            @click="openIde(availableIdes[0].id)"
          >
            <Code2 class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>{{ t.ideBtn }}</span>
          </button>
        </Tooltip>
        <DropdownMenuRoot v-else-if="availableIdes.length > 1" v-model:open="ideMenuOpen">
          <div class="relative group inline-flex">
            <DropdownMenuTrigger as-child>
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none"
              >
                <Code2 class="h-3.5 w-3.5" :stroke-width="1.75" />
                <span>{{ t.ideBtn }}</span>
                <ChevronDown class="h-3 w-3 opacity-70" :stroke-width="1.75" />
              </button>
            </DropdownMenuTrigger>
            <span
              v-if="!ideMenuOpen"
              class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-100 whitespace-nowrap rounded-sm border border-line bg-panel-alt px-2 py-1 text-xs text-fg shadow-menu opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none"
            >
              {{ t.openInIdeSelectTooltip }}
            </span>
          </div>
          <DropdownMenuPortal>
            <DropdownMenuContent side="bottom" align="start" :side-offset="4" class="z-110 min-w-40 rounded-sm border border-line bg-panel-alt p-1 shadow-menu">
              <DropdownMenuItem
                v-for="ide in availableIdes"
                :key="ide.id"
                class="rounded-sm px-2.5 py-1.5 text-xs text-fg hover:bg-hover cursor-pointer outline-none select-none flex items-center gap-2"
                @select="openIde(ide.id)"
              >
                <Code2 class="h-3.5 w-3.5 text-accent shrink-0" :stroke-width="1.75" />
                <span>{{ ide.name }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <ProjectCliPopover v-if="projectCommands.length > 0" :commands="projectCommands" />
        <Tooltip :content="t.projectDocsTooltip" side="bottom">
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
            @click="showDocsModal = true"
          >
            <BookMarked class="h-3.5 w-3.5" :stroke-width="1.75" />
            <span>{{ t.docsBtn }}</span>
          </button>
        </Tooltip>
      </div>
    </div>

    <!-- Grid Kartu Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 md:auto-rows-[330px] gap-5 w-full max-w-6xl mx-auto">
      <!-- Kartu Git Status (Kolom Kiri) -->
      <GitStatusCard :status="gitStatus" :loading="loadingGit" :initializing="initializingGit" @refresh="loadGit" @init-git="initGit" />

      <!-- Kartu Sesi Koding (Bisa pilih tanggal devlog) -->
      <LastSessionCard
        :files="devlogFiles"
        :selected-path="selectedDevlogPath"
        @select="selectedDevlogPath = $event"
        @record-next="showDevlogModal = true"
      />

      <!-- Kartu Target & Roadmap (Bisa pilih file) -->
      <RoadmapCard
        :documents="documents"
        :selected-path="selectedDocPath"
        @select="selectedDocPath = $event"
        @created="refreshAll"
      />

      <!-- Kartu Changelog -->
      <ChangelogCard :file-path="changelogPath" :content="changelogContent" @created="refreshAll" />
    </div>

    <!-- Modal Catat Sesi -->
    <DevlogModal
      :open="showDevlogModal"
      :branch="gitStatus?.branch || 'main'"
      :git-status="gitStatus"
      @close="showDevlogModal = false"
      @saved="refreshAll"
    />

    <!-- Modal Panduan Dokumen Proyek -->
    <ProjectDocsModal
      :open="showDocsModal"
      @close="showDocsModal = false"
      @created="refreshAll"
    />
  </div>
</template>
