import { ref } from 'vue'
import type { FileEntry, SortOrder } from '@/lib/ipc/types'

export interface DragBox {
  left: number
  top: number
  width: number
  height: number
}

export interface TreeRow {
  entry: FileEntry
  depth: number
}

export function sortEntries(entries: FileEntry[], order: SortOrder): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    if (order === 'name-asc') return a.name.localeCompare(b.name, 'id', { numeric: true })
    if (order === 'name-desc') return b.name.localeCompare(a.name, 'id', { numeric: true })
    return order === 'mtime-desc' ? b.mtime - a.mtime : a.mtime - b.mtime
  })
}

export function deduplicatePathsToDelete(paths: Iterable<string>): string[] {
  const sorted = Array.from(paths).sort()
  const result: string[] = []
  for (const p of sorted) {
    const isSubPath = result.some((parent) => p === parent || p.startsWith(`${parent}/`))
    if (!isSubPath) result.push(p)
  }
  return result
}

export function useTreeSelection() {
  const selectedPaths = ref<Set<string>>(new Set())
  const lastSelectedPath = ref<string | null>(null)
  const dragBox = ref<DragBox | null>(null)
  const isDragging = ref(false)

  let startX = 0
  let startY = 0
  let containerRef: HTMLElement | null = null
  let initialSelected = new Set<string>()

  function isSelected(path: string): boolean {
    return selectedPaths.value.has(path)
  }

  function clearSelection() {
    selectedPaths.value = new Set()
    lastSelectedPath.value = null
  }

  function selectSingle(path: string) {
    selectedPaths.value = new Set([path])
    lastSelectedPath.value = path
  }

  function toggleSelect(path: string) {
    const next = new Set(selectedPaths.value)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    selectedPaths.value = next
    lastSelectedPath.value = path
  }

  function selectRange(targetPath: string, allPaths: string[]) {
    const fromIdx = allPaths.indexOf(lastSelectedPath.value ?? '')
    const toIdx = allPaths.indexOf(targetPath)
    if (fromIdx === -1 || toIdx === -1) return selectSingle(targetPath)

    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
    const next = new Set(selectedPaths.value)
    for (let i = start; i <= end; i++) next.add(allPaths[i])
    selectedPaths.value = next
    lastSelectedPath.value = targetPath
  }

  function selectAll(allPaths: string[]) {
    selectedPaths.value = new Set(allPaths)
  }

  function handleItemClick(entry: FileEntry, e: MouseEvent, allPaths: string[]) {
    if (e.ctrlKey || e.metaKey) toggleSelect(entry.path)
    else if (e.shiftKey && lastSelectedPath.value) selectRange(entry.path, allPaths)
    else selectSingle(entry.path)
  }

  function updateDragBox(currentX: number, currentY: number) {
    const left = Math.min(startX, currentX)
    const top = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)
    dragBox.value = { left, top, width, height }
  }

  function checkIntersection() {
    if (!containerRef || !dragBox.value) return
    const box = dragBox.value
    const boxRight = box.left + box.width
    const boxBottom = box.top + box.height
    const items = containerRef.querySelectorAll<HTMLElement>('[data-tree-path]')
    const next = new Set(initialSelected)

    items.forEach((el) => {
      const rect = el.getBoundingClientRect()
      const intersects = !(rect.right < box.left || rect.left > boxRight || rect.bottom < box.top || rect.top > boxBottom)
      const p = el.dataset.treePath
      if (intersects && p) next.add(p)
    })
    selectedPaths.value = next
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return
      isDragging.value = true
    }
    updateDragBox(e.clientX, e.clientY)
    checkIntersection()
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    isDragging.value = false
    dragBox.value = null
    containerRef = null
  }

  function startDrag(e: MouseEvent, container: HTMLElement) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, input, [role="menuitem"], [data-tree-path]')) return

    startX = e.clientX
    startY = e.clientY
    containerRef = container
    initialSelected = e.ctrlKey || e.metaKey ? new Set(selectedPaths.value) : new Set()

    if (!e.ctrlKey && !e.metaKey) {
      clearSelection()
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return {
    selectedPaths,
    lastSelectedPath,
    dragBox,
    isDragging,
    isSelected,
    clearSelection,
    selectAll,
    handleItemClick,
    startDrag,
  }
}
