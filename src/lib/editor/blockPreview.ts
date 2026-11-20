import { EditorView, ViewPlugin, Decoration, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import {
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
  type Range,
} from '@codemirror/state'
import { syntaxTree, ensureSyntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'
import { renderMarkdown } from '@/lib/markdown/render'
import { useToastStore } from '@/stores/toast'
import { useVaultStore } from '@/stores/vault'
import { useTabsStore } from '@/stores/tabs'
import { showPopover, hidePopover } from './colorSwatch'
import { detectLanguage } from '@/lib/markdown/render'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { t } from '@/lib/i18n/id'
import { parseMarkdownTable, attachTableEditor } from './tableEditor'

type Opts = { revealOnCursor: boolean }

const PREVIEW_LANGS = new Set(['svg'])

// ---- State: blok mana yang sedang dalam mode pratinjau (kunci = posisi awal blok) ----
const togglePreview = StateEffect.define<number>()

const previewOpen = StateField.define<Set<number>>({
  create: () => new Set(),
  update(set, tr) {
    let next = set
    if (tr.docChanged && set.size) {
      next = new Set()
      for (const p of set) next.add(tr.changes.mapPos(p, 1))
    }
    for (const e of tr.effects) {
      if (e.is(togglePreview)) {
        if (next === set) next = new Set(set)
        if (next.has(e.value)) next.delete(e.value)
        else next.add(e.value)
      }
    }
    return next
  },
})

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string) {
  const e = document.createElement(tag)
  e.className = cls
  if (text !== undefined) e.textContent = text
  return e
}

async function copyText(text: string, okMsg: string) {
  const toast = useToastStore()
  try {
    await navigator.clipboard.writeText(text)
    toast.success(okMsg)
  } catch {
    toast.error('Gagal menyalin kode')
  }
}

function makeToggle(view: EditorView, pos: number, active: 'code' | 'preview') {
  const wrap = el('div', 'code-preview-toggle')
  const mk = (label: string, target: 'code' | 'preview') => {
    const b = el('button', 'code-preview-btn' + (active === target ? ' active' : ''), label)
    b.type = 'button'
    b.dataset.target = target
    b.addEventListener('mousedown', (e) => e.preventDefault())
    b.addEventListener('click', (e) => {
      e.preventDefault()
      if (active !== target) view.dispatch({ effects: togglePreview.of(pos) })
    })
    return b
  }
  wrap.append(mk('Kode', 'code'), mk('Pratinjau', 'preview'))
  return wrap
}

// ---- Header blok kode (mode kode) ----
class CodeHeadWidget extends WidgetType {
  constructor(
    readonly lang: string,
    readonly code: string,
    readonly pos: number,
    readonly previewable: boolean,
    readonly depth = 0,
  ) {
    super()
  }
  eq(o: CodeHeadWidget) {
    return (
      o.lang === this.lang &&
      o.code === this.code &&
      o.pos === this.pos &&
      o.previewable === this.previewable &&
      o.depth === this.depth
    )
  }
  get estimatedHeight() {
    return 32
  }
  toDOM(view: EditorView) {
    const cls = this.depth > 0 ? `cm-lp-codehead cm-lp-indent-${this.depth}` : 'cm-lp-codehead'
    const wrap = el('div', cls)
    wrap.append(el('span', 'cm-lp-codelang', this.lang || 'teks'))
    if (this.previewable) wrap.append(makeToggle(view, this.pos, 'code'))
    const btn = el('button', 'cm-lp-copy', 'Salin')
    btn.type = 'button'
    btn.addEventListener('mousedown', (e) => e.preventDefault())
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      await copyText(this.code, t.codeCopied)
      btn.textContent = 'Tersalin'
      setTimeout(() => (btn.textContent = 'Salin'), 1500)
    })
    wrap.append(btn)
    return wrap
  }
  ignoreEvent() {
    return true
  }
}

class CodeFootWidget extends WidgetType {
  constructor(readonly depth = 0) {
    super()
  }
  eq(o: CodeFootWidget) {
    return o.depth === this.depth
  }
  get estimatedHeight() {
    return 10
  }
  toDOM() {
    const cls = this.depth > 0 ? `cm-lp-codefoot cm-lp-indent-${this.depth}` : 'cm-lp-codefoot'
    return el('div', cls)
  }
  ignoreEvent() {
    return true
  }
}

// ---- Cache tinggi aktual untuk mencegah layout shift / lompatan scroll ----
const heightCache = new Map<string, number>()
function remember(key: string, node: HTMLElement) {
  requestAnimationFrame(() => {
    const h = node.offsetHeight
    if (h > 0) {
      if (heightCache.size > 300) heightCache.clear()
      heightCache.set(key, h)
    }
  })
}

const SVG_CHECKER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h6V3"/><path d="M9 9v6"/><path d="M9 15H3"/><path d="M21 9h-6"/><path d="M15 9v6"/><path d="M15 15h6"/></svg>`
const SVG_COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
const SVG_CHECKED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

// ---- Pratinjau SVG (menggantikan seluruh blok saat mode pratinjau) ----
class SvgPreviewWidget extends WidgetType {
  constructor(
    readonly pos: number,
    readonly code: string,
    readonly depth = 0,
  ) {
    super()
  }
  eq(o: SvgPreviewWidget) {
    return o.pos === this.pos && o.code === this.code && o.depth === this.depth
  }
  get estimatedHeight() {
    return heightCache.get(this.code) ?? 240
  }
  toDOM(view: EditorView) {
    const indentCls = this.depth > 0 ? ` cm-lp-indent-${this.depth}` : ''
    const block = el('div', `code-block code-block--previewable cm-lp-svgblock view-content${indentCls}`)
    const head = el('div', 'code-header')
    head.append(el('span', 'code-lang', 'svg'), makeToggle(view, this.pos, 'preview'))

    const actions = el('div', 'code-actions')
    const checker = el('button', 'code-checker-btn')
    checker.type = 'button'
    checker.title = 'Latar transparan'
    checker.setAttribute('aria-label', 'Latar transparan')
    checker.innerHTML = SVG_CHECKER_ICON

    const copy = el('button', 'code-copy-btn')
    copy.type = 'button'
    copy.title = 'Salin kode'
    copy.setAttribute('aria-label', 'Salin kode')
    copy.innerHTML = SVG_COPY_ICON
    copy.addEventListener('mousedown', (e) => e.preventDefault())
    copy.addEventListener('click', async (e) => {
      e.preventDefault()
      await copyText(this.code, t.codeCopied)
      copy.innerHTML = SVG_CHECKED_ICON
      copy.classList.add('copied')
      setTimeout(() => {
        copy.innerHTML = SVG_COPY_ICON
        copy.classList.remove('copied')
      }, 1500)
    })
    actions.append(checker, copy)
    head.append(actions)

    const pane = el('div', 'preview-pane')
    const inner = el('div', 'preview-inner')
    inner.innerHTML = DOMPurify.sanitize(this.code, {
      USE_PROFILES: { svg: true, svgFilters: true },
    })
    pane.append(inner)

    checker.addEventListener('mousedown', (e) => e.preventDefault())
    checker.addEventListener('click', (e) => {
      e.preventDefault()
      const on = inner.classList.toggle('preview-inner--checker')
      checker.classList.toggle('active', on)
    })

    block.append(head, pane)
    remember(this.code, block)
    return block
  }
  ignoreEvent() {
    return true
  }
}

// ---- Tabel ----
class TableWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly clickable: boolean,
    readonly depth = 0,
    readonly from = 0,
    readonly to = 0,
  ) {
    super()
  }
  eq(o: TableWidget) {
    return (
      o.source === this.source &&
      o.clickable === this.clickable &&
      o.depth === this.depth &&
      o.from === this.from &&
      o.to === this.to
    )
  }
  get estimatedHeight() {
    return heightCache.get(this.source) ?? this.source.split('\n').length * 36
  }
  toDOM(view: EditorView) {
    const cls = this.depth > 0 ? `cm-lp-table view-content cm-lp-indent-${this.depth}` : 'cm-lp-table view-content'
    const wrap = el('div', cls)
    wrap.innerHTML = renderMarkdown(this.source, useVaultStore().current?.path).html

    const tableEl = wrap.querySelector('table')
    if (tableEl && this.clickable) {
      const parsed = parseMarkdownTable(this.source)
      if (parsed) {
        attachTableEditor(tableEl, view, () => ({ from: this.from, to: this.to }), parsed)
      }
    }

    wrap.addEventListener('mouseover', (ev) => {
      const swatch = (ev.target as HTMLElement).closest('.color-swatch') as HTMLElement | null
      if (swatch?.dataset.color) {
        showPopover(swatch, swatch.dataset.color)
      } else {
        hidePopover()
      }
    })
    wrap.addEventListener('mouseleave', () => hidePopover())

    wrap.addEventListener('mousedown', (ev) => {
      const target = ev.target as HTMLElement
      if (target.closest('th, td, input, textarea, button')) return
      const swatch = target.closest('.color-swatch') as HTMLElement | null
      if (swatch?.dataset.color) {
        ev.preventDefault()
        ev.stopPropagation()
        const color = swatch.dataset.color
        navigator.clipboard
          .writeText(color)
          .then(() => useToastStore().success(`Warna ${color} disalin!`))
          .catch(() => {})
        return
      }
      if (target.closest('a')) return
    })
    wrap.addEventListener('click', (ev) => {
      const link = (ev.target as HTMLElement).closest('a') as HTMLAnchorElement | null
      if (!link) return
      ev.preventDefault()
      if (link.classList.contains('internal-link')) {
        const href = link.dataset.href
        if (href) useTabsStore().openPath(href.endsWith('.md') ? href : `${href}.md`)
      } else if (/^https?:\/\//.test(link.href)) {
        import('@tauri-apps/plugin-opener')
          .then(({ openUrl }) => openUrl(link.href))
          .catch(() => window.open(link.href, '_blank'))
      }
    })
    remember(this.source, wrap)
    return wrap
  }
  ignoreEvent() {
    return true
  }
}

// ---- Cache token highlight untuk auto-detect language ----
type HlMark = { from: number; to: number; cls: string }
const hlCache = new Map<string, HlMark[]>()

function hlMarks(code: string, lang: string): HlMark[] {
  const key = lang + '\0' + code
  const hit = hlCache.get(key)
  if (hit) return hit
  const marks: HlMark[] = []
  try {
    if (hljs.getLanguage(lang)) {
      const res = hljs.highlight(code, { language: lang, ignoreIllegals: true })
      const re = /<span class="hljs-([^"]+)">([^<]+)<\/span>/g
      let m: RegExpExecArray | null
      let cursor = 0
      while ((m = re.exec(res.value)) !== null) {
        const raw = m[2]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
        const i = code.indexOf(raw, cursor)
        if (i !== -1) {
          marks.push({ from: i, to: i + raw.length, cls: `hljs-${m[1]}` })
          cursor = i + raw.length
        }
      }
    }
  } catch {}
  if (hlCache.size > 200) hlCache.clear()
  hlCache.set(key, marks)
  return marks
}

function getListItemDepth(node: SyntaxNode, state: EditorState): number {
  for (let p: SyntaxNode | null = node.parent; p; p = p.parent) {
    if (p.name === 'ListItem') {
      let depth = 0
      for (let lp: SyntaxNode | null = p.parent; lp; lp = lp.parent) {
        if (lp.name === 'BulletList' || lp.name === 'OrderedList') depth++
      }
      return Math.min(Math.max(1, depth), 4)
    }
  }

  // Cek apakah baris tepat di atas blok ini adalah bagian dari list item
  const openLine = state.doc.lineAt(node.from)
  if (openLine.number > 1) {
    const prevLine = state.doc.line(openLine.number - 1)
    if (prevLine.text.trim().length > 0) {
      const prevNode = syntaxTree(state).resolveInner(prevLine.from, 1)
      for (let p: SyntaxNode | null = prevNode; p; p = p.parent) {
        if (p.name === 'ListItem') {
          let depth = 0
          for (let lp: SyntaxNode | null = p.parent; lp; lp = lp.parent) {
            if (lp.name === 'BulletList' || lp.name === 'OrderedList') depth++
          }
          return Math.min(Math.max(1, depth), 4)
        }
      }
    }
  }

  return 0
}

// ---- Bangun dekorasi ----
// StateField tidak punya akses view, jadi build menerima state.
// syntaxTree() dipakai tanpa blocking — parsing didorong oleh syntaxTreeWatcher.
function build(state: EditorState, opts: Opts): DecorationSet {
  const out: Range<Decoration>[] = []
  const sel = state.selection.ranges
  const opens = state.field(previewOpen)
  const touches = (from: number, to: number) =>
    opts.revealOnCursor && sel.some((r) => r.from <= to && r.to >= from)

  const FULL_PARSE_LIMIT = 500_000
  const tree =
    ensureSyntaxTree(
      state,
      state.doc.length,
      state.doc.length <= FULL_PARSE_LIMIT ? 500 : 50,
    ) ?? syntaxTree(state)

  tree.iterate({
    enter: (ref) => {
      if (ref.name === 'FencedCode') {
        const depth = getListItemDepth(ref.node, state)
        const indentCls = depth > 0 ? ` cm-lp-indent-${depth}` : ''
        const open = state.doc.lineAt(ref.from)
        const endLine = state.doc.lineAt(ref.to)
        const last = ref.node.lastChild
        const closed = !!last && last.name === 'CodeMark' && last.from > open.to
        const bodyFrom = open.number + 1
        const bodyTo = closed ? endLine.number - 1 : endLine.number
        const info = ref.node.getChild('CodeInfo')
        const rawLang = info ? state.sliceDoc(info.from, info.to).trim() : ''
        const code =
          bodyFrom <= bodyTo
            ? state.sliceDoc(state.doc.line(bodyFrom).from, state.doc.line(bodyTo).to)
            : ''
        const lang = detectLanguage(code, rawLang)
        const previewable = closed && PREVIEW_LANGS.has(lang.toLowerCase())

        // Mode pratinjau: seluruh blok diganti satu widget
        if (previewable && opens.has(open.from)) {
          out.push(
            Decoration.replace({
              widget: new SvgPreviewWidget(open.from, code, depth),
              block: true,
            }).range(open.from, endLine.to),
          )
          return false
        }

        for (let n = bodyFrom; n <= bodyTo; n++) {
          out.push(Decoration.line({ class: `cm-lp-codeblock${indentCls}` }).range(state.doc.line(n).from))
        }

        // Jika user tidak menulis nama bahasa, warnai menggunakan auto-detection highlight.js
        if (!rawLang && lang && bodyFrom <= bodyTo) {
          const blockStart = state.doc.line(bodyFrom).from
          for (const m of hlMarks(code, lang)) {
            out.push(
              Decoration.mark({ class: m.cls }).range(blockStart + m.from, blockStart + m.to),
            )
          }
        }

        if (touches(ref.from, ref.to)) {
          out.push(Decoration.line({ class: `cm-lp-codeblock cm-lp-codefence${indentCls}` }).range(open.from))
          if (closed) {
            out.push(
              Decoration.line({ class: `cm-lp-codeblock cm-lp-codefence${indentCls}` }).range(endLine.from),
            )
          }
        } else {
          out.push(
            Decoration.replace({
              widget: new CodeHeadWidget(lang, code, open.from, previewable, depth),
              block: true,
            }).range(open.from, open.to),
          )
          if (closed) {
            out.push(
              Decoration.replace({ widget: new CodeFootWidget(depth), block: true }).range(
                endLine.from,
                endLine.to,
              ),
            )
          }
        }
        return false
      }

      if (ref.name === 'Table') {
        if (!touches(ref.from, ref.to)) {
          const depth = getListItemDepth(ref.node, state)
          out.push(
            Decoration.replace({
              widget: new TableWidget(
                state.sliceDoc(ref.from, ref.to),
                opts.revealOnCursor,
                depth,
                ref.from,
                ref.to,
              ),
              block: true,
            }).range(ref.from, ref.to),
          )
        }
        return false
      }
    },
  })

  return Decoration.set(out, true)
}

export function blockPreview(opts: Opts): Extension {
  // StateField wajib untuk block decorations (Decoration.replace block:true, Decoration.line).
  // ViewPlugin DILARANG menyediakan block decorations — ini constraint CodeMirror 6.
  const field = StateField.define<DecorationSet>({
    create: (state) => build(state, opts),
    update: (deco, tr) =>
      tr.docChanged ||
      tr.selection ||
      tr.effects.some((e) => e.is(togglePreview)) ||
      syntaxTree(tr.state) !== syntaxTree(tr.startState)
        ? build(tr.state, opts)
        : deco,
    provide: (f) => EditorView.decorations.from(f),
  })

  // ViewPlugin terpisah: dorong parse untuk visibleRanges saja.
  // Ketika parse selesai, syntaxTree berubah → StateField rebuild otomatis.
  const watcher = ViewPlugin.fromClass(
    class {
      update(u: ViewUpdate) {
        if (!u.viewportChanged && !u.docChanged) return
        const { state } = u.view
        const to = u.view.visibleRanges.reduce((m, r) => Math.max(m, r.to), 0)
        // ensureSyntaxTree dengan timeout kecil (non-blocking); efek sampingnya
        // memantik parse inkremental, lalu meng-update StateField via treeChanged.
        ensureSyntaxTree(state, to, 30)
      }
    },
  )

  return [previewOpen, field, watcher]
}
