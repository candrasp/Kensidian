# FRONTEND.md — Kensidian

Spesifikasi frontend aplikasi catatan Markdown bergaya Obsidian untuk **Coding Agent**.
Stack: **Tauri 2 + Vue 3 + TypeScript + Tailwind CSS v4 + Lucide + Font Awesome (brand saja) + CodeMirror 6**.

> Nama aplikasi (**Kensidian**) hanya konstanta `APP_NAME` di `src/lib/constants.ts`. Ganti di satu tempat itu saja.

---

## 0. Cara Memakai Dokumen Ini

1. Dokumen ini adalah **satu-satunya sumber kebenaran frontend**. Backend (Rust) ada di `BACKEND.md`; kontrak IPC di **§12** harus identik di kedua dokumen.
2. Jika ada konflik antar bagian, urutan prioritas: **§1 Prinsip → §12 Kontrak IPC → bagian lain**.
3. Kerjakan **berurutan sesuai Fase (§17)**. Jangan melompat ke fitur fase berikutnya sebelum "Selesai bila" fase berjalan terpenuhi.
4. Kata **WAJIB** = harus persis. **DILARANG** = tidak boleh dalam kondisi apa pun. **OPSIONAL** = boleh diabaikan.
5. Nilai berlabel **(acuan)** adalah titik awal hasil pengukuran screenshot Obsidian. Boleh dikalibrasi **sekali** lewat design token di §5, **tidak** boleh di-hardcode di komponen.
6. Jika ada hal yang tidak tercantum, ikuti perilaku Obsidian desktop. Jika masih ragu, pilih yang **lebih sederhana dan lebih hemat RAM**, lalu catat di `DECISIONS.md`.

---

## 1. Tujuan, Prinsip, dan Non-Goals

### 1.1 Tujuan
Aplikasi desktop catatan berbasis **folder (vault) berisi file `.md`**, tampilannya mengikuti Obsidian (tata letak, modal, warna), dipakai untuk **menyimpan dan membaca data hasil kerja agent AI** maupun catatan manusia.

### 1.2 Prinsip (WAJIB)
1. **Ringan.** Alasan utama aplikasi ini ada: Obsidian (Electron) memakai >300 MB RAM. Lihat anggaran di §14.
2. **File Markdown adalah sumber kebenaran.** Frontend tidak menyimpan konten catatan di tempat lain.
3. **Frontend tidak menyentuh filesystem.** Semua baca/tulis lewat IPC (§12). DILARANG memakai `@tauri-apps/plugin-fs` di frontend.
4. **Konten tidak tepercaya.** Isi catatan bisa ditulis agent. Render Markdown **tanpa HTML mentah** (§10.3).
5. **Mirip Obsidian**: tata letak, ukuran, modal, warna, pintasan keyboard.
6. **UI berbahasa Indonesia**, semua teks lewat `src/lib/i18n/id.ts` (§16.2).
7. **Offline penuh.** Font, ikon, dan semua aset dibundel lokal. DILARANG memuat apa pun dari CDN.

### 1.3 Non-Goals (DILARANG dibangun di v1)
- Sistem plugin / tema komunitas
- Sync / publish / kolaborasi
- Canvas, whiteboard, graph view (graph view = ide fase lanjutan di luar dokumen ini)
- Versi mobile
- Pewarnaan teks / background / rata teks (`align`) di toolbar: Markdown murni tidak mendukung dan HTML dimatikan demi keamanan

---

## 2. Tech Stack (WAJIB)

| Kebutuhan | Pustaka | Catatan |
|---|---|---|
| Shell desktop | `@tauri-apps/api` v2, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-dialog` | Window kustom tanpa dekorasi OS |
| Framework | Vue 3.5+ `<script setup lang="ts">` | **Tanpa Vue Router** (satu jendela, navigasi lewat tab) |
| Bahasa | TypeScript `strict: true` | DILARANG `any` kecuali dengan komentar alasan |
| Build | Vite + `@vitejs/plugin-vue` | Package manager: **bun** (pnpm/npm boleh) |
| CSS | **Tailwind CSS v4** via `@tailwindcss/vite` | **Tanpa** `tailwind.config.js`; token lewat `@theme` di CSS |
| State | Pinia | Daftar besar pakai `shallowRef`, bukan `ref` dalam |
| Ikon UI | `lucide-vue-next` | Import **per ikon**; `stroke-width` 1.75 |
| Ikon brand | `@fortawesome/vue-fontawesome` + `@fortawesome/free-brands-svg-icons` + `@fortawesome/fontawesome-svg-core` | **Hanya brand** (TikTok, YouTube, dll). Import per ikon |
| Editor | CodeMirror 6: `@codemirror/state`, `view`, `commands`, `language`, `lang-markdown`, `search`, `autocomplete`, `@lezer/highlight` | Code-block language lewat `@codemirror/language-data` (lazy) |
| Render view | `markdown-it` + plugin kustom (§10) | `html: false` WAJIB |
| Highlight kode (view) | `highlight.js/lib/core` + daftar bahasa terbatas | js, ts, json, bash, python, html(xml), css, yaml, sql, markdown, rust |
| Frontmatter | `yaml` (parser kecil) | Dipakai Properties panel |
| Komponen headless | `reka-ui` (Dialog, DropdownMenu, ContextMenu, Tooltip, Popover) | Gaya sepenuhnya Tailwind |
| Utilitas | `@vueuse/core`, `@tanstack/vue-virtual` | Virtual scroll untuk tree & hasil pencarian |
| Font | `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono` | Dibundel lokal |

### 2.1 Versi Terkunci (stabil per 14 Nov 2026)
Versi di bawah ini **tidak boleh diubah** kecuali user memintanya secara eksplisit. `package.json` memakai versi persis (tanpa `^`/`~`). Peer dependency sudah dicek kompatibel pada tanggal di atas.

| Paket | Versi |
|---|---|
| `@tauri-apps/api`, `@tauri-apps/cli` | 2.12.4 |
| `@tauri-apps/plugin-opener` / `plugin-dialog` | 2.7.3 / 2.8.4 |
| `vue` | 3.5.45 |
| `typescript` / `vue-tsc` | 7.0.2 / 3.3.14 |
| `vite` / `@vitejs/plugin-vue` | 8.3.8 / 6.0.11 |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.5 |
| `pinia` | 4.1.0 |
| `lucide-vue-next` | 1.0.0 |
| `@fortawesome/fontawesome-svg-core`, `free-brands-svg-icons` | 7.3.1 |
| `@fortawesome/vue-fontawesome` | 3.3.3 |
| `@codemirror/state` / `view` / `commands` | 6.7.6 / 6.43.15 / 6.11.1 |
| `@codemirror/language` / `lang-markdown` / `language-data` | 6.13.1 / 6.5.2 / 6.5.2 |
| `@codemirror/search` / `autocomplete` | 6.7.2 / 6.20.4 |
| `@lezer/highlight` | 1.2.5 |
| `markdown-it` / `@types/markdown-it` | 15.0.3 / 14.2.0 |
| `highlight.js` / `yaml` | 11.12.0 / 2.9.1 |
| `reka-ui` | 2.11.0 |
| `@vueuse/core` / `@tanstack/vue-virtual` | 15.0.0 / 3.13.52 |
| `@fontsource-variable/inter`, `jetbrains-mono` | 5.3.0 |

Catatan: versi minor `@tauri-apps/*` (2.12) harus sama dengan crate Rust `tauri` di `src-tauri` (`BACKEND.md`).

**DILARANG**: Monaco, Element Plus/Vuetify/PrimeVue/komponen UI berat lain, `vue-i18n`, Lodash penuh, moment/dayjs (pakai `Intl`), Shiki, state library selain Pinia, CSS-in-JS.

---

## 3. Setup Proyek dan Konfigurasi

### 3.1 Inisialisasi
Semua versi **dikunci persis** (tanpa `^`/`~`) sesuai §2.1. Flag `--exact` wajib agar `package.json` tidak memakai rentang. Setiap perintah ditulis **dalam satu baris** (tanpa `\` penyambung) agar jalan di cmd, PowerShell, dan bash.
```bash
bun create tauri-app kensidian --template vue-ts
cd kensidian
```
1. Kunci paket bawaan template ke versi §2.1:
```bash
bun add --exact vue@3.5.45 @tauri-apps/api@2.12.4
bun add -d --exact @tauri-apps/cli@2.12.4 vite@8.3.8 @vitejs/plugin-vue@6.0.11 typescript@7.0.2 vue-tsc@3.3.14
```
2. Dependensi aplikasi:
```bash
bun add --exact pinia@4.1.0 reka-ui@2.11.0 @vueuse/core@15.0.0 @tanstack/vue-virtual@3.13.52 markdown-it@15.0.3 yaml@2.9.1 highlight.js@11.12.0 lucide-vue-next@1.0.0
bun add --exact @fortawesome/fontawesome-svg-core@7.3.1 @fortawesome/vue-fontawesome@3.3.3 @fortawesome/free-brands-svg-icons@7.3.1 @fontsource-variable/inter@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0
bun add --exact @codemirror/state@6.7.6 @codemirror/view@6.43.15 @codemirror/commands@6.11.1 @codemirror/language@6.13.1 @codemirror/lang-markdown@6.5.2 @codemirror/language-data@6.5.2 @codemirror/search@6.7.2 @codemirror/autocomplete@6.20.4 @lezer/highlight@1.2.5
bun add --exact @tauri-apps/plugin-opener@2.7.3 @tauri-apps/plugin-dialog@2.8.4
bun add -d --exact tailwindcss@4.3.5 @tailwindcss/vite@4.3.5 @types/markdown-it@14.2.0
```

### 3.2 `vite.config.ts`
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 500 },
})
```

**`tsconfig.json`**: alias `@/*` harus didaftarkan juga untuk TypeScript (alias di `vite.config.ts` hanya dikenal Vite). Tambahkan **hanya** blok `paths` ke `compilerOptions` bawaan template; opsi lain tidak diubah:
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```
- **DILARANG** memakai `baseUrl`: dihapus di TypeScript 7 (error `TS5102`). `paths` dengan awalan `./src/*` sudah cukup.
- `strict: true` tetap aktif. Bila `import.meta.env` tidak dikenali, pastikan `src/vite-env.d.ts` (berisi `/// <reference types="vite/client" />`) ada dan termasuk dalam `include`.

### 3.3 `src-tauri/tauri.conf.json` (bagian window — WAJIB)
```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Kensidian",
  "identifier": "app.kensidian.desktop",
  "build": {
    "beforeDevCommand": "bun run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "bun run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "Kensidian",
        "width": 1200,
        "height": 800,
        "minWidth": 720,
        "minHeight": 480,
        "maximized": true,
        "decorations": false,
        "shadow": true,
        "resizable": true,
        "visible": false,
        "backgroundColor": "#1e1e1e"
      }
    ],
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: asset: http://asset.localhost; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost",
      "assetProtocol": { "enable": true, "scope": [] }
    }
  }
}
```
Penjelasan perilaku yang diminta:
- `maximized: true` → **jendela langsung memenuhi layar saat aplikasi dijalankan**.
- `decorations: false` → title bar OS dihapus; frontend membuat `TitleBar` sendiri (§7.1).
- `visible: false` + `backgroundColor` → jendela baru ditampilkan setelah Vue selesai mount, **tanpa kedip putih** (lihat §3.5).
- `assetProtocol.scope` dikosongkan; backend menambah scope dinamis ke folder vault yang sedang dibuka (lihat BACKEND.md). Gambar di catatan dimuat lewat `convertFileSrc`.

### 3.4 `src-tauri/capabilities/default.json`
```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-show",
    "core:window:allow-minimize",
    "core:window:allow-toggle-maximize",
    "core:window:allow-is-maximized",
    "core:window:allow-close",
    "core:window:allow-destroy",
    "core:window:allow-start-dragging",
    "core:window:allow-set-title",
    "opener:default",
    "dialog:default"
  ]
}
```

### 3.5 `src/main.ts` (urutan WAJIB)
```ts
import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'
import { isTauri } from '@/lib/ipc'
import { useSettingsStore } from '@/stores/settings'

const app = createApp(App)
app.use(createPinia())
await useSettingsStore().load()   // terapkan tema/font SEBELUM mount (cegah flash)
app.mount('#app')

await nextTick()
if (isTauri) {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow().show()
}
```
Tambahan produksi (WAJIB, hanya jika `import.meta.env.PROD`):
- `contextmenu` bawaan dicegah di seluruh dokumen (kita pakai `ContextMenu.vue` sendiri), **kecuali** pada `<input>`/`<textarea>`.
- `F5`, `Ctrl+R`, `Ctrl+Shift+R`, `F12`, `Ctrl+P` (bawaan browser) dicegah; `Ctrl+P` dipakai Command Palette.
- `user-select: none` untuk chrome UI; `user-select: text` hanya di `.cm-content`, `.view-content`, dan input.

### 3.6 `index.html`
```html
<!doctype html>
<html lang="id" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kensidian</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```
`data-theme="dark"` di HTML mencegah flash tema. `settings` store menimpanya saat dimuat.

---

## 4. Struktur Folder (WAJIB persis)

```
src/
  main.ts
  App.vue
  styles/
    main.css            # @import tailwind, token, @theme, base
    editor.css          # CodeMirror + view prose
    fonts.css           # @fontsource imports
  lib/
    constants.ts        # APP_NAME, batas ukuran file, dll
    ipc/
      index.ts          # ekspor `ipc` (Tauri atau mock) + isTauri
      types.ts          # semua tipe kontrak IPC (§12)
      tauri.ts          # implementasi invoke() bertipe
      mock.ts           # implementasi in-memory untuk dev di browser
    markdown/
      render.ts         # factory markdown-it
      wikilink.ts       # rule [[...]] dan ![[...]]
      highlightMark.ts  # rule ==teks==
      frontmatter.ts    # pisah + parse YAML
      highlight.ts      # highlight.js core + bahasa
    editor/
      createEditor.ts   # buat EditorView tunggal
      statePool.ts      # LRU EditorState per tab (§9.3)
      theme.ts          # tema CM dari token CSS
      commands.ts       # toggleBold, setHeading, dll
      wikilinkComplete.ts
      livePreview.ts    # Fase 5
    icons/
      registry.ts       # daftar ikon yang diizinkan (§5.8)
    i18n/id.ts
    keymap.ts           # definisi pintasan terpusat
    path.ts             # util path relatif vault ('/' separator) + validator nama
    fuzzy.ts            # pencocokan fuzzy subsequence (palette, quick switcher)
    format.ts           # format angka/tanggal via Intl
  stores/
    vault.ts  tabs.ts  ui.ts  settings.ts  commands.ts  toasts.ts  sync.ts
  composables/
    useResizable.ts  useShortcuts.ts  useAutosave.ts  useVaultEvents.ts  useRovingFocus.ts
  components/
    layout/  AppShell.vue  TitleBar.vue  LeftSidebar.vue  SidebarTabs.vue
             FileToolbar.vue  SidebarFooter.vue  ResizeHandle.vue
             StatusBar.vue  RightSidebar.vue  WelcomeScreen.vue
    tree/    FileTree.vue  FileTreeItem.vue  ItemIcon.vue
    tabs/    TabBar.vue  TabItem.vue  NewTabPage.vue
    pane/    NavHeader.vue  FormatToolbar.vue  EditorPane.vue  ViewPane.vue
             PropertiesPanel.vue  ConflictBanner.vue
    search/  SearchPanel.vue
    modals/  ModalHost.vue  CommandPalette.vue  QuickSwitcher.vue
             SettingsModal.vue  SettingsBackup.vue  IconPickerDialog.vue
             PromptDialog.vue  ConfirmDialog.vue  HelpModal.vue
    ui/      IconButton.vue  Tooltip.vue  ContextMenu.vue  DropdownMenu.vue
             Toast.vue  Kbd.vue  Toggle.vue  SelectBox.vue
src-tauri/               # di luar lingkup dokumen ini (BACKEND.md)
```

Aturan:
- Satu komponen satu file, nama **PascalCase**, `<script setup lang="ts">` di atas, lalu `<template>`. Tanpa `<style>` kecuali sangat perlu (utamakan utilitas Tailwind).
- Alias impor `@/` untuk `src/`.
- Komponen di `modals/` dan `SettingsModal` WAJIB dimuat dengan `defineAsyncComponent` (code-splitting).

---

## 5. Design System

### 5.1 Token warna (`src/styles/main.css`)

Pola **WAJIB**: nilai mentah per tema di `:root[data-theme]`, lalu didaftarkan ke Tailwind lewat `@theme inline`. Dengan begitu **tidak ada `dark:` prefix** di komponen; ganti tema cukup mengubah atribut `data-theme`.

```css
@import "tailwindcss";
@import "./fonts.css";

/* ---------- 1. Nilai mentah per tema ---------- */
:root,
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg-app:        #1e1e1e;   /* background utama (editor) */
  --bg-panel:      #262626;   /* sidebar, tab bar, status bar */
  --bg-panel-alt:  #2a2a2a;
  --bg-code:       #161616;   /* blok kode */
  --bg-hover:      rgba(255,255,255,.06);
  --bg-selected:   rgba(255,255,255,.10);
  --bg-scrim:      rgba(0,0,0,.60);   /* latar gelap di belakang modal */
  --line:          #363636;           /* border */
  --line-strong:   #4a4a4a;
  --fg:            #dadada;
  --fg-muted:      #999999;
  --fg-faint:      #666666;
  --accent:        #7f6df2;           /* hsl(254 80% 68%) */
  --accent-hover:  #9486f5;
  --accent-soft:   rgba(127,109,242,.20);
  --accent-fg:     #ffffff;
  --danger:        #fb464c;
  --success:       #44cf6e;
  --warning:       #e0ac00;
  --selection:     rgba(127,109,242,.35);

  /* judul di view/editor (kalibrasi dari screenshot) */
  --h1: #7c9cff;
  --h2: var(--fg);  --h3: var(--fg);  --h4: var(--fg);  --h5: var(--fg);  --h6: var(--fg-muted);

  /* sintaks kode (satu set dipakai CodeMirror dan highlight.js) */
  --syn-comment:  #7f848e;
  --syn-keyword:  #c678dd;
  --syn-string:   #98c379;
  --syn-number:   #d19a66;
  --syn-function: #61afef;
  --syn-type:     #e5c07b;
  --syn-heading:  #e8a45a;   /* penanda ### di source mode */
  --syn-marker:   #56b6c2;   /* penanda list/quote */
  --syn-link:     #7c9cff;
  --syn-meta:     #7f848e;
}

:root[data-theme="light"] {
  color-scheme: light;
  --bg-app: #ffffff;  --bg-panel: #f6f6f6;  --bg-panel-alt: #efefef;  --bg-code: #f3f3f3;
  --bg-hover: rgba(0,0,0,.05);  --bg-selected: rgba(0,0,0,.09);  --bg-scrim: rgba(0,0,0,.35);
  --line: #e0e0e0;  --line-strong: #c8c8c8;
  --fg: #222222;  --fg-muted: #5c5c5c;  --fg-faint: #ababab;
  --accent: #705dcf;  --accent-hover: #5f4cc0;  --accent-soft: rgba(112,93,207,.15);  --accent-fg: #ffffff;
  --danger: #e93147;  --success: #08b94e;  --warning: #bb8a00;  --selection: rgba(112,93,207,.25);
  --h1: #3d5fd4;  --h2: var(--fg); --h3: var(--fg); --h4: var(--fg); --h5: var(--fg); --h6: var(--fg-muted);
  --syn-comment: #8a8f98; --syn-keyword: #a626a4; --syn-string: #50a14f; --syn-number: #986801;
  --syn-function: #4078f2; --syn-type: #c18401; --syn-heading: #c2410c; --syn-marker: #0184bc;
  --syn-link: #3d5fd4; --syn-meta: #8a8f98;
}

/* ---------- 2. Daftarkan sebagai utilitas Tailwind ---------- */
@theme inline {
  --color-app: var(--bg-app);
  --color-panel: var(--bg-panel);
  --color-panel-alt: var(--bg-panel-alt);
  --color-code: var(--bg-code);
  --color-hover: var(--bg-hover);
  --color-selected: var(--bg-selected);
  --color-scrim: var(--bg-scrim);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-faint: var(--fg-faint);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
  --color-accent-fg: var(--accent-fg);
  --color-danger: var(--danger);
  --color-success: var(--success);
  --color-warning: var(--warning);
}

/* ---------- 3. Token non-warna ---------- */
@theme {
  --font-ui:   "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-text: "Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, "Cascadia Code", Consolas, monospace;

  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-xl: 16px;

  --shadow-modal: 0 10px 40px rgba(0,0,0,.45);
  --shadow-menu:  0 4px 16px rgba(0,0,0,.35);

  --ease-ui: cubic-bezier(.2,0,0,1);
}

/* ---------- 4. Dimensi (acuan) sebagai CSS variable ---------- */
:root {
  --titlebar-h: 32px;
  --header-h: 40px;          /* sidebar tabs row, tab bar, nav header */
  --file-toolbar-h: 36px;
  --footer-h: 40px;
  --statusbar-h: 24px;
  --sidebar-w: 220px;        /* default; dikontrol store, bukan CSS */
  --right-sidebar-w: 280px;
  --tree-row-h: 28px;
  --tree-indent: 16px;
  --file-line-width: 900px;  /* terukur ±950px pada pane 1178px */
  --icon-s: 16px;
  --icon-m: 18px;
  --icon-stroke: 1.75;
  --font-size-ui-s: 12px;
  --font-size-ui-m: 13px;
  --font-size-ui-l: 15px;
  --font-size-text: 16px;    /* dioverride settings.fontSize */
}
```

**Kalibrasi warna:** nilai di atas adalah default Obsidian dark. Warna tema di screenshot referensi tampak sedikit kebiruan; ambil nilai persis dengan color picker pada: background editor, sidebar, border, dan judul H1, lalu **ubah hanya di blok `:root[data-theme="dark"]`**.

### 5.2 Tipografi

| Elemen | Font | Ukuran | Berat | Line-height |
|---|---|---|---|---|
| UI umum (sidebar, tab, status) | `--font-ui` | 13px (`ui-m`); status bar 12px (`ui-s`) | 400 | 1.4 |
| Judul tab aktif | `--font-ui` | 13px | 500 | — |
| Isi catatan | `--font-text` | `settings.fontSize` (default 16px) | 400 | 1.5 |
| Kode & source mode | `--font-mono` | 0.875em | 400 | 1.6 |
| Command palette input | `--font-ui` | 15px (`ui-l`) | 400 | — |

Skala judul (relatif ke ukuran isi): H1 `1.802em` / H2 `1.602em` / H3 `1.424em` / H4 `1.266em` / H5 `1.125em` / H6 `1em`; berat judul 700 (H1–H3) dan 600 (H4–H6); margin atas `1.2em`, bawah `0.4em`. Warna dari `--h1`..`--h6`.

### 5.3 Radius, border, bayangan
- Tombol ikon: `rounded-sm` (4px). Input & item menu: `rounded-sm`. Kartu/pil toolbar: `rounded-md` (8px). Modal: `rounded-lg` (10px).
- Border selalu `1px solid var(--line)`. Pemisah antar panel (sidebar|konten) memakai border 1px, bukan bayangan.
- Bayangan hanya untuk modal (`shadow-modal`) dan menu/popover (`shadow-menu`). Elemen lain **flat**.

### 5.4 Interaksi tombol ikon (`IconButton.vue`)
- Ukuran klik **28×28px**, ikon 16px (`--icon-s`), warna `fg-muted`.
- Hover: `bg-hover` + warna ikon `fg`. Aktif/toggle-on: `bg-selected` + ikon `fg`. Disabled: `opacity-40`, tanpa hover.
- Fokus keyboard: `outline: 2px solid var(--accent); outline-offset: 1px` (`:focus-visible` saja).
- Props: `icon` (komponen Lucide), `label` (string, **WAJIB**, jadi `aria-label` dan teks tooltip), `active?`, `disabled?`, `size?` (`s|m`).
- Tooltip (Reka `Tooltip`): delay 500ms, muncul di bawah, bg `panel-alt`, border `line`, teks 12px, menampilkan pintasan lewat `<Kbd>` bila ada.

### 5.5 Z-index (tetap)
`titlebar 50` · `resize-handle 40` · `dropdown/popover/context-menu 110` · `modal 100` · `tooltip 120` · `toast 130`.

### 5.6 Motion
- Hover/warna: `transition-colors duration-100`.
- Modal: fade 100ms (scrim) + scale `0.98→1` 120ms. Sidebar collapse/expand: lebar 150ms `--ease-ui`.
- Hormati `prefers-reduced-motion: reduce` → semua durasi 0.
- DILARANG animasi >200ms dan animasi pada properti layout selain lebar sidebar.

### 5.7 Scrollbar
Scrollbar tipis kustom (WebKit & Firefox): lebar 10px, thumb `rgba(128,128,128,.3)` (hover `.5`), track transparan, tanpa tombol panah. Berlaku global kecuali toolbar format (disembunyikan).

### 5.8 Ikon
- **Lucide** untuk semua ikon UI. Semua ikon yang boleh dipakai (termasuk ikon kustom folder dan file) didaftarkan di `src/lib/icons/registry.ts` sebagai peta statis `{ nama: Komponen }`. **DILARANG** impor dinamis seluruh paket Lucide (merusak tree-shaking).
- **Font Awesome** hanya untuk ikon brand folder. Contoh registry awal: `tiktok`, `youtube`, `instagram`, `github`, `x-twitter`, `telegram`, `whatsapp`, `discord`, `figma`.
- Tipe referensi ikon yang disimpan di data:
```ts
export type IconRef = { set: 'lucide' | 'fa-brands'; name: string }
export type IconColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray'
export interface ItemStyle { icon?: IconRef; color?: IconColor }   // gaya satu folder/file; key = path relatif ('' = root vault)
```
- Ikon yang tidak ditemukan di registry → fallback `Folder` (tidak error).
- Warna ikon **hanya** dari 9 nama `IconColor`. Nilai per tema: `--icon-{nama}` di `:root[data-theme]`, didaftarkan lewat `@theme inline` (utilitas `text-icon-red`, dst.). Tidak ada hex di komponen. Label (di `id.ts`): Merah, Oranye, Kuning, Hijau, Toska, Biru, Ungu, Merah muda, Abu-abu.

#### Pemetaan ikon UI (WAJIB)
| Fungsi | Lucide |
|---|---|
| Tab sidebar: Berkas / Cari / Bookmark | `Folder` / `Search` / `Bookmark` |
| Toggle sidebar kiri | `PanelLeft` |
| Toggle sidebar kanan | `PanelRight` |
| Catatan baru | `SquarePen` |
| Folder baru | `FolderPlus` |
| Urutkan | `ArrowUpDown` |
| Auto-reveal file aktif | `ScanEye` |
| Ciutkan semua / Buka semua | `ChevronsDownUp` / `ChevronsUpDown` |
| Chevron folder | `ChevronRight` (diputar 90° saat terbuka) |
| Tab baru | `Plus` |
| Tutup tab | `X` |
| Daftar tab | `ChevronDown` |
| Back / Forward | `ArrowLeft` / `ArrowRight` |
| Ke mode view / ke mode edit | `BookOpen` / `Pencil` |
| Menu lainnya | `MoreVertical` |
| Pengaturan | `Settings` |
| Bantuan | `CircleHelp` |
| Ganti vault | `ChevronsUpDown` |
| Window: min / max / restore / close | `Minus` / `Square` / `Copy` / `X` |

---

## 6. Layout dan Window

### 6.1 Struktur (mengikuti screenshot referensi)

```
┌───────────────────────────────────────────────────────────────┐
│ TitleBar 32px   [ judul di tengah ]            [ _  ▢  ✕ ]    │
├───────────────┬───────────────────────────────────────────────┤
│ SidebarTabs   │ TabBar 40px: [tab][tab][+]      [⌄] [▯panel]  │
│  📁 🔍 🔖  ▯  ├───────────────────────────────────────────────┤
│ FileToolbar   │ NavHeader 40px: [←][→]            [📖] [⋮]    │
│  ✎ 📁+ ⇅ ◎ ⌃  │ FormatToolbar 36px (hanya mode edit)          │
│               │ ┌───────────────────────────────────────────┐ │
│ FileTree      │ │ EditorPane / ViewPane (scroll sendiri)    │ │
│ (virtual)     │ │   konten rata tengah, max --file-line-width│ │
│               │ └───────────────────────────────────────────┘ │
├───────────────┤                      StatusBar 24px (kanan-bawah)
│ Footer 40px   │                                               │
│ [vault ⇅] ? ⚙ │                                               │
└───────────────┴───────────────────────────────────────────────┘
```

Catatan penting dari screenshot:
- **Tidak ada ribbon vertikal.** Peran ribbon digantikan baris `SidebarTabs` di dalam sidebar kiri.
- **StatusBar tidak membentang penuh**; ia menempel di **kanan-bawah kolom utama** (position absolute, `right:0; bottom:0`, `bg-panel`, border atas dan kiri 1px). Container scroll konten diberi `padding-bottom: 32px` agar baris terakhir tidak tertutup.
- Footer sidebar (nama vault, bantuan, pengaturan) berada di **dasar sidebar kiri**, bukan di status bar.
- Sidebar kanan **default tersembunyi** (toggle di kanan TabBar).

### 6.2 `AppShell.vue`
- Root: `div.h-screen.w-screen.flex.flex-col.bg-app.text-fg.overflow-hidden`.
- Isi: `TitleBar` → `div.flex.flex-1.min-h-0` berisi `LeftSidebar`, `ResizeHandle`, `main` (kolom: `TabBar`, area pane `relative flex-1 min-h-0`), `ResizeHandle`, `RightSidebar`.
- `ModalHost`, `Toast` di-teleport ke `body`.
- Bila `vault.current === null` → render `WelcomeScreen` menggantikan seluruh `div.flex.flex-1` (TitleBar tetap).

### 6.3 Sidebar yang bisa diubah ukurannya (`ResizeHandle.vue` + `useResizable.ts`)
| Properti | Sidebar kiri | Sidebar kanan |
|---|---|---|
| Default | 220px | 280px |
| Min | 160px | 200px |
| Max | `min(480px, window.innerWidth - 420px)` | sama |
| Collapse | lebar → 0, `overflow-hidden`, transisi 150ms | sama |

- Hit area handle **5px** (transparan), garis visual **1px** `line`. Hover/drag: garis jadi `accent`, kursor `col-resize`.
- Drag memakai Pointer Events + `setPointerCapture`; update lebar via `requestAnimationFrame`; simpan ke store saat `pointerup` (bukan tiap gerak).
- **Double-click** handle = reset ke default.
- Saat sidebar kiri collapse, `TabBar` menampilkan tombol `PanelLeft` di ujung kirinya.

---

## 7. Spesifikasi Komponen

### 7.1 `TitleBar.vue`
- Tinggi `--titlebar-h` (32px), `bg-panel`, border-bawah 1px `line`, `data-tauri-drag-region` pada container **dan** elemen judul.
- Judul (tengah, 12px, `fg-muted`, truncate): `{nama catatan aktif} - {nama vault} - {APP_NAME}`. Tanpa catatan aktif: `{nama vault} - {APP_NAME}`. Tanpa vault: `APP_NAME`. Judul yang sama dipasang ke `getCurrentWindow().setTitle()` (debounce 300ms) untuk taskbar.
- Kanan: tiga tombol kontrol, masing-masing **46×32px**, ikon 14px, **bukan** drag-region.
  - Minimize → `win.minimize()`. Maximize/Restore → `win.toggleMaximize()`; ikon `Square` bila tidak maximized, `Copy` bila maximized (cek lewat `isMaximized()` + listener `onResized`). Close → `win.close()` (memicu alur flush di §9.4).
  - Hover: `bg-hover`; khusus Close hover `bg-danger` dengan ikon putih.
- Double-click area judul = toggle maximize.

### 7.2 `SidebarTabs.vue`
- Tinggi `--header-h`, padding `0 8px`, `flex items-center gap-1`.
- Kiri: 3 `IconButton` (Berkas `Folder`, Cari `Search`, Bookmark `Bookmark`). Aktif = `active`. Tooltip: "Berkas", "Cari (Ctrl+Shift+F)", "Bookmark".
- Kanan (`ml-auto`): `PanelLeft` "Sembunyikan sidebar (Ctrl+\\)".
- `role="tablist"`; navigasi panah kiri/kanan (roving tabindex).

### 7.3 `FileToolbar.vue` (hanya saat tab Berkas aktif)
- Tinggi 36px, `px-2 gap-1`. Tombol berurutan: **Catatan baru** (`SquarePen`, Ctrl+N), **Folder baru** (`FolderPlus`), **Urutkan** (`ArrowUpDown`, dropdown), **Buka otomatis file aktif** (`ScanEye`, toggle), **Ciutkan semua** (`ChevronsDownUp`).
- Urutkan (DropdownMenu, centang `Check` pada pilihan aktif): `Nama (A → Z)`, `Nama (Z → A)`, `Diubah (terbaru → terlama)`, `Diubah (terlama → terbaru)`. **Folder selalu di atas file.** Pilihan disimpan di `workspace.sortOrder`.
- Auto-reveal aktif → setiap tab aktif berganti, tree mengembangkan folder induk file tersebut, menggulir ke barisnya, dan menandainya.
- Ciutkan semua → kosongkan `expanded`.
- Folder baru → `PromptDialog` (judul "Folder baru", nilai awal "Folder baru"), dibuat di folder terpilih (atau root).
- Catatan baru → buat `Tanpa judul.md` (bila ada: `Tanpa judul 1.md`, `2`, …) di folder terpilih (atau root), buka di tab aktif **mode edit**, lalu baris tree masuk mode rename (input terfokus, nama terseleksi). Setelah Enter/Esc, fokus pindah ke editor.

### 7.4 `FileTree.vue` / `FileTreeItem.vue`
**Data & render**
- `FileEntry` dimuat **lazy per folder** lewat `fs_list_dir` saat folder pertama kali dibuka. Root dimuat saat vault dibuka.
- Daftar baris datar (`visibleRows`) dihitung dari `expanded` + `tree` (Map dir → entries); dirender dengan `@tanstack/vue-virtual` (overscan 10).
- Hanya folder dan file `.md` ditampilkan di v1. Nama file ditampilkan **tanpa ekstensi**.
- Baris: tinggi **28px**, `padding-left = 8px + depth × 16px`. Urutan isi: chevron (kotak 16px, hanya folder) → ikon 16px (`ItemIcon`: ikon + warna dari `itemStyles[path]`; folder tanpa gaya = `Folder`; file tanpa ikon kustom = tanpa ikon) → nama (13px, truncate).
- Hover `bg-hover`; item aktif (catatan terbuka di tab aktif) `bg-selected` + teks `fg`; item terpilih tapi tab lain `bg-hover`.

**Interaksi mouse**
- Klik folder = toggle. Klik file = buka di **tab aktif** (bila file sudah terbuka di tab lain → fokus tab itu).
- Ctrl/Cmd+klik atau klik tengah = buka di **tab baru**.
- Klik kanan **baris** → ContextMenu (baris yang diklik kanan menjadi target menu):
  - File: `Buka di tab baru`, `Salin path`, `Tampilkan di file manager`, pemisah, `Ubah ikon…`, `Ubah warna ikon` (submenu), `Hapus ikon`, pemisah, `Ubah nama` (F2), `Hapus` (danger).
  - Folder: `Catatan baru`, `Folder baru`, pemisah, `Salin path`, `Tampilkan di file manager`, pemisah, `Ubah ikon…`, `Ubah warna ikon` (submenu), `Hapus ikon`, pemisah, `Ubah nama` (F2), `Hapus` (danger). Folder tidak punya `Buka di tab baru`.
- Klik kanan **area kosong** tree (di bawah baris terakhir) → ContextMenu: `Catatan baru`, `Folder baru`, pemisah, `Ubah ikon…` (target = root vault, path `''`).
- `Catatan baru` / `Folder baru` memakai aksi yang sama dengan tombol `FileToolbar` (§7.3), dengan folder target = folder yang diklik kanan, atau root untuk area kosong; folder target dikembangkan lalu baris baru masuk mode rename inline.
- "Tampilkan di file manager" memanggil `reveal_in_file_manager` (§12).
- **Gaya ikon** (`ItemStyle`, disimpan per vault lewat `item_style_set`):
  - `Ubah ikon…` → `IconPickerDialog` (Reka Dialog, dimuat lazy): kolom cari (autofokus) memfilter nama di registry, grid 8 kolom ikon 20px; klik ikon = simpan `{ ...gayaLama, icon }` dan tutup. Tombol `Batal`.
  - `Ubah warna ikon` → submenu 9 warna `IconColor` (bulatan 12px `bg-icon-{nama}` + label, centang pada warna aktif). **Nonaktif** bila item tidak punya ikon (file tanpa ikon kustom). Memilih warna menyimpan `{ ...gayaLama, color }`.
  - `Hapus ikon` → `item_style_set(path, null)`: menghapus ikon **dan** warna sekaligus (kembali ke bawaan). **Nonaktif** bila item tidak punya gaya.
- **Rename inline**: baris berubah jadi `<input>` (ekstensi `.md` tidak ikut diedit). Validasi: tidak kosong, tanpa karakter `\ / : * ? " < > |`, tidak diakhiri titik/spasi, tidak bentrok dengan nama lain (case-insensitive). Gagal → border input `danger` + tooltip pesan; Enter ulang tidak mengirim ke backend.
- **Hapus**: `ConfirmDialog` ("Hapus '{nama}'?", isi: "Item dipindahkan ke tempat sampah."), tombol danger "Hapus". Folder berisi: tampilkan jumlah isi bila tersedia. Default ke **tempat sampah**, bukan hapus permanen.
- **Drag & drop** (HTML5 DnD): baris `draggable`; folder target disorot `bg-accent-soft` + outline `accent`; area kosong tree = target root; tidak boleh drop ke diri sendiri/turunannya; hover 600ms di folder tertutup → auto-expand. Aksi = `fs_rename(from, to)`. Jika tab terbuka pada path yang dipindah → `tabs.renamePath(from, to)`.

**Interaksi keyboard** (`role="tree"`, `role="treeitem"`, `aria-expanded`, `aria-level`): ↑/↓ pindah fokus; → buka folder / masuk anak pertama; ← tutup folder / ke induk; Enter buka file; F2 rename; Delete hapus; Home/End awal/akhir.

**State kosong**: vault tanpa catatan → teks tengah "Vault masih kosong" + tombol "Catatan baru".

### 7.5 `SidebarFooter.vue`
- Tinggi 40px, border-atas 1px, `px-2`, `flex items-center`.
- Kiri: tombol vault (`ItemIcon` untuk `itemStyles['']`, default `Folder`, + nama vault 13px, truncate, + ikon `ChevronsUpDown`, `rounded-sm hover:bg-hover`). Klik → DropdownMenu (mengembang ke atas): daftar vault terbaru (centang untuk yang aktif), pemisah, `Buka folder sebagai vault…`, `Buat vault baru…`.
- Kanan (`ml-auto`): `CloudUpload` "Sinkronkan ke R2" (§7.15), `CircleHelp` "Bantuan" → `HelpModal`; `Settings` "Pengaturan (Ctrl+,)" → `SettingsModal`.

### 7.6 `TabBar.vue` / `TabItem.vue`
- Bar: tinggi 40px, `bg-panel`, `px-2 pt-1.5`, border-bawah 1px `line`.
- Tab: tinggi 32px, `px-3`, `rounded-t-md`, `min-w-[80px] max-w-[200px]`, mengisi lebar sama (flex-shrink) sampai min, lalu bar **scroll horizontal** (roda mouse vertikal dikonversi ke `scrollLeft`, tanpa scrollbar tampak).
  - Aktif: `bg-app`, border 1px `line` (tanpa border-bawah), teks `fg` berat 500. Tidak aktif: transparan, teks `fg-muted`, hover `bg-hover`.
  - Judul = nama file tanpa ekstensi; tab kosong = "Tab baru". Tooltip = path lengkap.
  - Tombol `X` 16px di kanan; tampil saat hover/aktif. Bila `dirty`, tampil titik 6px `fg-muted` menggantikan `X` sampai di-hover.
  - Klik tengah = tutup. Drag untuk mengurutkan ulang (HTML5 DnD, indikator sisip garis 2px `accent`).
  - Klik kanan: `Tutup`, `Tutup tab lain`, `Tutup tab di kanan`, `Salin path`, `Tampilkan di sidebar`.
- Setelah tab: tombol `Plus` "Tab baru (Ctrl+T)".
- Ujung kanan (`ml-auto`): `ChevronDown` "Daftar tab" (DropdownMenu seluruh tab; centang tab aktif) dan `PanelRight` "Sidebar kanan".
- `role="tablist"`/`role="tab"`, `aria-selected`.

### 7.7 `NewTabPage.vue`
Tab tanpa file. Konten rata tengah vertikal-horizontal, gap 12px, teks 15px, warna `accent` (hover underline), urutan: `Buat catatan baru` (Ctrl+N) · `Buka catatan` (Ctrl+O) · `Lihat berkas terbaru` (ekspansi daftar maks 5 dari `workspace.recent`) · `Tutup` (Ctrl+W).

### 7.8 `NavHeader.vue`
- Tinggi 40px, `bg-app`, tanpa border, `px-3`. Hanya muncul bila tab aktif punya file.
- Kiri: `ArrowLeft` "Kembali (Ctrl+Alt+←)" dan `ArrowRight` "Maju (Ctrl+Alt+→)"; disabled bila riwayat tab kosong. Tengah kosong (mengikuti screenshot).
- Kanan: tombol mode dan `MoreVertical`.
  - Mode edit → ikon `BookOpen`, tooltip "Beralih ke mode view (Ctrl+E)". Mode view → ikon `Pencil`, tooltip "Beralih ke mode edit (Ctrl+E)".
  - Menu `⋮`: `Cari di catatan` (Ctrl+F, hanya edit), `Mode source`/`Mode live preview` (hanya edit), `Bookmark`, `Salin path`, `Tampilkan di sidebar`, `Tampilkan di file manager`, pemisah, `Hapus catatan` (danger).

### 7.9 `FormatToolbar.vue`
- **Tampil hanya** bila tab mode edit **dan** `settings.showFormatToolbar`. Container: `mx-3 mb-2 h-9 rounded-md border border-line bg-panel px-1.5 flex items-center justify-between overflow-x-auto` (scrollbar disembunyikan, isi `min-w-max`).
- Semua tombol `IconButton size="s"`; yang punya panah kecil `ChevronDown` 10px = dropdown. Setiap aksi memanggil fungsi di `lib/editor/commands.ts` pada `EditorView` aktif lalu mengembalikan fokus ke editor.
- Urutan dan aksi (WAJIB):

| ID | Ikon | Label | Aksi | Pintasan | Fase |
|---|---|---|---|---|---|
| undo | `Undo2` | Urungkan | history undo | Mod-Z | 3 |
| redo | `Redo2` | Ulangi | history redo | Mod-Shift-Z / Mod-Y | 3 |
| clear | `Eraser` | Hapus format | buang `** * ~~ == ` ` ` dan `<u>` pada seleksi; hapus awalan `#` pada baris | — | 3 |
| h2 | teks "H2" | Judul 2 | toggle `## ` pada baris | — | 3 |
| h3 | teks "H3" | Judul 3 | toggle `### ` | — | 3 |
| hn | teks "Hn" ▾ | Judul lain | dropdown: Paragraf, H1, H4, H5, H6 | — | 3 |
| bold | `Bold` | Tebal | toggle `**` | Mod-B | 3 |
| italic | `Italic` | Miring | toggle `*` | Mod-I | 3 |
| strike | `Strikethrough` | Coret | toggle `~~` | Mod-Shift-X | 3 |
| underline | `Underline` | Garis bawah | toggle `<u>…</u>` | Mod-U | 3 |
| highlight | `Highlighter` | Sorot | toggle `==` | Mod-Shift-H | 3 |
| code | `Code` | Kode inline | toggle `` ` `` | — | 3 |
| codeblock | `SquareCode` | Blok kode | sisipkan blok ```` ``` ```` | — | 3 |
| link | `Link` | Tautan | bungkus seleksi `[teks](url)`, kursor/seleksi di `url` | Mod-K | 3 |
| table | `Table` | Tabel | sisipkan template 3 kolom × 2 baris | — | 3 |
| task | `ListChecks` | Daftar tugas | toggle `- [ ] ` | — | 3 |
| list | `List` ▾ | Daftar | dropdown: Bullet `- `, Bernomor `1. `, Tugas, Kutipan `> ` | — | 3 |
| focus | `Maximize2` / `Minimize2` | Mode fokus | toggle `ui.focusMode` (sembunyikan kedua sidebar dan TabBar; Esc keluar) | F11 | 3 |

- Perilaku toggle inline: bila seleksi sudah terbungkus penanda → lepas; bila seleksi kosong → sisipkan pasangan penanda, kursor di tengah; bila kursor di dalam kata → bungkus kata tersebut.
- Keadaan aktif tombol (B/I tersorot saat kursor di teks tebal/miring) **OPSIONAL** (Fase 6).
- **Tidak dibuat** (lihat §1.3): warna font, warna background, rata teks, superscript/subscript, komentar, "format painter". Lampiran (`Paperclip`) **OPSIONAL**, di luar v1.

### 7.10 `EditorPane.vue` dan `ViewPane.vue`
- Satu pane menampilkan satu tab aktif; `EditorPane` dan `ViewPane` dipilih lewat `v-if` berdasarkan `tab.mode` (bukan `v-show`: lepaskan DOM yang tidak dipakai demi RAM).
- **EditorPane**: scroll dilakukan oleh `.cm-scroller` milik CodeMirror (agar virtualisasi baris CM bekerja), bukan oleh div luar. Lebar konten diatur pada `.cm-content`: `max-width: var(--file-line-width); margin: 0 auto; padding: 16px 32px 48px`.
- **ViewPane**: div `.view-content` scroll sendiri, `mx-auto w-full max-w-(--file-line-width) px-8 pt-4 pb-12`.
- Bila `settings.readableLineLength === false` → `max-width: none` dan padding horizontal 48px.
- Posisi scroll disimpan per tab (`TabState.scrollTop`) dan dipulihkan saat tab diaktifkan.

### 7.11 `StatusBar.vue`
- Tinggi 24px, 12px, `fg-muted`, `flex items-center gap-3 px-2`. Hanya tampil bila ada catatan aktif.
- Item (kiri → kanan): `{n} backlink` (klik membuka sidebar kanan tab Backlink; Fase 5, sebelum itu tidak interaktif), `{n} kata`, `{n} karakter`, indikator pemantau file (titik 8px `success` bila `vault.watching`, `fg-faint` bila tidak; tooltip "Memantau perubahan file" / "Pemantau file tidak aktif").
- Angka diformat `Intl.NumberFormat('id-ID')` (mis. `3.131`).
- Kata = `text.trim() ? text.trim().split(/\s+/).length : 0`; karakter = `text.length`. Hitung dari **seluruh isi** (termasuk frontmatter). Mode edit: debounce 300ms dari dokumen CM. Dokumen >500.000 karakter: tampilkan "—".
- Titik "Sync" milik Obsidian **diganti** indikator pemantau di atas (titik kustomisasi).

### 7.12 `WelcomeScreen.vue`
Hanya tampil jika tidak ada vault aktif (pertama kali pakai atau vault terakhir tidak ditemukan). Kartu rata tengah lebar 440px, `bg-panel`, border, `rounded-lg`, `p-8`: judul `APP_NAME` (24px, 600), teks pendek, tombol utama `Buka folder sebagai vault` (bg `accent`, teks `accent-fg`), tombol sekunder `Buat vault baru` (border `line`), lalu daftar vault terbaru (klik = buka). **Bila `vault_get_current()` mengembalikan vault, layar ini dilewati dan aplikasi langsung membuka vault tersebut.**

### 7.13 Modal

**`ModalHost.vue`**: satu modal aktif dari `ui.modal`; `ConfirmDialog`/`PromptDialog` boleh bertumpuk di atas modal lain. Scrim `bg-scrim`; tutup dengan Esc atau klik scrim. Fokus terperangkap di dalam (Reka Dialog) dan dikembalikan ke elemen sebelumnya saat tutup. Animasi §5.6.

**`CommandPalette.vue`** (Ctrl+P)
- Lebar `min(700px, 90vw)`, `top: 15vh`, `rounded-lg`, `bg-app`, border `line`, `shadow-modal`.
- Input 44px tanpa border, 15px, placeholder "Ketik perintah…". Daftar `max-h-[50vh]`, baris 36px: ikon (opsional) + nama + `Kbd` pintasan di kanan. Baris terpilih `bg-selected`.
- Filter: fuzzy subsequence di `lib/fuzzy.ts` (skor: awal kata > berurutan > tersebar). ↑/↓ pilih, Enter jalankan, Esc tutup. Footer 28px, 12px `fg-faint`: `↑↓ pilih · ↵ jalankan · esc tutup`.
- Sumber: `stores/commands.ts` dengan bentuk `{ id, name, icon?, shortcut?, when?: () => boolean, run: () => void | Promise<void> }`. Perintah dengan `when()` false disembunyikan.

**`QuickSwitcher.vue`** (Ctrl+O)
- Cangkang sama dengan CommandPalette; placeholder "Cari catatan…".
- Sumber: `vault.noteIndex` (dari `vault_list_notes`), dicocokkan fuzzy pada **nama** lalu path. Baris: nama (tebal) + folder induk (`fg-muted`, kanan). Maks 50 baris. Query kosong → tampilkan `workspace.recent`.
- Enter = buka di tab aktif; Ctrl+Enter = tab baru. Bila query tidak cocok persis, baris terakhir `Buat "{query}"` membuat catatan baru (nama dibersihkan sesuai aturan §7.4).

**`SettingsModal.vue`** (Ctrl+,)
- Ukuran `w-[min(1000px,92vw)] h-[min(700px,86vh)]`, `rounded-lg`. Kiri nav 220px `bg-panel` + border-kanan; kanan konten scroll `p-8`. Tombol `X` pojok kanan atas.
- Bagian: **Umum**, **Editor**, **Tampilan**, **Cadangan** (R2, §7.15), **Pintasan** (baca-saja, dari `keymap.ts`), **Tentang** (versi, `APP_NAME`).
- Baris pengaturan: kiri nama (14px) + deskripsi (12px `fg-muted`), kanan kontrol; antar baris border-bawah 1px `line`, padding vertikal 12px.
- Daftar pengaturan lengkap ada di §11.1 (`Settings`). Perubahan **berlaku seketika** dan disimpan otomatis (debounce 400ms). Pengecualian: bagian **Cadangan** memakai tombol `Simpan` eksplisit (§7.15).

**`PromptDialog.vue`**: lebar 420px; judul, label, input, pesan error inline (`danger`), tombol `Batal` & `OK`. Props: `title`, `label`, `initial`, `validate(v): string | null`, `confirmText`. Enter = OK.

**`ConfirmDialog.vue`**: lebar 420px; judul, pesan, `Batal` & tombol konfirmasi (`danger` bila `danger: true`). Fokus awal ada di `Batal` untuk aksi danger.

**`HelpModal.vue`**: daftar semua pintasan (dari `keymap.ts`) dikelompokkan, plus versi aplikasi.

### 7.14 Komponen UI umum
- **`ContextMenu` / `DropdownMenu`** (Reka): lebar min 200px, `bg-panel-alt`, border `line`, `rounded-md`, `shadow-menu`, padding 4px. Item 28px, `px-2`, `rounded-sm`, ikon 16px kiri, label 13px, pintasan `Kbd` kanan; sorot `bg-hover`; varian `danger` berwarna `danger`; pemisah 1px `line` dengan margin 4px.
- **`Toast`**: kanan-atas di bawah TitleBar, lebar 320px, maks 3 bertumpuk, `bg-panel-alt` + border + `rounded-md`, otomatis hilang 4 detik (error 8 detik), tipe `info|success|error` dengan ikon kiri berwarna. API: `useToasts().push({ type, message })`.
- **`Kbd`**: `font-mono text-[11px] px-1 rounded-sm border border-line bg-panel-alt text-fg-muted`; `Mod` ditampilkan `Ctrl` (Win/Linux) atau `⌘` (macOS).
- **`Toggle`**: 36×20px, aktif `bg-accent`, nonaktif `bg-line-strong`, knob putih 16px.
- **`SelectBox`**: tombol 28px `rounded-sm border border-line bg-panel` + dropdown Reka.
- **`PropertiesPanel`** (Fase 5, mode view): blok `Properti` yang bisa dilipat di atas konten bila ada frontmatter. Baris `kunci` (`fg-muted`) → `nilai`; `tags` dirender sebagai chip `rounded-full bg-accent-soft text-accent px-2 text-xs`. Baca-saja.
- **`ConflictBanner`**: di atas pane; `bg-warning/15`, border bawah `warning`; teks "File ini diubah di luar aplikasi."; tombol `Muat ulang dari disk`, `Timpa dengan versi saya`, `Simpan sebagai salinan`.

### 7.15 Cadangan Cloudflare R2 (UI)
Cadangan **satu arah** (lokal → R2) dan **hanya manual**: tidak ada sinkron otomatis (tidak saat simpan, tutup, atau terjadwal). Frontend tidak pernah menghubungi R2; semuanya lewat IPC (§12.3, §12.4), sehingga `connect-src` CSP tidak berubah.

**Tombol di `SidebarFooter`** (`IconButton`, ikon `CloudUpload`):
- Nonaktif bila tidak ada vault terbuka.
- Belum diatur (`!config.hasCredentials` atau `endpoint`/`bucket` kosong): klik membuka `SettingsModal` di bagian **Cadangan**.
- Siap: klik memanggil `sync_start`. Selama `running` ikon menjadi `LoaderCircle` (`animate-spin`, hanya selama berjalan), tooltip `Menyinkronkan… {done}/{total}`; klik memanggil `sync_cancel` (aman, bisa dilanjutkan).
- Tooltip saat diam: `Sinkronkan ke R2` + baris `Terakhir: {tanggal}` (`Intl.DateTimeFormat('id-ID')`) bila ada `lastResult`.
- Selesai (`sync:finished`) → toast: `ok` "Sinkron selesai: {uploaded} file diunggah, {unchanged} tidak berubah."; `partial` "Sinkron selesai dengan {n} masalah." (tipe `warning`); `cancelled` "Sinkron dibatalkan."; `failed` pesan sesuai `error` (§15.2).

**Bagian `Cadangan` (`SettingsBackup.vue`)**, baris pengaturan seperti §7.13:
- `Endpoint R2` (teks, placeholder `https://<account-id>.r2.cloudflarestorage.com`), `Bucket`, `Awalan folder di bucket` (opsional; saat pertama kali diisi, nilai awal = nama vault).
- `Access Key ID` dan `Secret Access Key` (`type="password"`, `autocomplete="off"`). Bila `hasCredentials`, kolom kosong dan menampilkan "Tersimpan"; secret **tidak pernah** dikirim balik dari backend. Tombol `Simpan kredensial` (`sync_credentials_set`) dan `Hapus kredensial` (`ConfirmDialog`, `sync_credentials_clear`).
- Tombol `Simpan` (`sync_config_save`) dan `Tes koneksi` (`sync_test`; hasil inline: hijau "Terhubung" atau pesan error §15.2).
- Teks info (12px `fg-muted`): "Cadangan menyalin file ke R2 secara manual, satu arah. File yang dihapus di komputer tidak dihapus dari R2."
- Kotak **Sinkron terakhir**: waktu, jumlah diunggah/tidak berubah, dan daftar `issues` yang bisa dilipat (maks 50 baris, sisanya "dan {n} lainnya").

**`stores/sync.ts` (`useSyncStore`)**: state `config: SyncConfig | null`, `running`, `progress: SyncProgress | null`, `lastResult: SyncResult | null`. Aksi: `loadConfig()`, `saveConfig(input)`, `setCredentials(id, secret)`, `clearCredentials()`, `test()`, `start()`, `cancel()`, `refresh()` (`sync_status`). `listen('sync:progress')` dan `listen('sync:finished')` didaftarkan sekali saat boot. `loadConfig()` + `refresh()` dipanggil setiap vault dibuka. Secret hanya hidup di state komponen formulir dan dikosongkan segera setelah `setCredentials` selesai.

---

## 8. Mode Edit dan Mode View

| Aspek | Mode **view** | Mode **edit** |
|---|---|---|
| Komponen | `ViewPane` | `EditorPane` (CodeMirror 6) |
| Isi | HTML hasil render (§10), baca-saja | Markdown mentah, bisa diubah |
| Toolbar format | tidak tampil | tampil (bila diaktifkan) |
| Ikon di NavHeader | `Pencil` | `BookOpen` |
| Seleksi teks | boleh | boleh |

Aturan (WAJIB):
1. Mode disimpan **per tab** (`TabState.mode`). Tab baru dari file yang dibuka memakai `settings.defaultNoteMode` (**default: `view`**). Catatan yang baru dibuat memakai `edit`.
2. Pindah mode: tombol di NavHeader, **Ctrl+E**, atau perintah "Alihkan mode edit/view". Pindah mode **menyimpan dahulu** (flush autosave) bila `dirty`.
3. Posisi scroll dipertahankan secara proporsional (`scrollTop / scrollHeight`) saat pindah mode.
4. Sub-mode edit: **Source** (default v1) dan **Live Preview** (Fase 5). Pilihan global di `settings.editMode`, bisa dialihkan lewat menu `⋮`.
5. **Mode view menerima pembaruan live**: bila file berubah di disk (misalnya ditulis agent) dan tab dalam mode view atau tidak `dirty`, konten dimuat ulang diam-diam dengan posisi scroll dipertahankan (§15).
6. Mode view: tautan wikilink internal → buka di tab aktif (Ctrl+klik = tab baru); tautan `http(s)`/`mailto` → `openUrl` (plugin-opener); wikilink yang tidak ditemukan bergaya `.is-unresolved`, klik → `ConfirmDialog` "Buat catatan '{nama}'?".
7. Mode view: centang daftar tugas **dapat diklik** dan menulis balik ke file (Fase 5), memakai atribut `data-line` (§10.2).

---

## 9. Editor (CodeMirror 6)

### 9.1 Instance dan state pool
- **Hanya satu `EditorView`** untuk seluruh aplikasi, dibuat saat pertama kali ada tab mode edit, dan di-`destroy()` bila tidak ada tab edit yang aktif selama >60 detik.
- Tiap tab menyimpan `EditorState` di `statePool.ts` (LRU, maks **8**). Pindah tab: simpan state tab lama, `view.setState(stateTabBaru)` (riwayat undo ikut terjaga). Tab di luar 8 terbaru kehilangan riwayat undo dan dibuat ulang dari konten saat diaktifkan.

### 9.2 Ekstensi (WAJIB)
`history`, `drawSelection`, `highlightActiveLine` (warna `bg-hover`), `EditorView.lineWrapping`, `closeBrackets` (`[ ( { \` " '`), `markdown({ base: markdownLanguage, codeLanguages })` dengan `insertNewlineContinueMarkup` pada Enter, `syntaxHighlighting` dengan `HighlightStyle` dari token `--syn-*`, `autocompletion` (hanya sumber wikilink), `search`, keymap: `defaultKeymap`, `historyKeymap`, `searchKeymap`, `closeBracketsKeymap`, pintasan format (§7.9), Tab = `indentMore`, Shift-Tab = `indentLess`. Opsi yang bisa berubah memakai **Compartment**: tema/ukuran font, nomor baris, spellcheck (`contentAttributes`), sub-mode edit.
- Tema CM (`theme.ts`) membaca token CSS lewat `var(--...)` sehingga ganti tema tidak membangun ulang editor. Kursor: 2px `accent`; seleksi: `--selection`; baris aktif: `--bg-hover`; gutter (bila aktif): `fg-faint`, tanpa background.
- Gaya source mode: penanda judul `#` berwarna `--syn-heading`, penanda list/kutipan `--syn-marker`, kode inline di `--font-mono` dengan `bg-code`, blok kode memakai bahasa dari `language-data` (dimuat lazy).

### 9.3 Sinkronisasi dokumen
- DILARANG menyalin seluruh teks ke Pinia pada tiap ketikan. Store hanya menyimpan `dirty` dan `docVersion` (counter). Teks dibaca dari `view.state.doc.toString()` saat diperlukan (simpan, hitung kata).

### 9.4 Autosave (`useAutosave.ts`)
- Pemicu: debounce `settings.autosaveMs` (default 1000ms) setelah perubahan terakhir; **juga** saat: Ctrl+S, ganti tab, ganti mode, jendela kehilangan fokus, dan penutupan jendela.
- Menyimpan: `note_write(path, content, expectedMtime)`; `tab.mtime` selalu terisi saat tab `dirty` (isi sudah dimuat), jadi `expectedMtime` tidak pernah `null`. Sukses → `tab.mtime = hasil.mtime`, `dirty = false`.
- Gagal `CONFLICT` → tampilkan `ConflictBanner` (§15.1). Gagal lain → toast error, `dirty` tetap, coba ulang setelah 2s, 5s, 15s, lalu berhenti sampai ada perubahan berikutnya.
- Penutupan jendela: `getCurrentWindow().onCloseRequested(async (e) => { e.preventDefault(); await flushAll(2000); await win.destroy() })`. Bila flush gagal dalam 2 detik, tampilkan `ConfirmDialog` "Ada perubahan yang belum tersimpan. Tutup tetap?".

### 9.5 Autocomplete wikilink
- Terpicu setelah `[[`. Sumber `vault.noteIndex`, fuzzy. Terima → sisipkan `Nama]]` (bila nama tidak unik di vault, sisipkan path relatif tanpa `.md`).
- Popup: `bg-panel-alt`, border, `rounded-md`, `shadow-menu`, `max-height: 240px`, baris 28px.

### 9.6 Batas ukuran
| Ukuran file | Perilaku |
|---|---|
| ≤ 2 MB | normal |
| > 2 MB – 10 MB | **hanya Source**: Live Preview, autocomplete, dan render view dinonaktifkan; banner info "File besar, beberapa fitur dimatikan" |
| > 10 MB | tidak dibuka; toast error "File terlalu besar untuk dibuka" |

Konstanta ada di `lib/constants.ts` (`LARGE_FILE_BYTES = 2 * 1024 * 1024`, `MAX_FILE_BYTES = 10 * 1024 * 1024`).

---

## 10. Renderer Mode View

### 10.1 Konfigurasi `markdown-it` (`lib/markdown/render.ts`)
```ts
const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: false })
```
- `html: false` **WAJIB dan tidak boleh diubah**.
- `breaks: true` agar satu baris baru tampil sebagai baris baru (perilaku default Obsidian).

### 10.2 Plugin kustom
| Fitur | Sintaks | Output |
|---|---|---|
| Wikilink | `[[target]]`, `[[target\|alias]]`, `[[target#judul]]` | `<a class="internal-link" data-href="target#judul">alias/target</a>`; tanpa target ditemukan → tambah `is-unresolved` |
| Embed gambar | `![[gambar.png]]` | `<img>` dari path vault (§10.3); embed catatan **tidak** didukung → tampil sebagai wikilink biasa |
| Sorot | `==teks==` | `<mark>` |
| Garis bawah | tepat `<u>teks</u>` | `<u>` (hanya tag ini yang di-whitelist; tag HTML lain tetap teks biasa) |
| Daftar tugas | `- [ ]`, `- [x]` | `<input type="checkbox" disabled data-line="N">` + kelas pada `li` |
| ID judul | semua heading | `id` = slug (huruf kecil, spasi → `-`, hapus tanda baca; duplikat diberi `-1`, `-2`) |
| `data-line` | semua token blok | atribut `data-line` = `token.map[0]` (nomor baris sumber, basis 0) |
| Blok kode | ```` ```bahasa ```` | `<div class="code-block"><span class="code-lang">Bahasa</span><button class="code-copy" aria-label="Salin kode">…</button><pre><code>…</code></pre></div>`; label bahasa di **kanan-atas** seperti screenshot referensi; tombol salin muncul saat hover |

Event (klik tautan internal, salin kode, centang tugas) ditangani lewat **event delegation** pada `.view-content`. DILARANG atribut `onclick` inline (dilarang CSP).

### 10.3 Keamanan (WAJIB)
1. Isi catatan dianggap **tidak tepercaya**. `v-html` HANYA boleh menerima keluaran `renderMarkdown()`.
2. Semua teks yang disisipkan rule kustom WAJIB lewat `md.utils.escapeHtml`.
3. Skema tautan yang boleh: `http:`, `https:`, `mailto:`, dan internal/relatif. Skema lain (`javascript:`, `data:`, `file:`, `vbscript:`) → dirender sebagai teks, bukan tautan. Tautan eksternal: `rel="noopener noreferrer"`, dibuka lewat `openUrl`, tidak pernah navigasi di dalam WebView.
4. Gambar: hanya path relatif vault (diubah ke URL aset lewat `convertFileSrc`). Gambar `http(s)` **tidak dimuat** (diblokir CSP dan privasi); tampilkan placeholder kotak `bg-code` dengan teks "Gambar eksternal diblokir" dan `alt`.
5. Uji wajib (harus tampil sebagai teks/aman, tanpa eksekusi): `<img src=x onerror=alert(1)>`, `[x](javascript:alert(1))`, `<script>alert(1)</script>`, `![[<script>]]`, `[[a"onmouseover="x]]`.

### 10.4 Alur render
`renderMarkdown(source, ctx) → { html, headings: {level, text, id, line}[] }`. Hasil di-memo berdasarkan `(path, mtime)`. Frontmatter dipisah oleh `frontmatter.ts` (regex `^---\n[\s\S]*?\n---\n?` di awal file) sebelum render dan diteruskan ke `PropertiesPanel`.

### 10.5 Gaya (`styles/editor.css`, kelas `.view-content`)
- Judul: skala §5.2, warna `--h1..--h6`. Paragraf: margin `0 0 1em`.
- Daftar: bullet `•`, indent `1.5em`, jarak item `0.25em`. Daftar tugas: tanpa bullet; kotak centang 16px `rounded-sm`, border `line-strong`; tercentang `bg-accent` dengan tanda ✓ putih; teks tercentang `fg-muted` + coret.
- Blockquote: border-kiri 2px `accent`, padding-kiri `1em`, teks `fg-muted`.
- Tabel: `border-collapse: collapse`, sel `border: 1px solid var(--line)`, padding `6px 13px`, header berat 600 dengan `bg-panel`.
- `hr`: border-atas 1px `line`, margin `2em 0`.
- Kode inline: `bg-code`, `rounded-sm`, padding `0.1em 0.35em`, `--font-mono` `0.875em`.
- Blok kode: `bg-code`, `rounded-md`, border 1px `line`, padding `12px 16px`, `overflow-x: auto`, `--font-mono` `0.875em`, line-height 1.6, warna token `--syn-*` (highlight.js: `.hljs-keyword` dst. dipetakan manual ke variabel, **bukan** tema bawaan highlight.js).
- `mark`: `background: rgba(255, 208, 0, .4)`, warna `fg`, `rounded-sm`.
- Tautan: `accent`, hover underline; `.internal-link` sama; `.is-unresolved`: `fg-faint` dengan underline putus-putus.
- Gambar: `max-width: 100%`, `rounded-sm`.

---

## 11. State Management (Pinia)

### 11.1 Tipe inti
```ts
export type NoteMode = 'view' | 'edit'
export type SortOrder = 'name-asc' | 'name-desc' | 'mtime-desc' | 'mtime-asc'

export interface Settings {
  theme: 'dark' | 'light' | 'system'        // default 'dark'
  accentColor: string | null                // null = pakai token tema
  fontUi: string | null
  fontText: string | null
  fontMono: string | null                   // null = default token
  fontSize: number                          // 12–24, default 16
  readableLineLength: boolean               // default true
  lineWidth: number                         // 600–1400, default 900
  defaultNoteMode: NoteMode                 // default 'view'
  editMode: 'source' | 'live'               // default 'source' (jadi 'live' setelah Fase 5)
  autosaveMs: number                        // 500–5000, default 1000
  showFormatToolbar: boolean                // default true
  showLineNumbers: boolean                  // default false
  spellcheck: boolean                       // default false
  confirmDelete: boolean                    // default true
}

export interface TabState {
  id: string                                // crypto.randomUUID()
  path: string | null                       // null = Tab baru
  mode: NoteMode
  scrollTop: number
  cursor: { anchor: number; head: number } | null
  history: string[]                         // riwayat path per tab (seperti Obsidian)
  historyIndex: number
  dirty: boolean                            // TIDAK disimpan ke workspace
  mtime: number | null                      // TIDAK disimpan ke workspace
}

export interface Workspace {
  version: 1
  leftSidebar:  { visible: boolean; width: number; activeTab: 'files' | 'search' | 'bookmarks' }
  rightSidebar: { visible: boolean; width: number; activeTab: 'backlinks' | 'outline' }
  tabs: Omit<TabState, 'dirty' | 'mtime'>[]
  activeTabId: string | null
  expandedFolders: string[]
  sortOrder: SortOrder
  autoReveal: boolean
  recent: string[]                          // maks 20 path
  bookmarks: string[]
}
```
Pengaturan disimpan **global** (lewat `settings_load/save`, di config app). Workspace disimpan **per vault** (lewat `workspace_load/save`). Ikon folder kustom ada di `VaultConfig` (§12).

### 11.2 Store dan API (WAJIB)
**`useSettingsStore`**: `load()`, `update(patch)` (terapkan seketika: set `data-theme`, variabel font/aksen/ukuran, lalu simpan debounce 400ms). Aksen kustom → set `--accent` inline di `<html>`; `--accent-hover = color-mix(in srgb, var(--accent), white 15%)`; `--accent-soft = color-mix(in srgb, var(--accent) 20%, transparent)`. Tema `system` mengikuti `prefers-color-scheme`.

**`useVaultStore`**: state `current: VaultInfo | null`, `tree` (`shallowRef<Map<string, FileEntry[]>>`, key = path folder, `''` = root), `expanded: Set<string>`, `noteIndex: NoteRef[]`, `watching: boolean`, `indexing: boolean`, `itemStyles: Record<string, ItemStyle>`. Aksi: `openVault(path)`, `closeVault()`, `loadDir(path)`, `createNote(dir)`, `createFolder(dir, name)`, `rename(from, to)`, `remove(path)`, `setItemStyle(path, style | null)`, `handleEvent(e: VaultEvent)`. Setelah `rename`/`remove` berhasil, `itemStyles` dimuat ulang lewat `vault_config_load` (backend yang memigrasikan key, §12.6); frontend tidak mengubah key sendiri.
- `handleEvent`: kumpulkan path terdampak, **debounce 150ms**, lalu muat ulang hanya folder induk yang sudah termuat; perbarui `noteIndex` secara inkremental (bukan muat ulang total); teruskan ke `tabs` bila path terbuka (§15).

**`useTabsStore`**: state `tabs: TabState[]`, `activeId`. Getter `activeTab`, `activePath`. Aksi:
- `openPath(path, { newTab?: boolean })`: bila `newTab` false dan path sudah terbuka di tab lain → aktifkan tab itu; selain itu pada tab aktif: potong riwayat maju, push path, `historyIndex++`, muat konten. Tab aktif kosong/Tab baru → gunakan itu.
- `openNewTab()`, `closeTab(id)` (flush dulu; bila tab terakhir ditutup → buat Tab baru, bukan layar kosong), `closeOthers(id)`, `closeRight(id)`, `activate(id)`, `toggleMode(id?)`, `back()`, `forward()`, `reorder(from, to)`, `renamePath(from, to)` (juga untuk folder: ganti prefix), `removePath(path)` (tab yang terdampak menjadi Tab baru).
- Tab ke-N yang tidak aktif **tidak memuat konten** sampai diaktifkan (lazy).

**`useUiStore`**: `modal`, `focusMode`, visibilitas dan lebar sidebar (disinkronkan ke `workspace`), `sidebarTab`.
**`useCommandsStore`**: registri perintah (§7.13). **`useToastsStore`**: antrean toast.

### 11.3 Persistensi
- `workspace_save` dipanggil **debounce 500ms** setelah perubahan struktur (tab, sidebar, expanded, sort, recent, bookmarks). `scrollTop`/`cursor` hanya diperbarui saat tab berganti/tutup dan `beforeunload`, bukan tiap gulir.
- Muat: `workspace_load` → pulihkan tab (hanya tab aktif yang dimuat kontennya), `expandedFolders` (muat lazy saat tree dirender), lebar sidebar.

### 11.4 Urutan boot (WAJIB)
1. `main.ts`: pasang Pinia → `await useSettingsStore().load()` (terapkan tema/font **sebelum** `app.mount`) → mount → `window.show()` (§3.5).
2. `vault_get_current()`; bila ada → `openVault` (tanpa layar Welcome); bila tidak → `WelcomeScreen`.
3. `workspace_load` → pulihkan tab/sidebar → muat konten tab aktif.
4. `vault_list_notes` (untuk QuickSwitcher/wikilink) dimuat di latar belakang **setelah** first paint (`requestIdleCallback`).
5. Mulai dengar event `vault:changed` (§12).

---

## 12. Kontrak IPC (Frontend ⇄ Backend Rust)

> Bagian ini **harus identik** dengan `BACKEND.md`. Bila ada perubahan, ubah di kedua dokumen dalam satu commit.

### 12.1 Konvensi
- **Path** selalu **relatif terhadap root vault**, pemisah `/`, tanpa `/` di awal. Root = `''`. Path catatan **menyertakan** `.md` (`Riset/Ide.md`). Frontend **tidak pernah** mengirim/menerima path absolut kecuali `VaultInfo.path`.
- **Waktu** (`mtime`) = milidetik epoch (`number`).
- Nama command **snake_case**; argumen dari JS **camelCase** (Tauri mengonversi).
- Error dikembalikan sebagai objek `IpcError` (§12.2). Frontend membungkusnya menjadi `IpcException`.
- Backend menormalkan nama ke Unicode **NFC** dan menolak path yang keluar dari vault (`..`).

### 12.2 Tipe (`src/lib/ipc/types.ts`)
```ts
import type { ItemStyle } from '@/lib/icons/registry'

export interface VaultInfo   { path: string; name: string }          // path absolut: hanya untuk tampilan & convertFileSrc
export interface FileEntry   { path: string; name: string; kind: 'file' | 'folder'; mtime: number; size: number }
export interface NoteRef     { path: string; name: string; mtime: number }   // name = tanpa .md
export interface NoteContent { content: string; mtime: number; size: number }
export interface SearchHit   { path: string; name: string; line: number; snippet: string; ranges: [number, number][] }   // line: 1-based; ranges: offset UTF-16 (indeks string JS) di dalam snippet, [mulai, akhir)
export interface BacklinkRef { path: string; name: string; line: number; context: string }
export interface VaultConfig { itemStyles: Record<string, ItemStyle> }

export type VaultEvent = {
  kind: 'create' | 'modify' | 'delete' | 'rename'
  path: string
  from?: string                    // hanya untuk 'rename'
  origin: 'self' | 'external'      // 'self' = ditulis lewat IPC oleh aplikasi ini
}

export type IpcErrorCode =
  'NOT_FOUND' | 'CONFLICT' | 'EXISTS' | 'DENIED' | 'TOO_LARGE' | 'INVALID_NAME' | 'IO' |
  'SYNC_NOT_CONFIGURED' | 'SYNC_AUTH' | 'SYNC_NETWORK' | 'SYNC_BUSY'
export interface IpcError { code: IpcErrorCode; message: string }

// Cadangan R2 (§12.3, §12.4)
export interface SyncConfigInput { endpoint: string; bucket: string; prefix: string }
export interface SyncConfig extends SyncConfigInput { hasCredentials: boolean }   // hasCredentials: hanya-baca
export interface SyncProgress {
  phase: 'scanning' | 'uploading'
  done: number; total: number              // jumlah file
  bytesDone: number; bytesTotal: number    // hanya file yang perlu diunggah
  current: string | null                   // path relatif yang sedang diproses
}
export interface SyncIssue { path: string; kind: 'too_large' | 'changed_during_sync' | 'read_failed' | 'upload_failed' }
export interface SyncResult {
  status: 'ok' | 'partial' | 'cancelled' | 'failed'   // 'ok' hanya bila issues kosong
  error: IpcErrorCode | null               // diisi bila status 'failed'
  uploaded: number; unchanged: number; bytesUploaded: number
  issues: SyncIssue[]
  startedAt: number; finishedAt: number    // ms epoch
}
export interface SyncStatus { running: boolean; progress: SyncProgress | null; lastResult: SyncResult | null }
```

### 12.3 Daftar command (WAJIB)
| Command | Argumen | Hasil | Error mungkin | Catatan |
|---|---|---|---|---|
| `settings_load` | — | `Settings \| null` | IO | `null` = belum pernah disimpan |
| `settings_save` | `settings: Settings` | `void` | IO | |
| `vault_list_recent` | — | `VaultInfo[]` | — | maks 10, terbaru dulu |
| `vault_get_current` | — | `VaultInfo \| null` | — | vault terakhir yang masih ada di disk |
| `vault_open` | `path: string` (absolut) | `VaultInfo` | NOT_FOUND, DENIED | set scope aset, mulai watcher + indexer |
| `vault_create` | `parentPath: string, name: string` | `VaultInfo` | EXISTS, INVALID_NAME, DENIED | buat folder lalu buka |
| `vault_close` | — | `void` | — | hentikan watcher |
| `vault_config_load` | — | `VaultConfig` | IO | gaya ikon folder/file |
| `item_style_set` | `path: string, style: ItemStyle \| null` | `void` | NOT_FOUND, IO | `null` = hapus gaya. Menggantikan `vault_config_save`: frontend **tidak** pernah menulis seluruh config (mencegah baca-ubah-tulis yang saling menimpa) |
| `workspace_load` / `workspace_save` | — / `workspace: Workspace` | `Workspace \| null` / `void` | IO | per vault |
| `fs_list_dir` | `path: string` | `FileEntry[]` | NOT_FOUND | **hanya** anak langsung; folder + `.md`; tidak diurutkan (frontend mengurutkan); abaikan item tersembunyi (awalan `.`) |
| `vault_list_notes` | — | `NoteRef[]` | — | semua `.md` di vault |
| `note_read` | `path: string` | `NoteContent` | NOT_FOUND, TOO_LARGE, IO | TOO_LARGE bila >10 MB |
| `note_write` | `path: string, content: string, expectedMtime: number` | `{ mtime: number }` | CONFLICT, NOT_FOUND, IO | `CONFLICT` bila mtime di disk ≠ `expectedMtime` (wajib, tidak boleh `null`). Tulis **atomik** (file sementara + rename); lihat §12.6 |
| `note_create` | `path: string, content?: string` | `{ mtime: number }` | EXISTS, INVALID_NAME, IO | otomatis buat folder induk |
| `fs_create_folder` | `path: string` | `void` | EXISTS, INVALID_NAME | |
| `fs_rename` | `from: string, to: string` | `void` | NOT_FOUND, EXISTS, INVALID_NAME | dipakai juga untuk memindahkan. Key `itemStyles` (folder: semua turunan) ikut dipindahkan dalam operasi yang sama |
| `fs_delete` | `path: string, toTrash: boolean` | `void` | NOT_FOUND, DENIED | default `toTrash = true`. Key `itemStyles` terkait ikut dihapus |
| `reveal_in_file_manager` | `path: string` | `void` | NOT_FOUND | |
| `search_query` | `query: string, caseSensitive: boolean, limit: number` | `SearchHit[]` | — | teks penuh (SQLite FTS5); frontend memakai `limit = 100` |
| `backlinks_get` | `path: string` | `BacklinkRef[]` | — | |
| `backlinks_count` | `path: string` | `number` | — | untuk StatusBar; jumlah **catatan** yang menautkan (bukan jumlah baris) |
| `sync_config_load` | — | `SyncConfig` | IO | per vault; `endpoint`/`bucket`/`prefix` kosong bila belum diatur |
| `sync_config_save` | `config: SyncConfigInput` | `void` | INVALID_NAME, IO | memvalidasi endpoint (https, host `*.r2.cloudflarestorage.com`), bucket, prefix |
| `sync_credentials_set` | `accessKeyId: string, secretAccessKey: string` | `void` | IO | disimpan di keyring OS; tulis-saja, tidak pernah dikembalikan |
| `sync_credentials_clear` | — | `void` | IO | |
| `sync_test` | — | `void` | SYNC_NOT_CONFIGURED, SYNC_AUTH, SYNC_NETWORK | menulis objek kecil `{prefix}/.kensidian-check` untuk memastikan izin tulis |
| `sync_start` | — | `void` | NOT_FOUND, SYNC_NOT_CONFIGURED, SYNC_BUSY | kembali segera; berjalan di latar; progres lewat event |
| `sync_cancel` | — | `void` | — | aman dipanggil kapan saja |
| `sync_status` | — | `SyncStatus` | — | untuk memulihkan UI (mis. setelah vault dibuka ulang) |

### 12.4 Event dari backend
| Event | Payload | Keterangan |
|---|---|---|
| `vault:changed` | `VaultEvent[]` | Dikirim **berkelompok** (backend mendebounce ±100ms). Frontend mendengarkan dengan `listen()` sekali saat vault dibuka |
| `vault:watching` | `boolean` | Status pemantau file → `vault.watching` |
| `index:status` | `{ indexing: boolean }` | `true` selama indeks pencarian dibangun/diperbarui di latar → `vault.indexing`; `SearchPanel` menampilkan "Mengindeks catatan…" (12px `fg-faint`) dan mengulang pencarian saat menjadi `false` |
| `sync:progress` | `SyncProgress` | Maks 4 kali per detik |
| `sync:finished` | `SyncResult` | Tepat satu kali per `sync_start` |

Event `origin: 'self'` untuk `modify` pada tab yang sedang terbuka **diabaikan** (mtime sudah diperbarui dari hasil `note_write`).

### 12.5 Pembungkus dan mock
- `ipc/index.ts` mengekspor objek `ipc` bertipe (satu fungsi per command, mis. `ipc.noteRead(path)`) dan `isTauri` (`'__TAURI_INTERNALS__' in window`). Implementasi: `tauri.ts` bila `isTauri`, selain itu `mock.ts`. Variabel `VITE_MOCK_IPC=1` memaksa mock.
- `IpcException extends Error { code: IpcErrorCode }`. Komponen **tidak** memanggil `invoke` langsung; hanya lewat `ipc`.
- **`mock.ts` WAJIB** (agar frontend bisa dikembangkan dan diuji di browser tanpa backend): vault in-memory dengan ±40 catatan di 4 level folder, berisi wikilink (ada yang tak terselesaikan), frontmatter + tags, daftar tugas, tabel, blok kode beberapa bahasa, satu catatan sangat panjang (±300 KB), satu catatan berisi payload uji keamanan §10.3. Latensi simulasi 30–120ms. Tombol rahasia di Pengaturan > Tentang (hanya `import.meta.env.DEV`): "Simulasikan perubahan eksternal" memicu `vault:changed`. Mock juga mensimulasikan R2: config di memori, `sync_start` memancarkan ±20 `sync:progress` selama ±3 detik lalu `sync:finished` (satu `issues` contoh), `sync_test` sukses.
- Resolusi wikilink dilakukan di **frontend** memakai `noteIndex`: cocokkan nama (tanpa `.md`, case-insensitive) atau path relatif; bila ada beberapa kandidat pilih yang sefolder dengan catatan asal, lalu path terpendek.

### 12.6 Jaminan perilaku backend (konkurensi dan `.kensidian/`)
Mengikat `BACKEND.md`. Tujuan: tidak ada race condition antar command, antara command dan watcher, maupun antara aplikasi dan penulis luar (agent).

1. **Satu kunci tulis per vault.** Semua command yang mengubah disk atau konfigurasi (`note_write`, `note_create`, `fs_create_folder`, `fs_rename`, `fs_delete`, `item_style_set`) berjalan berurutan di bawah satu mutex. Command baca (`note_read`, `fs_list_dir`, `vault_list_notes`, `search_query`, `backlinks_*`) tidak memakai kunci.
2. **Tulis kondisional.** Di dalam kunci: tulis ke file sementara, baca mtime file asli **tepat sebelum** rename, bandingkan dengan `expectedMtime`; berbeda → buang file sementara dan kembalikan `CONFLICT`. Celah yang tersisa (penulis luar menulis di antara pengecekan dan rename) sangat sempit dan tidak bisa ditutup tanpa kunci file OS; diterima.
3. **Penentuan `origin`.** Sebelum rename, backend mencatat sidik jari tulisannya (ukuran + hash isi, dihitung dengan `std`) di tabel `self_writes[path]` (di dalam kunci). Saat watcher melepas batch (setelah debounce), event `create`/`modify` berstatus `self` **hanya bila** sidik jari file di disk saat itu sama dengan catatan; selain itu `external`. Catatan dihapus setelah cocok atau setelah 5 detik. Untuk `fs_rename`/`fs_delete`/`fs_create_folder`, backend mencatat token `(jenis, path)` yang dipakai sekali oleh event yang cocok. Dengan cara ini tulisan luar yang menyusul tulisan aplikasi tidak pernah salah ditandai `self`.
4. **Indexer satu penulis.** Indeks hanya diperbarui oleh pemindaian awal dan alur event watcher dalam satu thread; command tidak menulis indeks langsung.
5. **`.kensidian/`** di root vault berisi `config.json` (`VaultConfig`), `workspace.json`, `sync.json` (`SyncConfigInput`), `sync-manifest.json`, dan `index.db` (SQLite FTS5). Dibuat saat `vault_open` bila belum ada. Watcher, `fs_list_dir`, `vault_list_notes`, pencarian, dan backlink **mengabaikan seluruh** `.kensidian/` (agar penulisan indeks tidak memicu event). `index.db` hanya cache: rusak atau skema berbeda → hapus dan bangun ulang. File JSON ditulis atomik di bawah kunci tulis (kecuali `sync-manifest.json`, yang hanya ditulis oleh tugas sinkron). `Settings` (global) disimpan di folder data aplikasi, bukan di vault.
6. **Sinkron R2 hanya membaca vault.** Tidak memakai kunci tulis, sehingga tidak menghambat penyimpanan. Hanya satu sinkron berjalan pada satu waktu (`SYNC_BUSY`). Berkas yang berubah selama dibaca tidak dicatat sebagai terunggah dan dilaporkan sebagai `changed_during_sync`. `vault_open`/`vault_close` membatalkan sinkron yang sedang berjalan. Detail di `BACKEND.md` §11.

---

## 13. Pintasan Keyboard

`Mod` = Ctrl (Windows/Linux) atau ⌘ (macOS). Semua didefinisikan terpusat di `lib/keymap.ts` sebagai `{ id, keys, commandId, scope: 'global' | 'editor' }` dan ditampilkan otomatis di `HelpModal` dan `Kbd`.

| Pintasan | Aksi | Scope |
|---|---|---|
| Mod-P | Buka Command Palette | global |
| Mod-O | Buka Quick Switcher | global |
| Mod-N | Catatan baru | global |
| Mod-T | Tab baru | global |
| Mod-W | Tutup tab aktif | global |
| Ctrl-Tab / Ctrl-Shift-Tab | Tab berikutnya / sebelumnya | global |
| Mod-E | Alihkan mode edit/view | global |
| Mod-S | Simpan sekarang | global |
| Mod-, | Buka Pengaturan | global |
| Mod-\\ | Sembunyikan/tampilkan sidebar kiri | global |
| Mod-Alt-\\ | Sembunyikan/tampilkan sidebar kanan | global |
| Mod-Shift-F | Buka tab Cari di sidebar | global |
| Mod-Alt-← / → | Kembali / Maju di riwayat tab | global |
| F11 | Mode fokus | global |
| F2 | Ubah nama item terpilih di tree | tree |
| Delete | Hapus item terpilih di tree | tree |
| Esc | Tutup modal / keluar mode fokus / batal rename | global |
| Mod-F | Cari di catatan | editor |
| Mod-B / Mod-I / Mod-U | Tebal / Miring / Garis bawah | editor |
| Mod-Shift-X | Coret | editor |
| Mod-Shift-H | Sorot | editor |
| Mod-K | Sisipkan tautan | editor |
| Mod-Z / Mod-Shift-Z / Mod-Y | Urungkan / Ulangi | editor |
| Tab / Shift-Tab | Indentasi / kurangi indentasi | editor |

Aturan: satu listener `keydown` di `window` (fase capture) lewat `useShortcuts.ts`. Saat modal terbuka, hanya `Esc`, `Mod-P`, `Mod-O` (toggle modal terkait) yang aktif. Scope `editor` ditangani **keymap CodeMirror**, bukan listener global. Pintasan yang sudah dipakai WebView (Ctrl+P cetak, dll.) di-`preventDefault()`.

---

## 14. Anggaran Performa (WAJIB diukur)

Alasan proyek ini ada adalah RAM yang lebih kecil dari Obsidian (>300 MB). Angka berikut adalah **target**; ukur di mesin nyata dan catat hasilnya di `PERF.md` setiap akhir fase.

| Metrik | Target | Cara ukur |
|---|---|---|
| RAM total semua proses aplikasi (termasuk WebView), idle, vault ±1.000 catatan, 3 tab terbuka | **≤ 150 MB** (Windows) | Task Manager / `Get-Process` dijumlahkan |
| RAM setelah 30 menit dipakai (buka/tutup 100 catatan) | tidak naik >30 MB dari idle | idem |
| Jendela tampil setelah proses mulai | ≤ 800 ms | log waktu `main.ts` |
| Bundle JS awal (di luar chunk lazy) | ≤ 400 KB gzip | `vite build` + `rollup-plugin-visualizer` |
| Buka catatan 100 KB sampai render pertama | ≤ 100 ms | `performance.measure` |
| Pindah tab (state ter-cache) | ≤ 50 ms | idem |
| Latensi ketikan | < 16 ms per tombol | Performance panel |
| Scroll tree dengan 10.000 baris | 60 fps | Performance panel |

Aturan (WAJIB):
1. Daftar besar (tree, hasil cari, QuickSwitcher) selalu **virtual scroll**.
2. Satu `EditorView`; state tab lain disimpan di LRU (§9.1).
3. `shallowRef`/`markRaw` untuk Map/array besar dan objek CodeMirror; jangan membuat objek CM menjadi reaktif.
4. `SettingsModal`, `CommandPalette`, `QuickSwitcher`, `HelpModal`, `language-data`, `highlight.js` bahasa tambahan, dan Live Preview dimuat **lazy**.
5. Tidak ada `watch` dengan `deep: true` pada struktur besar. Tidak ada `setInterval` yang berjalan terus tanpa keperluan.
6. Ikon diimpor per ikon; **DILARANG** `import * as icons from 'lucide-vue-next'`.
7. Font dibundel hanya subset yang dipakai (`latin` + `latin-ext`), format `woff2`.
8. Pekerjaan berat (indexing, pencarian, hitung backlink) ada di Rust, bukan JavaScript.
9. Transisi terbatas pada §5.6; tidak ada animasi yang berjalan saat idle.
10. Hindari `box-shadow`/`backdrop-filter` pada area besar.

---

## 15. Penanganan Error dan Kasus Tepi

### 15.1 Perubahan dari luar (misalnya agent menulis ke file)
Berlaku saat `vault:changed` (`origin: 'external'`) menyentuh path yang terbuka di sebuah tab:

| Kejadian | Tab tidak `dirty` | Tab `dirty` |
|---|---|---|
| `modify` | Muat ulang diam-diam (`note_read`); mode edit: ganti isi dokumen lewat transaksi `addToHistory: false`, pertahankan posisi kursor (dijepit ke panjang baru); mode view: render ulang, pertahankan scroll. Tanpa toast. | `tab.conflict = true` → tampilkan `ConflictBanner`. Autosave **ditunda** sampai dipilih. |
| `delete` | Banner "File ini telah dihapus." dengan `Simpan ulang` (`note_create` dengan isi di tab) dan `Tutup tab` | sama, tetapi `Simpan ulang` ditandai utama |
| `rename` (`from` → `path`) | `tabs.renamePath(from, path)` (termasuk riwayat tab) | sama |

Aksi `ConflictBanner`:
- **Muat ulang dari disk**: buang perubahan lokal, `note_read`, ganti dokumen.
- **Timpa dengan versi saya**: `note_read` untuk mengambil mtime terbaru, lalu `note_write` dengan mtime itu.
- **Simpan sebagai salinan**: `note_create('{nama} (salinan).md', isiLokal)` lalu muat ulang file asli dari disk.

### 15.2 Pemetaan error → pesan (toast, kecuali dinyatakan inline)
| Kode | Pesan |
|---|---|
| NOT_FOUND | "File atau folder tidak ditemukan." |
| CONFLICT | (ditangani `ConflictBanner`, tanpa toast) |
| EXISTS | "Nama sudah dipakai." (pada rename/buat: inline) |
| DENIED | "Akses ditolak oleh sistem." |
| TOO_LARGE | "File terlalu besar untuk dibuka." |
| INVALID_NAME | "Nama tidak valid." (inline) |
| IO | "Gagal membaca atau menulis file." |
| SYNC_NOT_CONFIGURED | "Cadangan R2 belum diatur." (aksi: buka Pengaturan > Cadangan) |
| SYNC_AUTH | "R2 menolak kredensial atau izin bucket." |
| SYNC_NETWORK | "Tidak dapat terhubung ke R2." |
| SYNC_BUSY | "Sinkron sedang berjalan." |

### 15.3 Kasus lain
- **Vault tidak ditemukan saat boot** (folder dipindah/dihapus): toast "Vault tidak ditemukan", tampilkan `WelcomeScreen` dengan daftar vault terbaru.
- **Ganti vault**: `flushAll()` dahulu, simpan workspace lama, tutup semua tab, muat workspace vault baru.
- **Catatan kosong**: mode view menampilkan teks tengah `fg-faint` "Catatan kosong. Tekan Ctrl+E untuk mulai menulis."
- **Gagal render** (exception di renderer): `ViewPane` menampilkan isi mentah di `<pre>` + banner "Gagal merender catatan".
- **Error tak tertangkap** di komponen: `onErrorCaptured` global → toast "Terjadi kesalahan tak terduga" + `console.error`; aplikasi tidak boleh blank.
- **Nama dengan spasi ujung atau karakter terlarang** ditolak di frontend (validator di `lib/path.ts`) sebelum memanggil IPC.
- **Banyak event beruntun** (agent menulis ratusan file): debounce `handleEvent` 150ms dan satu kali muat ulang per folder; tidak boleh membekukan UI.

---

## 16. Aksesibilitas, i18n, dan Konvensi Kode

### 16.1 Aksesibilitas
- Semua tombol ikon punya `aria-label`. Elemen interaktif dapat dijangkau keyboard; urutan Tab logis (TitleBar → sidebar → tab → pane).
- Fokus terlihat: outline 2px `accent` pada `:focus-visible`.
- Role: `tree/treeitem`, `tablist/tab`, `dialog` (Reka), `menu/menuitem`.
- Kontras teks minimum 4,5:1 untuk `fg` dan `fg-muted` pada `app`/`panel` (periksa ulang setelah kalibrasi warna).
- Hormati `prefers-reduced-motion`.

### 16.2 i18n
- Bahasa UI: **Indonesia**. Semua string UI berasal dari `lib/i18n/id.ts` (objek biasa; fungsi untuk string berparameter). DILARANG string UI di dalam template.
```ts
const n = (v: number) => new Intl.NumberFormat('id-ID').format(v)
export const t = {
  files: 'Berkas', search: 'Cari', bookmarks: 'Bookmark',
  newNote: 'Catatan baru', newFolder: 'Folder baru', sort: 'Urutkan',
  autoReveal: 'Buka otomatis file aktif', collapseAll: 'Ciutkan semua',
  newTab: 'Tab baru', back: 'Kembali', forward: 'Maju',
  toView: 'Beralih ke mode view', toEdit: 'Beralih ke mode edit',
  settings: 'Pengaturan', help: 'Bantuan', untitled: 'Tanpa judul',
  vaultEmpty: 'Vault masih kosong',
  words: (v: number) => `${n(v)} kata`,
  chars: (v: number) => `${n(v)} karakter`,
  backlinks: (v: number) => `${n(v)} backlink`,
} as const
```
- Tanggal/angka lewat `Intl` (`lib/format.ts`). Pustaka tanggal tidak dipakai.

### 16.3 Konvensi kode
- TypeScript `strict`; tanpa `any`; tipe IPC diimpor dari `lib/ipc/types.ts`.
- Komponen: `<script setup lang="ts">`; props bertipe (`defineProps<{...}>()`); emit bertipe.
- Tailwind: gunakan utilitas dan **token semantik** (`bg-panel`, `text-fg-muted`, `border-line`). DILARANG hex/`rgb()` di template; DILARANG nilai piksel acak bila ada variabel di §5.1 (`h-(--titlebar-h)` boleh). Pola berulang (>3 kali) diekstrak jadi komponen, bukan `@apply` panjang.
- Penamaan: komponen `PascalCase.vue`, composable `useXxx.ts`, store `useXxxStore`, konstanta `UPPER_SNAKE`.
- Tidak ada `console.log` tersisa; gunakan `console.error` hanya untuk error nyata.
- Fungsi murni (render, fuzzy, path, commands toggle, statePool) WAJIB punya unit test **Vitest**, terutama uji keamanan §10.3.

---

## 17. Fase Pengembangan dan Kriteria Selesai

### Fase 0 — Scaffold
Proyek Tauri + Vue + Tailwind v4 berjalan; token (§5.1), font lokal, `ipc` + `mock.ts`, struktur folder §4, konfigurasi window §3.3.
**Selesai bila:**
- [ ] `bun run tauri dev` membuka jendela **maximized, tanpa title bar OS, tanpa kedip putih**.
- [ ] `bun run dev` di browser berjalan dengan mock IPC.
- [ ] Mengganti `data-theme` dark↔light mengubah semua warna tanpa reload.

### Fase 1 — Shell dan layout
`TitleBar`, `LeftSidebar` (tab + footer, isi placeholder), `ResizeHandle`, `TabBar`, `StatusBar`, `WelcomeScreen`, persistensi lebar/visibilitas sidebar.
**Selesai bila:**
- [ ] Tampilan sejajar dengan screenshot referensi (tata letak, tinggi baris, warna) pada jendela 1366×768.
- [ ] Sidebar dapat diubah ukurannya (min/max, double-click reset) dan collapse; tombol kontrol jendela dan double-click TitleBar bekerja.
- [ ] Lebar sidebar bertahan setelah restart.

### Fase 2 — Vault, tree, dan tab
`vault` store, `FileTree` (virtual, lazy, DnD, rename, hapus, context menu), `FileToolbar`, `TabBar` penuh, `NewTabPage`, riwayat back/forward, workspace save/load.
**Selesai bila:**
- [ ] Semua interaksi §7.3, §7.4, §7.6 bekerja dan dapat dioperasikan dengan keyboard.
- [ ] Menutup dan membuka lagi aplikasi memulihkan tab, folder terbuka, urutan, dan tab aktif.
- [ ] Tree 10.000 baris di mock tetap 60 fps.

### Fase 3 — Editor dan view
`EditorPane` (CM6 source mode), `ViewPane` (markdown-it §10), toggle mode, `NavHeader`, `FormatToolbar` (§7.9), autosave, `StatusBar` hitung kata, wikilink (render + klik), batas ukuran file.
**Selesai bila:**
- [ ] Mode edit/view bekerja per tab; Ctrl+E dan tombol sinkron; scroll proporsional terjaga.
- [ ] Autosave bekerja; menutup jendela saat `dirty` tidak kehilangan data.
- [ ] Semua tombol toolbar §7.9 berfungsi sesuai tabel.
- [ ] **Seluruh uji keamanan §10.3 lolos** (Vitest).
- [ ] Catatan 300 KB di mock terbuka ≤ 100 ms dan ketikan tetap mulus.

### Fase 4 — Modal dan perintah
`ModalHost`, `CommandPalette`, `QuickSwitcher`, `SettingsModal`, `PromptDialog`, `ConfirmDialog`, `HelpModal`, `keymap.ts` + `useShortcuts`, `Toast`.
**Selesai bila:**
- [ ] Semua pintasan §13 bekerja dan tampil di `HelpModal`.
- [ ] Semua pengaturan §11.1 berlaku seketika dan bertahan setelah restart.
- [ ] Fokus terperangkap di modal dan kembali ke elemen asal saat ditutup.

### Fase 5 — Integrasi agent dan fitur lanjutan
Event `vault:changed` + `ConflictBanner` (§15.1), `SearchPanel`, backlinks, `RightSidebar` (Backlink + Outline), `PropertiesPanel`, bookmark, ikon folder kustom (termasuk brand FA), centang tugas di mode view, autocomplete wikilink, cari-di-catatan (Mod-F), **Live Preview**.
**Selesai bila:**
- [ ] Menulis file dari luar (simulasi agent) memperbarui tab view tanpa kehilangan posisi scroll; konflik pada tab `dirty` ditangani tanpa kehilangan data.
- [ ] 200 file berubah sekaligus tidak membekukan UI.
- [ ] Live Preview dapat dimatikan dan tidak dimuat bila tidak dipakai (lazy).
- [ ] Cadangan R2 (§7.15): tombol sinkron, bagian Cadangan, progres, pembatalan, dan toast hasil berfungsi di mode mock; secret tidak muncul di state global maupun log.

### Fase 6 — Poles
Tema terang, audit aksesibilitas, overflow `FormatToolbar` ke menu `⋯`, keadaan aktif tombol format, audit performa penuh.
**Selesai bila:**
- [ ] Seluruh target §14 tercapai dan tercatat di `PERF.md`.
- [ ] Tidak ada hex/`rgb()` di template (`grep` bersih).
- [ ] Daftar periksa aksesibilitas §16.1 lolos.

---

## 18. Titik Kustomisasi, Asumsi, dan Pertanyaan Terbuka

### 18.1 Perbedaan yang disengaja dari Obsidian
| Area | Obsidian | Kensidian |
|---|---|---|
| Runtime | Electron | Tauri 2 (WebView OS + Rust) |
| StatusBar | Indikator Sync | Indikator pemantau file |
| Toolbar format | Plugin komunitas | Bawaan; tanpa warna/rata teks/komentar |
| HTML di catatan | Dirender | **Tidak dirender** (keamanan data agent) |
| Plugin / tema komunitas | Ada | Tidak ada |
| Mode default saat membuka catatan | Edit | **View** (dapat diubah) |
| Ikon folder | Plugin | Bawaan (Lucide + brand FA) |
| Tab di sidebar | Ribbon vertikal | Baris tab di dalam sidebar (sesuai screenshot) |

### 18.2 Asumsi yang dipakai dokumen ini (koreksi bila keliru)
1. **"Langsung full view window"** ditafsirkan sebagai: jendela **maximized** saat aplikasi dibuka (§3.3), dan catatan dibuka di **mode view** secara default (§8). Bila yang dimaksud hanya salah satunya, cukup ubah `maximized` atau `settings.defaultNoteMode`.
2. Nama aplikasi **Kensidian**; hanya file `.md` yang ditampilkan di tree v1.
3. Warna tema = default Obsidian dark sebagai awal; **dikalibrasi dari screenshot** (§5.1).
4. Platform utama: Windows. Linux/macOS diuji setelah Fase 3.
5. UI hanya Bahasa Indonesia di v1.

### 18.3 Pertanyaan terbuka (catat jawabannya di `DECISIONS.md`)
1. Bagian Obsidian mana lagi yang ingin dikustomisasi (selain StatusBar dan toolbar)?
2. Apakah perlu tampilan khusus untuk data agent (mis. properti `agent`, `sumber`, `tanggal` di frontmatter ditampilkan menonjol)?
3. Apakah perlu pembatasan akses tulis untuk folder tertentu agar tidak tertimpa manusia/agent?

---

_Akhir FRONTEND.md_