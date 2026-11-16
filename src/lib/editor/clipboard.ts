import { EditorView } from '@codemirror/view'
import { ipc } from '@/lib/ipc'

async function handleImageFile(file: File, view: EditorView, insertPos?: number): Promise<boolean> {
  const ext = file.type.split('/')[1] || 'png'
  const cleanExt = ext.replace('+xml', '').replace('jpeg', 'jpg')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const fileName = `Pasted-image-${timestamp}.${cleanExt}`

  try {
    const arrayBuf = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuf)
    const savedName = await ipc.writeAsset(fileName, Array.from(uint8))

    const pos = insertPos ?? view.state.selection.main.from
    const snippet = `![[${savedName}|400]]`

    view.dispatch({
      changes: { from: pos, to: pos, insert: snippet },
      selection: { anchor: pos + snippet.length },
      scrollIntoView: true,
    })
    view.focus()
    return true
  } catch (err) {
    console.error('Gagal menyimpan gambar dari clipboard:', err)
    return false
  }
}

export function clipboardPasteExtension() {
  return EditorView.domEventHandlers({
    paste(event: ClipboardEvent, view: EditorView): boolean {
      const items = event.clipboardData?.items
      if (!items) return false

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleImageFile(file, view)
            return true
          }
        }
      }
      return false
    },
    drop(event: DragEvent, view: EditorView): boolean {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return false

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.from
          handleImageFile(file, view, pos)
          return true
        }
      }
      return false
    },
  })
}
