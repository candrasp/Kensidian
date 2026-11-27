# Panduan Pengembangan Kensidian (Development Guide)

Dokumen ini berisi panduan teknis, alur kerja pengembangan, struktur arsitektur, dan perintah penting untuk pengembang aplikasi Kensidian.

---

## Prasyarat Lingkungan

Pastikan peralatan berikut telah terpasang di sistem operasi Anda:

- **Node.js / Bun**: Rekomendasi menggunakan [Bun](https://bun.sh/) (v1.1+) untuk manajemen paket frontend yang super cepat.
- **Rust Toolchain**: `rustc` dan `cargo` (versi stable terbaru) via [rustup.rs](https://rustup.rs/).
- **Tauri Prerequisites**: WebView2 Runtime (bawaan Windows 10/11) atau dependensi platform yang sesuai untuk Tauri v2.

---

## Perintah Penting (CLI Scripts)

Proyek ini menggunakan **Bun** sebagai package runner frontend dan **Cargo** untuk backend Rust.

### 1. Menjalankan Aplikasi (Development Mode)
Menjalankan server Vite frontend dan membuka aplikasi Tauri dalam mode debug dengan fitur HMR (*Hot Module Replacement*):
```bash
bun tauri dev
```

### 2. Memeriksa Tipe & Kompilasi (Typecheck / Cargo Check)
Untuk memverifikasi kode TypeScript/Vue dan backend Rust sebelum build:
```bash
# Frontend (TypeScript & Vue)
bun x tsc --noEmit

# Backend (Rust)
cargo check --manifest-path src-tauri/Cargo.toml
```
> **Catatan**: Gunakan `bun x tsc --noEmit` secara langsung karena versi TypeScript yang terpasang (TS 7.x) memiliki arsitektur subpath modern yang paling kompatibel dengan compiler `tsc` bawaan.

### 3. Mengubah & Mengonversi Ikon Aplikasi
Jika ingin memperbarui ikon aplikasi executable (`kensidian.exe`), taskbar Windows, tray, dan bundle installer dari sebuah file logo gambar (misal `logo.png` di root proyek):
```bash
bun tauri icon logo.png
```
Perintah ini akan otomatis mengonversi gambar master ke:
- `src-tauri/icons/icon.ico` (multi-size `.ico` untuk binary Windows)
- `src-tauri/icons/icon.icns` (untuk macOS)
- `src-tauri/icons/32x32.png`, `128x128.png`, dan seluruh varian ikon lainnya.

### 4. Build Aplikasi untuk Distribusi (Production)
Mengompilasi bundle aplikasi final untuk produksi:
```bash
bun tauri build
```
Hasil installer (`.msi` / `.exe`) dan file binary final akan tersimpan di direktori:
- `src-tauri/target/release/`
- `src-tauri/target/release/bundle/msi/`

---

## Arsitektur & Struktur Proyek

```text
kensidian/
├── src/                         # Frontend Vue 3 + TypeScript
│   ├── assets/                  # Aset statis & font bawaan
│   ├── components/
│   │   ├── editor/              # Editor, outline, & format toolbar
│   │   ├── layout/              # Shell, sidebar, titlebar, statusbar
│   │   ├── modal/               # Dialog pengaturan, search, & bantuan
│   │   ├── project/             # Dashboard Mode Proyek & devlog
│   │   ├── tabs/                # Tab bar & tab item
│   │   ├── tree/                # File explorer & drag-drop tree
│   │   └── ui/                  # Komponen UI dasar (button, tooltip, toast)
│   ├── composables/             # Logika UI reaktif (workspace, drag, resize)
│   ├── lib/
│   │   ├── color/               # Validasi & utilitas warna
│   │   ├── editor/              # Ekstensi CodeMirror 6 & live preview
│   │   ├── i18n/                # Lokalisasi multi-bahasa (id, en)
│   │   ├── ipc/                 # Kontrak tipe & wrapper invoke Tauri
│   │   ├── markdown/            # Renderer markdown-it, math, & task list
│   │   └── project*.ts          # Utilitas Mode Proyek (stack, CLI, devlog)
│   ├── stores/                  # State Pinia (vault, tabs, ui, settings, toast)
│   ├── styles/                  # CSS (main, themes, editor, fonts)
│   ├── App.vue                  # Root komponen aplikasi
│   └── main.ts                  # Titik masuk frontend Vue
├── src-tauri/                   # Backend Desktop Rust (Tauri v2)
│   ├── icons/                   # Ikon executable sistem
│   ├── src/
│   │   ├── commands/            # Handler IPC (fs, note, project, search, store, vault)
│   │   ├── storage/             # Penulisan file atomik (atomic.rs)
│   │   ├── vault/               # Utilitas path & penamaan vault
│   │   ├── constants.rs         # Konstanta backend
│   │   ├── error.rs             # Definisi AppError & IpcError
│   │   ├── lib.rs               # Registrasi plugin & command Tauri
│   │   ├── main.rs              # Titik masuk binary Tauri
│   │   ├── models.rs            # Struct DTO kontrak IPC
│   │   └── state.rs             # State aplikasi Rust (AppState)
│   ├── tauri.conf.json          # Konfigurasi jendela, izin, & build Tauri
│   └── Cargo.toml               # Dependensi crate Rust
├── index.html                   # Entry HTML Vite
├── logo.png                     # Master logo resolusi tinggi
├── package.json                 # Dependensi & script frontend
├── tsconfig.json                # Konfigurasi TypeScript
└── vite.config.ts               # Konfigurasi bundler Vite & Tailwind v4
```

---

## Standar Koding & Konvensi

1. **Frontend**: Vue 3 `<script setup lang="ts">`, TypeScript Strict (tanpa tipe `any`), dan Pinia untuk manajemen state.
2. **Styling & Tema**: Tailwind CSS v4 dengan token semantik (`bg-panel`, `text-fg`, `border-line`); seluruh palet tema (Dark & Light per skema) dikelola terpusat di `src/styles/themes.css` (tanpa hex/`rgb()` langsung di template).
3. **Lokalisasi (i18n)**: Seluruh teks UI wajib melalui proxy reaktif `t` dari `src/lib/i18n/` dengan kamus di `src/lib/i18n/locales/` (`id.ts`, `en.ts`), tidak ditulis langsung (*hardcoded*) di komponen.
4. **Backend**: Rust 2021 edition dengan penanganan error terstruktur (`Result<T, E>`), serta operasi file atomik (`src-tauri/src/storage/atomic.rs`) untuk mencegah korupsi data.
5. **Komunikasi IPC**: Frontend hanya memanggil backend melalui objek abstraksi `ipc` di `src/lib/ipc/` (kontrak tipe sinkron antara TypeScript dan struct Rust di `src-tauri/src/models.rs`).
6. **Desain Komponen**: Ukuran komponen dijaga ringkas, modular, dan bersih dari logika bisnis inline di template.
