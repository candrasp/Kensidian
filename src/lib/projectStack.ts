import { ipc } from '@/lib/ipc'

export interface DependencyItem {
  name: string
  version: string
  source: 'npm' | 'cargo'
}

export interface ProjectStackInfo {
  stacks: string[]
  dependencies: DependencyItem[]
}

const STACK_RULES: Array<{ pkg: string; label: string }> = [
  { pkg: '@tauri-apps/api', label: 'Tauri' },
  { pkg: 'vue', label: 'Vue' },
  { pkg: 'react', label: 'React' },
  { pkg: 'svelte', label: 'Svelte' },
  { pkg: 'next', label: 'Next.js' },
  { pkg: 'tailwindcss', label: 'Tailwind' },
  { pkg: 'typescript', label: 'TypeScript' },
  { pkg: 'pinia', label: 'Pinia' },
  { pkg: 'vite', label: 'Vite' },
]

async function readOptional(path: string): Promise<string | null> {
  try {
    const res = await ipc.noteRead(path)
    return res.content || null
  } catch {
    return null
  }
}

function parsePackageJson(raw: string): { stacks: string[]; deps: DependencyItem[] } {
  try {
    const parsed = JSON.parse(raw) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const allDeps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) }
    const stacks = STACK_RULES.filter((r) => r.pkg in allDeps).map((r) => r.label)

    const deps: DependencyItem[] = Object.entries(parsed.dependencies ?? {}).map(
      ([name, version]) => ({ name, version, source: 'npm' }),
    )
    return { stacks, deps }
  } catch {
    return { stacks: [], deps: [] }
  }
}

function parseCargoToml(raw: string): DependencyItem[] {
  const deps: DependencyItem[] = []
  let inDeps = false

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('[')) {
      inDeps = trimmed === '[dependencies]'
      continue
    }
    if (!inDeps) continue

    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const name = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (name) {
      deps.push({ name, version: val.length > 24 ? 'object' : val, source: 'cargo' })
    }
  }
  return deps
}

export async function detectProjectStack(): Promise<ProjectStackInfo> {
  const [pkgRaw, cargoRaw] = await Promise.all([
    readOptional('package.json'),
    readOptional('src-tauri/Cargo.toml'),
  ])

  const stacks: string[] = []
  const dependencies: DependencyItem[] = []

  if (pkgRaw) {
    const pkg = parsePackageJson(pkgRaw)
    stacks.push(...pkg.stacks)
    dependencies.push(...pkg.deps)
  }

  if (cargoRaw) {
    if (!stacks.includes('Rust')) stacks.push('Rust')
    dependencies.push(...parseCargoToml(cargoRaw))
  }

  return { stacks, dependencies }
}
