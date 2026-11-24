<script setup lang="ts">
import { ref, computed } from 'vue'
import { CheckSquare, ExternalLink, ChevronDown, Check, FileText } from 'lucide-vue-next'
import {
  DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal,
  DropdownMenuContent, DropdownMenuItem,
} from 'reka-ui'
import { useTabsStore } from '@/stores/tabs'

export interface DocumentTarget {
  name: string
  path: string
  content: string
}

const props = defineProps<{
  documents: DocumentTarget[]
  selectedPath: string | null
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
}>()

const tabsStore = useTabsStore()
const dropdownOpen = ref(false)

const currentDoc = computed(() => {
  return props.documents.find((d) => d.path === props.selectedPath) || props.documents[0] || null
})

interface TaskItem {
  text: string
  done: boolean
}

function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}

const parsedTasks = computed(() => {
  if (!currentDoc.value?.content) return []
  const lines = currentDoc.value.content.split('\n')
  const tasks: TaskItem[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- [ ] ')) {
      tasks.push({ text: cleanMarkdownInline(trimmed.slice(6)), done: false })
    } else if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      tasks.push({ text: cleanMarkdownInline(trimmed.slice(6)), done: true })
    }
  }
  return tasks
})

const completedCount = computed(() => parsedTasks.value.filter((t) => t.done).length)
const totalCount = computed(() => parsedTasks.value.length)
const percent = computed(() => (totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100)))

function selectDoc(path: string) {
  emit('select', path)
  dropdownOpen.value = false
}

function openFile() {
  if (currentDoc.value?.path) {
    tabsStore.openPath(currentDoc.value.path, { mode: 'view' })
  }
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5">
      <div class="flex items-center gap-2">
        <CheckSquare class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">Progres Target & Checklist</span>
      </div>

      <!-- Selector Dokumen Target Menggunakan Reka-UI DropdownMenu -->
      <div class="flex items-center gap-2">
        <DropdownMenuRoot v-if="documents.length > 1" v-model:open="dropdownOpen">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-sm border border-line bg-panel-alt px-2 py-1 text-[11px] font-medium text-fg hover:bg-hover hover:border-line/80 transition-colors cursor-pointer outline-none"
            >
              <FileText class="h-3 w-3 text-accent shrink-0" :stroke-width="1.75" />
              <span class="max-w-[120px] truncate">{{ currentDoc?.name || 'Pilih Dokumen' }}</span>
              <ChevronDown class="h-3 w-3 text-fg-muted shrink-0 opacity-70" :stroke-width="1.75" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuPortal>
            <DropdownMenuContent
              side="bottom"
              align="end"
              :side-offset="4"
              class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 shadow-menu animate-in fade-in zoom-in-95 duration-100"
            >
              <DropdownMenuItem
                v-for="doc in documents"
                :key="doc.path"
                class="rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center justify-between text-xs text-fg group"
                @select="selectDoc(doc.path)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <FileText class="h-3.5 w-3.5 text-fg-muted group-hover:text-fg shrink-0" :stroke-width="1.75" />
                  <span class="truncate">{{ doc.name }}</span>
                </div>
                <Check
                  v-if="doc.path === currentDoc?.path"
                  class="h-3.5 w-3.5 text-accent shrink-0 ml-2"
                  :stroke-width="2"
                />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>

        <button
          v-if="currentDoc"
          type="button"
          class="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer"
          @click="openFile"
        >
          <span>Buka file</span>
          <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
        </button>
      </div>
    </div>

    <div v-if="totalCount === 0" class="text-xs text-fg-muted italic py-1">
      Tidak ada checklist tugas (`- [ ]`) di dokumen {{ currentDoc?.name || 'ini' }}.
    </div>

    <div v-else class="flex flex-col gap-2.5">
      <!-- Progress Bar -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-fg font-medium">{{ percent }}% selesai</span>
          <span class="text-fg-muted">{{ completedCount }} dari {{ totalCount }} tugas</span>
        </div>
        <div class="h-2 w-full rounded-full bg-panel-alt overflow-hidden border border-line/40">
          <div
            class="h-full bg-accent transition-all duration-300 rounded-full"
            :style="{ width: `${percent}%` }"
          />
        </div>
      </div>

      <!-- Preview Tugas Teratas -->
      <div class="flex flex-col gap-1.5 mt-1 max-h-48 overflow-y-auto overflow-x-hidden">
        <div
          v-for="(t, idx) in parsedTasks.slice(0, 8)"
          :key="idx"
          class="flex items-center gap-2 text-xs"
        >
          <span :class="['h-2 w-2 rounded-full shrink-0', t.done ? 'bg-success' : 'bg-fg-faint']" />
          <span :class="['truncate', t.done ? 'line-through decoration-fg-faint text-fg-muted' : 'text-fg font-normal']">
            {{ t.text }}
          </span>
        </div>
        <span v-if="parsedTasks.length > 8" class="text-[10px] text-fg-muted mt-1 italic">
          + {{ parsedTasks.length - 8 }} tugas lainnya...
        </span>
      </div>
    </div>
  </div>
</template>
