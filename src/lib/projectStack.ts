import { ipc } from '@/lib/ipc'

export interface DependencyItem {
  name: string
  version: string
  source: 'npm' | 'cargo' | 'pip' | 'composer' | 'go' | 'other'
}

export interface ProjectStackInfo {
  stacks: string[]
  packageManager: string | null
  isMonorepo: boolean
  dependencies: DependencyItem[]
}

const NPM_STACK_RULES: Array<{ pkg: string; label: string }> = [
  { pkg: '@tauri-apps/api', label: 'Tauri' },
  { pkg: 'vue', label: 'Vue' },
  { pkg: 'nuxt', label: 'Nuxt' },
  { pkg: '@nuxt/core', label: 'Nuxt' },
  { pkg: 'react', label: 'React' },
  { pkg: 'react-dom', label: 'React' },
  { pkg: 'next', label: 'Next.js' },
  { pkg: '@remix-run/node', label: 'Remix' },
  { pkg: '@remix-run/react', label: 'Remix' },
  { pkg: 'svelte', label: 'Svelte' },
  { pkg: '@sveltejs/kit', label: 'SvelteKit' },
  { pkg: '@angular/core', label: 'Angular' },
  { pkg: 'astro', label: 'Astro' },
  { pkg: 'solid-js', label: 'SolidJS' },
  { pkg: 'tailwindcss', label: 'Tailwind' },
  { pkg: 'pinia', label: 'Pinia' },
  { pkg: 'electron', label: 'Electron' },
  { pkg: 'express', label: 'Express' },
  { pkg: 'fastify', label: 'Fastify' },
  { pkg: 'hono', label: 'Hono' },
  { pkg: 'elysia', label: 'Elysia' },
  { pkg: 'typescript', label: 'TypeScript' },
  { pkg: 'vite', label: 'Vite' },
]

const PYTHON_RULES: Record<string, string> = {
  django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
  'scikit-learn': 'scikit-learn', pandas: 'Pandas', numpy: 'NumPy',
  torch: 'PyTorch', tensorflow: 'TensorFlow',
}

const COMPOSER_RULES: Record<string, string> = {
  'laravel/framework': 'Laravel', 'symfony/symfony': 'Symfony',
  'codeigniter4/framework': 'CodeIgniter', 'slim/slim': 'Slim',
  'cakephp/cakephp': 'CakePHP',
}

async function readOptional(path: string): Promise<string | null> {
  try { return (await ipc.noteRead(path)).content || null } catch { return null }
}

function extractFromPkg(raw: string, globalSeen: Set<string>): { stacks: string[]; deps: DependencyItem[]; hasWorkspaces: boolean } {
  try {
    const parsed = JSON.parse(raw) as {
      workspaces?: unknown
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const allDeps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) }
    const stacks: string[] = []
    for (const rule of NPM_STACK_RULES) {
      if (rule.pkg in allDeps && !globalSeen.has(rule.label)) {
        globalSeen.add(rule.label)
        stacks.push(rule.label)
      }
    }
    const deps: DependencyItem[] = Object.entries(parsed.dependencies ?? {}).map(
      ([name, version]) => ({ name, version, source: 'npm' as const }),
    )
    return { stacks, deps, hasWorkspaces: Boolean(parsed.workspaces) }
  } catch { return { stacks: [], deps: [], hasWorkspaces: false } }
}

function parseCargoToml(raw: string): DependencyItem[] {
  const deps: DependencyItem[] = []
  let inDeps = false
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('[')) { inDeps = trimmed === '[dependencies]'; continue }
    if (!inDeps) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const name = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    const verMatch = val.match(/version\s*=\s*["']([^"']+)["']/)
    const version = verMatch ? verMatch[1] : (val.length > 24 ? '…' : val)
    if (name) deps.push({ name, version, source: 'cargo' })
  }
  return deps
}

function parseRequirements(raw: string, globalSeen: Set<string>): { stacks: string[]; deps: DependencyItem[] } {
  const stacks: string[] = []
  const deps: DependencyItem[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const name = trimmed.split(/[=><![\s]/)[0].trim()
    const version = trimmed.includes('==') ? (trimmed.split('==')[1]?.split(/[\s;]/)[0] ?? '') : ''
    const label = PYTHON_RULES[name.toLowerCase()]
    if (label && !globalSeen.has(label)) { globalSeen.add(label); stacks.push(label) }
    if (name) deps.push({ name, version, source: 'pip' })
  }
  return { stacks, deps }
}

function parseComposerJson(raw: string, globalSeen: Set<string>): { stacks: string[]; deps: DependencyItem[] } {
  try {
    const parsed = JSON.parse(raw) as { require?: Record<string, string> }
    const allDeps = parsed.require ?? {}
    const stacks: string[] = []
    for (const [pkg, label] of Object.entries(COMPOSER_RULES)) {
      if (pkg in allDeps && !globalSeen.has(label)) { globalSeen.add(label); stacks.push(label) }
    }
    const deps: DependencyItem[] = Object.entries(allDeps).map(
      ([name, version]) => ({ name, version, source: 'composer' as const }),
    )
    return { stacks, deps }
  } catch { return { stacks: [], deps: [] } }
}

// Scan sub-package.json di folder workspace monorepo
async function scanMonorepo(globalSeen: Set<string>): Promise<{ stacks: string[]; deps: DependencyItem[]; foundSubpackages: number }> {
  const WORKSPACE_DIRS = ['apps', 'packages', 'library', 'projects']
  const stacks: string[] = []
  const depMap = new Map<string, DependencyItem>()
  let foundSubpackages = 0

  for (const dir of WORKSPACE_DIRS) {
    let entries: { name: string; kind: string }[] = []
    try { entries = await ipc.fsListDir(dir) } catch { continue }

    const subfolders = entries.filter((e) => e.kind === 'folder').slice(0, 8)
    await Promise.all(subfolders.map(async (folder) => {
      const raw = await readOptional(`${dir}/${folder.name}/package.json`)
      if (!raw) return
      foundSubpackages++
      const result = extractFromPkg(raw, globalSeen)
      stacks.push(...result.stacks)
      for (const dep of result.deps) {
        const key = `${dep.source}:${dep.name}`
        if (!depMap.has(key)) depMap.set(key, dep)
      }
    }))
  }
  return { stacks, deps: [...depMap.values()], foundSubpackages }
}

export async function detectProjectStack(): Promise<ProjectStackInfo> {
  const stackSet = new Set<string>()
  const globalSeen = new Set<string>() // dedup label antar semua sumber
  const dependencies: DependencyItem[] = []

  const [
    pkgRaw, cargoTauriRaw, cargoRootRaw,
    reqRaw, pyprojectRaw, pipfileRaw,
    goModRaw, composerRaw, gemfileRaw,
    gradleRaw, gradleKtsRaw, pomRaw,
    pubspecRaw, packageSwiftRaw, cmakeRaw,
    bunLockRaw, pnpmLockRaw, yarnLockRaw, pkgLockRaw,
    pnpmWorkspaceRaw,
  ] = await Promise.all([
    readOptional('package.json'),
    readOptional('src-tauri/Cargo.toml'),
    readOptional('Cargo.toml'),
    readOptional('requirements.txt'),
    readOptional('pyproject.toml'),
    readOptional('Pipfile'),
    readOptional('go.mod'),
    readOptional('composer.json'),
    readOptional('Gemfile'),
    readOptional('build.gradle'),
    readOptional('build.gradle.kts'),
    readOptional('pom.xml'),
    readOptional('pubspec.yaml'),
    readOptional('Package.swift'),
    readOptional('CMakeLists.txt'),
    readOptional('bun.lock'),
    readOptional('pnpm-lock.yaml'),
    readOptional('yarn.lock'),
    readOptional('package-lock.json'),
    readOptional('pnpm-workspace.yaml'),
  ])

  // Package manager (prioritas: Bun > pnpm > Yarn > npm)
  let packageManager: string | null = null
  if (bunLockRaw) packageManager = 'Bun'
  else if (pnpmLockRaw) packageManager = 'pnpm'
  else if (yarnLockRaw) packageManager = 'Yarn'
  else if (pkgLockRaw) packageManager = 'npm'

  // JavaScript/TypeScript — root package.json
  let rootDepsEmpty = true
  let hasWorkspacesField = false
  if (pkgRaw) {
    const pkg = extractFromPkg(pkgRaw, globalSeen)
    hasWorkspacesField = pkg.hasWorkspaces
    pkg.stacks.forEach((s) => stackSet.add(s))
    if (pkg.deps.length > 0) { dependencies.push(...pkg.deps); rootDepsEmpty = false }
  }

  // Monorepo: scan subfolder jika root deps kosong atau ada workspace marker
  let isMonorepo = Boolean(pnpmWorkspaceRaw || hasWorkspacesField)
  if (rootDepsEmpty || isMonorepo) {
    const sub = await scanMonorepo(globalSeen)
    if (sub.foundSubpackages > 0) isMonorepo = true
    sub.stacks.forEach((s) => stackSet.add(s))
    const existingKeys = new Set(dependencies.map((d) => `${d.source}:${d.name}`))
    for (const dep of sub.deps) {
      if (!existingKeys.has(`${dep.source}:${dep.name}`)) dependencies.push(dep)
    }
  }

  // Rust/Tauri
  const cargoToml = cargoTauriRaw ?? cargoRootRaw
  if (cargoToml) { stackSet.add('Rust'); dependencies.push(...parseCargoToml(cargoToml)) }

  // Python
  if (reqRaw) {
    stackSet.add('Python')
    const { stacks, deps } = parseRequirements(reqRaw, globalSeen)
    stacks.forEach((s) => stackSet.add(s)); dependencies.push(...deps)
  } else if (pyprojectRaw || pipfileRaw) stackSet.add('Python')

  // Go
  if (goModRaw) stackSet.add('Go')

  // PHP
  if (composerRaw) {
    stackSet.add('PHP')
    const { stacks, deps } = parseComposerJson(composerRaw, globalSeen)
    stacks.forEach((s) => stackSet.add(s)); dependencies.push(...deps)
  }

  // Ruby
  if (gemfileRaw) stackSet.add('Ruby')

  // Java / Kotlin / Android
  if (gradleKtsRaw || gradleRaw || pomRaw) {
    if (gradleKtsRaw?.includes('kotlin') || gradleRaw?.includes('kotlin') || gradleKtsRaw) stackSet.add('Kotlin')
    else stackSet.add('Java')
    if (gradleRaw?.includes('com.android') || gradleKtsRaw?.includes('com.android')) stackSet.add('Android')
  }

  // Dart / Flutter
  if (pubspecRaw) { stackSet.add('Dart'); if (pubspecRaw.includes('flutter')) stackSet.add('Flutter') }

  // Swift
  if (packageSwiftRaw) stackSet.add('Swift')

  // C/C++
  if (cmakeRaw) stackSet.add('C/C++')

  const stackOrder = new Map(NPM_STACK_RULES.map((r, i) => [r.label, i]))
  const sortedStacks = [...stackSet].sort((a, b) => (stackOrder.get(a) ?? 99) - (stackOrder.get(b) ?? 99))

  return { stacks: sortedStacks, packageManager, isMonorepo, dependencies }
}
