<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles, Download, RefreshCw, X } from 'lucide-vue-next'
import { t } from '@/lib/i18n/id'
import { useUpdater } from '@/composables/useUpdater'
import { renderMarkdown } from '@/lib/markdown/render'
import { useToastStore } from '@/stores/toast'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const {
  isDownloading,
  downloadProgress,
  availableVersion,
  releaseDate,
  releaseNotes,
  downloadAndInstall,
} = useUpdater()
const toastStore = useToastStore()

const renderedNotes = computed(() => {
  if (!releaseNotes.value) return ''
  return renderMarkdown(releaseNotes.value).html
})

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

async function handleDownload() {
  try {
    await downloadAndInstall()
  } catch {
    toastStore.error(t.updateError)
  }
}
</script>

<template>
  <div class="fixed inset-0 z-150 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4 animate-in fade-in duration-100">
    <div
      class="relative flex flex-col w-full max-w-lg max-h-[85vh] rounded-lg border border-line bg-panel shadow-modal overflow-hidden text-fg"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-panel-alt/50 shrink-0">
        <div class="flex items-center gap-2">
          <Sparkles class="h-4 w-4 text-accent" />
          <h2 class="text-sm font-semibold tracking-wide">{{ t.updateAvailable }}</h2>
        </div>
        <button
          type="button"
          class="h-7 w-7 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none"
          :disabled="isDownloading"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        <div>
          <h3 class="text-sm font-bold text-fg">
            {{ availableVersion ? t.updateVersion(availableVersion) : t.updateAvailable }}
          </h3>
          <p v-if="releaseDate" class="text-fg-muted text-[11px] mt-0.5">
            {{ t.releasedOn(formatDate(releaseDate)) }}
          </p>
        </div>

        <!-- Release Notes Section -->
        <div class="space-y-2">
          <span class="text-[11px] font-semibold text-fg-muted uppercase tracking-wider block">
            {{ t.releaseNotesTitle }}
          </span>
          <div
            v-if="renderedNotes"
            class="max-h-60 overflow-y-auto rounded-md border border-line bg-panel-alt/50 px-3.5 py-3 text-xs leading-relaxed text-fg select-text prose prose-invert prose-xs max-w-none [&>*:last-child]:mb-2"
            v-html="renderedNotes"
          />
          <div
            v-else
            class="rounded-md border border-line bg-panel-alt/40 px-3.5 py-3 text-fg-muted text-[11px]"
          >
            {{ t.noReleaseNotes }}
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="flex items-center justify-end gap-2.5 px-4 py-3 border-t border-line bg-panel-alt/40 shrink-0">
        <button
          type="button"
          class="px-3.5 py-1.5 rounded-sm border border-line bg-panel hover:bg-hover text-fg-muted hover:text-fg text-xs font-medium transition-colors cursor-pointer outline-none disabled:opacity-50"
          :disabled="isDownloading"
          @click="emit('close')"
        >
          {{ t.remindMeLater }}
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-sm bg-accent hover:bg-accent-hover active:opacity-90 text-accent-fg font-semibold text-xs transition-colors cursor-pointer outline-none shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="isDownloading"
          @click="handleDownload"
        >
          <Download v-if="!isDownloading" class="h-3.5 w-3.5 stroke-[2.25]" />
          <RefreshCw v-else class="h-3.5 w-3.5 animate-spin" />
          <span v-if="!isDownloading">{{ t.downloadUpdate }}</span>
          <span v-else>{{ t.downloading }} {{ downloadProgress }}%</span>
        </button>
      </div>
    </div>
  </div>
</template>
