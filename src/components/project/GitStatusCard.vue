<script setup lang="ts">
import { ref, computed } from 'vue'
import { GitBranch, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-vue-next'
import { openUrl } from '@tauri-apps/plugin-opener'
import { isTauri } from '@/lib/ipc'
import type { GitStatus } from '@/lib/ipc/types'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  status: GitStatus | null
  loading: boolean
  initializing?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'init-git'): void
}>()

const showAllFiles = ref(false)
const INITIAL_LIMIT = 8

const visibleFiles = computed(() => {
  const list = props.status?.uncommittedFiles || []
  if (showAllFiles.value) return list
  return list.slice(0, INITIAL_LIMIT)
})

const remainingCount = computed(() => {
  const total = props.status?.uncommittedFiles?.length || 0
  return Math.max(0, total - INITIAL_LIMIT)
})

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  const diffSec = Math.floor(Date.now() / 1000) - timestamp
  if (diffSec < 60) return t.timeJustNow
  if (diffSec < 3600) return t.timeMinutesAgo(Math.floor(diffSec / 60))
  if (diffSec < 86400) return t.timeHoursAgo(Math.floor(diffSec / 3600))
  return t.timeDaysAgo(Math.floor(diffSec / 86400))
}

const remoteLabel = computed(() => {
  const url = props.status?.remoteUrl || ''
  if (url.includes('github.com')) return 'GitHub'
  if (url.includes('gitlab.com')) return 'GitLab'
  return 'Remote'
})

const gitignoreWarning = computed(() => {
  const s = props.status
  if (!s?.isGit) return null
  if (s.unignoredHeavyDirs.length > 0) {
    return t.gitUnignoredHeavyDirs(s.unignoredHeavyDirs.join(', '))
  }
  if (!s.hasGitignore) {
    return t.gitMissingGitignore
  }
  return null
})

async function openRemoteRepo() {
  const url = props.status?.remoteUrl
  if (!url) return
  if (isTauri) await openUrl(url)
  else window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5 h-full">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5 shrink-0">
      <div class="flex items-center gap-2">
        <GitBranch class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">{{ t.gitStatusTitle }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          v-if="status?.isGit && status.remoteUrl"
          type="button"
          :title="status.remoteUrl"
          class="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer mr-1"
          @click="openRemoteRepo"
        >
          <span>{{ remoteLabel }}</span>
          <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
        </button>
        <button
          type="button"
          :title="t.gitRefreshTooltip"
          class="h-6 w-6 rounded-xs flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
          :disabled="loading"
          @click="emit('refresh')"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" :stroke-width="1.75" />
        </button>
      </div>
    </div>

    <div v-if="!status?.isGit" class="flex flex-col items-start gap-2.5 py-1">
      <span class="text-xs text-fg-muted italic">{{ t.gitNotInitialized }}</span>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-sm border border-line bg-panel-alt px-2.5 py-1 text-[11px] font-medium text-fg hover:bg-hover transition-colors cursor-pointer disabled:opacity-50"
        :disabled="initializing || loading"
        @click="emit('init-git')"
      >
        <GitBranch class="h-3 w-3 text-accent" :stroke-width="1.75" />
        <span>{{ t.gitInitBtn }}</span>
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-0 md:divide-x md:divide-line/60 text-xs py-0.5 shrink-0">
      <!-- Branch -->
      <div class="flex flex-col gap-1 md:pr-3">
        <span class="text-[11px] text-fg-muted">{{ t.gitBranch }}</span>
        <div class="flex items-center gap-1.5 font-mono text-fg font-medium">
          <span class="truncate">{{ status.branch || 'main' }}</span>
          <span
            v-if="status.ahead > 0"
            :title="t.gitAheadTooltip"
            class="text-[10px] text-accent font-mono shrink-0"
          >
            ↑{{ status.ahead }}
          </span>
          <span
            v-if="status.behind > 0"
            :title="t.gitBehindTooltip"
            class="text-[10px] text-warning font-mono shrink-0"
          >
            ↓{{ status.behind }}
          </span>
        </div>
      </div>

      <!-- Uncommitted -->
      <div class="flex flex-col gap-1 md:px-3">
        <span class="text-[11px] text-fg-muted">{{ t.gitUncommitted }}</span>
        <span :class="status.uncommittedCount > 0 ? 'text-warning font-semibold' : 'text-fg font-medium'">
          {{ t.gitUncommittedFiles(status.uncommittedCount) }}
        </span>
      </div>

      <!-- Commit Terakhir -->
      <div class="flex flex-col gap-0.5 md:pl-3 min-w-0">
        <span class="text-[11px] text-fg-muted">{{ t.gitLastCommit }}</span>
        <template v-if="status.lastCommit">
          <span class="truncate font-medium text-fg">{{ status.lastCommit.message }}</span>
          <span class="text-[11px] text-fg-muted truncate">
            {{ formatTime(status.lastCommit.timestamp) }} · {{ status.lastCommit.author }}
          </span>
        </template>
        <span v-else class="text-fg-muted italic">{{ t.gitNoCommitYet }}</span>
      </div>
    </div>

    <!-- Peringatan .gitignore / folder berat untracked -->
    <div
      v-if="gitignoreWarning"
      class="flex items-start gap-2 rounded-xs border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning shrink-0"
    >
      <AlertTriangle class="h-3.5 w-3.5 shrink-0 mt-0.5" :stroke-width="1.75" />
      <span class="leading-snug">{{ gitignoreWarning }}</span>
    </div>

    <!-- Daftar File Belum Dicommit (jika ada) -->
    <div v-if="status?.uncommittedFiles && status.uncommittedFiles.length > 0" class="flex flex-col gap-1.5 pt-1 border-t border-line/50 flex-1 min-h-0">
      <div class="flex items-center justify-between pt-1 shrink-0">
        <span class="text-[11px] font-medium text-fg-muted">{{ t.gitActiveChanges }}</span>
        <button
          v-if="status.uncommittedFiles.length > INITIAL_LIMIT"
          type="button"
          class="text-[11px] text-accent hover:underline cursor-pointer"
          @click="showAllFiles = !showAllFiles"
        >
          {{ showAllFiles ? t.showLess : t.moreItemsCount(remainingCount) }}
        </button>
      </div>
      <div class="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden divide-y divide-line/30">
        <div
          v-for="file in visibleFiles"
          :key="file"
          class="flex items-center py-1 px-1.5"
        >
          <span class="text-[11px] font-mono text-fg truncate">{{ file }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
