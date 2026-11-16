# Panduan Pengembangan Kensidian (Development Guide)

Dokumen ini berisi panduan teknis, alur kerja pengembangan, struktur arsitektur, dan perintah penting untuk pengembang aplikasi Kensidian.

---

## 🛠️ Prasyarat Lingkungan

Pastikan peralatan berikut telah terpasang di sistem operasi Anda:

- **Node.js / Bun**: Rekomendasi menggunakan [Bun](https://bun.sh/) (v1.1+) untuk manajemen paket frontend yang super cepat.
- **Rust Toolchain**: `rustc` dan `cargo` (versi stable terbaru) via [rustup.rs](https://rustup.rs/).
- **Tauri Prerequisites**: WebView2 Runtime (bawaan Windows 10/11) atau dependensi platform yang sesuai untuk Tauri v2.

---

## 🚀 Perintah Penting (CLI Scripts)

Proyek ini menggunakan **Bun** sebagai package runner frontend dan **Cargo** untuk backend Rust.

### 1. Menjalankan Aplikasi (Development Mode)
Menjalankan server Vite frontend dan membuka aplikasi Tauri dalam mode debug dengan fitur HMR (*Hot Module Replacement*):
```bash
bun tauri dev
```

### 2. Memeriksa Tipe TypeScript (Typecheck)
Untuk memverifikasi bahwa seluruh tipe data TypeScript pada kode `.ts` dan `.vue` bersih tanpa kesalahan tipe:
```bash
bun x tsc --noEmit
```
> **Catatan**: Gunakan `bun x tsc --noEmit` secara langsung karena versi TypeScript yang terpasang (TS 7.x) memiliki arsitektur subpath modern yang paling kompatibel dengan compiler tsc bawaan.

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

## 📂 Arsitektur & Struktur Proyek

```text
kensidian/
├── src/                         # Frontend Vue 3 + TypeScript
│   ├── assets/                  # Aset statis & font bawaan
│   ├── components/
│   │   ├── editor/              # EditorPane (CodeMirror), ViewPane, FormatToolbar, ContextMenu
│   │   ├── layout/              # AppShell, TitleBar, LeftSidebar, RightSidebar, StatusBar
│   │   ├── modal/               # QuickSwitcher, SettingsModal, IconColorModal, DeleteConfirmModal
│   │   ├── tabs/                # TabBar, TabItem
│   │   ├── tree/                # FileTree, FileTreeItem, TreeDragGhost, ItemIcon
│   │   └── ui/                  # Komponen UI atomik (IconButton, Tooltip, ToastHost)
│   ├── composables/             # Logika UI reaktif (useTreeSelection, useItemDrag, useTreeDrop, dll.)
│   ├── lib/
│   │   ├── constants.ts         # Nilai konstanta aplikasi
│   │   ├── editor/              # Konfigurasi CodeMirror 6, live widgets, shortcuts, theme
│   │   ├── i18n/                # Lokalisasi bahasa (id.ts)
│   │   ├── ipc/                 # Kontrak antarmuka & wrapper invoke Tauri IPC
│   │   ├── markdown/            # Markdown-it parser, swatch warna, taskList plugin, image parser
│   │   └── icons.ts             # Peta ikon Lucide & FontAwesome Brands
│   ├── stores/                  # State management Pinia (vault, tabs, ui, settings, toast)
│   └── styles/                  # Tailwind CSS v4, main.css, editor.css
├── src-tauri/                   # Backend Desktop Rust (Tauri v2)
│   ├── icons/                   # Ikon executable sistem
│   ├── src/
│   │   ├── commands/            # Tauri invoke commands (fs, vault, note, search, r2)
│   │   ├── storage/             # Logika atomic write & file system
│   │   ├── constants.rs         # Konstanta backend
│   │   ├── state.rs             # Application state management Rust
│   │   └── main.rs              # Titik masuk aplikasi Tauri
│   ├── tauri.conf.json          # Konfigurasi jendela, izin keamanan, dan build Tauri
│   └── Cargo.toml               # Dependensi crate Rust
├── logo.png                     # Master logo resolusi tinggi
├── package.json                 # Konfigurasi dependensi frontend
├── tsconfig.json                # Pengaturan compiler TypeScript
└── vite.config.ts               # Konfigurasi bundler Vite & Tailwind v4
```

---

## 📐 Standar Koding & Konvensi

1. **Frontend**: Vue 3 `<script setup lang="ts">`, TypeScript Strict (tanpa tipe `any`), Pinia untuk manajemen state, dan Tailwind CSS v4 dengan token semantik.
2. **Backend**: Rust 2021 edition dengan penanganan error terstruktur (`Result<T, E>`), operasi file atomic untuk mencegah korupsi data dokumen.
3. **Komunikasi IPC**: Frontend hanya memanggil backend melalui objek abstraksi `ipc` di `src/lib/ipc/` (tipe kontrak sinkron antara frontend dan backend Rust).
4. **Desain Komponen**: Ukuran komponen dijaga ringkas, modular, dan bersih dari logika inline berulang.
