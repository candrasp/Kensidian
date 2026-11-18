import { Decoration, WidgetType } from '@codemirror/view'
import type { Range } from '@codemirror/state'

class EntityWidget extends WidgetType {
  constructor(readonly char: string) { super() }
  eq(o: EntityWidget) { return this.char === o.char }
  toDOM() {
    const s = document.createElement('span')
    s.className = 'cm-lp-entity'
    s.textContent = this.char
    return s
  }
}

export function decodeEntity(raw: string): string {
  if (raw.startsWith('&#x') || raw.startsWith('&#X')) {
    const code = parseInt(raw.slice(3, -1), 16)
    return isNaN(code) ? raw : String.fromCodePoint(code)
  }
  if (raw.startsWith('&#')) {
    const code = parseInt(raw.slice(2, -1), 10)
    return isNaN(code) ? raw : String.fromCodePoint(code)
  }
  const NAMED: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    '&copy;': '©', '&reg;': '®', '&trade;': '™', '&hearts;': '♥', '&diams;': '♦',
    '&spades;': '♠', '&clubs;': '♣', '&nbsp;': '\u00A0', '&bull;': '•',
    '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  }
  return NAMED[raw] || raw
}

export function createEntityDecoration(raw: string): WidgetType {
  return new EntityWidget(decodeEntity(raw))
}

const HTML_PAIR_RE = /<(kbd|sup|sub|u|mark|small|big)>([\s\S]*?)<\/\1>/gi
const SPAN_STYLE_RE = /<span\s+style="([^"]+)">([\s\S]*?)<\/span>/gi
const HIGHLIGHT_RE = /==([^=\n]+?)==/g

export function matchInlineFormatting(
  text: string,
  basePos: number,
  isRevealed: (from: number, to: number) => boolean,
  onMark: (deco: Range<Decoration>, hidden?: Range<Decoration>[]) => void,
  isCode: (pos: number) => boolean
) {
  // 1. Highlight ==teks==
  let m: RegExpExecArray | null
  HIGHLIGHT_RE.lastIndex = 0
  while ((m = HIGHLIGHT_RE.exec(text))) {
    const start = basePos + m.index
    const end = start + m[0].length
    if (isCode(start)) continue
    const cFrom = start + 2
    const cTo = end - 2
    if (cFrom < cTo) {
      const mark = Decoration.mark({ class: 'cm-lp-highlight' }).range(cFrom, cTo)
      const h: Range<Decoration>[] = []
      if (!isRevealed(start, end)) {
        h.push(Decoration.replace({}).range(start, cFrom))
        h.push(Decoration.replace({}).range(cTo, end))
      }
      onMark(mark, h)
    }
  }

  // 2. Tag HTML inline berpasangan (<kbd>, <sup>, <sub>, <u>, <mark>, <small>)
  HTML_PAIR_RE.lastIndex = 0
  while ((m = HTML_PAIR_RE.exec(text))) {
    const start = basePos + m.index
    const end = start + m[0].length
    if (isCode(start)) continue
    const tag = m[1].toLowerCase()
    const openTagLen = tag.length + 2 // <tag>
    const closeTagLen = tag.length + 3 // </tag>
    const cFrom = start + openTagLen
    const cTo = end - closeTagLen

    if (cFrom < cTo) {
      const mark = Decoration.mark({ class: `cm-lp-html-${tag}` }).range(cFrom, cTo)
      const h: Range<Decoration>[] = []
      if (!isRevealed(start, end)) {
        h.push(Decoration.replace({}).range(start, cFrom))
        h.push(Decoration.replace({}).range(cTo, end))
      }
      onMark(mark, h)
    }
  }

  // 3. Warna / Gaya lewat HTML: <span style="...">...</span>
  SPAN_STYLE_RE.lastIndex = 0
  while ((m = SPAN_STYLE_RE.exec(text))) {
    const start = basePos + m.index
    const end = start + m[0].length
    if (isCode(start)) continue
    const styleAttr = m[1].trim()
    const openTagLen = m[0].indexOf('>') + 1
    const closeTagLen = 7 // </span>
    const cFrom = start + openTagLen
    const cTo = end - closeTagLen

    if (cFrom < cTo) {
      const mark = Decoration.mark({ attributes: { style: styleAttr } }).range(cFrom, cTo)
      const h: Range<Decoration>[] = []
      if (!isRevealed(start, end)) {
        h.push(Decoration.replace({}).range(start, cFrom))
        h.push(Decoration.replace({}).range(cTo, end))
      }
      onMark(mark, h)
    }
  }
}
