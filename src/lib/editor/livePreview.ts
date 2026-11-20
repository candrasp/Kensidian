import {
  EditorView,
  ViewPlugin,
  Decoration,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import type { EditorState, Extension, Range } from '@codemirror/state'
import { syntaxTree, ensureSyntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { useTabsStore } from '@/stores/tabs'
import { isImageFile } from '@/lib/markdown/image'
import { blockPreview } from './blockPreview'
import { colorSwatch } from './colorSwatch'
import { mathPreview } from './mathPreview'
import { createEntityDecoration, matchInlineFormatting } from './inlineDecorations'

class BulletWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const span = document.createElement('span')
    span.textContent = '•'
    span.className = 'cm-lp-bullet'
    return span
  }
}

class NumberedListWidget extends WidgetType {
  constructor(readonly num: number) {
    super()
  }
  eq(other: NumberedListWidget) {
    return this.num === other.num
  }
  toDOM() {
    const span = document.createElement('span')
    span.textContent = `${this.num}.`
    span.className = 'cm-lp-ol-num'
    return span
  }
}

class HRWidget extends WidgetType {
  eq() {
    return true
  }
  toDOM() {
    const hr = document.createElement('div')
    hr.className = 'cm-lp-hr'
    return hr
  }
}

const SKIP_NODES = new Set(['FencedCode', 'CodeBlock', 'HTMLBlock', 'CommentBlock', 'Image'])
const CODE_NODES = new Set(['InlineCode', 'FencedCode', 'CodeBlock', 'CodeText'])
const WIKILINK_RE = /\[\[([^\]\n|]+)(?:\|([^\]\n]+))?\]\]/g

function inCode(state: EditorState, pos: number): boolean {
  for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
    if (CODE_NODES.has(n.name)) return true
  }
  return false
}

function getListDepth(node: SyntaxNode): number {
  let depth = 0
  for (let p: SyntaxNode | null = node.parent; p; p = p.parent) {
    if (p.name === 'BulletList' || p.name === 'OrderedList') depth++
  }
  return Math.min(Math.max(1, depth), 4)
}

function build(view: EditorView, opts: { revealOnCursor: boolean }) {
  const { state } = view
  const out: Range<Decoration>[] = []
  const hiddenRanges: Range<Decoration>[] = []
  const seen = new Set<string>()

  // Baris yang disentuh seleksi
  const selectedLines = new Set<number>()
  if (opts.revealOnCursor) {
    for (const r of state.selection.ranges) {
      const a = state.doc.lineAt(r.from).number
      const b = state.doc.lineAt(r.to).number
      for (let l = a; l <= b; l++) selectedLines.add(l)
    }
  }

  const revealed = (from: number, to: number) => {
    if (!opts.revealOnCursor) return false
    const a = state.doc.lineAt(from).number
    const b = state.doc.lineAt(to).number
    for (let l = a; l <= b; l++) if (selectedLines.has(l)) return true
    return false
  }

  const hide = (from: number, to: number, widget?: WidgetType) => {
    if (from >= to) return
    const d = Decoration.replace(widget ? { widget } : {})
    out.push(d.range(from, to))
    hiddenRanges.push(d.range(from, to))
  }

  // Pola: mark + isi + mark (emphasis, strong, strikethrough, inline code)
  const wrap = (node: SyntaxNode, cls: string) => {
    const first = node.firstChild
    const last = node.lastChild
    if (!first || !last || first === last) return
    if (!first.name.endsWith('Mark') || !last.name.endsWith('Mark')) return

    const delimChar = state.sliceDoc(first.from, first.from + 1)
    let firstTo = first.to
    while (firstTo < last.from && state.sliceDoc(firstTo, firstTo + 1) === delimChar) {
      firstTo++
    }

    let lastFrom = last.from
    while (lastFrom > firstTo && state.sliceDoc(lastFrom - 1, lastFrom) === delimChar) {
      lastFrom--
    }

    if (firstTo < lastFrom) {
      out.push(Decoration.mark({ class: cls }).range(firstTo, lastFrom))
    }
    if (!revealed(node.from, node.to)) {
      hide(first.from, firstTo)
      hide(lastFrom, last.to)

      // Sembunyikan delimiter ganda berurutan di tengah (seperti **tebal****tebal-lagi**)
      if (node.name === 'StrongEmphasis' || node.name === 'Emphasis') {
        const innerText = state.sliceDoc(firstTo, lastFrom)
        const midRe = /\*{2,}|_{2,}/g
        let mm: RegExpExecArray | null
        while ((mm = midRe.exec(innerText))) {
          const mFrom = firstTo + mm.index
          const mTo = mFrom + mm[0].length
          hide(mFrom, mTo)
        }
      }
    }
  }

  const BUFFER = opts.revealOnCursor ? 0 : 5_000
  const docLen = state.doc.length
  const maxVisibleTo = view.visibleRanges.reduce((m, r) => Math.max(m, r.to), 0)
  const bufTarget = maxVisibleTo > 0
    ? Math.min(docLen, maxVisibleTo + BUFFER)
    : Math.min(docLen, 10_000)
  const ready = bufTarget > 0 ? ensureSyntaxTree(state, bufTarget, 200) : null
  const tree = ready ?? syntaxTree(state)

  const buildRanges = opts.revealOnCursor
    ? view.visibleRanges
    : view.visibleRanges.map((r) => ({
      from: Math.max(0, r.from - BUFFER),
      to: Math.min(docLen, r.to + BUFFER),
    }))

  for (const { from, to } of buildRanges) {
    tree.iterate({
      from,
      to,
      enter: (ref) => {
        const name = ref.name
        const key = `${name}:${ref.from}:${ref.to}`
        if (seen.has(key)) return false
        seen.add(key)

        if (SKIP_NODES.has(name)) return false

        // Heading
        if (/^ATXHeading[1-6]$/.test(name)) {
          const line = state.doc.lineAt(ref.from)
          out.push(Decoration.line({ class: `cm-lp-h${name.slice(-1)}` }).range(line.from))
          const mark = ref.node.firstChild
          if (mark?.name === 'HeaderMark' && !revealed(line.from, line.to)) {
            let end = mark.to
            while (end < line.to && state.sliceDoc(end, end + 1) === ' ') end++
            hide(mark.from, end)
          }
          return
        }

        if (name === 'StrongEmphasis') return void wrap(ref.node, 'cm-lp-strong')
        if (name === 'Emphasis') return void wrap(ref.node, 'cm-lp-em')
        if (name === 'Strikethrough') return void wrap(ref.node, 'cm-lp-strike')
        if (name === 'InlineCode') {
          wrap(ref.node, 'cm-lp-code')
          return false
        }

        // List item (hanging indent)
        if (name === 'ListItem') {
          const line = state.doc.lineAt(ref.from)
          const depth = getListDepth(ref.node)
          const isOrdered = ref.node.parent?.name === 'OrderedList'
          const isTask = /^\s*[-*+]\s+\[[ xX\/\->i?!]\]/.test(line.text)
          const kindCls = isTask ? 'cm-lp-task' : (isOrdered ? 'cm-lp-ol' : 'cm-lp-ul')
          out.push(Decoration.line({ class: `cm-lp-list-item ${kindCls} cm-lp-list-${depth}` }).range(line.from))
        }

        // Bullet list & Ordered list
        if (name === 'ListMark') {
          const text = state.sliceDoc(ref.from, ref.to)
          const parentName = ref.node.parent?.parent?.name
          if (
            ['-', '*', '+'].includes(text) &&
            parentName === 'BulletList'
          ) {
            const line = state.doc.lineAt(ref.from)
            const isTask = /^\s*[-*+]\s+\[[ xX\/\->i?!]\]/.test(line.text)
            let end = ref.to
            if (state.sliceDoc(end, end + 1) === ' ') end++
            if (!revealed(line.from, line.to)) {
              if (isTask) {
                hide(ref.from, end)
              } else {
                hide(ref.from, end, new BulletWidget())
              }
            }
          } else if (/^\d+[.)]$/.test(text) && parentName === 'OrderedList') {
            const line = state.doc.lineAt(ref.from)
            let end = ref.to
            if (state.sliceDoc(end, end + 1) === ' ') end++
            if (!revealed(line.from, line.to)) {
              let itemIndex = 1
              const parentList = ref.node.parent?.parent
              if (parentList) {
                for (let c = parentList.firstChild; c; c = c.nextSibling) {
                  if (c.name === 'ListItem') {
                    if (c.from === ref.node.parent?.from) break
                    itemIndex++
                  }
                }
              }
              hide(ref.from, end, new NumberedListWidget(itemIndex))
            }
          }
          return
        }

        // Blockquote
        if (name === 'Blockquote') {
          let depth = 0
          for (let p: SyntaxNode | null = ref.node.parent; p; p = p.parent) {
            if (p.name === 'ListItem') {
              depth = getListDepth(p)
              break
            }
          }
          if (depth === 0) {
            const openLine = state.doc.lineAt(ref.from)
            if (openLine.number > 1) {
              const prevLine = state.doc.line(openLine.number - 1)
              if (prevLine.text.trim().length > 0) {
                const prevNode = syntaxTree(state).resolveInner(prevLine.from, 1)
                for (let p: SyntaxNode | null = prevNode; p; p = p.parent) {
                  if (p.name === 'ListItem') {
                    depth = getListDepth(p)
                    break
                  }
                }
              }
            }
          }
          const indentCls = depth > 0 ? ` cm-lp-indent-${depth}` : ''
          const a = state.doc.lineAt(Math.max(ref.from, from)).number
          const b = state.doc.lineAt(Math.min(ref.to, to)).number
          for (let l = a; l <= b; l++) {
            out.push(Decoration.line({ class: `cm-lp-quote${indentCls}` }).range(state.doc.line(l).from))
          }
          return
        }
        if (name === 'QuoteMark') {
          const line = state.doc.lineAt(ref.from)
          if (!revealed(line.from, line.to)) {
            let end = ref.to
            if (state.sliceDoc(end, end + 1) === ' ') end++
            hide(ref.from, end)
          }
          return
        }

        // Garis pemisah
        if (name === 'HorizontalRule') {
          const line = state.doc.lineAt(ref.from)
          if (!revealed(line.from, line.to)) hide(line.from, line.to, new HRWidget())
          return
        }

        // Link inline: LinkMark "[" ... LinkMark "]" LinkMark "(" URL ... LinkMark ")"
        if (name === 'Link') {
          const marks: SyntaxNode[] = []
          let hasUrl = false
          for (let c = ref.node.firstChild; c; c = c.nextSibling) {
            if (c.name === 'LinkMark') marks.push(c)
            else if (c.name === 'URL') hasUrl = true
          }
          if (hasUrl && marks.length >= 2) {
            const open = marks[0]
            const close = marks[1]
            if (open.to < close.from) {
              out.push(Decoration.mark({ class: 'cm-lp-link' }).range(open.to, close.from))
            }
            const sameLine = state.doc.lineAt(close.from).number === state.doc.lineAt(ref.to).number
            if (sameLine && !revealed(ref.from, ref.to)) {
              hide(open.from, open.to)
              hide(close.from, ref.to)
            }
          }
          return
        }

        // URL polos / autolink
        if (name === 'URL') {
          const parent = ref.node.parent?.name
          if (parent !== 'Link' && parent !== 'Image') {
            out.push(Decoration.mark({ class: 'cm-lp-link' }).range(ref.from, ref.to))
          }
        }

        // Entitas HTML (&copy; &#9731; &#x1F600; dll.)
        if (name === 'Entity') {
          if (!revealed(ref.from, ref.to)) {
            const raw = state.sliceDoc(ref.from, ref.to)
            hide(ref.from, ref.to, createEntityDecoration(raw))
          }
        }
      },
    })

    // Wikilink [[nama]] atau [[nama|alias]] (abaikan bila gambar ![[...]])
    const text = state.sliceDoc(from, to)
    WIKILINK_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = WIKILINK_RE.exec(text))) {
      const start = from + m.index
      const end = start + m[0].length
      if (inCode(state, start)) continue
      // Jika di depannya ada tanda seru '!' (sintaks gambar), lewati
      if (start > 0 && state.sliceDoc(start - 1, start) === '!') continue
      const target = m[1].trim()
      if (isImageFile(target)) continue

      const alias = m[2]
      const displayFrom = alias ? start + 2 + target.length + 1 : start + 2
      const displayTo = end - 2
      if (displayFrom < displayTo) {
        out.push(Decoration.mark({ class: 'cm-lp-wikilink' }).range(displayFrom, displayTo))
      }
      if (!revealed(start, end)) {
        hide(start, displayFrom)
        hide(displayTo, end)
      }
    }

    // Highlight ==teks== & Tag HTML inline (<kbd>, <sup>, <sub>, <u>, <mark>, <span style="...">)
    matchInlineFormatting(
      text,
      from,
      revealed,
      (mark, hidden) => {
        out.push(mark)
        if (hidden) {
          for (const h of hidden) {
            out.push(h)
            hiddenRanges.push(h)
          }
        }
      },
      (p) => inCode(state, p)
    )
  }

  return {
    decorations: Decoration.set(out, true), // true = urutkan otomatis
    hidden: Decoration.set(hiddenRanges, true),
  }
}

function createPlugin(opts: { revealOnCursor: boolean }) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      hidden: DecorationSet

      constructor(view: EditorView) {
        const r = build(view, opts)
        this.decorations = r.decorations
        this.hidden = r.hidden
      }

      update(u: ViewUpdate) {
        const treeChanged = syntaxTree(u.state) !== syntaxTree(u.startState)
        if (u.docChanged || u.selectionSet || u.viewportChanged || treeChanged) {
          const r = build(u.view, opts)
          this.decorations = r.decorations
          this.hidden = r.hidden
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
}

function openTarget(raw: string) {
  if (/^https?:\/\//.test(raw)) {
    import('@tauri-apps/plugin-opener')
      .then(({ openUrl }) => openUrl(raw))
      .catch(() => window.open(raw, '_blank'))
    return
  }
  let href = raw
  try {
    href = decodeURIComponent(raw)
  } catch {
    /* biarkan apa adanya */
  }
  useTabsStore().openPath(href.endsWith('.md') ? href : `${href}.md`)
}

function clickHandlers(viewMode: boolean) {
  return EditorView.domEventHandlers({
    mousedown(event, view) {
      if (event.button !== 0) return false
      if (!viewMode && !(event.ctrlKey || event.metaKey)) return false

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos == null) return false
      const { state } = view

      // Wikilink
      const line = state.doc.lineAt(pos)
      WIKILINK_RE.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = WIKILINK_RE.exec(line.text))) {
        const s = line.from + m.index
        const e = s + m[0].length
        if (pos >= s && pos <= e && !inCode(state, s)) {
          // Abaikan jika ini sintaks gambar ![[...]] atau file gambar
          if (s > 0 && state.sliceDoc(s - 1, s) === '!') return false
          const target = m[1].trim()
          if (isImageFile(target)) return false

          event.preventDefault()
          openTarget(target)
          return true
        }
      }

      // Link markdown biasa
      for (let n: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1); n; n = n.parent) {
        if (n.name !== 'Link') continue
        for (let c = n.firstChild; c; c = c.nextSibling) {
          if (c.name === 'URL') {
            const url = state.sliceDoc(c.from, c.to).replace(/^<|>$/g, '')
            event.preventDefault()
            openTarget(url)
            return true
          }
        }
      }
      return false
    },
  })
}

export function livePreview(opts: { revealOnCursor: boolean }): Extension {
  const plugin = createPlugin(opts)
  return [
    plugin,
    // Kursor melompati penanda yang tersembunyi
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.hidden ?? Decoration.none),
    clickHandlers(!opts.revealOnCursor),
    blockPreview(opts),
    colorSwatch(),
    mathPreview(opts),
  ]
}