import MarkdownIt from 'markdown-it'
import type { StateCore } from 'markdown-it'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'
import { isImageFile, parseImageAttributes, resolveImageUrl } from './image'
import { taskListPlugin } from './taskList'
import { mathPlugin } from './math'
import { isValidCssColor } from '@/lib/color/colorValidator'

export interface HeadingItem {
  level: number
  text: string
  id: string
  line: number
}

export interface RenderResult {
  html: string
  headings: HeadingItem[]
  frontmatter: string | null
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// Regex universal pencocokan warna: HEX, RGB/RGBA, HSL/HSLA
const COLOR_REGEX = /(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b)|(\b(?:rgba?|hsla?)\([^)<>]+\))/gi

function addColorSwatches(rawHtml: string): string {
  let result = rawHtml.replace(/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g, (m) => {
    return isValidCssColor(m)
      ? `<span class="color-swatch" data-color="${m}" style="background-color: ${m}"></span>${m}`
      : m
  })
  const funcRegex = /((?:<span[^>]*>)?(?:rgba?|hsla?|hwb)(?:<\/span>)?\s*\((?:[^)<>]|<[^>]+>)+\))/gi
  return result.replace(funcRegex, (m) => {
    const pure = m.replace(/<[^>]+>/g, '').trim()
    return isValidCssColor(pure)
      ? `<span class="color-swatch" data-color="${pure}" style="background-color: ${pure}"></span>${m}`
      : m
  })
}
const COPY_BTN_SVG = `<button type="button" class="code-copy-btn" title="Salin kode" aria-label="Salin kode"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button>`

const PREVIEW_LANGS = new Set(['svg'])
const WRAP_LANGS = new Set(['prompt', 'text', 'txt', 'plain', 'markdown', 'md'])
// Bahasa-bahasa umum yang aman di-auto-detect tanpa false positive GAUSS
const COMMON_CODE_LANGS = ['javascript', 'typescript', 'css', 'json', 'bash', 'sql', 'python', 'rust', 'html', 'xml', 'yaml', 'markdown']

export function detectLanguage(code: string, explicitLang: string): string {
  if (explicitLang) return explicitLang.toLowerCase()
  const trimmed = code.trim()

  // 1. Deteksi SVG murni
  if (trimmed.startsWith('<svg') && trimmed.includes('</svg>')) return 'svg'

  // 2. Deteksi HTML murni
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) return 'html'
  if (/^<(div|main|section|article|header|footer|nav|p|table|form)[\s>]/i.test(trimmed) && /<\/[a-z]+>$/i.test(trimmed)) {
    return 'html'
  }

  // 3. Deteksi Bash / Shell CLI
  if (/^(?:npm|pnpm|bun|yarn|cargo|git|docker|curl|wget|cd|ls|mkdir|rm|cat|chmod|echo)\s/m.test(trimmed) || /^\$\s+[a-z]/m.test(trimmed)) {
    return 'bash'
  }

  // 4. Deteksi CSS (misal aturan :root, selector dengan tanda kurung kurawal & deklarasi properti: nilai;)
  if (/(\/\*[\s\S]*?\*\/|:(?:root|hover|focus)|(?:\.[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+|[a-z]+)\s*\{[\s\S]*?--?[a-zA-Z0-9_-]+\s*:\s*[^;]+;)/m.test(trimmed)) {
    return 'css'
  }

  // 5. Deteksi struktur pohon folder / output teks biasa (misal ada karakter cabang tree: ├──, └──, │, atau format direktori src/ ...)
  if (/[├└│─]/.test(trimmed) || /^[a-zA-Z0-9_.-]+\/\s*$/m.test(trimmed)) {
    return 'text'
  }

  // 6. Coba deteksi terbatas pada COMMON_CODE_LANGS agar tidak menebak bahasa liar seperti GAUSS
  try {
    const res = hljs.highlightAuto(code, COMMON_CODE_LANGS)
    if (res.language && res.relevance >= 8) {
      return res.language
    }
  } catch {}

  return ''
}

function buildPreviewHeader(safeLang: string): string {
  const langBadge = safeLang ? `<span class="code-lang">${safeLang}</span>` : ''
  const toggleBtns = `<div class="code-preview-toggle" role="group">
    <button type="button" class="code-preview-btn active" data-target="code">Kode</button>
    <button type="button" class="code-preview-btn" data-target="preview">Pratinjau</button>
  </div>`
  const checkerBtn = `<button type="button" class="code-checker-btn" title="Latar transparan" aria-label="Latar transparan"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h6V3"/><path d="M9 9v6"/><path d="M9 15H3"/><path d="M21 9h-6"/><path d="M15 9v6"/><path d="M15 15h6"/></svg></button>`
  return `<div class="code-header">${langBadge}${toggleBtns}<div class="code-actions">${checkerBtn}${COPY_BTN_SVG}</div></div>`
}

const md: InstanceType<typeof MarkdownIt> = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
  highlight: (str: string, lang: string): string => {
    const effectiveLang = detectLanguage(str, lang || '')
    const safeLang = escapeHtml(effectiveLang)

    if (PREVIEW_LANGS.has(effectiveLang)) {
      const header = buildPreviewHeader(safeLang)
      const escapedRaw = escapeHtml(str)
      const safeSvg = DOMPurify.sanitize(str, { USE_PROFILES: { svg: true, svgFilters: true } })
      return `<div class="code-block code-block--previewable" data-preview-lang="${safeLang}" data-raw="${escapedRaw}">${header}<pre class="code-pane"><code>${escapeHtml(str)}</code></pre><div class="preview-pane" hidden><div class="preview-inner">${safeSvg}</div></div></div>`
    }

    const langBadge = safeLang ? `<span class="code-lang">${safeLang}</span>` : ''
    const header = `<div class="code-header">${langBadge}${COPY_BTN_SVG}</div>`

    if (effectiveLang && hljs.getLanguage(effectiveLang)) {
      try {
        let highlighted = hljs.highlight(str, { language: effectiveLang, ignoreIllegals: true }).value
        highlighted = addColorSwatches(highlighted)
        const isWrap = WRAP_LANGS.has(effectiveLang)
        const wrapClass = isWrap ? ' code-block--wrap' : ''
        if (effectiveLang === 'bash' || effectiveLang === 'sh') {
          // Sorot flag CLI (--option, -f) menjadi warna cyan lembut (#56b6c2)
          highlighted = highlighted.replace(/(?<=\s|^)(--?[a-zA-Z0-9_-]+)/g, '<span class="hljs-attr">$1</span>')
          // Sorot command prompt simbol ($ / >) di awal baris
          highlighted = highlighted.replace(/(^|\n)(\$\s+)/g, '$1<span class="hljs-symbol">$2</span>')
        }
        return `<div class="code-block${wrapClass}">${header}<pre><code class="language-${safeLang}">${highlighted}</code></pre></div>`
      } catch {}
    }

    // Blok teks polos / prompt tanpa format bahasa (otomatis wrap ke bawah)
    return `<div class="code-block code-block--wrap">${header}<pre><code>${addColorSwatches(escapeHtml(str))}</code></pre></div>`
  },
})

md.use(taskListPlugin)
md.use(mathPlugin)

// Custom renderer untuk code_inline (`#61afef`, `rgb(...)`) agar tabel/teks ber-backtick memunculkan swatch
const defaultCodeInline =
  md.renderer.rules.code_inline ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options)
  }

md.renderer.rules.code_inline = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const content = token.content.trim()
  if (isValidCssColor(content)) {
    return `<code><span class="color-swatch" data-color="${content}" style="background-color: ${content}"></span>${escapeHtml(token.content)}</code>`
  }
  return defaultCodeInline(tokens, idx, options, env, self)
}

let activeVaultPath: string | undefined

// Wikilink [[target|alias]] dan Embed ![[image.png|size]]
md.core.ruler.after('inline', 'wikilinks', (state: StateCore) => {
  for (const blockToken of state.tokens) {
    if (blockToken.type !== 'inline' || !blockToken.children) continue
    const newChildren = []
    for (const token of blockToken.children) {
      if (token.type !== 'text') {
        newChildren.push(token)
        continue
      }
      const parts = token.content.split(/(!?\[\[[^\]]+\]\])/g)
      for (const part of parts) {
        const match = part.match(/^(!)?\[\[([^\]]+)\]\]$/)
        if (match) {
          const isEmbed = !!match[1]
          const raw = match[2]
          const { fileName, alt, width, height } = parseImageAttributes(raw)
          if (isEmbed && isImageFile(fileName)) {
            const url = resolveImageUrl(fileName, activeVaultPath)
            const style = [width ? `width: ${width}` : '', height ? `height: ${height}` : '']
              .filter(Boolean)
              .join('; ')
            const imgToken = new state.Token('html_inline', '', 0)
            imgToken.content = `<img class="note-image" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="${style}" loading="lazy" />`
            newChildren.push(imgToken)
          } else {
            const [target, alias] = raw.split('|')
            const linkToken = new state.Token('html_inline', '', 0)
            linkToken.content = `<a class="internal-link" data-href="${escapeHtml(target.trim())}">${escapeHtml((alias || target).trim())}</a>`
            newChildren.push(linkToken)
          }
        } else if (part) {
          const t = new state.Token('text', '', 0)
          t.content = part
          newChildren.push(t)
        }
      }
    }
    blockToken.children = newChildren
  }
})

// Markdown standard image ![alt](url)
const defaultImageRender =
  md.renderer.rules.image ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options)
  }

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  const srcIdx = token.attrIndex('src')
  if (srcIdx >= 0 && token.attrs) {
    token.attrs[srcIdx][1] = resolveImageUrl(String(token.attrs[srcIdx][1]), activeVaultPath)
  }
  token.attrJoin('class', 'note-image')
  return defaultImageRender(tokens, idx, options, env, self)
}

// Highlight ==text==
md.core.ruler.after('inline', 'highlights', (state: StateCore) => {
  for (const blockToken of state.tokens) {
    if (blockToken.type !== 'inline' || !blockToken.children) continue
    for (const token of blockToken.children) {
      if (token.type === 'text' && token.content.includes('==')) {
        token.content = token.content.replace(/==([^=]+)==/g, (_m: string, p1: string) => {
          return `<mark>${escapeHtml(p1)}</mark>`
        })
        token.type = 'html_inline'
      }
    }
  }
})

// Deteksi swatch warna otomatis (#hex, rgb, hsl) di teks biasa (di luar inline code)
md.core.ruler.after('inline', 'color-swatches', (state: StateCore) => {
  for (const blockToken of state.tokens) {
    if (blockToken.type !== 'inline' || !blockToken.children) continue
    for (const token of blockToken.children) {
      if (token.type === 'text' && COLOR_REGEX.test(token.content)) {
        COLOR_REGEX.lastIndex = 0
        token.content = token.content.replace(COLOR_REGEX, (match) => {
          return `<span class="color-swatch" data-color="${match}" style="background-color: ${match}"></span>${escapeHtml(match)}`
        })
        token.type = 'html_inline'
      }
    }
  }
})

export function renderMarkdown(source: string, vaultPath?: string): RenderResult {
  activeVaultPath = vaultPath
  let frontmatter: string | null = null
  let content = source
  let frontmatterOffset = 0

  const fmMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (fmMatch) {
    frontmatter = fmMatch[1]
    content = source.slice(fmMatch[0].length)
    frontmatterOffset = fmMatch[0].split('\n').length - 1
  }

  const headings: HeadingItem[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (m) {
      const level = m[1].length
      const text = m[2].trim()
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
      headings.push({ level, text, id, line: i + 1 + frontmatterOffset })
    }
  }

  // Inject data-source-line ke semua block token
  const tokens = md.parse(content, {})
  for (const token of tokens) {
    if (token.map && token.nesting !== -1) {
      const sourceLine = token.map[0] + 1 + frontmatterOffset
      token.attrSet('data-source-line', String(sourceLine))
    }
  }

  const rawHtml = md.renderer.render(tokens, md.options, {})
  const html = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true, svg: true, svgFilters: true, mathMl: true },
    ADD_TAGS: ['svg', 'path', 'rect', 'button'],
    ADD_ATTR: [
      'target',
      'loading',
      'data-source-line',
      'data-color',
      'data-preview-lang',
      'data-raw',
      'data-target',
      'data-href',
      'data-task',
      'data-line',
    ],
    ALLOW_DATA_ATTR: true,
    ADD_DATA_URI_TAGS: ['img'],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|asset|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })
  return { html, headings, frontmatter }
}
