# ROADMAP-BARU.md — Fitur Baru Kensidian (Desain & Developer Productivity)

Dokumen ini mencatat rencana implementasi fitur-fitur produktivitas baru yang disepakati untuk meningkatkan alur kerja Frontend Designer, Developer Backend, dan Kolaborasi bersama AI.

---

## 1. Document Outline / TOC (Table of Contents)
Navigasi hierarki heading dokumen yang cepat, bersih, dan fleksibel.

### Tujuan
Memudahkan developer dan penulis melompat antar-bagian pada dokumen panjang (spesifikasi arsitektur, catatan meeting, PRD) tanpa scrolling manual.

### Spesifikasi Teknis
- **Heading Parser**: Mengekstrak heading level 1–6 (`#`, `##`, `###`, dst.) secara reaktif dari catatan aktif.
- **Tampilan Fleksibel (Bisa di-Hide & Show)**:
  - **Sidebar Kanan (Panel Tetap)**: Memanfaatkan slot `Area Backlink & Outline` di sidebar kanan yang sudah memiliki toggle `PanelRight` (`Ctrl+Alt+\`).
  - **Floating TOC (Opsional)**: Panel melayang minimalis di sudut view mode yang bisa dibuka-tutup tanpa menyita lebar layar.
- **Interaksi**:
  - Klik item heading langsung melompat (*scroll to view*) ke posisi baris terkait.
  - Active Heading Highlight: Menyorot heading yang sedang aktif di viewport saat scrolling.
  - Opsi collapse/expand per sub-level heading.

---

## 2. Live SVG & HTML Component Previewer
Pratinjau visual langsung untuk asset desain dan markup di mode View.

### Tujuan
Frontend designer dan developer dapat menyimpan serta menginspeksi ikon SVG atau cuplikan komponen HTML langsung di dalam catatan tanpa perlu membuka Figma atau browser eksternal.

### Spesifikasi Teknis
- **Toggle Segmented pada Blok Kode**:
  - Untuk blok kode ` ```svg ` dan ` ```html `:
  - Header blok kode memiliki tombol toggle: **`Code` | `Preview`**.
- **Fitur Pratinjau**:
  - Render SVG/HTML interaktif di dalam container blok kode.
  - **Checkerboard Background Toggle**: Pilihan latar belakang transparan/catur vs solid untuk mempermudah pengecekan ikon SVG berwarna putih/terang.
  - Tombol **"Copy SVG"** khusus untuk langsung digunakan di kode (misal format JSX/Vue template).

---

## 3. "Kopas Khusus AI" (Copy with Context / Metadata)
Menyalin isi dokumen yang diperkaya metadata struktur agar LLM (Claude, Gemini, ChatGPT) langsung memahami konteks proyek.

### Tujuan
Mempercepat interaksi dengan AI Assistant tanpa perlu mengetik ulang pengantar manual tentang nama file, path, atau deskripsi dokumen.

### Spesifikasi Teknis
- **Opsi pada Tombol "Salin" di TitleBar**:
  - Klik biasa: Salin teks Markdown mentah (*clean raw markdown*).
  - Klik kanan / Dropdown panah: **"Salin dengan Konteks AI"**.
- **Format Output**:
  ```markdown
  [File: path/to/document.md | Vault: kensidian]
  ---
  <isi markdown asli...>
  ```
- **Pintasan Cepat**: Keyboard shortcut sekunder (misal `Ctrl+Shift+Alt+C`).
