<script setup lang="ts">
import { ref, computed } from 'vue'
import { Command, Copy, Check } from 'lucide-vue-next'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
import type { ProjectCommand } from '@/lib/projectCommands'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'

const props = defineProps<{
  commands: ProjectCommand[]
}>()

const toastStore = useToastStore()
const copiedCmd = ref<string | null>(null)
const isOpen = ref(false)

const groupedCommands = computed(() => {
  const map = new Map<string, ProjectCommand[]>()
  for (const cmd of props.commands) {
    const list = map.get(cmd.group) ?? []
    list.push(cmd)
    map.set(cmd.group, list)
  }
  return [...map.entries()].map(([group, items]) => ({ group, items }))
})

async function copyCommand(cmd: string) {
  try {
    await navigator.clipboard.writeText(cmd)
    copiedCmd.value = cmd
    toastStore.success(t.cmdCopied(cmd))
    setTimeout(() => {
      if (copiedCmd.value === cmd) copiedCmd.value = null
    }, 1500)
  } catch {
    toastStore.error(t.copyCmdFailed)
  }
}
</script>

<template>
  <PopoverRoot v-model:open="isOpen">
    <div class="relative group inline-flex">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-sm border border-line/70 bg-panel px-2.5 py-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg transition-colors cursor-pointer outline-none"
        >
          <Command class="h-3.5 w-3.5" :stroke-width="1.75" />
          <span>{{ t.cliBtn }}</span>
        </button>
      </PopoverTrigger>
      <span
        v-if="!isOpen"
        class="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-100 whitespace-nowrap rounded-sm border border-line bg-panel-alt px-2 py-1 text-xs text-fg shadow-menu opacity-0 group-hover:opacity-100 transition-opacity duration-150 select-none"
      >
        {{ t.cliTooltip }}
      </span>
    </div>
    <PopoverPortal>
      <PopoverContent
        side="bottom"
        align="end"
        :side-offset="6"
        class="z-110 w-96 max-h-80 overflow-y-auto overflow-x-hidden rounded-sm border border-line bg-panel-alt p-3 shadow-menu text-xs"
      >
        <div class="text-xs font-semibold text-fg pb-2 mb-2 border-b border-line flex items-center justify-between">
          <span>{{ t.cliTitle }}</span>
          <span class="text-[11px] font-normal text-fg-muted">{{ t.clickToCopy }}</span>
        </div>
        <div v-if="commands.length === 0" class="py-2 text-[11px] text-fg-muted italic">
          {{ t.cliEmpty }}
        </div>
        <div v-else class="flex flex-col gap-3">
          <div v-for="section in groupedCommands" :key="section.group" class="flex flex-col gap-0.5">
            <div class="text-[11px] font-semibold text-accent px-1.5 pb-1">
              {{ section.group }}
            </div>
            <button
              v-for="item in section.items"
              :key="`${item.group}-${item.command}`"
              type="button"
              :title="item.command"
              class="group flex items-center gap-2.5 rounded-xs px-1.5 py-1.5 text-left hover:bg-hover transition-colors cursor-pointer"
              @click="copyCommand(item.command)"
            >
              <span class="w-20 shrink-0 text-[11px] font-medium text-fg truncate">{{ item.label }}</span>
              <span class="flex-1 font-mono text-[11px] text-fg-muted group-hover:text-fg truncate">{{ item.command }}</span>
              <Check v-if="copiedCmd === item.command" class="h-3.5 w-3.5 text-success shrink-0" :stroke-width="2" />
              <Copy v-else class="h-3 w-3 text-fg-muted opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" :stroke-width="1.75" />
            </button>
          </div>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
