<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Search, X, FileText } from 'lucide-vue-next'
import { ipc, type SearchHit } from '@/lib/ipc'
import { useTabsStore } from '@/stores/tabs'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const tabsStore = useTabsStore()
const toastStore = useToastStore()

const query = ref('')
const caseSensitive = ref(false)
const useRegex = ref(false)
const results = ref<SearchHit[]>([])
const isSearching = ref(false)
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

let debounceTimer: number | null = null

watch([query, caseSensitive, useRegex], () => {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = window.setTimeout(() => {
    performSearch()
  }, 300)
})

async function performSearch() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    return
  }

  isSearching.value = true
  try {
    const hits = await ipc.searchInVault(q, useRegex.value, caseSensitive.value)
    results.value = hits
    selectedIndex.value = 0
  } catch (error: any) {
    toastStore.error(error.message || 'Gagal melakukan pencarian')
    results.value = []
  } finally {
    isSearching.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
      scrollToSelected()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
      scrollToSelected()
    }
  } else if (e.key === 'Enter' && results.value.length > 0) {
    e.preventDefault()
    openResult(results.value[selectedIndex.value])
  }
}

function scrollToSelected() {
  const el = document.querySelector(`[data-result-index="${selectedIndex.value}"]`)
  if (el) {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
}

async function openResult(hit: SearchHit) {
  tabsStore.openPath(hit.path)
  emit('close')

  // TODO: Scroll to line number setelah file dibuka
  // Butuh extend TabState untuk simpan target line
}

function clearQuery() {
  query.value = ''
  nextTick(() => {
    inputRef.value?.focus()
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  nextTick(() => {
    inputRef.value?.focus()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer)
  }
})
</script>

<template>
  <div class="fixed inset-0 z-150 flex justify-center pt-20 bg-black/60 backdrop-blur-xs select-none p-4 animate-in fade-in duration-100">
    <div
      class="relative flex flex-col w-full max-w-2xl h-[500px] rounded-lg border border-line bg-panel shadow-modal overflow-hidden text-fg"
      @click.stop
    >
      <!-- Search Input -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-line bg-panel-alt/50 shrink-0">
        <Search class="h-4 w-4 text-fg-muted" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          :placeholder="t.searchPlaceholder"
          class="flex-1 bg-transparent outline-none text-sm text-fg placeholder:text-fg-muted"
        />
        <button
          v-if="query"
          type="button"
          class="h-5 w-5 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none"
          @click="clearQuery"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        <div class="flex items-center gap-2 text-xs">
          <label class="flex items-center gap-1.5 cursor-pointer text-fg-muted hover:text-fg transition-colors">
            <input v-model="caseSensitive" type="checkbox" class="rounded border-line" />
            <span>Aa</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer text-fg-muted hover:text-fg transition-colors">
            <input v-model="useRegex" type="checkbox" class="rounded border-line" />
            <span>.*</span>
          </label>
        </div>
        <button
          type="button"
          class="h-6 w-6 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none"
          @click="$emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <!-- Results Count -->
      <div v-if="query.trim()" class="px-4 py-2 text-xs text-fg-muted border-b border-line bg-panel-alt/30 shrink-0">
        <span v-if="isSearching">Mencari...</span>
        <span v-else-if="results.length > 0">{{ t.searchResults(results.length) }}</span>
        <span v-else>{{ t.noSearchResults }}</span>
      </div>

      <!-- Results List -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="results.length === 0 && !query.trim()" class="flex items-center justify-center h-full text-fg-muted text-sm">
          {{ t.searchInVault }}
        </div>
        <div v-else-if="results.length === 0 && query.trim() && !isSearching" class="flex items-center justify-center h-full text-fg-muted text-sm">
          {{ t.noSearchResults }}
        </div>
        <div v-else class="divide-y divide-line">
          <button
            v-for="(hit, idx) in results"
            :key="`${hit.path}-${hit.line}`"
            type="button"
            :data-result-index="idx"
            :class="[
              'w-full px-4 py-3 text-left cursor-pointer outline-none transition-colors',
              idx === selectedIndex ? 'bg-hover' : 'hover:bg-panel-alt/50',
            ]"
            @click="openResult(hit)"
          >
            <div class="flex items-start gap-2">
              <FileText class="h-4 w-4 text-fg-muted shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="text-sm font-medium text-fg truncate">{{ hit.name }}</span>
                  <span class="text-xs text-fg-muted shrink-0">{{ t.rootFolder }}/{{ hit.path }}</span>
                </div>
                <div class="text-xs text-fg-muted mt-1 line-clamp-2">
                  <span class="font-mono">{{ hit.line }}:</span> {{ hit.snippet }}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Footer Hint -->
      <div class="px-4 py-2 text-[11px] text-fg-faint border-t border-line bg-panel-alt/30 shrink-0 flex items-center gap-4">
        <span><kbd class="px-1 py-0.5 rounded bg-app border border-line font-mono text-[10px] text-fg-muted">↑↓</kbd> Navigasi</span>
        <span><kbd class="px-1 py-0.5 rounded bg-app border border-line font-mono text-[10px] text-fg-muted">Enter</kbd> Buka</span>
        <span><kbd class="px-1 py-0.5 rounded bg-app border border-line font-mono text-[10px] text-fg-muted">Esc</kbd> Tutup</span>
      </div>
    </div>
  </div>
</template>
