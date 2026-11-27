<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, BookMarked, FilePlus2, ExternalLink, Copy, Check } from 'lucide-vue-next'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { useToastStore } from '@/stores/toast'
import { ipc } from '@/lib/ipc'
import { t, currentLocale } from '@/lib/i18n'
import {
  PROJECT_DOC_SPECS,
  DOC_CATEGORIES,
  DOC_WRITING_RULES,
  buildDocAgentPrompt,
  type DocCategory,
  type ProjectDocSpec,
} from '@/lib/projectDocsGuide'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created'): void
}>()

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()
const toastStore = useToastStore()

const activeCategory = ref<DocCategory>('core')
const copiedFile = ref<string | null>(null)
const creatingFile = ref<string | null>(null)

const writingRules = computed(() => DOC_WRITING_RULES[currentLocale.value])
const localizedCategories = computed(() =>
  DOC_CATEGORIES.map((cat) => ({ id: cat.id, label: cat.label[currentLocale.value] })),
)

const filteredDocs = computed(() =>
  PROJECT_DOC_SPECS.filter((d) => d.category === activeCategory.value).map((d) => ({
    ...d,
    localSummary: d.summary[currentLocale.value],
  })),
)

const rootFiles = computed(() => {
  const entries = vaultStore.tree.get('') || []
  return new Set(entries.filter((e) => e.kind === 'file').map((e) => e.name.toUpperCase()))
})

function existsInRoot(filename: string): boolean {
  return rootFiles.value.has(filename.toUpperCase())
}

async function handleCreateDoc(spec: ProjectDocSpec) {
  creatingFile.value = spec.filename
  try {
    await ipc.noteCreate(spec.filename, spec.template[currentLocale.value])
    await vaultStore.loadDir('')
    emit('created')
    emit('close')
    tabsStore.openPath(spec.filename, { mode: 'edit' })
    toastStore.success(t.fileCreated(spec.filename))
  } catch {
    toastStore.error(t.createFileFailed(spec.filename))
  } finally {
    creatingFile.value = null
  }
}

function handleOpenDoc(filename: string) {
  emit('close')
  tabsStore.openPath(filename, { mode: 'view' })
}

async function handleCopyPrompt(spec: ProjectDocSpec) {
  try {
    const projectName = vaultStore.current?.name || t.projectBadge
    await navigator.clipboard.writeText(buildDocAgentPrompt(spec, projectName))
    copiedFile.value = spec.filename
    toastStore.success(t.promptCopied(spec.filename))
    setTimeout(() => {
      if (copiedFile.value === spec.filename) copiedFile.value = null
    }, 1800)
  } catch {
    toastStore.error(t.copyPromptFailed)
  }
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-110 flex items-center justify-center bg-scrim backdrop-blur-xs select-none p-4" @click.self="emit('close')">
    <div class="flex flex-col w-full max-w-3xl h-[640px] max-h-[90vh] rounded-lg border border-line bg-panel-alt shadow-modal overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-line bg-panel">
        <div class="flex items-center gap-2">
          <BookMarked class="h-4 w-4 text-accent" :stroke-width="1.75" />
          <h2 class="text-sm font-semibold text-fg">{{ t.projectDocsTitle }}</h2>
        </div>
        <button type="button" class="h-6 w-6 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg cursor-pointer" @click="emit('close')">
          <X class="h-4 w-4" :stroke-width="1.75" />
        </button>
      </div>

      <div class="p-4 flex flex-col gap-3.5 flex-1 min-h-0 text-xs">
        <div class="rounded-sm border border-line/70 bg-panel p-3 flex flex-col gap-1.5 shrink-0">
          <span class="text-xs font-semibold text-fg">{{ t.docRulesTitle }}</span>
          <div v-for="(rule, i) in writingRules" :key="i" class="flex items-start gap-2 text-xs text-fg/90 leading-relaxed">
            <span class="text-accent font-semibold">{{ i + 1 }}.</span>
            <span>{{ rule }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1.5 border-b border-line pb-2 shrink-0">
          <button
            v-for="cat in localizedCategories" :key="cat.id" type="button"
            :class="['px-2.5 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer', activeCategory === cat.id ? 'bg-accent text-accent-fg' : 'text-fg/80 hover:bg-hover hover:text-fg']"
            @click="activeCategory = cat.id"
          >
            {{ cat.label }}
          </button>
        </div>

        <div class="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
          <div v-for="doc in filteredDocs" :key="doc.filename" class="flex items-center justify-between gap-3 rounded-sm border border-line/70 bg-panel px-3.5 py-3">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[13px] font-semibold text-fg">{{ doc.filename }}</span>
                <span v-if="existsInRoot(doc.filename)" class="text-[10px] px-1.5 py-0.2 rounded-xs bg-accent-soft text-accent font-medium">{{ t.docExistsBadge }}</span>
              </div>
              <span class="text-xs text-fg/80 leading-relaxed">{{ doc.localSummary }}</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                v-if="existsInRoot(doc.filename)" type="button"
                class="flex items-center gap-1 rounded-sm border border-line bg-panel-alt px-2.5 py-1.5 text-xs text-fg hover:bg-hover cursor-pointer"
                @click="handleOpenDoc(doc.filename)"
              >
                <ExternalLink class="h-3.5 w-3.5" :stroke-width="1.75" />
                <span>{{ t.openHint }}</span>
              </button>
              <button
                v-else type="button" :disabled="creatingFile === doc.filename"
                class="flex items-center gap-1 rounded-sm bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent-hover cursor-pointer disabled:opacity-50"
                @click="handleCreateDoc(doc)"
              >
                <FilePlus2 class="h-3.5 w-3.5" :stroke-width="1.75" />
                <span>{{ t.createBtn }}</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-1 rounded-sm border border-line bg-panel-alt px-2.5 py-1.5 text-xs text-fg/85 hover:bg-hover hover:text-fg cursor-pointer"
                @click="handleCopyPrompt(doc)"
              >
                <Check v-if="copiedFile === doc.filename" class="h-3.5 w-3.5 text-success" :stroke-width="2" />
                <Copy v-else class="h-3.5 w-3.5" :stroke-width="1.75" />
                <span>{{ copiedFile === doc.filename ? t.copiedLabel : t.promptLabel }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
