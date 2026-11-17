# CLAUDE.md — Aturan Coding untuk Proyek Kensidian

Aturan ini WAJIB dipatuhi di setiap tugas. Bahasa percakapan: **Indonesia**. Kode dan nama identifier: **Inggris**.

## 0. Konteks Proyek
- **Kensidian**: aplikasi catatan Markdown ringan bergaya Obsidian
- **Stack**: Tauri 2, Vue 3 (`<script setup lang="ts">`), TypeScript strict, Tailwind v4, Pinia, CodeMirror 6, Lucide
- **Sumber kebenaran spesifikasi**: `FRONTEND.md`. Baca **hanya bagian yang relevan** dengan tugas, bukan seluruh dokumen
- **Prioritas jika konflik**: perintah user saat ini → FRONTEND.md → aturan ini

## 1. DILARANG Menjalankan Perintah Tanpa Diminta

Jangan menjalankan perintah terminal apa pun kecuali user memintanya secara eksplisit. Termasuk:
- `git` (commit, add, push, pull, checkout, stash, reset, dll.)
- `npm`, `pnpm`, `bun`, `node`, build tools (`vite`, `tauri`)
- `cargo`, linters, formatters, test runners
- Perintah hapus/pindah file (`rm`, `del`, `mv`)

**Aturan turunan:**
1. **Jangan install/hapus/upgrade dependency** dan jangan ubah `package.json`, lockfile, `tauri.conf.json`, `vite.config.ts`, `Cargo.toml`
2. **Jangan commit atau ubah riwayat git**
3. **Boleh**: Read, Write, Edit file; Grep untuk mencari kode
4. Jika perintah benar-benar dibutuhkan: **tulis perintahnya + alasan, lalu tunggu user menjalankannya**

## 2. Verifikasi Wajib Setelah Edit

**TypeScript (.ts / .vue):**
- **WAJIB jalankan** `bun x tsc --noEmit` setelah edit file TypeScript/Vue
- Perbaiki semua error sebelum selesai
- **DILARANG** `any`, `as unknown as`, `// @ts-ignore`, `// @ts-expect-error` tanpa alasan kuat
- Di laporan akhir tulis jujur:
  - `✓ Verifikasi TS: bersih (bun x tsc --noEmit)` (jika lolos)
  - `✗ Verifikasi TS: masih ada N masalah (daftar)` (jika ada issue)

**Rust (.rs):**
- **WAJIB jalankan** `cargo check --manifest-path "i:\Tauri Project\kensidian\src-tauri\Cargo.toml"` setelah edit file Rust
- Perbaiki semua error/warning sebelum selesai
- Di laporan akhir tulis:
  - `✓ Verifikasi Rust: bersih (cargo check)` (jika lolos)
  - `✗ Verifikasi Rust: error (daftar)` (jika ada issue)

**Jika TIDAK mengedit file TS/Vue/Rust: JANGAN jalankan verifikasi**

## 3. Anti-Halusinasi

- **Jangan mengarang**: nama library, API, prop, event, fungsi, file, atau perilaku yang tidak kamu yakini
- **Baca dulu sebelum pakai**: Read file definisi fungsi/komponen/tipe sebelum menggunakannya
- Hanya pakai dependency yang ada di `package.json`. Butuh yang baru → tanya user
- **Kontrak IPC** (`FRONTEND.md` §12) tidak boleh diubah atau ditebak. Tidak ada di tabel → berhenti dan tanya
- Bila tidak yakin: katakan **"Saya tidak yakin"** dan ajukan **maksimal 3 pertanyaan singkat**
- Saat ambil keputusan desain, sebut rujukannya (mis. "sesuai FRONTEND.md §7.4")

## 4. Kode Minimal (YAGNI)

- Kerjakan **persis yang diminta**, tidak lebih
- Tidak ada fitur tambahan, abstraksi prematur, atau optimasi spekulatif
- Tidak ada kode mati, commented code, `console.log`, `TODO` kosong
- Tidak membuat file tambahan (test, docs) kecuali diminta
- **Jangan refactor kode di luar lingkup tugas**. Diff harus sekecil mungkin
- Komentar hanya untuk **mengapa**, bukan **apa**
- Jangan tulis ulang file utuh jika cukup Edit beberapa baris

## 5. Batas Ukuran

| Unit | Batas |
|---|---|
| File `.vue` (total) | ≤ 150 baris |
| Bagian `<template>` | ≤ 80 baris |
| File `.ts` | ≤ 200 baris |
| Satu fungsi | ≤ 30 baris |
| Parameter fungsi | ≤ 4 (lebih → objek) |
| Kedalaman nesting | ≤ 3 tingkat |
| File diubah per tugas | ≤ 5 |

**Jika batas terlewati:** pecah dulu (subkomponen, composable di `composables/`, fungsi murni di `lib/`). Satu file = satu tanggung jawab. Bila >5 file → usulkan pembagian tugas dan minta persetujuan.

## 6. Standar Clean Code (Vue 3 + TypeScript)

**Vue:**
- `<script setup lang="ts">` dengan `defineProps<{...}>()` dan `defineEmits<{...}>()`
- Logika bisnis di `stores/`, `composables/`, atau `lib/` — **bukan di template**
- Frontend panggil backend **hanya lewat objek `ipc`** dari `lib/ipc/`, tidak `invoke` langsung

**TypeScript:**
- Mode `strict`, tanpa `any` kecuali benar-benar tak terhindarkan
- Tipe IPC dari `lib/ipc/types.ts`
- Nama jelas dan spesifik (`activeTabPath` bukan `data2`)
- Boolean: awalan `is/has/can`
- Konstanta `UPPER_SNAKE` di `lib/constants.ts`

**Patterns:**
- Early return, fungsi murni bila memungkinkan
- Jangan mutasi argumen
- Teks UI dari `lib/i18n/id.ts` saja, tidak hardcoded di template

**Tailwind:**
- Pakai **token semantik**: `bg-panel`, `text-fg-muted`, `border-line`
- **DILARANG** hex literal atau `rgb()` di template
- Tanpa `<style>` kecuali sangat perlu

**Lain-lain:**
- Ikon Lucide import **per ikon**, bukan `import * as icons`
- `v-html` hanya untuk output `renderMarkdown()`
- Tidak ada `watch` dengan `deep: true` pada struktur besar
- Objek CodeMirror pakai `markRaw`/`shallowRef`
- Error handling: tangkap `IpcException`, tampilkan via toast sesuai mapping FRONTEND.md §15.2

## 7. Workflow Setiap Tugas

1. **Pahami**: ulangi tugas dalam 1–2 kalimat. Jika ambigu, tanya sekarang
2. **Baca**: Read hanya file dan bagian FRONTEND.md yang relevan (gunakan Grep bila perlu)
3. **Rencana singkat**: daftar file yang akan dibuat/diubah. Jika >3 file → minta konfirmasi
4. **Implementasi minimal** sesuai §4–6
5. **Verifikasi TS** sesuai §2
6. **Laporan akhir** pakai format di bawah

### Format Laporan Akhir

```
Ringkasan: <1–2 kalimat apa yang dikerjakan>

File diubah:
- path/to/file1.ts
- path/to/file2.vue

Asumsi: <jika ada, atau "tidak ada">

Belum terverifikasi: <jika ada, atau "tidak ada">

<status verifikasi TS dari §2>

Perintah yang disarankan: bun run typecheck
```

## 8. Perilaku Saat Ragu atau Bermasalah

- **Bug di luar tugas**: laporkan, jangan perbaiki tanpa diminta
- **FRONTEND.md bertentangan dengan kode**: berhenti dan tanya
- **Tugas tidak bisa selesai sesuai aturan**: jelaskan alasan, usulkan pemecahan, jangan langgar diam-diam
- **Jangan klaim sudah menjalankan/menguji/verifikasi** sesuatu yang tidak kamu lakukan

## 9. Tool Usage

**Prioritas tool:**
- **Read** untuk baca file (bukan `cat`)
- **Edit** untuk ubah file (bukan `sed`/`awk`)
- **Write** untuk file baru
- **Grep** untuk cari kode (bukan `grep` via Bash)
- **Glob** untuk cari file pattern
- **Bash/PowerShell** hanya jika user minta eksplisit (lihat §1)

**Efisiensi:**
- Buat tool call independen secara paralel dalam satu response
- Jangan baca file yang baru saja kamu Edit/Write untuk verifikasi — trust the tool

## 10. Response Style untuk Proyek Ini

- **Ringkas dan langsung**: jawab tanpa basa-basi
- **Bahasa Indonesia** untuk percakapan, **Inggris** untuk kode
- File reference pakai format clickable: `[filename.ts](src/filename.ts)` atau `[filename.ts:42](src/filename.ts#L42)`
- Tidak perlu emoji berlebihan atau tabel dekoratif
- Jika perlu konfirmasi: ajukan pertanyaan singkat dan tunggu jawaban
