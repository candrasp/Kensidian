import type { EditorView } from '@codemirror/view'
import { undo as cmUndo, redo as cmRedo } from '@codemirror/commands'
import { open } from '@tauri-apps/plugin-dialog'
import { ipc } from '@/lib/ipc'

export function applyUndo(view: EditorView) {
  cmUndo(view)
  view.focus()
}

export function applyRedo(view: EditorView) {
  cmRedo(view)
  view.focus()
}

export function toggleInlineMark(view: EditorView, marker: string) {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)
  const mLen = marker.length
  const before = state.sliceDoc(Math.max(0, range.from - mLen), range.from)
  const after = state.sliceDoc(range.to, range.to + mLen)

  if (before === marker && after === marker) {
    view.dispatch({
      changes: [
        { from: range.from - mLen, to: range.from, insert: '' },
        { from: range.to, to: range.to + mLen, insert: '' },
      ],
      selection: { anchor: range.from - mLen, head: range.to - mLen },
      scrollIntoView: true,
    })
  } else if (text.startsWith(marker) && text.endsWith(marker) && text.length >= mLen * 2) {
    view.dispatch({
      changes: {
        from: range.from,
        to: range.to,
        insert: text.slice(mLen, -mLen),
      },
      selection: { anchor: range.from, head: range.to - mLen * 2 },
      scrollIntoView: true,
    })
  } else {
    view.dispatch({
      changes: {
        from: range.from,
        to: range.to,
        insert: `${marker}${text}${marker}`,
      },
      selection: range.empty
        ? { anchor: range.from + mLen }
        : { anchor: range.from, head: range.to + mLen * 2 },
      scrollIntoView: true,
    })
  }
  view.focus()
}

export function toggleLinePrefix(view: EditorView, prefix: string) {
  const { state } = view
  const range = state.selection.main
  const startLine = state.doc.lineAt(range.from)
  const endLine = state.doc.lineAt(range.to)

  let allPrefixed = true
  let pos = startLine.from
  while (pos <= endLine.from) {
    const line = state.doc.lineAt(pos)
    if (!line.text.startsWith(prefix)) {
      allPrefixed = false
      break
    }
    pos = line.to + 1
  }

  const changes = []
  pos = startLine.from
  while (pos <= endLine.from) {
    const line = state.doc.lineAt(pos)
    if (allPrefixed) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
    } else if (!line.text.startsWith(prefix)) {
      changes.push({ from: line.from, to: line.from, insert: prefix })
    }
    pos = line.to + 1
  }

  view.dispatch({ changes, scrollIntoView: true })
  view.focus()
}

export function insertLink(view: EditorView) {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to) || 'teks'
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: `[${text}](https://)` },
    selection: { anchor: range.from + text.length + 3, head: range.from + text.length + 11 },
    scrollIntoView: true,
  })
  view.focus()
}

export function insertCodeBlock(view: EditorView) {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)
  const line = state.doc.lineAt(range.from)
  const atLineStart = range.from === line.from
  const prefix = atLineStart ? '```\n' : '\n```\n'
  const insert = `${prefix}${text}\n\`\`\`\n`
  const cursorPos = range.empty
    ? range.from + prefix.length
    : range.from + prefix.length + text.length

  view.dispatch({
    changes: {
      from: range.from,
      to: range.to,
      insert,
    },
    selection: { anchor: cursorPos },
    scrollIntoView: true,
  })
  view.focus()
}

export function insertTable(view: EditorView) {
  const { state } = view
  const range = state.selection.main
  const template = "\n| Kolom 1 | Kolom 2 | Kolom 3 |\n| --- | --- | --- |\n| Item 1 | Item 2 | Item 3 |\n"
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: template },
    selection: { anchor: range.from + template.length },
    scrollIntoView: true,
  })
  view.focus()
}

export function insertHorizontalRule(view: EditorView) {
  const { state } = view
  const range = state.selection.main
  const line = state.doc.lineAt(range.from)
  const prefix = line.length > 0 ? "\n\n---\n\n" : "---\n\n"
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: prefix },
    selection: { anchor: range.from + prefix.length },
    scrollIntoView: true,
  })
  view.focus()
}
export function setHeading(view: EditorView, level: number) {
  const { state } = view
  const range = state.selection.main
  const startLine = state.doc.lineAt(range.from)
  const endLine = state.doc.lineAt(range.to)

  const changes: { from: number; to: number; insert: string }[] = []
  let pos = startLine.from

  while (pos <= endLine.from) {
    const line = state.doc.lineAt(pos)
    const cleaned = line.text.replace(/^#{1,6}\s+/, '')
    const prefix = level > 0 ? '#'.repeat(level) + ' ' : ''
    changes.push({
      from: line.from,
      to: line.to,
      insert: prefix + cleaned,
    })
    pos = line.to + 1
  }

  view.dispatch({ changes, scrollIntoView: true })
  view.focus()
}

export async function insertImageFromDisk(view: EditorView): Promise<void> {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'Gambar', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] }],
  })
  if (!selected || typeof selected !== 'string') return

  const fileName = await ipc.saveAsset(selected)
  const { state } = view
  const range = state.selection.main
  const snippet = `![[${fileName}|400]]`

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: snippet },
    selection: { anchor: range.from + snippet.length },
    scrollIntoView: true,
  })
  view.focus()
}