# TODO-PROJEK.md — Rencana Pengembangan Fitur Manajemen Proyek Kensidian

Dokumen perencanaan fitur **Mode Proyek (Project Tracker)** untuk solo developer pada Kensidian. Fitur ini dirancang agar developer dapat memantau progres koding, status repositori Git, dan devlog sesi kerja tanpa kehilangan sifat utama Kensidian: ringan, cepat, dan berbasis file Markdown lokal.

---

## 1. Prinsip Desain Fitur
1. **Pemisahan Komponen:** Seluruh komponen UI terkait proyek diletakkan dalam folder terpisah (`src/components/project/`) agar modular dan tidak bercampur dengan komponen vault/catatan umum.
2. **File-First (Markdown):** Semua data progres, checklist, dan devlog disimpan sebagai file `.md` biasa di dalam repositori proyek (misal `TODO.md`, `ROADMAP.md`, `devlog/YYYY-MM-DD.md`).
3. **Smart Ignore:** Mengabaikan folder beban berat (`node_modules`, `target`, `dist`, `.git`, dll.) agar tidak membebani memory/file-watcher.
4. **Git-Aware (Ringan):** Memanfaatkan backend Rust untuk membaca metadata Git (`branch`, status uncommitted, commit terakhir) secara instan.

---

## 2. Rencana Tahapan Pengembangan (Roadmap)

### Fase 1: Menu & Pembeda Mode Proyek
- [x] Tambahkan opsi **"Buka folder proyek..."** di menu popover vault footer (`SidebarFooter.vue`) dan `WelcomeScreen.vue`.
- [x] Tandai tipe vault/proyek di konfigurasi recent vaults (membedakan ikon/badge vault biasa vs proyek koding).
- [x] Buat filter direktori di backend Rust agar otomatis mengabaikan direktori build (`node_modules`, `target`, `dist`, `.git`).

### Fase 2: Backend Rust — Integrasi Git Metadata (IPC)
- [x] Tambahkan command IPC `project_get_git_status`:
  - Nama branch aktif.
  - Jumlah file uncommitted / modified.
  - Ringkasan commit terakhir (hash, pesan commit, waktu relatif).
- [x] Tambahkan validasi apakah folder yang dibuka memiliki repositori Git aktif.

### Fase 3: Struktur Komponen UI (`src/components/project/`)
- [x] `src/components/project/ProjectDashboard.vue`: Tampilan utama dashboard proyek saat mode proyek dibuka.
- [x] `src/components/project/GitStatusCard.vue`: Kartu status branch, uncommitted files, dan waktu commit terakhir.
- [x] `src/components/project/RoadmapCard.vue`: Parser dan visualisasi progress bar dari checklist `- [ ]` / `- [x]` di file `ROADMAP.md` / `TODO.md`.
- [x] `src/components/project/DevlogModal.vue` / `SessionNoteCard.vue`: Dialog cepat untuk mencatat sesi koding ("Where I Left Off") yang langsung disimpan ke folder `devlog/`.


