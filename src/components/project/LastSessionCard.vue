<script setup lang="ts">
import { computed } from 'vue'
import { Clock, ExternalLink } from 'lucide-vue-next'
import { useTabsStore } from '@/stores/tabs'

export interface SessionData {
  timeStr: string
  branch: string
  completed: string
  next: string
  filePath: string
}

const props = defineProps<{
  session: SessionData | null
}>()

const emit = defineEmits<{
  (e: 'recordNext'): void
}>()

const tabsStore = useTabsStore()

const hasSession = computed(() => Boolean(props.session))

function openDevlog() {
  if (props.session?.filePath) {
    tabsStore.openPath(props.session.filePath, { mode: 'view' })
  }
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5">
      <div class="flex items-center gap-2">
        <Clock class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">Sesi Koding Terakhir</span>
      </div>

      <button
        v-if="hasSession"
        type="button"
        class="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
        @click="openDevlog"
      >
        <span>Lihat devlog</span>
        <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
      </button>
    </div>

    <div v-if="!hasSession" class="text-xs text-fg-muted italic py-1">
      Belum ada catatan sesi di folder `devlog/`. Klik "Catat Sesi Koding" di atas untuk memulai.
    </div>

    <div v-else class="flex flex-col gap-3.5 text-xs">
      <!-- Info Waktu & Branch -->
      <div class="flex items-center gap-1.5 text-[11px] text-fg-muted">
        <span>{{ session?.timeStr }}</span>
        <template v-if="session?.branch">
          <span class="text-fg-faint">·</span>
          <span class="font-mono text-fg">{{ session.branch }}</span>
        </template>
      </div>

      <!-- Apa yang selesai -->
      <div class="flex flex-col gap-1 border-l-2 border-accent pl-3 py-0.5">
        <span class="text-[11px] font-medium text-fg-muted">Selesai dikerjakan</span>
        <p class="text-fg leading-relaxed">{{ session?.completed }}</p>
      </div>

      <!-- Langkah berikutnya -->
      <div v-if="session?.next" class="flex flex-col gap-1 border-l-2 border-line pl-3 py-0.5">
        <span class="text-[11px] font-medium text-fg-muted">Langkah berikutnya</span>
        <p class="text-fg leading-relaxed">{{ session.next }}</p>
      </div>

      <div v-else class="flex items-center justify-between gap-2 pt-1 text-[11px] text-fg-muted">
        <span>Belum ada target berikutnya.</span>
        <button
          type="button"
          class="shrink-0 font-medium text-accent hover:underline cursor-pointer"
          @click="emit('recordNext')"
        >
          + Tulis target
        </button>
      </div>
    </div>
  </div>
</template>
