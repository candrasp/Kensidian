import MarkdownIt from 'markdown-it'
import type { StateBlock, StateInline } from 'markdown-it'
import katex from 'katex'

type RendererRule = NonNullable<InstanceType<typeof MarkdownIt>['renderer']['rules'][string]>

function renderKatex(content: string, displayMode: boolean): string {
  try {
    return katex.renderToString(content, { displayMode, throwOnError: false })
  } catch {
    return content
  }
}

function mathBlock(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  if (start + 2 > max || state.src.slice(start, start + 2) !== '$$') return false
  if (silent) return true

  const firstLine = state.src.slice(start + 2, max).trim()
  if (firstLine.endsWith('$$') && firstLine.length >= 2) {
    const token = state.push('math_block', 'div', 0)
    token.block = true
    token.content = firstLine.slice(0, -2).trim()
    token.map = [startLine, startLine + 1]
    state.line = startLine + 1
    return true
  }

  let nextLine = startLine + 1
  for (; nextLine < endLine; nextLine++) {
    const s = state.bMarks[nextLine] + state.tShift[nextLine]
    const m = state.eMarks[nextLine]
    if (state.src.slice(s, m).trim().endsWith('$$')) break
  }

  const content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false).trim()
  const token = state.push('math_block', 'div', 0)
  token.block = true
  token.content = content
  token.map = [startLine, nextLine + 1]
  state.line = Math.min(nextLine + 1, endLine)
  return true
}

function mathInline(state: StateInline, silent: boolean): boolean {
  if (state.src[state.pos] !== '$' || state.src[state.pos + 1] === '$') return false
  const start = state.pos + 1
  let match = -1

  for (let i = start; i < state.posMax; i++) {
    if (state.src[i] === '$' && state.src[i - 1] !== '\\') {
      match = i
      break
    }
    if (state.src[i] === '\n') break
  }

  if (match === -1 || match === start) return false
  const content = state.src.slice(start, match)
  if (content.startsWith(' ') || content.endsWith(' ')) return false

  if (!silent) {
    const token = state.push('math_inline', 'span', 0)
    token.content = content
  }
  state.pos = match + 1
  return true
}

export function mathPlugin(md: InstanceType<typeof MarkdownIt>) {
  md.block.ruler.before('fence', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
  md.inline.ruler.before('escape', 'math_inline', mathInline)

  const renderBlock: RendererRule = (tokens, idx) => {
    return `<div class="katex-block">${renderKatex(tokens[idx].content, true)}</div>\n`
  }
  const renderInline: RendererRule = (tokens, idx) => {
    return renderKatex(tokens[idx].content, false)
  }

  md.renderer.rules.math_block = renderBlock
  md.renderer.rules.math_inline = renderInline
}
