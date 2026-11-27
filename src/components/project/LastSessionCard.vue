<script setup lang="ts">
import { ref, computed } from 'vue'
import { Clock, ExternalLink, ChevronDown, Check, Calendar, Plus } from 'lucide-vue-next'
import {
  DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal,
  DropdownMenuContent, DropdownMenuItem,
} from 'reka-ui'
import { useTabsStore } from '@/stores/tabs'
import type { DevlogFile } from '@/lib/projectDevlog'
import { t } from '@/lib/i18n/id'
import Tooltip from '@/components/ui/Tooltip.vue'

const props = defineProps<{
  files: DevlogFile[]
  selectedPath: string | null
}>()

const emit = defineEmits<{
  (e: 'select', path: string): void
  (e: 'recordNext'): void
}>()

const tabsStore = useTabsStore()
const dropdownOpen = ref(false)

const currentFile = computed(() => {
  return props.files.find((f) => f.path === props.selectedPath) || props.files[0] || null
})

function selectFile(path: string) {
  emit('select', path)
  dropdownOpen.value = false
}

function openDevlog() {
  if (currentFile.value?.path) {
    tabsStore.openPath(currentFile.value.path, { mode: 'view' })
  }
}
</script>

<template>
  <div class="rounded-sm border border-line/70 bg-panel p-4 flex flex-col gap-3 h-full">
    <div class="flex items-center justify-between border-b border-line/60 pb-2.5 shrink-0">
      <div class="flex items-center gap-2">
        <Clock class="h-3.5 w-3.5 text-fg-muted" :stroke-width="1.75" />
        <span class="text-xs font-semibold text-fg">{{ t.devlogCardTitle }}</span>
      </div>
      <div class="flex items-center gap-2">
        <DropdownMenuRoot v-if="files.length > 1" v-model:open="dropdownOpen">
          <DropdownMenuTrigger as-child>
            <button type="button" class="flex items-center gap-1.5 rounded-sm border border-line bg-panel-alt px-2 py-1 text-[11px] font-medium text-fg hover:bg-hover transition-colors cursor-pointer outline-none">
              <Calendar class="h-3 w-3 text-accent shrink-0" :stroke-width="1.75" />
              <span>{{ currentFile?.name }}</span>
              <ChevronDown class="h-3 w-3 text-fg-muted shrink-0 opacity-70" :stroke-width="1.75" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent side="bottom" align="end" :side-offset="4" class="z-110 min-w-40 rounded-sm border border-line bg-panel-alt p-1 shadow-menu">
              <DropdownMenuItem
                v-for="file in files" :key="file.path"
                class="rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center justify-between text-xs text-fg"
                @select="selectFile(file.path)"
              >
                <span>{{ file.name }}</span>
                <Check v-if="file.path === currentFile?.path" class="h-3.5 w-3.5 text-accent shrink-0 ml-2" :stroke-width="2" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
        <Tooltip :content="t.recordDevlogBtn" side="bottom">
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-sm bg-accent-soft text-accent hover:bg-accent hover:text-accent-fg transition-colors cursor-pointer"
            @click="emit('recordNext')"
          >
            <Plus class="h-3.5 w-3.5" :stroke-width="2" />
          </button>
        </Tooltip>
      </div>
    </div>

    <div v-if="!currentFile || currentFile.sessions.length === 0" class="flex flex-col items-start gap-2.5 py-1">
      <span class="text-xs text-fg-muted italic">{{ t.devlogEmpty }}</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent hover:text-accent-fg transition-colors cursor-pointer"
        @click="emit('recordNext')"
      >
        <Plus class="h-3.5 w-3.5 shrink-0" :stroke-width="2" />
        <span>{{ t.recordDevlogBtn }}</span>
      </button>
    </div>
    <div v-else class="flex flex-col gap-3.5 flex-1 min-h-0 overflow-y-auto pr-1 pb-1 text-xs">
      <div v-for="(s, idx) in currentFile.sessions" :key="idx" :class="['flex flex-col gap-2.5', idx > 0 ? 'pt-3 border-t border-line/50' : '']">
        <div class="flex items-center gap-1.5 text-[11px] text-fg-muted">
          <span>{{ currentFile.name }} ({{ s.time }})</span>
          <template v-if="s.branch">
            <span class="text-fg-faint">·</span>
            <span class="font-mono text-fg">{{ s.branch }}</span>
          </template>
        </div>
        <div v-if="s.completed" class="flex flex-col gap-1 border-l-2 border-accent pl-3 py-0.5">
          <span class="text-[11px] font-medium text-fg-muted">{{ t.devlogCompleted }}</span>
          <div class="flex flex-col gap-1.5 text-fg leading-relaxed">
            <div v-for="(line, i) in s.completed.split('\n')" :key="i" class="flex items-start gap-1.5">
              <span v-if="s.completed.includes('\n')" class="text-accent/80 select-none">•</span>
              <span>{{ line }}</span>
            </div>
          </div>
        </div>
        <div v-if="s.next" class="flex flex-col gap-1 border-l-2 border-line pl-3 py-0.5">
          <span class="text-[11px] font-medium text-fg-muted">{{ t.devlogNext }}</span>
          <div class="flex flex-col gap-1.5 text-fg leading-relaxed">
            <div v-for="(line, i) in s.next.split('\n')" :key="i" class="flex items-start gap-1.5">
              <span v-if="s.next.includes('\n')" class="text-fg-muted select-none">•</span>
              <span>{{ line }}</span>
            </div>
          </div>
        </div>
        <div v-else-if="idx === 0" class="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-fg-muted">
          <span>{{ t.devlogNoNext }}</span>
          <button type="button" class="shrink-0 font-medium text-accent hover:underline cursor-pointer" @click="emit('recordNext')">{{ t.devlogWriteNext }}</button>
        </div>
      </div>

      <div class="pt-1">
        <button type="button" class="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline cursor-pointer" @click="openDevlog">
          <span>{{ t.viewDevlog }}</span>
          <ExternalLink class="h-3 w-3" :stroke-width="1.75" />
        </button>
      </div>
    </div>
  </div>
</template>
