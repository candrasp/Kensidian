import { ipc } from '@/lib/ipc'

export interface ProjectCommand {
  label: string
  command: string
  group: string
}

async function readOptional(path: string): Promise<string | null> {
  try { return (await ipc.noteRead(path)).content || null } catch { return null }
}

function getRunnerPrefix(pm: string | null): string {
  if (pm === 'Bun') return 'bun run'
  if (pm === 'pnpm') return 'pnpm'
  if (pm === 'Yarn') return 'yarn'
  return 'npm run'
}

function parsePackageScripts(raw: string, pm: string | null): ProjectCommand[] {
  try {
    const parsed = JSON.parse(raw) as { scripts?: Record<string, string> }
    const scripts = parsed.scripts ?? {}
    const prefix = getRunnerPrefix(pm)
    return Object.keys(scripts).slice(0, 12).map((name) => ({
      label: name,
      command: `${prefix} ${name}`,
      group: 'Script',
    }))
  } catch {
    return []
  }
}

function getSubpackageCommand(pm: string | null, subDir: string, script: string): string {
  if (pm === 'Bun') return `bun --cwd ${subDir} run ${script}`
  if (pm === 'pnpm') return `pnpm --dir ${subDir} ${script}`
  if (pm === 'Yarn') return `yarn --cwd ${subDir} ${script}`
  return `npm --prefix ${subDir} run ${script}`
}

async function scanMonorepoScripts(pm: string | null): Promise<ProjectCommand[]> {
  const WORKSPACE_DIRS = ['apps', 'packages', 'library', 'projects']
  const cmds: ProjectCommand[] = []

  for (const dir of WORKSPACE_DIRS) {
    let entries: { name: string; kind: string }[] = []
    try { entries = await ipc.fsListDir(dir) } catch { continue }

    const subfolders = entries.filter((e) => e.kind === 'folder').slice(0, 8)
    await Promise.all(subfolders.map(async (folder) => {
      const subDir = `${dir}/${folder.name}`
      const raw = await readOptional(`${subDir}/package.json`)
      if (!raw) return
      try {
        const parsed = JSON.parse(raw) as { scripts?: Record<string, string> }
        for (const name of Object.keys(parsed.scripts ?? {}).slice(0, 6)) {
          cmds.push({
            label: name,
            command: getSubpackageCommand(pm, subDir, name),
            group: subDir,
          })
        }
      } catch { /* abaikan JSON invalid */ }
    }))
  }
  return cmds
}

function parseComposerScripts(raw: string): ProjectCommand[] {
  try {
    const parsed = JSON.parse(raw) as { scripts?: Record<string, unknown> }
    return Object.keys(parsed.scripts ?? {}).slice(0, 8).map((name) => ({
      label: name,
      command: `composer run ${name}`,
      group: 'Composer',
    }))
  } catch {
    return []
  }
}

function parseMakefileTargets(raw: string): ProjectCommand[] {
  const cmds: ProjectCommand[] = []
  for (const line of raw.split('\n')) {
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*:/)
    if (!match || match[1].startsWith('.')) continue
    cmds.push({ label: match[1], command: `make ${match[1]}`, group: 'Make' })
    if (cmds.length >= 6) break
  }
  return cmds
}

export async function detectProjectCommands(packageManager: string | null): Promise<ProjectCommand[]> {
  let rootFiles = new Set<string>()
  try {
    const entries = await ipc.fsListDir('')
    rootFiles = new Set(entries.filter((e) => e.kind === 'file').map((e) => e.name))
  } catch {
    // Tetap lanjut baca file konfigurasi langsung meski fsListDir gagal
  }

  const [pkgRaw, composerRaw, reqRaw, pubspecRaw, makeRaw, tauriCargoRaw] = await Promise.all([
    readOptional('package.json'),
    readOptional('composer.json'),
    readOptional('requirements.txt'),
    readOptional('pubspec.yaml'),
    readOptional('Makefile'),
    readOptional('src-tauri/Cargo.toml'),
  ])

  const commands: ProjectCommand[] = []

  if (pkgRaw) {
    commands.push(...parsePackageScripts(pkgRaw, packageManager))
  }
  if (commands.length === 0) {
    commands.push(...await scanMonorepoScripts(packageManager))
  }

  if (tauriCargoRaw && !commands.some((c) => c.label === 'tauri')) {
    const prefix = getRunnerPrefix(packageManager)
    commands.push(
      { label: 'tauri dev', command: `${prefix} tauri dev`, group: 'Tauri' },
      { label: 'tauri build', command: `${prefix} tauri build`, group: 'Tauri' },
    )
  }

  if (rootFiles.has('Cargo.toml')) {
    commands.push(
      { label: 'run', command: 'cargo run', group: 'Rust' },
      { label: 'build', command: 'cargo build --release', group: 'Rust' },
      { label: 'test', command: 'cargo test', group: 'Rust' },
      { label: 'check', command: 'cargo check', group: 'Rust' },
    )
  }

  if (rootFiles.has('artisan')) {
    commands.push(
      { label: 'serve', command: 'php artisan serve', group: 'Laravel' },
      { label: 'test', command: 'php artisan test', group: 'Laravel' },
      { label: 'migrate', command: 'php artisan migrate', group: 'Laravel' },
    )
  } else if (composerRaw) {
    const composerScripts = parseComposerScripts(composerRaw)
    if (composerScripts.length > 0) commands.push(...composerScripts)
    else commands.push({ label: 'serve', command: 'php -S localhost:8000', group: 'PHP' })
  }

  if (rootFiles.has('go.mod')) {
    commands.push(
      { label: 'run', command: 'go run .', group: 'Go' },
      { label: 'build', command: 'go build ./...', group: 'Go' },
      { label: 'test', command: 'go test ./...', group: 'Go' },
    )
  }

  if (rootFiles.has('manage.py')) {
    commands.push(
      { label: 'runserver', command: 'python manage.py runserver', group: 'Django' },
      { label: 'test', command: 'python manage.py test', group: 'Django' },
    )
  } else if (reqRaw) {
    const lower = reqRaw.toLowerCase()
    if (lower.includes('fastapi') || lower.includes('uvicorn')) {
      commands.push({ label: 'dev', command: 'uvicorn main:app --reload', group: 'Python' })
    } else if (lower.includes('flask')) {
      commands.push({ label: 'dev', command: 'flask run --debug', group: 'Python' })
    }
    if (lower.includes('pytest')) {
      commands.push({ label: 'test', command: 'pytest', group: 'Python' })
    }
  }

  if (pubspecRaw) {
    if (pubspecRaw.includes('flutter')) {
      commands.push(
        { label: 'run', command: 'flutter run', group: 'Flutter' },
        { label: 'build', command: 'flutter build', group: 'Flutter' },
        { label: 'test', command: 'flutter test', group: 'Flutter' },
      )
    } else {
      commands.push(
        { label: 'run', command: 'dart run', group: 'Dart' },
        { label: 'test', command: 'dart test', group: 'Dart' },
      )
    }
  }

  if (makeRaw) commands.push(...parseMakefileTargets(makeRaw))

  return commands
}
