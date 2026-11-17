# GEMINI.md — Aturan Coding untuk Proyek Kensidian

Aturan ini WAJIB dipatuhi di setiap tugas. Bahasa percakapan: **Indonesia**. Kode dan nama identifier: **Inggris**.

## 0. Konteks Proyek (singkat)
- Kensidian: aplikasi catatan Markdown ringan bergaya Obsidian.
- Stack: Tauri 2, Vue 3 (`<script setup lang="ts">`), TypeScript strict, Tailwind v4, Pinia, CodeMirror 6, Lucide.
- Sumber kebenaran spesifikasi: `FRONTEND.md`. Baca **hanya bagian yang relevan** dengan tugas, bukan seluruh dokumen.
- Prioritas jika konflik: **perintah user saat ini → FRONTEND.md → aturan ini**.

## 1. DILARANG Menjalankan Perintah Tanpa Diminta
Jangan menjalankan perintah terminal apa pun kecuali user memintanya secara eksplisit di pesan saat ini. Termasuk (tidak terbatas pada):
- `git` (commit, add, push, pull, checkout, stash, reset, dll.)
- `npm`, `npx`, `pnpm`, `yarn`, `bun`, `bunx`, `node`, `deno`
- `cargo`, `tauri`, `vite`, `vue-tsc`, `tsc`, `eslint`, `prettier`, `vitest`
- `pip`, `docker`, `curl`, `wget`, serta perintah hapus/pindah file (`rm`, `del`, `mv`)

Aturan turunan:
1. **Jangan install/hapus/upgrade dependency** dan jangan mengubah `package.json`, lockfile, `tauri.conf.json`, `vite.config.ts`, `Cargo.toml` kecuali diminta.
2. **Jangan commit atau mengubah riwayat git**, meski tugas sudah selesai.
3. Boleh: membaca, membuat, dan mengedit file lewat tool editor; memakai diagnostik/Problems milik IDE.
4. Jika sebuah perintah memang dibutuhkan: **tulis perintah persisnya + alasannya, lalu berhenti dan tunggu user menjalankannya**.

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
- **Jangan mengarang**: nama pustaka, versi, API, prop, event, nama fungsi/file/path, atau perilaku Tauri/Vue/CodeMirror yang tidak kamu yakini.
- Sebelum memakai fungsi, komponen, tipe, atau store: **buka dan baca definisinya di repo** (atau file `.d.ts` pustaka). Jangan mengimpor sesuatu yang belum kamu pastikan ada.
- Gunakan hanya dependency yang sudah ada di `package.json`. Butuh pustaka baru → tanya user, jangan ditambahkan.
- Kontrak IPC (`FRONTEND.md` §12) **tidak boleh diubah atau ditebak**. Jika command yang dibutuhkan tidak ada di tabel, berhenti dan tanya.
- Bila tidak yakin atau spesifikasi ambigu: katakan **"saya tidak yakin"** dan ajukan **maksimal 3 pertanyaan singkat**. Jangan memilih diam-diam.
- Saat mengambil keputusan desain, sebut rujukannya (mis. "sesuai FRONTEND.md §7.4").

## 4. Tulis Seperlunya (Tanpa Kode yang Tidak Perlu)
- Kerjakan **persis yang diminta**, tidak lebih. Tidak ada fitur "sekalian", tidak ada pengaturan/opsi tambahan yang tidak diminta.
- Tidak ada abstraksi prematur (interface/generic/factory untuk satu pemakaian).
- Tidak ada kode mati, kode yang dikomentari, `console.log`, `TODO` kosong, atau placeholder.
- Tidak membuat file tambahan (test, README, dokumentasi, contoh) kecuali diminta.
- Tidak memformat ulang, mengganti nama, atau merapikan kode **di luar lingkup tugas**. Diff harus sekecil mungkin.
- Komentar hanya untuk menjelaskan **mengapa**, bukan mengulang apa yang dilakukan kode.
- Jangan menulis ulang file utuh bila cukup mengubah beberapa baris.

## 5. Batas Ukuran (agar mudah dibaca agent dan manusia)
| Unit | Batas |
|---|---|
| File `.vue` (template + script) | ≤ **150 baris** |
| Bagian `<template>` | ≤ **80 baris** |
| File `.ts` | ≤ **200 baris** |
| Satu fungsi | ≤ **30 baris** |
| Parameter fungsi | ≤ **4** (lebih → pakai satu objek) |
| Kedalaman nesting | ≤ **3** tingkat (pakai early return) |
| File yang diubah dalam satu tugas | ≤ **5** |

Jika batas akan terlewati: **pecah dulu sebelum menyelesaikan tugas** (subkomponen, composable di `composables/`, fungsi murni di `lib/`). Satu file = satu tanggung jawab. Bila satu tugas butuh >5 file, **usulkan pembagian tugas dan minta persetujuan** sebelum menulis.

## 6. Standar Clean Code (Vue + TS)
- `<script setup lang="ts">`; props dan emit bertipe (`defineProps<{...}>()`).
- `strict` TypeScript, tanpa `any`. Tipe IPC diimpor dari `lib/ipc/types.ts`.
- Logika bisnis di `stores/`, `composables/`, atau `lib/`, **bukan** di `<template>`.
- Frontend memanggil backend **hanya lewat objek `ipc`**, tidak lewat `invoke` langsung.
- Nama jelas dan spesifik (`activeTabPath`, bukan `data2`). Boolean berawalan `is/has/can`. Konstanta `UPPER_SNAKE` di `lib/constants.ts`; tidak ada angka ajaib.
- Early return, fungsi murni bila memungkinkan, jangan mutasi argumen.
- Teks UI hanya dari `lib/i18n/id.ts`, tidak ditulis langsung di template.
- Tailwind: pakai **token semantik** (`bg-panel`, `text-fg-muted`, `border-line`). DILARANG hex/`rgb()` di template. Tanpa `<style>` kecuali sangat perlu.
- Ikon Lucide diimpor **per ikon**; DILARANG `import * as icons`.
- `v-html` hanya untuk keluaran `renderMarkdown()`. Tidak ada HTML mentah dari catatan.
- Tidak ada `watch` `deep: true` pada struktur besar; objek CodeMirror memakai `markRaw`/`shallowRef`.
- Penanganan error: tangkap `IpcException`, tampilkan lewat toast sesuai pemetaan di FRONTEND.md §15.2; jangan menelan error diam-diam.

## 7. Alur Kerja Tiap Tugas
1. **Pahami**: ulangi tugas dalam 1–2 kalimat. Jika ada ambiguitas, tanya sekarang (lihat §3).
2. **Baca** hanya file dan bagian FRONTEND.md yang relevan.
3. **Rencana singkat**: daftar file yang akan dibuat/diubah. Jika >3 file, minta konfirmasi singkat dulu.
4. **Implementasi minimal** sesuai §4–§6.
5. **Verifikasi** sesuai §2 (TS dan/atau Rust jika mengedit file tersebut).
6. **Laporan akhir** memakai format di bawah.

### Format laporan akhir (ringkas, tanpa menempel ulang kode)
```
Ringkasan: <1–2 kalimat apa yang dikerjakan>
File diubah: <daftar path>
Asumsi: <jika ada, kalau tidak "tidak ada">
Belum terverifikasi: <jika ada, kalau tidak "tidak ada">
<status verifikasi TS/Rust dari §2>
```

## 8. Perilaku Saat Ragu atau Bermasalah
- Menemukan bug atau kejanggalan di luar tugas: **laporkan, jangan perbaiki** tanpa diminta.
- Spesifikasi di `FRONTEND.md` bertentangan dengan kode yang ada: **berhenti dan tanya**.
- Tugas tidak bisa diselesaikan sesuai aturan (mis. file pasti >150 baris): jelaskan alasannya dan usulkan pemecahan, jangan melanggar diam-diam.
- Jangan pernah mengklaim sudah menjalankan, menguji, atau memverifikasi sesuatu yang tidak kamu lakukan.
