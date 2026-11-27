export interface ChecklistTask {
  text: string
  done: boolean
}

export function cleanMarkdownInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .trim()
}

export function parseChecklist(content: string): ChecklistTask[] {
  const tasks: ChecklistTask[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('- [ ] ')) {
      tasks.push({ text: cleanMarkdownInline(trimmed.slice(6)), done: false })
    } else if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
      tasks.push({ text: cleanMarkdownInline(trimmed.slice(6)), done: true })
    }
  }
  return tasks
}
