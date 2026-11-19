<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import { ContextMenuRoot, ContextMenuTrigger, ContextMenuPortal, ContextMenuContent, ContextMenuItem } from 'reka-ui'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { useToastStore } from '@/stores/toast'
import { t } from '@/lib/i18n/id'
import type { FileEntry } from '@/lib/ipc/types'
import FileTreeItem from './FileTreeItem.vue'
import IconColorModal from '@/components/modal/IconColorModal.vue'
import DeleteConfirmModal from '@/components/modal/DeleteConfirmModal.vue'
import { useTreeSelection, deduplicatePathsToDelete, sortEntries, type TreeRow } from '@/composables/useTreeSelection'
import { useTreeDrop } from '@/composables/useTreeDrop'
import { useItemDrag } from '@/composables/useItemDrag'
import TreeDragGhost from './TreeDragGhost.vue'

const vaultStore = useVaultStore()
const tabsStore = useTabsStore()
const toastStore = useToastStore()
const renamingPath = ref<string | null>(null)
const iconModalPath = ref<string | null>(null)
const iconModalKind = ref<'file' | 'folder'>('file')
const treeContainerRef = ref<HTMLElement | null>(null)
const deleteModalOpen = ref(false)
const pathsToDelete = ref<string[]>([])
const itemClass = 'rounded-sm px-2 py-1.5 hover:bg-hover cursor-pointer outline-none select-none flex items-center'

const hoverTooltip = ref<{ visible: boolean; text: string; x: number; y: number }>({
  visible: false,
  text: '',
  x: 0,
  y: 0,
})
let hoverTimer: ReturnType<typeof setTimeout> | null = null

const { selectedPaths, dragBox, isSelected, clearSelection, selectAll, handleItemClick, startDrag } = useTreeSelection()
const { isDragOverRoot, onRootDragOver, onRootDragLeave, onRootDrop } = useTreeDrop()
const { isDraggingItem, dropTargetPath, isValidDrop, dragPos, sourceLabel, targetLabel, startItemDrag } = useItemDrag()
const isOverRoot = computed(() => isDragOverRoot.value || (isDraggingItem.value && dropTargetPath.value === '' && isValidDrop.value))

const visibleRows = computed<TreeRow[]>(() => {
  void vaultStore.treeVersion
  const rows: TreeRow[] = []
  function traverse(dirPath: string, depth: number) {
    const list = sortEntries(vaultStore.tree.get(dirPath) ?? [], vaultStore.sortOrder)
    for (const item of list) {
      rows.push({ entry: item, depth })
      if (item.kind === 'folder' && vaultStore.expanded.has(item.path)) traverse(item.path, depth + 1)
    }
  }
  traverse('', 0)
  return rows
})

const allVisiblePaths = computed(() => visibleRows.value.map((r) => r.entry.path))
watch(() => tabsStore.activePath, (p) => { if (p && vaultStore.autoReveal) vaultStore.revealPath(p) }, { immediate: true })

function handleFileClick(entry: FileEntry, e: MouseEvent) {
  handleItemClick(entry, e, allVisiblePaths.value)
  vaultStore.selectedPath = entry.path
  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
    if (entry.kind === 'file') tabsStore.openPath(entry.path, { mode: 'view' })
    else vaultStore.toggleExpand(entry.path)
  }
}

function promptDelete(paths: string[]) {
  pathsToDelete.value = deduplicatePathsToDelete(paths)
  if (pathsToDelete.value.length > 0) deleteModalOpen.value = true
}

async function handleConfirmDelete() {
  deleteModalOpen.value = false
  const targets = [...pathsToDelete.value]
  clearSelection()
  for (const p of targets) {
    await vaultStore.deleteItem(p)
    tabsStore.closeByPath(p)
  }
}

const newlyCreated = ref<{ path: string; kind: 'file' | 'folder' } | null>(null)

async function handleConfirmRename(path: string, newName: string) {
  renamingPath.value = null
  const isCreated = newlyCreated.value?.path === path
  const createdKind = newlyCreated.value?.kind
  newlyCreated.value = null

  const newPath = await vaultStore.renameItem(path, newName)
  tabsStore.renamePath(path, newPath)
  if (isCreated && createdKind === 'file') {
    tabsStore.openPath(newPath, { mode: 'edit' })
  }
}

async function handleCancelRename(path?: string) {
  const target = path ?? renamingPath.value
  renamingPath.value = null
  if (target && newlyCreated.value?.path === target) {
    newlyCreated.value = null
    await vaultStore.deleteItem(target)
  }
}

const handleNewNote = async (folder?: string) => {
  try {
    const p = await vaultStore.createNote(folder)
    newlyCreated.value = { path: p, kind: 'file' }
    renamingPath.value = p
  } catch (err) {
    toastStore.error(err instanceof Error ? err.message : 'Gagal membuat catatan')
  }
}

const handleNewFolder = async (folder?: string) => {
  try {
    const p = await vaultStore.createFolder(folder)
    newlyCreated.value = { path: p, kind: 'folder' }
    renamingPath.value = p
  } catch (err) {
    toastStore.error(err instanceof Error ? err.message : 'Gagal membuat folder')
  }
}

watch(() => vaultStore.requestCreate, (req) => {
  if (req) {
    if (req.kind === 'file') handleNewNote(req.folder)
    else handleNewFolder(req.folder)
  }
})

function handleItemMousedown(path: string, e: MouseEvent) {
  hideTooltip()
  if (e.ctrlKey || e.metaKey || e.shiftKey) return
  const paths = selectedPaths.value.has(path) ? Array.from(selectedPaths.value) : [path]
  startItemDrag(e, paths)
}

function handleItemMouseEnter(name: string, e: MouseEvent) {
  if (isDraggingItem.value) return
  if (hoverTimer) clearTimeout(hoverTimer)
  const clientX = e.clientX
  const clientY = e.clientY
  hoverTimer = setTimeout(() => {
    hoverTooltip.value = {
      visible: true,
      text: name,
      x: clientX + 14,
      y: clientY + 10,
    }
  }, 400)
}

function hideTooltip() {
  if (hoverTimer) clearTimeout(hoverTimer)
  hoverTooltip.value.visible = false
}

watch(() => vaultStore.current?.path, () => {
  hideTooltip()
})

function handleKeydown(e: KeyboardEvent) {
  if (renamingPath.value) return
  if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
    e.preventDefault(); selectAll(allVisiblePaths.value)
  } else if (e.key === 'F2' && vaultStore.selectedPath) {
    renamingPath.value = vaultStore.selectedPath
  } else if (e.key === 'Delete') {
    const list = selectedPaths.value.size > 0 ? Array.from(selectedPaths.value) : vaultStore.selectedPath ? [vaultStore.selectedPath] : []
    promptDelete(list)
  }
}
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <div
        ref="treeContainerRef"
        role="tree"
        tabindex="0"
        :class="['flex-1 flex flex-col overflow-y-auto select-none py-1 outline-none relative', isOverRoot ? 'bg-accent/10 ring-2 ring-inset ring-accent/40' : '', isDraggingItem ? 'cursor-grabbing' : '']"
        @keydown="handleKeydown"
        @mousedown="treeContainerRef && startDrag($event, treeContainerRef)"
        @dragover.prevent="onRootDragOver"
        @dragleave.prevent="onRootDragLeave"
        @drop.prevent="onRootDrop"
      >
        <div v-if="visibleRows.length === 0" class="p-4 text-center">
          <p class="text-xs text-fg-faint">{{ t.vaultEmpty }}</p>
          <button type="button" class="mt-3 inline-flex items-center gap-1 rounded-sm bg-accent/20 px-2 py-1 text-xs text-accent hover:bg-accent/30 cursor-pointer" @click="handleNewNote('')">
            <Plus class="h-3.5 w-3.5" :stroke-width="1.75" />{{ t.newNote }}
          </button>
        </div>

        <div v-else class="flex flex-col">
          <FileTreeItem
            v-for="row in visibleRows"
            :key="row.entry.path"
            :entry="row.entry"
            :depth="row.depth"
            :is-expanded="vaultStore.expanded.has(row.entry.path)"
            :is-active="tabsStore.activePath === row.entry.path"
            :is-selected="isSelected(row.entry.path)"
            :is-drag-over="isValidDrop && dropTargetPath === row.entry.path"
            :is-renaming="renamingPath === row.entry.path"
            :is-new="newlyCreated?.path === row.entry.path"
            :style-config="vaultStore.itemStyles[row.entry.path]"
            @edit-icon="iconModalPath = row.entry.path; iconModalKind = row.entry.kind"
            @click="handleFileClick"
            @toggle="vaultStore.toggleExpand"
            @open-new-tab="tabsStore.openPath($event, { newTab: true, mode: 'view' })"
            @start-rename="renamingPath = $event"
            @confirm-rename="handleConfirmRename"
            @cancel-rename="handleCancelRename"
            @delete="promptDelete(selectedPaths.has($event) ? Array.from(selectedPaths) : [$event])"
            @new-note="handleNewNote"
            @new-folder="handleNewFolder"
            @mousedown-item="handleItemMousedown"
            @item-mouseenter="handleItemMouseEnter"
            @item-mouseleave="hideTooltip"
          />
        </div>
        <div class="flex-1 min-h-8" />
        <div
          v-if="dragBox"
          class="fixed border border-accent bg-accent/15 rounded-xs pointer-events-none z-50"
          :style="{ left: `${dragBox.left}px`, top: `${dragBox.top}px`, width: `${dragBox.width}px`, height: `${dragBox.height}px` }"
        />
      </div>
    </ContextMenuTrigger>

    <!-- Cursor Follower Floating Tooltip -->
    <Teleport to="body">
      <div
        v-if="hoverTooltip.visible"
        class="fixed pointer-events-none z-130 rounded-sm border border-line bg-panel-alt px-2 py-1 text-xs text-fg shadow-menu max-w-xs break-all animate-in fade-in duration-100"
        :style="{ left: `${hoverTooltip.x}px`, top: `${hoverTooltip.y}px` }"
      >
        {{ hoverTooltip.text }}
      </div>
    </Teleport>

    <ContextMenuPortal>
      <ContextMenuContent class="z-110 min-w-44 rounded-sm border border-line bg-panel-alt p-1 text-xs text-fg shadow-menu">
        <ContextMenuItem :class="itemClass" @select="handleNewNote('')">{{ t.newNote }}</ContextMenuItem>
        <ContextMenuItem :class="itemClass" @select="handleNewFolder('')">{{ t.newFolder }}</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>

  <IconColorModal
    :open="!!iconModalPath"
    :path="iconModalPath ?? ''"
    :kind="iconModalKind"
    :current-style="iconModalPath ? vaultStore.itemStyles[iconModalPath] : undefined"
    @close="iconModalPath = null"
    @save="iconModalPath && vaultStore.setItemStyle(iconModalPath, $event)"
  />
  <DeleteConfirmModal :open="deleteModalOpen" :paths="pathsToDelete" @close="deleteModalOpen = false" @confirm="handleConfirmDelete" />
  <TreeDragGhost :visible="isDraggingItem" :x="dragPos.x" :y="dragPos.y" :source-label="sourceLabel" :target-label="targetLabel" :is-valid="isValidDrop" />
</template>
