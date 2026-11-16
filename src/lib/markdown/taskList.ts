import type MarkdownIt from 'markdown-it'
import type { StateCore } from 'markdown-it'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const taskListPlugin = (md: InstanceType<typeof MarkdownIt>) => {
  md.core.ruler.after('inline', 'task-lists', (state: StateCore) => {
    const tokens = state.tokens
    for (let i = 2; i < tokens.length; i++) {
      if (tokens[i].type !== 'inline') continue
      const inlineToken = tokens[i]
      if (!inlineToken.children || inlineToken.children.length === 0) continue

      const firstChild = inlineToken.children[0]
      if (firstChild.type !== 'text') continue

      const match = firstChild.content.match(/^\[([ xX\/\->i?!])\](?:\s*(.*))?$/s)
      if (!match) continue

      let parentListItem: { attrJoin: (k: string, v: string) => void; attrSet: (k: string, v: string) => void; map?: [number, number] } | null = null
      for (let j = i - 1; j >= 0; j--) {
        if (tokens[j].type === 'list_item_open') {
          parentListItem = tokens[j] as unknown as { attrJoin: (k: string, v: string) => void; attrSet: (k: string, v: string) => void; map?: [number, number] }
          break
        }
        if (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open') {
          break
        }
      }
      if (!parentListItem) continue

      const char = match[1]
      const lowerChar = char.toLowerCase()
      const isChecked = lowerChar === 'x'
      const isCancelled = char === '-'

      parentListItem.attrJoin('class', 'task-list-item')
      parentListItem.attrSet('data-task', lowerChar)
      if (isChecked) parentListItem.attrJoin('class', 'is-checked')
      if (isCancelled) parentListItem.attrJoin('class', 'is-cancelled')

      const lineNum = parentListItem.map ? String(parentListItem.map[0]) : ''
      firstChild.content = match[2] ?? ''

      const checkboxToken = new state.Token('html_inline', '', 0)
      checkboxToken.content = `<span class="task-checkbox" data-task="${escapeHtml(lowerChar)}" data-line="${lineNum}" role="checkbox" aria-checked="${isChecked}"></span>`
      inlineToken.children.unshift(checkboxToken)
    }
  })
}

export function toggleTaskInContent(content: string, lineIdx: number): string {
  const lines = content.split('\n')
  if (lineIdx < 0 || lineIdx >= lines.length) return content
  const line = lines[lineIdx]
  const match = line.match(/^(\s*[-*]\s+\[)(.)(\])/)
  if (!match) return content
  const nextChar = match[2].toLowerCase() === 'x' ? ' ' : 'x'
  lines[lineIdx] = line.replace(/^(\s*[-*]\s+\[)(.)(\])/, `$1${nextChar}$3`)
  return lines.join('\n')
}
