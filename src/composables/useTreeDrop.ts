import { ref, onMounted, onUnmounted } from 'vue'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { isTauri, ipc } from '@/lib/ipc'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'

const ALLOWED_EXTS = ['.md', '.markdown', '.txt']

export function useTreeDrop() {
  const vaultStore = useVaultStore()
  const tabsStore = useTabsStore()
  const isDragOverRoot = ref(false)

  let unlisten: UnlistenFn | null = null

  function getTargetFolderFromPoint(x: number, y: number): string {
    const scale = window.devicePixelRatio || 1
    let el = document.elementFromPoint(x / scale, y / scale)
    let itemEl = el?.closest<HTMLElement>('[data-tree-path]')
    if (!itemEl && scale !== 1) {
      el = document.elementFromPoint(x, y)
      itemEl = el?.closest<HTMLElement>('[data-tree-path]')
    }
    if (!itemEl) return ''
    const kind = itemEl.dataset.treeKind
    const path = itemEl.dataset.treePath ?? ''
    if (kind === 'folder') return path
    if (kind === 'file') {
      const idx = path.lastIndexOf('/')
      return idx === -1 ? '' : path.slice(0, idx)
    }
    return ''
  }

  async function expandAndLoad(targetDir: string) {
    await vaultStore.loadDir(targetDir)
    if (targetDir) {
      const next = new Set(vaultStore.expanded)
      let cur = ''
      for (const part of targetDir.split('/')) {
        cur = cur ? `${cur}/${part}` : part
        next.add(cur)
      }
      vaultStore.expanded = next
    }
  }

  async function importPaths(paths: string[], targetDir: string) {
    let lastPath = ''
    for (const srcPath of paths) {
      try {
        const relPath = await ipc.fsImportExternal(srcPath, targetDir)
        await expandAndLoad(targetDir)
        lastPath = relPath
      } catch (err) {
        console.error('Import file gagal:', srcPath, err)
      }
    }
    if (lastPath) tabsStore.openPath(lastPath, { mode: 'view' })
  }

  async function handleHtml5Drop(dt: DataTransfer | null, targetDir: string) {
    const files = dt?.files ? Array.from(dt.files) : []
    const valid = files.filter((f) => ALLOWED_EXTS.some((ext) => f.name.toLowerCase().endsWith(ext)))
    let lastPath = ''

    if (valid.length > 0) {
      for (const file of valid) {
        const content = await file.text()
        const p = await vaultStore.createNote(targetDir)
        await ipc.noteWrite(p, content, 0)
        lastPath = p
      }
    } else {
      const text = dt?.getData('text/plain')?.trim()
      if (text) {
        const p = await vaultStore.createNote(targetDir)
        await ipc.noteWrite(p, text, 0)
        lastPath = p
      }
    }
    if (lastPath) tabsStore.openPath(lastPath, { mode: 'view' })
  }

  onMounted(async () => {
    if (!isTauri) return
    try {
      const webview = getCurrentWebview()
      unlisten = await webview.onDragDropEvent(async (event) => {
        const p = event.payload
        if (p.type === 'over' || p.type === 'enter') {
          const target = getTargetFolderFromPoint(p.position.x, p.position.y)
          isDragOverRoot.value = !target
        } else if (p.type === 'drop') {
          isDragOverRoot.value = false
          const target = getTargetFolderFromPoint(p.position.x, p.position.y)
          await importPaths(p.paths, target)
        } else if (p.type === 'leave') {
          isDragOverRoot.value = false
        }
      })
    } catch (err) {
      console.warn('onDragDropEvent init error:', err)
    }
  })

  onUnmounted(() => {
    unlisten?.()
    unlisten = null
  })

  function onRootDragOver(e: DragEvent) {
    e.preventDefault()
    isDragOverRoot.value = true
  }

  function onRootDragLeave() {
    isDragOverRoot.value = false
  }

  async function onRootDrop(e: DragEvent) {
    e.preventDefault()
    isDragOverRoot.value = false
    await handleHtml5Drop(e.dataTransfer, '')
  }

  return {
    isDragOverRoot,
    onRootDragOver,
    onRootDragLeave,
    onRootDrop,
  }
}
