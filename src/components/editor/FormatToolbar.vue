<script setup lang="ts">
import { ref } from 'vue'
import type { EditorView } from '@codemirror/view'
import {
  Undo2, Redo2, ChevronDown, Bold, Italic, Strikethrough, Highlighter,
  Code, SquareCode, Link, List, ListOrdered, SquareCheck, Quote, Table, Minus, Image as ImageIcon,
} from 'lucide-vue-next'
import {
  DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent, DropdownMenuItem,
} from 'reka-ui'
import IconButton from '@/components/ui/IconButton.vue'
import {
  applyUndo, applyRedo, setHeading, toggleInlineMark, toggleLinePrefix,
  insertLink, insertCodeBlock, insertTable, insertHorizontalRule, insertImageFromDisk,
} from '@/lib/editor/commands'
import { toggleTask, setTaskStatus, TASK_STATUSES, HEADINGS } from '@/lib/editor/checkboxWidget'
import { t } from '@/lib/i18n/id'

const props = defineProps<{ view: EditorView | null }>()
const isHeadingOpen = ref(false)
const isTaskOpen = ref(false)
const itemClass = 'rounded-sm px-2.5 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center justify-between text-xs text-fg'

const run = (cmd: (v: EditorView) => void) => { if (props.view) cmd(props.view) }
const handleHeading = (l: number, e?: Event) => {
  if (e) e.preventDefault()
  isHeadingOpen.value = false
  run((v) => {
    setHeading(v, l)
    setTimeout(() => v.focus(), 15)
  })
}
const handleTask = (c: string, e?: Event) => {
  if (e) e.preventDefault()
  isTaskOpen.value = false
  run((v) => {
    setTaskStatus(v, c)
    setTimeout(() => v.focus(), 15)
  })
}
</script>

<template>
  <div class="flex h-9 w-full items-center justify-start gap-1 border-b border-line bg-panel/80 backdrop-blur-xs px-3 text-xs select-none shrink-0 overflow-x-auto" @mousedown.prevent>
    <div class="flex items-center gap-0.5">
      <IconButton :icon="Undo2" label="Urungkan (Ctrl+Z)" :disabled="!view" @click="run(applyUndo)" />
      <IconButton :icon="Redo2" label="Ulangi (Ctrl+Y)" :disabled="!view" @click="run(applyRedo)" />
    </div>

    <div class="h-4 w-px bg-line/80 mx-1" />

    <DropdownMenuRoot v-model:open="isHeadingOpen">
      <DropdownMenuTrigger as-child>
        <button type="button" :disabled="!view" class="h-7 px-2 rounded-sm flex items-center gap-1.5 text-xs font-medium text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-40 cursor-pointer outline-none">
          <span>Heading</span>
          <ChevronDown class="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 text-xs text-fg shadow-menu">
          <DropdownMenuItem v-for="h in HEADINGS" :key="h.level" :class="itemClass" @select="handleHeading(h.level, $event)">
            <span :class="h.level === 1 ? 'font-bold' : h.level ? 'font-semibold' : ''">{{ h.label }}</span>
            <span class="text-fg-faint text-[10px]">{{ h.badge }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenuRoot>

    <div class="h-4 w-px bg-line/80 mx-1" />

    <div class="flex items-center gap-0.5">
      <IconButton :icon="Bold" label="Tebal (**)" :disabled="!view" @click="run((v) => toggleInlineMark(v, '**'))" />
      <IconButton :icon="Italic" label="Miring (*)" :disabled="!view" @click="run((v) => toggleInlineMark(v, '*'))" />
      <IconButton :icon="Strikethrough" label="Coret (~~)" :disabled="!view" @click="run((v) => toggleInlineMark(v, '~~'))" />
      <IconButton :icon="Highlighter" label="Sorot (==)" :disabled="!view" @click="run((v) => toggleInlineMark(v, '=='))" />
      <IconButton :icon="Code" label="Kode Inline (`)" :disabled="!view" @click="run((v) => toggleInlineMark(v, '`'))" />
      <IconButton :icon="Link" label="Tautan (Ctrl+K)" :disabled="!view" @click="run(insertLink)" />
    </div>

    <div class="h-4 w-px bg-line/80 mx-1" />

    <div class="flex items-center gap-0.5">
      <IconButton :icon="Quote" label="Kutipan (>)" :disabled="!view" @click="run((v) => toggleLinePrefix(v, '> '))" />
      <IconButton :icon="List" label="Daftar Bullet (-)" :disabled="!view" @click="run((v) => toggleLinePrefix(v, '- '))" />
      <IconButton :icon="ListOrdered" label="Daftar Nomor (1.)" :disabled="!view" @click="run((v) => toggleLinePrefix(v, '1. '))" />

      <div class="flex items-center">
        <IconButton :icon="SquareCheck" label="Kotak Centang (- [ ])" :disabled="!view" @click="run(toggleTask)" />
        <DropdownMenuRoot v-model:open="isTaskOpen">
          <DropdownMenuTrigger as-child>
            <button type="button" :disabled="!view" class="h-7 w-3.5 -ml-1.5 rounded-sm flex items-center justify-center text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-40 cursor-pointer outline-none" title="Pilihan status tugas">
              <ChevronDown class="h-2.5 w-2.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 text-xs text-fg shadow-menu">
              <DropdownMenuItem v-for="s in TASK_STATUSES" :key="s.char" :class="itemClass" @select="handleTask(s.char, $event)">
                <span class="flex items-center gap-2"><span class="task-checkbox" :data-task="s.char"></span><span>{{ s.label }}</span></span>
                <span class="text-fg-faint text-[10px]">{{ s.code }}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>
    </div>

    <div class="h-4 w-px bg-line/80 mx-1" />

    <div class="flex items-center gap-0.5">
      <IconButton :icon="SquareCode" label="Blok Kode (```)" :disabled="!view" @click="run(insertCodeBlock)" />
      <IconButton :icon="Table" label="Sisipkan Tabel" :disabled="!view" @click="run(insertTable)" />
      <IconButton :icon="ImageIcon" :label="t.insertImage" :disabled="!view" @click="run(insertImageFromDisk)" />
      <IconButton :icon="Minus" label="Garis Pemisah (---)" :disabled="!view" @click="run(insertHorizontalRule)" />
    </div>
  </div>
</template>
