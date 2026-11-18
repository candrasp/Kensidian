import {
  EditorView,
  ViewPlugin,
  Decoration,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import type { EditorState, Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { useToastStore } from '@/stores/toast'
import { isValidCssColor } from '@/lib/color/colorValidator'

export const COLOR_SRC =
  '#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\\b|\\b(?:rgba?|hsla?|hwb)\\([^)\\n]+\\)'

const SKIP = new Set([
  'URL',
  'Image',
  'HTMLBlock',
  'HTMLTag',
  'LinkMark',
])

function insideSkipped(state: EditorState, pos: number): boolean {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (SKIP.has(n.name)) return true
  }
  return false
}

let pop: HTMLDivElement | null = null

export function hidePopover() {
  pop?.remove()
  pop = null
}

export function showPopover(anchor: HTMLElement, color: string) {
  hidePopover()
  const rect = anchor.getBoundingClientRect()
  const placeAbove = rect.top >= 110

  pop = document.createElement('div')
  pop.style.cssText = [
    'position:fixed',
    'z-index:1000',
    'pointer-events:none',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:6px',
    'padding:8px',
    'border-radius:8px',
    'border:1px solid var(--line)',
    'background:var(--bg-panel)',
    'box-shadow:0 10px 30px rgba(0,0,0,.4)',
    `left:${rect.left + rect.width / 2}px`,
    `top:${placeAbove ? rect.top - 8 : rect.bottom + 8}px`,
    `transform:translate(-50%, ${placeAbove ? '-100%' : '0'})`,
  ].join(';')

  const box = document.createElement('div')
  box.style.cssText = `width:56px;height:56px;border-radius:6px;border:1px solid rgba(255,255,255,.2);background:${color}`
  const label = document.createElement('span')
  label.textContent = color
  label.style.cssText =
    'font:11px var(--font-mono);padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.4);color:var(--fg)'
  pop.append(box, label)
  document.body.appendChild(pop)
}

class SwatchWidget extends WidgetType {
  constructor(readonly color: string) {
    super()
  }
  eq(o: SwatchWidget) {
    return o.color === this.color
  }
  toDOM() {
    const el = document.createElement('span')
    el.className = 'color-swatch cm-lp-swatch'
    el.dataset.color = this.color
    el.style.backgroundColor = this.color
    el.addEventListener('mouseenter', () => showPopover(el, this.color))
    el.addEventListener('mouseleave', hidePopover)
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      navigator.clipboard
        .writeText(this.color)
        .then(() => useToastStore().success(`Warna ${this.color} disalin!`))
        .catch(() => {})
    })
    return el
  }
  ignoreEvent() {
    return true
  }
}

function build(view: EditorView): DecorationSet {
  const out: Range<Decoration>[] = []
  const { state } = view

  for (const { from, to } of view.visibleRanges) {
    const text = state.sliceDoc(from, to)
    const re = new RegExp(COLOR_SRC, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const pos = from + m.index
      if (insideSkipped(state, pos)) continue

      const colorVal = m[0]
      if (!isValidCssColor(colorVal)) continue

      // Jika berada di dalam InlineCode, seluruh isi kode harus merupakan warna tunggal
      const node = syntaxTree(state).resolveInner(pos, 1)
      const codeNode = node.name === 'InlineCode' ? node : (node.parent?.name === 'InlineCode' ? node.parent : null)
      if (codeNode) {
        const rawCode = state.sliceDoc(codeNode.from, codeNode.to).replace(/^`+|`+$/g, '').trim()
        if (rawCode !== colorVal) continue
      }

      out.push(Decoration.widget({ widget: new SwatchWidget(colorVal), side: -1 }).range(pos))
    }
  }
  return Decoration.set(out, true)
}

export function colorSwatch() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      private onScroll = () => hidePopover()

      constructor(readonly view: EditorView) {
        this.decorations = build(view)
        view.scrollDOM.addEventListener('scroll', this.onScroll, { passive: true })
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || syntaxTree(u.state) !== syntaxTree(u.startState)) {
          this.decorations = build(u.view)
        }
      }
      destroy() {
        this.view.scrollDOM.removeEventListener('scroll', this.onScroll)
        hidePopover()
      }
    },
    { decorations: (v) => v.decorations },
  )
}
