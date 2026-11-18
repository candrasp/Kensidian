import {
  EditorView,
  Decoration,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { StateField, type EditorState, type Extension } from '@codemirror/state'
import type { SyntaxNode } from '@lezer/common'
import katex from 'katex'

const CODE_NODES = new Set(['FencedCode', 'CodeBlock', 'InlineCode', 'CodeText'])

function inCode(state: EditorState, pos: number): boolean {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (CODE_NODES.has(n.name)) return true
  }
  return false
}

function getMathDepth(pos: number, state: EditorState): number {
  const check = (node: SyntaxNode | null) => {
    for (let p: SyntaxNode | null = node; p; p = p.parent) {
      if (p.name === 'ListItem') {
        let depth = 0
        for (let lp: SyntaxNode | null = p.parent; lp; lp = lp.parent) {
          if (lp.name === 'BulletList' || lp.name === 'OrderedList') depth++
        }
        return Math.min(Math.max(1, depth), 4)
      }
    }
    return 0
  }

  const depth = check(syntaxTree(state).resolveInner(pos, 1))
  if (depth > 0) return depth

  const openLine = state.doc.lineAt(pos)
  if (openLine.number > 1) {
    const prevLine = state.doc.line(openLine.number - 1)
    if (prevLine.text.trim().length > 0) {
      return check(syntaxTree(state).resolveInner(prevLine.from, 1))
    }
  }
  return 0
}

class InlineMathWidget extends WidgetType {
  constructor(readonly math: string, readonly from: number) { super() }
  eq(other: InlineMathWidget) { return this.math === other.math }
  toDOM(view: EditorView) {
    const span = document.createElement('span')
    span.className = 'cm-lp-math cm-lp-math-inline'
    try {
      span.innerHTML = katex.renderToString(this.math, { displayMode: false, throwOnError: false })
    } catch {
      span.textContent = `$${this.math}$`
    }
    span.addEventListener('mousedown', (e) => {
      e.preventDefault()
      view.dispatch({ selection: { anchor: this.from + 1 } })
      view.focus()
    })
    return span
  }
}

class BlockMathWidget extends WidgetType {
  constructor(readonly math: string, readonly from: number, readonly depth: number) { super() }
  eq(other: BlockMathWidget) { return this.math === other.math && this.depth === other.depth }
  toDOM(view: EditorView) {
    const div = document.createElement('div')
    const indent = this.depth > 0 ? ` cm-lp-indent-${this.depth}` : ''
    div.className = `cm-lp-math cm-lp-math-block${indent}`
    try {
      div.innerHTML = katex.renderToString(this.math, { displayMode: true, throwOnError: false })
    } catch {
      div.textContent = `$$\n${this.math}\n$$`
    }
    div.addEventListener('mousedown', (e) => {
      e.preventDefault()
      view.dispatch({ selection: { anchor: this.from + 2 } })
      view.focus()
    })
    return div
  }
}

function buildMathDecorations(state: EditorState, revealOnCursor: boolean): DecorationSet {
  const decos: Array<{ from: number; to: number; value: Decoration }> = []
  const docText = state.doc.toString()
  const sel = state.selection.main

  const isRevealed = (from: number, to: number) => {
    if (!revealOnCursor) return false
    return sel.from <= to && sel.to >= from
  }

  // 1. Block Math: $$...$$
  const blockRe = /\$\$([\s\S]*?)\$\$/g
  const blockRanges: Array<{ from: number; to: number }> = []
  let bm: RegExpExecArray | null

  while ((bm = blockRe.exec(docText))) {
    const from = bm.index
    const to = from + bm[0].length
    if (inCode(state, from)) continue
    blockRanges.push({ from, to })

    if (!isRevealed(from, to)) {
      const depth = getMathDepth(from, state)
      const widget = new BlockMathWidget(bm[1].trim(), from, depth)
      decos.push({ from, to, value: Decoration.replace({ widget }) })
    }
  }

  // 2. Inline Math: $...$
  const inlineRe = /(?<!\$)\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\$)/g
  let im: RegExpExecArray | null

  while ((im = inlineRe.exec(docText))) {
    const from = im.index
    const to = from + im[0].length
    if (inCode(state, from)) continue
    const insideBlock = blockRanges.some((b) => from >= b.from && to <= b.to)
    if (insideBlock) continue

    if (!isRevealed(from, to)) {
      const widget = new InlineMathWidget(im[1].trim(), from)
      decos.push({ from, to, value: Decoration.replace({ widget }) })
    }
  }

  decos.sort((a, b) => a.from - b.from || a.to - b.to)
  return Decoration.set(decos.map((d) => d.value.range(d.from, d.to)))
}

export function mathPreview(opts: { revealOnCursor: boolean }): Extension {
  return StateField.define<DecorationSet>({
    create: (state) => buildMathDecorations(state, opts.revealOnCursor),
    update: (deco, tr) =>
      tr.docChanged || tr.selection ? buildMathDecorations(tr.state, opts.revealOnCursor) : deco,
    provide: (f) => EditorView.decorations.from(f),
  })
}
