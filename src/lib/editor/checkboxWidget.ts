import {
  WidgetType,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  Decoration,
  type DecorationSet,
} from '@codemirror/view'
import type { Range } from '@codemirror/state'

class CheckboxWidget extends WidgetType {
  constructor(
    readonly char: string,
    readonly pos: number
  ) {
    super()
  }

  eq(other: CheckboxWidget): boolean {
    return other.char === this.char && other.pos === this.pos
  }

  toDOM(view: EditorView): HTMLElement {
    const lower = this.char.toLowerCase()
    const isChecked = lower === 'x'

    const span = document.createElement('span')
    span.className = 'task-checkbox cm-task-checkbox'
    span.dataset.task = lower
    span.setAttribute('role', 'checkbox')
    span.setAttribute('aria-checked', String(isChecked))

    span.addEventListener('mousedown', (e) => e.preventDefault())
    span.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const nextChar = lower === 'x' ? ' ' : 'x'
      view.dispatch({
        changes: { from: this.pos + 1, to: this.pos + 2, insert: nextChar },
      })
    })

    return span
  }

  ignoreEvent(): boolean {
    return false
  }
}

export function checkboxExtension() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = this.buildDecorations(update.view)
        }
      }

      buildDecorations(view: EditorView): DecorationSet {
        const widgets: Range<Decoration>[] = []
        for (const { from, to } of view.visibleRanges) {
          let pos = from
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos)
            const match = line.text.match(/^(\s*[-*]\s+)\[([ xX\/\->i?!])\]/)
            if (match) {
              const start = line.from + match[1].length
              const end = start + 3
              const char = match[2]
              widgets.push(
                Decoration.replace({
                  widget: new CheckboxWidget(char, start),
                }).range(start, end)
              )
            }
            pos = line.to + 1
          }
        }
        return Decoration.set(widgets)
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  )
}

export function toggleTask(view: EditorView) {
  const { state } = view
  const range = state.selection.main
  const line = state.doc.lineAt(range.from)
  const taskMatch = line.text.match(/^(\s*)[-*]\s+\[[ xX\/\->i?!]\]\s*(.*)$/)

  if (taskMatch) {
    const indent = taskMatch[1]
    const rest = taskMatch[2]
    const insert = `${indent}${rest}`
    const targetCursor = line.from + indent.length
    view.dispatch({
      changes: { from: line.from, to: line.to, insert },
      selection: { anchor: targetCursor },
      scrollIntoView: true,
    })
  } else {
    const listMatch = line.text.match(/^(\s*)(?:[-*]|\d+\.)\s*(.*)$/)
    const indent = listMatch ? listMatch[1] : (line.text.match(/^(\s*)/)?.[1] ?? '')
    const rest = listMatch ? listMatch[2] : line.text.slice(indent.length)
    const insert = `${indent}- [ ] ${rest}`
    const targetCursor = line.from + indent.length + 6
    view.dispatch({
      changes: { from: line.from, to: line.to, insert },
      selection: { anchor: targetCursor },
      scrollIntoView: true,
    })
  }
  view.focus()
}

export function setTaskStatus(view: EditorView, char: string) {
  const { state } = view
  const range = state.selection.main
  const startLine = state.doc.lineAt(range.from).number
  const endLine = state.doc.lineAt(range.to).number

  const changes = []
  let firstTargetCursor = 0

  for (let l = startLine; l <= endLine; l++) {
    const line = state.doc.line(l)
    const match = line.text.match(/^(\s*)(?:[-*]\s*(?:\[[ xX\/\->i?!]\]\s*)?|\d+\.\s*)?(.*)$/)
    if (match) {
      const indent = match[1]
      const rest = match[2]
      const newPrefix = `${indent}- [${char}] `
      const newText = `${newPrefix}${rest}`

      changes.push({
        from: line.from,
        to: line.to,
        insert: newText,
      })

      if (l === startLine) {
        if (rest.length > 0) {
          const oldPrefixLen = line.text.length - rest.length
          const offsetInRest = Math.max(0, range.from - (line.from + oldPrefixLen))
          firstTargetCursor = line.from + newPrefix.length + offsetInRest
        } else {
          firstTargetCursor = line.from + newPrefix.length
        }
      }
    }
  }

  view.dispatch({
    changes,
    selection: { anchor: firstTargetCursor },
    scrollIntoView: true,
  })
  view.focus()
}

export const TASK_STATUSES = [
  { char: ' ', label: 'Belum Selesai', code: '[ ]' },
  { char: '/', label: 'Sedang Berjalan', code: '[/]' },
  { char: 'x', label: 'Selesai', code: '[x]' },
  { char: '-', label: 'Dibatalkan', code: '[-]' },
  { char: '>', label: 'Ditunda', code: '[>]' },
  { char: 'i', label: 'Informasi', code: '[i]' },
  { char: '?', label: 'Klarifikasi', code: '[?]' },
  { char: '!', label: 'Penting', code: '[!]' },
] as const

export const HEADINGS = [
  { level: 0, label: 'Paragraf Normal', badge: 'Teks biasa' },
  { level: 1, label: 'Heading 1', badge: '#' },
  { level: 2, label: 'Heading 2', badge: '##' },
  { level: 3, label: 'Heading 3', badge: '###' },
  { level: 4, label: 'Heading 4', badge: '####' },
  { level: 5, label: 'Heading 5', badge: '#####' },
  { level: 6, label: 'Heading 6', badge: '######' },
] as const
