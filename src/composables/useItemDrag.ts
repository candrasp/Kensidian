import { ref, computed } from 'vue'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { t } from '@/lib/i18n/id'

function getParent(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? '' : path.slice(0, idx)
}

function checkValidDrop(sources: string[], target: string | null): boolean {
  if (target === null || sources.length === 0) return false
  for (const s of sources) {
    if (s === target || (target && target.startsWith(`${s}/`))) return false
  }
  return sources.some((s) => getParent(s) !== target)
}

function resolveTarget(x: number, y: number): { target: string | null; isTree: boolean } {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  const tree = el?.closest<HTMLElement>('[role="tree"]')
  if (!tree) return { target: null, isTree: false }

  const itemEl = el?.closest<HTMLElement>('[data-tree-path]')
  if (!itemEl) return { target: '', isTree: true }

  const kind = itemEl.dataset.treeKind
  const path = itemEl.dataset.treePath ?? ''
  if (kind === 'folder') return { target: path, isTree: true }
  return { target: getParent(path), isTree: true }
}

export function useItemDrag() {
  const vaultStore = useVaultStore()
  const tabsStore = useTabsStore()
  const isDraggingItem = ref(false)
  const dragSources = ref<string[]>([])
  const dropTargetPath = ref<string | null>(null)
  const isValidDrop = ref(false)
  const dragPos = ref({ x: 0, y: 0 })

  let startX = 0
  let startY = 0

  const sourceLabel = computed(() => {
    if (dragSources.value.length === 0) return ''
    if (dragSources.value.length === 1) {
      const name = dragSources.value[0].split('/').pop() ?? ''
      return name.replace(/\.md$/, '')
    }
    return t.dragItemsCount(dragSources.value.length)
  })

  const targetLabel = computed(() => {
    if (dropTargetPath.value === null) return ''
    if (dropTargetPath.value === '') return t.rootFolder
    return dropTargetPath.value.split('/').pop() ?? t.rootFolder
  })

  function resetState() {
    isDraggingItem.value = false
    dragSources.value = []
    dropTargetPath.value = null
    isValidDrop.value = false
    document.body.style.cursor = ''
  }

  function onMouseMove(e: MouseEvent) {
    dragPos.value = { x: e.clientX, y: e.clientY }
    if (!isDraggingItem.value) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return
      isDraggingItem.value = true
      document.body.style.cursor = 'grabbing'
    }
    const { target } = resolveTarget(e.clientX, e.clientY)
    dropTargetPath.value = target
    isValidDrop.value = checkValidDrop(dragSources.value, target)
  }

  async function onMouseUp(e: MouseEvent) {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    if (!isDraggingItem.value) {
      resetState()
      return
    }

    const { target } = resolveTarget(e.clientX, e.clientY)
    const valid = checkValidDrop(dragSources.value, target)
    const sourcesToMove = [...dragSources.value]
    resetState()

    if (valid && target !== null) {
      for (const p of sourcesToMove) {
        const newPath = await vaultStore.moveItem(p, target)
        if (newPath) tabsStore.renamePath(p, newPath)
      }
    }
  }

  function startItemDrag(e: MouseEvent, paths: string[]) {
    if (e.button !== 0) return
    startX = e.clientX
    startY = e.clientY
    dragPos.value = { x: e.clientX, y: e.clientY }
    dragSources.value = paths
    isDraggingItem.value = false
    dropTargetPath.value = null
    isValidDrop.value = false
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return {
    isDraggingItem,
    dragSources,
    dropTargetPath,
    isValidDrop,
    dragPos,
    sourceLabel,
    targetLabel,
    startItemDrag,
  }
}
