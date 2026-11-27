import { currentLocale, type Locale } from '@/lib/i18n'

export type DocCategory = 'core' | 'design' | 'tech' | 'governance'

export const DOC_CATEGORIES: { id: DocCategory; label: Record<Locale, string> }[] = [
  { id: 'core', label: { id: 'Inti & Rencana', en: 'Core & Planning' } },
  { id: 'design', label: { id: 'Desain & Spesifikasi', en: 'Design & Specs' } },
  { id: 'tech', label: { id: 'Teknis & Operasional', en: 'Technical & Ops' } },
  { id: 'governance', label: { id: 'Tata Kelola & Keamanan', en: 'Governance & Security' } },
]

export interface ProjectDocSpec {
  filename: string
  category: DocCategory
  summary: Record<Locale, string>
  template: Record<Locale, string>
  promptHint: Record<Locale, string>
}

export const DOC_WRITING_RULES: Record<Locale, string[]> = {
  id: [
    'Gunakan format Markdown (.md) dengan nama file HURUF KAPITAL agar berada di atas daftar file.',
    'Langsung ke inti: pakai kalimat pendek dan poin-poin, hindari basa-basi.',
    'Wajib update dokumen terkait setiap kali mengubah fitur, arsitektur, atau cara kerja.',
  ],
  en: [
    'Use Markdown (.md) with UPPERCASE filenames so they stay at the top of the file list.',
    'Keep it concise: use short sentences and bullet points, avoid fluff.',
    'Update relevant docs whenever you change features, architecture, or behavior.',
  ],
}

export const PROJECT_DOC_SPECS: ProjectDocSpec[] = [
  {
    filename: 'README.md',
    category: 'core',
    summary: {
      id: 'Halaman utama proyek: ringkasan aplikasi, fitur inti, dan cara cepat menjalankannya.',
      en: 'Project landing page: app overview, core features, and quick start instructions.',
    },
    template: {
      id: '# Nama Proyek\n\nDeskripsi singkat 1–2 kalimat tentang fungsi utama proyek ini.\n\n## Fitur Utama\n- Fitur 1\n- Fitur 2\n\n## Cara Menjalankan\n```bash\n# install & jalankan\n```\n',
      en: '# Project Name\n\nShort 1–2 sentence overview of what this project does.\n\n## Key Features\n- Feature 1\n- Feature 2\n\n## Getting Started\n```bash\n# install & run\n```\n',
    },
    promptHint: {
      id: 'ringkasan proyek, tech stack dari manifest yang ada, daftar fitur utama, dan perintah dev/build untuk menjalankannya',
      en: 'project overview, tech stack from existing manifests, key features, and dev/build commands',
    },
  },
  {
    filename: 'ROADMAP.md',
    category: 'core',
    summary: {
      id: 'Rencana fitur dan checklist tugas (- [ ]) yang sedang dikerjakan maupun target berikutnya.',
      en: 'Feature plan and task checklists (- [ ]) for current work and upcoming milestones.',
    },
    template: {
      id: '# ROADMAP\n\n## Tahap 1 — Fondasi\n- [ ] Tugas pertama\n- [ ] Tugas kedua\n',
      en: '# ROADMAP\n\n## Phase 1 — Foundation\n- [ ] First task\n- [ ] Second task\n',
    },
    promptHint: {
      id: 'daftar milestone dan checklist tugas dengan format `- [ ]` dan `- [x]` berdasarkan kondisi codebase saat ini',
      en: 'milestones and task checklists using `- [ ]` and `- [x]` based on the current codebase',
    },
  },
  {
    filename: 'CHANGELOG.md',
    category: 'core',
    summary: {
      id: 'Catatan perubahan per versi (Ditambahkan, Diperbaiki, Diubah) agar riwayat rilis jelas.',
      en: 'Per-version change log (Added, Fixed, Changed) to keep release history clear.',
    },
    template: {
      id: '# Changelog\n\n## [Belum Dirilis]\n### Ditambahkan\n- Inisialisasi proyek\n\n### Diperbaiki\n- -\n',
      en: '# Changelog\n\n## [Unreleased]\n### Added\n- Initial project setup\n\n### Fixed\n- -\n',
    },
    promptHint: {
      id: 'ringkasan perubahan terbaru (atau dari riwayat git) memakai format `## [Versi]` dengan sub-bagian `### Ditambahkan` dan `### Diperbaiki` serta poin `- `',
      en: 'summary of recent changes (or from git history) using `## [Version]` with `### Added` / `### Fixed` subsections and `- ` bullets',
    },
  },
  {
    filename: 'TODO.md',
    category: 'core',
    summary: {
      id: 'Daftar tugas harian atau perbaikan cepat di luar roadmap utama.',
      en: 'Daily tasks or quick fixes outside the main roadmap.',
    },
    template: {
      id: '# TODO\n\n- [ ] Tugas mendesak\n',
      en: '# TODO\n\n- [ ] Urgent task\n',
    },
    promptHint: {
      id: 'daftar tugas teknis atau TODO yang masih terbuka di codebase dengan format checklist `- [ ]`',
      en: 'open technical tasks or TODOs in the codebase formatted as `- [ ]` checklists',
    },
  },
  {
    filename: 'BUG.md',
    category: 'core',
    summary: {
      id: 'Catatan bug yang ditemukan, langkah reproduksi, dan status perbaikannya.',
      en: 'Tracked bugs, reproduction steps, and fix status.',
    },
    template: {
      id: '# Bug & Audit\n\n- [ ] **BUG-01:** Deskripsi singkat masalah dan cara reproduksinya\n',
      en: '# Bugs & Audit\n\n- [ ] **BUG-01:** Brief problem description and reproduction steps\n',
    },
    promptHint: {
      id: 'audit potensi bug atau edge case yang ada di codebase saat ini dalam format checklist `- [ ]`',
      en: 'audit of potential bugs or edge cases in the current codebase formatted as `- [ ]` checklists',
    },
  },
  {
    filename: 'DESIGN.md',
    category: 'design',
    summary: {
      id: 'Panduan UI/UX: design tokens (warna, tipografi, spacing), layout utama, dan aturan komponen.',
      en: 'UI/UX guide: design tokens (colors, typography, spacing), main layouts, and component rules.',
    },
    template: {
      id: '# Panduan Desain\n\n## Token Warna & Tipografi\n- Background: ...\n- Accent: ...\n\n## Tata Letak & Komponen\n- ...\n',
      en: '# Design Guide\n\n## Color & Typography Tokens\n- Background: ...\n- Accent: ...\n\n## Layout & Components\n- ...\n',
    },
    promptHint: {
      id: 'design tokens CSS/Tailwind, palet warna, tipografi, layout utama, dan pola komponen UI yang digunakan di proyek',
      en: 'CSS/Tailwind design tokens, color palette, typography, main layouts, and UI component patterns',
    },
  },
  {
    filename: 'CONTRACT.md',
    category: 'design',
    summary: {
      id: 'Kontrak integrasi Frontend ↔ Backend: daftar endpoint/IPC, payload request/response, dan error code.',
      en: 'Frontend ↔ Backend contract: endpoints/IPC commands, request/response payloads, and error codes.',
    },
    template: {
      id: '# Kontrak API & IPC\n\n## Daftar Endpoint / Command\n| Nama | Input | Output | Error |\n|---|---|---|---|\n| `...` | `...` | `...` | `...` |\n',
      en: '# API & IPC Contract\n\n## Endpoints / Commands\n| Name | Input | Output | Error |\n|---|---|---|---|\n| `...` | `...` | `...` | `...` |\n',
    },
    promptHint: {
      id: 'seluruh endpoint API atau IPC command, skema tipe request/response, serta kode error yang berlaku antara frontend dan backend',
      en: 'all API endpoints or IPC commands, request/response schemas, and error codes between frontend and backend',
    },
  },
  {
    filename: 'FRONTEND.md',
    category: 'design',
    summary: {
      id: 'Spesifikasi arsitektur antarmuka: routing, state management, komponen utama, dan aturan UI.',
      en: 'Frontend architecture spec: routing, state management, core components, and UI conventions.',
    },
    template: {
      id: '# Spesifikasi Frontend\n\n## Stack & State Management\n- ...\n\n## Struktur Halaman & Komponen\n- ...\n',
      en: '# Frontend Specification\n\n## Stack & State Management\n- ...\n\n## Pages & Components\n- ...\n',
    },
    promptHint: {
      id: 'arsitektur frontend, state/store, daftar komponen utama, alur interaksi, dan aturan styling dari codebase frontend',
      en: 'frontend architecture, stores/state, main components, interaction flows, and styling rules',
    },
  },
  {
    filename: 'BACKEND.md',
    category: 'design',
    summary: {
      id: 'Spesifikasi layanan backend: modul bisnis, skema database/storage, autentikasi, dan validasi.',
      en: 'Backend service spec: business modules, database/storage schema, auth, and validation.',
    },
    template: {
      id: '# Spesifikasi Backend\n\n## Modul & Layanan\n- ...\n\n## Penyimpanan Data & Keamanan\n- ...\n',
      en: '# Backend Specification\n\n## Modules & Services\n- ...\n\n## Storage & Security\n- ...\n',
    },
    promptHint: {
      id: 'struktur modul backend, model data/database, validasi input, penanganan error, dan mekanisme keamanan di codebase backend',
      en: 'backend module structure, data/database models, input validation, error handling, and security mechanisms',
    },
  },
  {
    filename: 'ARCHITECTURE.md',
    category: 'tech',
    summary: {
      id: 'Desain sistem: struktur folder utama, alur data, dan keputusan teknis penting.',
      en: 'System design: main folder structure, data flow, and key architectural decisions.',
    },
    template: {
      id: '# Arsitektur Sistem\n\n## Struktur Folder\n- `src/` — ...\n\n## Alur Data\n- ...\n',
      en: '# System Architecture\n\n## Folder Structure\n- `src/` — ...\n\n## Data Flow\n- ...\n',
    },
    promptHint: {
      id: 'struktur folder utama, modul inti, dan alur data antar komponen berdasarkan codebase aktual',
      en: 'main folder structure, core modules, and data flow across components based on the actual codebase',
    },
  },
  {
    filename: 'DEVELOPMENT.md',
    category: 'tech',
    summary: {
      id: 'Panduan setup environment lokal, menjalankan test, dan cara debugging.',
      en: 'Local environment setup guide, running tests, and debugging workflow.',
    },
    template: {
      id: '# Panduan Development\n\n## Prasyarat\n- ...\n\n## Menjalankan Tes & Verifikasi\n```bash\n# perintah test/lint\n```\n',
      en: '# Development Guide\n\n## Prerequisites\n- ...\n\n## Running Tests & Checks\n```bash\n# test/lint commands\n```\n',
    },
    promptHint: {
      id: 'prasyarat environment, setup lokal, dan perintah test/typecheck/lint yang tersedia di proyek',
      en: 'environment prerequisites, local setup, and available test/typecheck/lint commands',
    },
  },
  {
    filename: 'DEPLOYMENT.md',
    category: 'tech',
    summary: {
      id: 'Langkah build produksi dan cara rilis/deploy aplikasi ke server atau distribusi.',
      en: 'Production build steps and release/deployment instructions.',
    },
    template: {
      id: '# Panduan Deployment\n\n## Build Produksi\n```bash\n# perintah build\n```\n\n## Langkah Rilis\n1. ...\n',
      en: '# Deployment Guide\n\n## Production Build\n```bash\n# build commands\n```\n\n## Release Steps\n1. ...\n',
    },
    promptHint: {
      id: 'langkah build produksi, environment variable yang dibutuhkan, dan proses rilis/deploy proyek',
      en: 'production build steps, required environment variables, and release/deploy process',
    },
  },
  {
    filename: 'CONTRIBUTING.md',
    category: 'governance',
    summary: {
      id: 'Aturan kerja tim: konvensi branch, format commit Git, dan standar kode.',
      en: 'Team workflow rules: branch conventions, Git commit format, and code standards.',
    },
    template: {
      id: '# Panduan Kontribusi\n\n## Aturan Branch & Commit\n- Gunakan nama branch deskriptif (`feat/...`, `fix/...`)\n\n## Standar Kode\n- Pastikan lint & typecheck lolos sebelum commit\n',
      en: '# Contributing Guide\n\n## Branch & Commit Rules\n- Use descriptive branch names (`feat/...`, `fix/...`)\n\n## Code Standards\n- Ensure lint & typecheck pass before committing\n',
    },
    promptHint: {
      id: 'aturan kontribusi, konvensi penamaan, dan checklist verifikasi sebelum commit/PR sesuai setup proyek',
      en: 'contribution rules, naming conventions, and pre-commit/PR verification checklist',
    },
  },
  {
    filename: 'SECURITY.md',
    category: 'governance',
    summary: {
      id: 'Kebijakan pelaporan celah keamanan dan praktik keamanan dasar proyek.',
      en: 'Vulnerability reporting policy and baseline security practices.',
    },
    template: {
      id: '# Kebijakan Keamanan\n\nJika menemukan celah keamanan, harap laporkan secara privat kepada maintainer sebelum mempublikasikannya.\n',
      en: '# Security Policy\n\nIf you discover a security vulnerability, please report it privately to the maintainers before public disclosure.\n',
    },
    promptHint: {
      id: 'kebijakan pelaporan celah keamanan dan daftar area sensitif (autentikasi, input validation, storage) yang perlu dijaga',
      en: 'vulnerability reporting policy and sensitive areas (auth, input validation, storage) to protect',
    },
  },
  {
    filename: 'LICENSE.md',
    category: 'governance',
    summary: {
      id: 'Lisensi resmi yang mengatur hak pakai, modifikasi, dan distribusi kode.',
      en: 'Official license governing usage, modification, and distribution rights.',
    },
    template: {
      id: '# Lisensi\n\nHak cipta (c) 2026. Sesuaikan dengan lisensi proyek (misal GNU GPLv3 / MIT).\n',
      en: '# License\n\nCopyright (c) 2026. Match with the project license (e.g. GNU GPLv3 / MIT).\n',
    },
    promptHint: {
      id: 'teks lisensi standar yang sesuai dengan informasi package/proyek (misal GNU GPLv3 atau MIT)',
      en: 'standard license text matching the project package info (e.g. GNU GPLv3 or MIT)',
    },
  },
]

export function getDocSpec(filename: string): ProjectDocSpec | undefined {
  return PROJECT_DOC_SPECS.find((d) => d.filename === filename)
}

export function getDocTemplate(spec: ProjectDocSpec): string {
  return spec.template[currentLocale.value]
}

export function buildDocAgentPrompt(spec: ProjectDocSpec, projectName: string): string {
  const loc = currentLocale.value
  if (loc === 'en') {
    return [
      `Create or update \`${spec.filename}\` at the root of project "${projectName}".`,
      `Purpose: ${spec.summary.en}`,
      `Required content: ${spec.promptHint.en}.`,
      `Writing rules:`,
      `- If \`${spec.filename}\` already exists, read it first and preserve valid existing information.`,
      `- Use clean Markdown (.md) and get straight to the point (short sentences, bullet points).`,
      `- Only state facts verified in this codebase; do not invent details.`,
    ].join('\n')
  }
  return [
    `Buat atau perbarui file \`${spec.filename}\` di root proyek "${projectName}".`,
    `Tujuan dokumen: ${spec.summary.id}`,
    `Isi yang harus dicakup: ${spec.promptHint.id}.`,
    `Aturan penulisan:`,
    `- Jika \`${spec.filename}\` sudah ada, baca isinya terlebih dahulu dan pertahankan bagian yang masih valid.`,
    `- Gunakan format Markdown (.md) yang rapi dan langsung ke inti (kalimat pendek, pakai poin-poin).`,
    `- Hanya tulis fakta yang benar-benar ada di codebase proyek ini, jangan mengarang.`,
  ].join('\n')
}
