import { cleanMarkdownInline } from './projectChecklist'
import { currentLocale } from '@/lib/i18n'

export interface DevlogSession {
  time: string
  branch: string
  completed: string
  next: string
}

export interface DevlogFile {
  name: string
  path: string
  sessions: DevlogSession[]
}

function cleanLine(raw: string): string {
  const withoutBullet = raw.trim().replace(/^-\s+/, '')
  return cleanMarkdownInline(withoutBullet)
}

export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function buildDevlogAgentPrompt(branch: string): string {
  const date = getTodayString()
  const time = getTimeString()
  const activeBranch = branch || 'main'
  if (currentLocale.value === 'en') {
    return [
      `Log a summary of this coding session to \`devlog/${date}.md\`.`,
      `1. If the \`devlog/\` folder does not exist, create it first.`,
      `2. If \`devlog/${date}.md\` does not exist, create it with the title \`# Devlog — ${date}\`. If it exists, append the new entry at the bottom without removing previous sessions.`,
      `3. Use the current local time (${time}) and keep the exact entry format below:`,
      ``,
      `### Sesi ${time} (Branch: \`${activeBranch}\`)`,
      `- **Selesai:** <concise summary of what was completed in this session>`,
      `- **Langkah berikutnya:** <concrete next target for the following session, optional>`,
    ].join('\n')
  }
  return [
    `Catat ringkasan sesi koding ini ke file \`devlog/${date}.md\`.`,
    `1. Jika folder \`devlog/\` belum ada, buat folder tersebut terlebih dahulu.`,
    `2. Jika file \`devlog/${date}.md\` belum ada, buat dengan judul \`# Devlog — ${date}\`. Jika sudah ada, tambahkan entri baru di bagian paling bawah tanpa menghapus sesi sebelumnya.`,
    `3. Gunakan jam sistem lokal saat ini (${time}) dan format persis seperti berikut:`,
    ``,
    `### Sesi ${time} (Branch: \`${activeBranch}\`)`,
    `- **Selesai:** <ringkasan singkat apa yang dikerjakan pada sesi ini>`,
    `- **Langkah berikutnya:** <target konkret untuk sesi berikutnya, opsional>`,
  ].join('\n')
}

export function parseDevlogContent(content: string): DevlogSession[] {
  const sessions: DevlogSession[] = []
  let current: DevlogSession | null = null
  let activeField: 'completed' | 'next' | null = null

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    const headerMatch = trimmed.match(/^### Sesi ([^ ]+)(?: \(Branch: `([^`]+)`\))?/)
    if (headerMatch) {
      if (current && (current.completed || current.next)) sessions.push(current)
      current = { time: headerMatch[1], branch: headerMatch[2] || '', completed: '', next: '' }
      activeField = null
      continue
    }
    if (!current) continue
    if (trimmed.startsWith('- **Selesai:**')) {
      activeField = 'completed'
      const text = cleanLine(trimmed.slice('- **Selesai:**'.length))
      if (text) current.completed = text
    } else if (trimmed.startsWith('- **Langkah berikutnya:**')) {
      activeField = 'next'
      const text = cleanLine(trimmed.slice('- **Langkah berikutnya:**'.length))
      if (text) current.next = text
    } else if (activeField && trimmed && !trimmed.startsWith('#')) {
      const cleaned = cleanLine(trimmed)
      if (cleaned) current[activeField] = current[activeField] ? `${current[activeField]}\n${cleaned}` : cleaned
    }
  }
  if (current && (current.completed || current.next)) sessions.push(current)
  return sessions.reverse()
}
