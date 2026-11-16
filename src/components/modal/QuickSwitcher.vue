<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Search, FileText } from 'lucide-vue-next'
import { ipc } from '@/lib/ipc'
import type { NoteRef } from '@/lib/ipc/types'
import { useTabsStore } from '@/stores/tabs'
import { t } from '@/lib/i18n/id'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const tabsStore = useTabsStore()
const query = ref('')
const allNotes = ref<NoteRef[]>([])
const selectedIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  try {
    allNotes.value = await ipc.vaultListNotes()
  } catch {
    allNotes.value = []
  }
  nextTick(() => inputEl.value?.focus())
})

const filteredNotes = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allNotes.value.slice(0, 30)
  return allNotes.value
    .filter((n) => n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))
    .slice(0, 30)
})

watch(query, () => {
  selectedIndex.value = 0
})

function selectNote(note: NoteRef) {
  tabsStore.openPath(note.path)
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (filteredNotes.value.length > 0) {
      selectedIndex.value = (selectedIndex.value + 1) % filteredNotes.value.length
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (filteredNotes.value.length > 0) {
      selectedIndex.value = (selectedIndex.value - 1 + filteredNotes.value.length) % filteredNotes.value.length
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const target = filteredNotes.value[selectedIndex.value]
    if (target) selectNote(target)
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-100 flex items-start justify-center pt-24 bg-scrim backdrop-blur-xs select-none"
    @click.self="emit('close')"
  >
    <div
      class="flex flex-col w-full max-w-lg rounded-lg border border-line bg-panel-alt shadow-modal overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      @keydown="handleKeydown"
    >
      <div class="flex items-center gap-2 px-3 border-b border-line bg-panel">
        <Search class="h-4 w-4 text-fg-muted shrink-0" :stroke-width="1.75" />
        <input
          ref="inputEl"
          v-model="query"
          type="text"
          class="h-10 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-faint outline-none"
          :placeholder="`${t.quickSwitcherPlaceholder} (Ctrl+O)`"
        />
      </div>

      <div class="max-h-80 overflow-y-auto p-1.5 flex flex-col gap-0.5">
        <div
          v-if="filteredNotes.length === 0"
          class="px-3 py-6 text-center text-xs text-fg-faint"
        >
          {{ t.noMatchingNotes }}
        </div>
        <button
          v-for="(note, idx) in filteredNotes"
          :key="note.path"
          type="button"
          :class="[
            'flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors',
            idx === selectedIndex ? 'bg-selected text-fg font-medium' : 'text-fg-muted hover:bg-hover hover:text-fg',
          ]"
          @click="selectNote(note)"
          @mouseenter="selectedIndex = idx"
        >
          <FileText class="h-3.5 w-3.5 shrink-0 opacity-70" :stroke-width="1.75" />
          <span class="truncate flex-1">{{ note.name.replace(/\.md$/, '') }}</span>
          <span class="text-[11px] text-fg-faint truncate max-w-40 font-mono">{{ note.path }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
