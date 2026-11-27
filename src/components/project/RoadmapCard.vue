<script setup lang="ts">
import { ref, computed } from 'vue'
import { CheckSquare, ExternalLink, ChevronDown, Check, FileText, Circle, CheckCircle2, FilePlus2, Copy } from 'lucide-vue-next'
import {
  DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal,
  DropdownMenuContent, DropdownMenuItem,
} from 'reka-ui'
import { useTabsStore } from '@/stores/tabs'
import { useVaultStore } from '@/stores/vault'
import { useToastStore } from '@/stores/toast'
import { ipc } from '@/lib/ipc'
import { parseChecklist } from '@/lib/projectChecklist'
import { getDocSpec, getDocTemplate, buildDocAgentPrompt } from '@/lib/projectDocsGuide'
import { t } from '@/lib/i18n/id'

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
  (e: 'created'): void
}>()

const tabsStore = useTabsStore()
const vaultStore = useVaultStore()
const toastStore = useToastStore()
const dropdownOpen = ref(false)
const showCompleted = ref(false)
const copiedPrompt = ref(false)

const currentDoc = computed(() => {
  return props.documents.find((d) => d.path === props.selectedPath) || props.documents[0] || null
})

const parsedTasks = computed(() => {
  if (!currentDoc.value?.content) return []
  return parseChecklist(currentDoc.value.content)
})

const pendingTasks = computed(() => parsedTasks.value.filter((t) => !t.done))
const completedCount = computed(() => parsedTasks.value.length - pendingTasks.value.length)
const totalCount = computed(() => parsedTasks.value.length)
const percent = computed(() => (totalCount.value === 0 ? 0 : Math.round((completedCount.value / totalCount.value) * 100)))

const displayedTasks = computed(() => {
  if (!showCompleted.value) return pendingTasks.value
  return [...pendingTasks.value, ...parsedTasks.value.filter((t) => t.done)]
})

function selectDoc(path: string) {
  emit('select', path)
  dropdownOpen.value = false
}

function openFile() {
  if (currentDoc.value?.path) {
    tabsStore.openPath(currentDoc.value.path, { mode: 'view' })
  }
}

async function createRoadmap() {
  const spec = getDocSpec('ROADMAP.md')
  if (!spec) return
  try {
    await ipc.noteCreate(spec.filename, getDocTemplate(spec))
    await vaultStore.loadDir('')
    emit('created')
    tabsStore.openPath(spec.filename, { mode: 'edit' })
  } catch {
    toastStore.error(t.createFileFailed('ROADMAP.md'))
  }
}

async function copyPrompt() {
  const spec = getDocSpec('ROADMAP.md')
  if (!spec) return
  try {
    await navigator.clipboard.writeText(buildDocAgentPrompt(spec, vaultStore.current?.name || t.projectBadge))
    copiedPrompt.value = true
    toastStore.success(t.promptCopied('ROADMAP.md'))
    setTimeout(() => { copiedPrompt.value = false }, 1800)
  } catch {
    toastStore.error(t.copyPromptFailed)
  }
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3.5 h-full">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5 shrink-0">
      <div class="flex items-center gap-2">
        <CheckSquare class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">{{ t.roadmapCardTitle }}</span>
      </div>
      <div class="flex items-center gap-2">
        <DropdownMenuRoot v-if="documents.length > 1" v-model:open="dropdownOpen">
          <DropdownMenuTrigger as-child>
            <button type="button" class="flex items-center gap-1.5 rounded-sm border border-line bg-panel-alt px-2 py-1 text-[11px] font-medium text-fg hover:bg-hover hover:border-line/80 transition-colors cursor-pointer outline-none">
              <FileText class="h-3 w-3 text-accent shrink-0" :stroke-width="1.75" />
              <span class="max-w-[120px] truncate">{{ currentDoc?.name || t.selectDocument }}</span>
              <ChevronDown class="h-3 w-3 text-fg-muted shrink-0 opacity-70" :stroke-width="1.75" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent side="bottom" align="end" :side-offset="4" class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 shadow-menu animate-in fade-in zoom-in-95 duration-100">
              <DropdownMenuItem
                v-for="doc in documents" :key="doc.path"
                class="rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center justify-between text-xs text-fg group"
                @select="selectDoc(doc.path)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <FileText class="h-3.5 w-3.5 text-fg-muted group-hover:text-fg shrink-0" :stroke-width="1.75" />
                  <span class="truncate">{{ doc.name }}</span>
                </div>
                <Check v-if="doc.path === currentDoc?.path" class="h-3.5 w-3.5 text-accent shrink-0 ml-2" :stroke-width="2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <button v-if="currentDoc" type="button" class="flex items-center gap-1 text-[11px] text-accent hover:underline cursor-pointer" @click="openFile">
          <span>{{ t.openFile }}</span>
          <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
        </button>
      </div>
    </div>

    <div v-if="totalCount === 0" class="flex flex-col gap-2.5 py-1">
      <span class="text-xs text-fg-muted italic">{{ t.roadmapNoChecklist(currentDoc?.name || t.thisProject) }}</span>
      <div class="flex items-center gap-2">
        <button v-if="documents.length === 0" type="button" class="flex items-center gap-1 rounded-sm bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-fg hover:bg-accent-hover cursor-pointer" @click="createRoadmap">
          <FilePlus2 class="h-3 w-3" :stroke-width="1.75" />
          <span>{{ t.createRoadmapBtn }}</span>
        </button>
        <button type="button" class="flex items-center gap-1 rounded-sm border border-line bg-panel-alt px-2.5 py-1 text-[11px] text-fg-muted hover:bg-hover hover:text-fg cursor-pointer" @click="copyPrompt">
          <Check v-if="copiedPrompt" class="h-3 w-3 text-success" :stroke-width="2" />
          <Copy v-else class="h-3 w-3" :stroke-width="1.75" />
          <span>{{ copiedPrompt ? t.copiedExclaim : t.copyAgentPrompt }}</span>
        </button>
      </div>
    </div>
    <div v-else class="flex flex-col gap-2.5 flex-1 min-h-0">
      <div class="flex flex-col gap-1 shrink-0">
        <div class="flex items-center justify-between text-xs">
          <span class="text-fg font-medium">{{ t.percentDone(percent) }}</span>
          <div class="flex items-center gap-2.5">
            <button v-if="completedCount > 0" type="button" class="text-[11px] text-accent hover:underline cursor-pointer" @click="showCompleted = !showCompleted">
              {{ showCompleted ? t.hideCompleted : t.showCompletedCount(completedCount) }}
            </button>
            <span class="text-fg-muted">{{ t.tasksProgress(completedCount, totalCount) }}</span>
          </div>
        </div>
        <div class="h-2 w-full rounded-full bg-panel-alt overflow-hidden border border-line/40">
          <div class="h-full bg-accent transition-all duration-300 rounded-full" :style="{ width: `${percent}%` }" />
        </div>
      </div>

      <div v-if="displayedTasks.length === 0" class="text-xs text-fg-muted italic py-1">
        {{ t.allTasksDone }}
      </div>
      <div v-else class="flex flex-col gap-1.5 mt-1 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
        <div v-for="(item, idx) in displayedTasks" :key="idx" class="flex items-center gap-2 text-xs">
          <CheckCircle2 v-if="item.done" class="h-3.5 w-3.5 text-success shrink-0" :stroke-width="2" />
          <Circle v-else class="h-3.5 w-3.5 text-fg-faint shrink-0" :stroke-width="1.75" />
          <span :class="['truncate', item.done ? 'text-fg-muted/80' : 'text-fg font-normal']">
            {{ item.text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
