<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import {
  ContextMenuRoot,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from 'reka-ui'
import { t } from '@/lib/i18n/id'
import { ipc } from '@/lib/ipc'
import type { FileEntry, ItemStyle } from '@/lib/ipc/types'
import ItemIcon from './ItemIcon.vue'

const props = defineProps<{
  entry: FileEntry
  depth: number
  isExpanded: boolean
  isActive: boolean
  isSelected: boolean
  isDragOver?: boolean
  isRenaming: boolean
  isNew?: boolean
  styleConfig?: ItemStyle
}>()

const emit = defineEmits<{
  (e: 'click', entry: FileEntry, event: MouseEvent): void
  (e: 'toggle', path: string): void
  (e: 'open-new-tab', path: string): void
  (e: 'start-rename', path: string): void
  (e: 'confirm-rename', path: string, newName: string): void
  (e: 'cancel-rename', path: string): void
  (e: 'delete', path: string): void
  (e: 'new-note', folder: string): void
  (e: 'new-folder', folder: string): void
  (e: 'edit-icon', path: string): void
  (e: 'mousedown-item', path: string, event: MouseEvent): void
  (e: 'item-mouseenter', name: string, event: MouseEvent): void
  (e: 'item-mouseleave'): void
}>()

const editName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const itemClass = 'rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center'

const displayName = computed(() => {
  return props.entry.kind === 'file' ? props.entry.name.replace(/\.md$/, '') : props.entry.name
})

let isSubmitting = false
watch(() => props.isRenaming, (renaming) => {
  if (renaming) {
    isSubmitting = false
    editName.value = props.isNew ? '' : displayName.value
    nextTick(() => {
      inputRef.value?.focus()
      if (!props.isNew) inputRef.value?.select()
    })
  }
})

function submitRename() {
  if (isSubmitting) return
  isSubmitting = true
  const val = editName.value.trim()
  if (!val || (!props.isNew && val === displayName.value)) {
    emit('cancel-rename', props.entry.path)
    return
  }
  emit('confirm-rename', props.entry.path, val)
}

const handleClick = (e: MouseEvent) => { if (!props.isRenaming) emit('click', props.entry, e) }
const copyPath = () => navigator.clipboard.writeText(props.entry.path)
const revealInManager = () => ipc.revealInFileManager(props.entry.path)
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        role="treeitem"
        :data-tree-path="entry.path"
        :data-tree-kind="entry.kind"
        :aria-expanded="entry.kind === 'folder' ? isExpanded : undefined"
        :style="{ paddingLeft: `calc(6px + ${depth} * var(--tree-indent, 12px))` }"
        :class="[
          'flex h-(--tree-row-h) items-center gap-1.5 pr-2 text-xs cursor-pointer transition-colors duration-100',
          isDragOver ? 'ring-2 ring-accent bg-accent/30 text-fg font-semibold rounded-xs' : isSelected ? 'bg-accent/20 text-fg font-medium' : isActive ? 'bg-selected text-fg font-medium' : 'text-fg/100 hover:bg-hover hover:text-fg',
        ]"
        @click="handleClick"
        @mousedown.stop="!isRenaming && emit('mousedown-item', entry.path, $event)"
        @mouseenter="!isRenaming && emit('item-mouseenter', displayName, $event)"
        @mouseleave="emit('item-mouseleave')"
      >
        <button
          v-if="entry.kind === 'folder'"
          type="button"
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm hover:bg-hover text-fg-muted cursor-pointer"
          @click.stop="emit('toggle', entry.path)"
        >
          <ChevronRight :class="['h-3.5 w-3.5 transition-transform duration-100', isExpanded ? 'rotate-90' : '']" :stroke-width="1.75" />
        </button>
        <span v-else class="w-4 shrink-0" />

        <ItemIcon :kind="entry.kind" :style-config="styleConfig" />

        <input
          v-if="isRenaming"
          ref="inputRef"
          v-model="editName"
          type="text"
          :placeholder="entry.kind === 'file' ? 'Nama catatan...' : 'Nama folder...'"
          class="flex-1 bg-panel-alt px-1 py-0.5 rounded-xs border border-accent text-fg text-xs outline-none"
          @click.stop
          @keydown.enter.stop="inputRef?.blur()"
          @keydown.esc.stop="emit('cancel-rename', entry.path)"
          @blur="submitRename"
        />
        <span v-else class="truncate flex-1">{{ displayName }}</span>
      </div>
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <ContextMenuContent class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 text-xs text-fg shadow-menu">
        <template v-if="entry.kind === 'file'">
          <ContextMenuItem :class="itemClass" @select="emit('open-new-tab', entry.path)">{{ t.openInNewTab }}</ContextMenuItem>
        </template>
        <template v-else>
          <ContextMenuItem :class="itemClass" @select="emit('new-note', entry.path)">{{ t.newNote }}</ContextMenuItem>
          <ContextMenuItem :class="itemClass" @select="emit('new-folder', entry.path)">{{ t.newFolder }}</ContextMenuItem>
        </template>
        <ContextMenuSeparator class="my-1 h-px bg-line" />
        <ContextMenuItem :class="itemClass" @select="copyPath">{{ t.copyPath }}</ContextMenuItem>
        <ContextMenuItem :class="itemClass" @select="revealInManager">{{ t.revealInFileManager }}</ContextMenuItem>
        <ContextMenuSeparator class="my-1 h-px bg-line" />
        <ContextMenuItem :class="itemClass" @select="emit('edit-icon', entry.path)">{{ t.changeIconColor }}</ContextMenuItem>
        <ContextMenuItem :class="itemClass" @select="emit('start-rename', entry.path)">{{ t.rename }}</ContextMenuItem>
        <ContextMenuItem :class="[itemClass, 'text-danger']" @select="emit('delete', entry.path)">{{ t.delete }}</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
