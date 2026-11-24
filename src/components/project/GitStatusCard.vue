<script setup lang="ts">
import { ref, computed } from 'vue'
import { GitBranch, RefreshCw } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'
import type { GitStatus } from '@/lib/ipc/types'

const props = defineProps<{
  status: GitStatus | null
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const tabsStore = useTabsStore()
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

function openFile(path: string) {
  tabsStore.openPath(path, { mode: 'edit' })
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '-'
  const diffSec = Math.floor(Date.now() / 1000) - timestamp
  if (diffSec < 60) return 'baru saja'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`
  return `${Math.floor(diffSec / 86400)} hari lalu`
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5">
      <div class="flex items-center gap-2">
        <GitBranch class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">Status Git</span>
      </div>
      <button
        type="button"
        :title="'Segarkan status Git'"
        class="h-6 w-6 rounded-xs flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" :stroke-width="1.75" />
      </button>
    </div>

    <div v-if="!status?.isGit" class="text-xs text-fg-muted italic py-1">
      Folder ini belum diinisialisasi sebagai repositori Git.
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-0 md:divide-x md:divide-line/60 text-xs py-0.5">
      <!-- Branch -->
      <div class="flex flex-col gap-1 md:pr-3">
        <span class="text-[11px] text-fg-muted">Branch</span>
        <div class="flex items-center gap-1.5 font-mono text-fg font-medium">
          <span class="truncate">{{ status.branch || 'main' }}</span>
          <span
            v-if="status.ahead > 0"
            title="Commit lokal belum dipush"
            class="text-[10px] text-accent font-mono shrink-0"
          >
            ↑{{ status.ahead }}
          </span>
          <span
            v-if="status.behind > 0"
            title="Ada commit baru di remote"
            class="text-[10px] text-warning font-mono shrink-0"
          >
            ↓{{ status.behind }}
          </span>
        </div>
      </div>

      <!-- Uncommitted -->
      <div class="flex flex-col gap-1 md:px-3">
        <span class="text-[11px] text-fg-muted">Belum dicommit</span>
        <span :class="status.uncommittedCount > 0 ? 'text-warning font-semibold' : 'text-fg font-medium'">
          {{ status.uncommittedCount }} file
        </span>
      </div>

      <!-- Commit Terakhir -->
      <div class="flex flex-col gap-0.5 md:pl-3 min-w-0">
        <span class="text-[11px] text-fg-muted">Commit terakhir</span>
        <template v-if="status.lastCommit">
          <span class="truncate font-medium text-fg">{{ status.lastCommit.message }}</span>
          <span class="text-[11px] text-fg-muted truncate">
            {{ formatTime(status.lastCommit.timestamp) }} · {{ status.lastCommit.author }}
          </span>
        </template>
        <span v-else class="text-fg-muted italic">-</span>
      </div>
    </div>

    <!-- Daftar File Belum Dicommit (jika ada) -->
    <div v-if="status?.uncommittedFiles && status.uncommittedFiles.length > 0" class="flex flex-col gap-1.5 pt-1 border-t border-line/50">
      <div class="flex items-center justify-between pt-1">
        <span class="text-[11px] font-medium text-fg-muted">Perubahan aktif</span>
        <button
          v-if="status.uncommittedFiles.length > INITIAL_LIMIT"
          type="button"
          class="text-[11px] text-accent hover:underline cursor-pointer"
          @click="showAllFiles = !showAllFiles"
        >
          {{ showAllFiles ? 'Lebih sedikit' : `+${remainingCount} lainnya` }}
        </button>
      </div>
      <div class="flex flex-col max-h-36 overflow-y-auto overflow-x-hidden divide-y divide-line/30">
        <button
          v-for="file in visibleFiles"
          :key="file"
          type="button"
          :title="`Buka ${file}`"
          class="group flex items-center justify-between gap-2 py-1 px-1.5 rounded-xs hover:bg-hover text-left cursor-pointer transition-colors"
          @click="openFile(file)"
        >
          <span class="text-[11px] font-mono text-fg truncate">{{ file }}</span>
          <span class="text-[10px] text-fg-faint opacity-0 group-hover:opacity-100 shrink-0 transition-opacity">Buka</span>
        </button>
      </div>
    </div>
  </div>
</template>
