# ROADMAP.md — Peta Jalan Pengembangan Kensidian

Dokumen ini menyusun urutan kerja dari nol sampai rilis 1.0. Spesifikasi rinci ada di `FRONTEND.md` dan `BACKEND.md` (fase dan kriteria selesainya **tidak diulang** di sini, hanya dirujuk). Keputusan desain ada di `DECISIONS.md`.

Konteks: pengembang tunggal, Windows, laptop i3 / RAM 8 GB (waktu kompilasi Rust lama, jadi risiko teknis dicoba **lebih awal**), `bun` sebagai pengelola paket.

---

## 1. Prinsip Urutan Kerja

1. **Risiko dulu.** Hal yang paling mungkin gagal (kompilasi crate, kompatibilitas TypeScript 7 / Vite 8, FTS5, penandatanganan R2) dicoba di Milestone 0, bukan di akhir.
2. **Kontrak dulu, implementasi kemudian.** Kontrak IPC (§12 di kedua dokumen) sudah dikunci; frontend dibangun di atas mock, backend memenuhi kontrak yang sama.
3. **Irisan vertikal.** Tiap milestone menghasilkan sesuatu yang bisa dipakai dan diuji, bukan lapisan setengah jadi.
4. **Data pengguna paling akhir boleh rusak.** Penulisan file, konflik, dan cadangan dikerjakan sebelum fitur kosmetik.
5. **Rilis kecil dan sering.** Versi 0.x dipakai sendiri sebagai catatan sehari-hari (dogfooding) sejak v0.1.
6. **Fitur berisiko tinggi dan bernilai rendah di akhir** (Live Preview), dan boleh ditunda tanpa memblokir rilis.

---

## 2. Ringkasan Milestone

| M | Nama | Frontend | Backend | Hasil | Rilis | Ukuran |
|---|---|---|---|---|---|---|
| M0 | Fondasi dan spike teknis | Fase 0 | B0 | Proyek berjalan, semua toolchain terbukti | — | M |
| M1 | Shell dan layout | Fase 1 | — | Tampilan sejajar referensi (data mock) | — | M |
| M2 | Vault dan operasi file | Fase 2 | B1 | Membuka vault nyata, tree, tab, rename, hapus, ikon | — | L |
| M3 | Editor dan view | Fase 3 | — | Mengedit dan membaca catatan dengan aman | — | L |
| M4 | Perintah dan pengaturan | Fase 4 | — | Palet perintah, pintasan, pengaturan | **v0.1** (MVP) | M |
| M5 | Cadangan R2 | §7.15 | B4 | Tombol sinkron ke R2 | **v0.2** | M |
| M6 | Integrasi agent | Fase 5a | B2 | Perubahan eksternal, konflik tertangani | **v0.3** | L |
| M7 | Pencarian dan backlink | Fase 5b | B3 | Cari teks penuh, backlink, panel kanan | **v0.4** | L |
| M8 | Live Preview (opsional) | Fase 5c | — | Mode edit langsung | v0.5 | XL |
| M9 | Poles dan performa | Fase 6 | B5 | Semua target terpenuhi, aksesibilitas lolos | RC | M |
| M10 | Rilis 1.0 | — | — | Installer, dokumentasi, uji instal bersih | **v1.0** | S |

Ukuran bersifat relatif (S < M < L < XL), bukan janji waktu. Perbarui setelah M2 dengan kecepatan nyata.

### Alur ketergantungan
```
M0 ─► M1 ─► M2 ─► M3 ─► M4 ──► v0.1
                │
                ├─► M5 (butuh B1) ─► v0.2
                └─► M6 (butuh B1 + NotesCache) ─► M7 ─► M8 (opsional) ─► M9 ─► M10
```
M5 boleh dikerjakan sebelum atau sesudah M3/M4 karena hanya butuh Fase B1, tetapi lebih baik **setelah v0.1** agar ada catatan nyata untuk dicadangkan.

---

## 3. Standar yang Berlaku di Semua Milestone

### 3.1 Siklus kerja per tugas (selaras `GEMINI.md` §7)
1. **Pahami** tugas dalam 1–2 kalimat; tanyakan bila ambigu.
2. **Baca** hanya bagian spesifikasi yang relevan.
3. **Rencana** daftar file (maks 5 file per tugas; lebih dari itu dipecah).
4. **Implementasi minimal** sesuai aturan ukuran dan kode (`GEMINI.md` §4–§6, `BACKEND.md` §13).
5. **Gerbang kualitas** (3.3).
6. **Laporan** dengan format baku; **user** yang menjalankan perintah dan melakukan commit.

### 3.2 Definisi siap dan selesai
- **Siap dikerjakan:** bagian spesifikasi jelas, tidak ada pertanyaan terbuka yang memblokir, tugas muat dalam ≤ 5 file.
- **Selesai:** gerbang kualitas lolos, kriteria "Selesai bila" fase terkait tercentang, perilaku diuji manual, dokumen yang terdampak diperbarui, dan keputusan baru dicatat di `DECISIONS.md`.

### 3.3 Gerbang kualitas (dijalankan user)
| Area | Pemeriksaan |
|---|---|
| Frontend | `bun run typecheck` (`vue-tsc`), `bun run build`, uji Vitest bila ada, `grep` tanpa hex/`rgb()` di template, `grep` tanpa `any` dan `console.log` |
| Backend | `cargo check`, `cargo clippy -- -D warnings`, `cargo test` |
| Aplikasi | `bun run tauri dev` berjalan; daftar periksa manual milestone |
| Performa | Ukur target `FRONTEND.md` §14 dan `BACKEND.md` §14 pada milestone yang disebut; catat di `PERF.md` |

Catatan: skrip `typecheck` belum tentu ada di template. Menambahkannya adalah tugas M0 **dengan persetujuan user** (`GEMINI.md` melarang agent mengubah `package.json` tanpa diminta).

### 3.4 Git dan versi
- **Cabang pendek per tugas atau fase** dari `main`: `feat/m2-file-tree`, `fix/...`. `main` selalu bisa dibangun.
- **Commit kecil dan bermakna**, format Conventional Commits (`feat(tree): ...`, `fix(ipc): ...`, `docs: ...`). Commit dilakukan **oleh user**, bukan agent.
- **Tag** setiap rilis: `v0.1.0`, `v0.2.0`, dst. (SemVer; 0.x berarti kontrak boleh berubah). Catat di `CHANGELOG.md` (format Keep a Changelog).
- `Cargo.lock` dan `bun.lock` selalu di-commit; versi dependensi tetap terkunci (`FRONTEND.md` §2.1, `BACKEND.md` §2).

### 3.5 Pengelolaan dokumen
- Ubah kontrak IPC **hanya** di `FRONTEND.md` §12, lalu salin ke `BACKEND.md` §12 di commit yang sama.
- Pertanyaan terbuka dijawab di `DECISIONS.md` sebelum milestone yang bergantung padanya dimulai (lihat tabel gerbang keputusan di §6).

### 3.6 Strategi pengujian bertingkat
| Tingkat | Isi | Kapan |
|---|---|---|
| Unit | Vitest (`path.ts`, keamanan render §10.3, fuzzy); `cargo test` (`BACKEND.md` §16) | Bersama kode yang diuji |
| Kontrak | Mock dan backend nyata dijalankan terhadap skenario yang sama (buat, tulis, konflik, rename, hapus) | M2, lalu setiap perubahan §12 |
| Manual | Daftar periksa "Selesai bila" tiap fase | Akhir milestone |
| Beban | Vault uji 1.000 dan 10.000 catatan (skrip pembangkit; minta izin sebelum membuatnya) | M2, M7, M9 |
| Dogfooding | Memakai Kensidian untuk catatan sendiri | Mulai v0.1 |

---

## 4. Milestone Rinci

### M0 — Fondasi dan spike teknis
**Tujuan:** membuktikan semua teknologi bekerja bersama sebelum menulis fitur.
**Pekerjaan:**
- Frontend Fase 0 (`FRONTEND.md` §17): scaffold Tauri + Vue + Tailwind v4, token, font lokal, `ipc` + `mock.ts`, konfigurasi window.
- Backend Fase B0 (`BACKEND.md` §17): `Cargo.toml` terkunci, `lib.rs`, `error.rs`, `models.rs`, stub command.
- **Spike teknis** (kode buangan, tidak masuk produk):
  1. `vue-tsc` 3.3.14 + TypeScript 7.0.2 memeriksa file `.vue` tanpa error.
  2. Vite 8 + `@tailwindcss/vite` 4.3.5 + `@vitejs/plugin-vue` berjalan di `bun run dev`.
  3. `cargo check` lolos dengan seluruh crate terkunci (terutama `reqwest` `native-tls` dan `rusty-s3` tanpa fitur bawaan).
  4. `rusqlite` bundled membuat tabel FTS5 dan kueri `MATCH` + `JOIN` + `rank` (`BACKEND.md` §16 butir 12).
  5. `rusty-s3` membuat URL bertanda tangan untuk nama file berspasi dan berhuruf Unicode.
- Tambahkan skrip `typecheck` (dengan persetujuan user).
**Gerbang keluar:** kriteria Fase 0 dan B0 tercentang; semua spike hijau. **Bila ada yang gagal:** catat di `DECISIONS.md` dan putuskan alternatif (mis. turunkan TypeScript atau Vite satu mayor) **sebelum** lanjut.

### M1 — Shell dan layout
**Tujuan:** kerangka UI sejajar dengan referensi, memakai data mock.
**Pekerjaan:** Fase 1 (`TitleBar`, sidebar + tab + footer, `ResizeHandle`, `TabBar`, `StatusBar`, `WelcomeScreen`, persistensi lebar).
**Gerbang keluar:** kriteria Fase 1; tombol sinkron R2 di footer belum ada (ditambahkan di M5).

### M2 — Vault dan operasi file (milestone pertama dengan data nyata)
**Tujuan:** membuka folder sungguhan dan mengelolanya dengan aman.
**Urutan di dalam milestone:**
1. Backend B1 lebih dulu: `paths`/`names`, `atomic_write`, kunci tulis, `vault_*`, `fs_*`, `note_*`, `settings_*`/`workspace_*`, config ikon, scope aset.
2. Frontend Fase 2 di atas backend nyata (mode browser tetap memakai mock): `vault` store, `FileTree` (virtual, lazy, DnD), menu klik kanan (§7.4), `ItemIcon`, `IconPickerDialog`, `TabBar` penuh, workspace save/load.
3. Uji kontrak: skenario yang sama berjalan di mock dan backend nyata.
**Gerbang keluar:** kriteria Fase 2 + B1. Tambahan: tree 10.000 baris 60 fps; uji keamanan path lolos; hapus ke tempat sampah bekerja di Windows.
**Risiko utama:** perilaku `rename`/penguncian file di Windows (antivirus). Sudah ada retry di `BACKEND.md` §8.2; uji dengan vault di folder yang dipantau antivirus.

### M3 — Editor dan view
**Tujuan:** menulis dan membaca catatan tanpa risiko kehilangan data.
**Pekerjaan:** Fase 3 (CM6 source mode, `ViewPane` + markdown-it, toggle mode, `FormatToolbar`, autosave, wikilink render+klik, batas ukuran).
**Gerbang keluar:** kriteria Fase 3, termasuk **seluruh uji keamanan §10.3**. Uji tambahan: matikan aplikasi paksa saat mengetik; file di disk tidak rusak (atomik) dan perubahan terakhir tersimpan sesuai interval autosave.

### M4 — Perintah dan pengaturan → **v0.1 (MVP)**
**Pekerjaan:** Fase 4 (`ModalHost`, `CommandPalette`, `QuickSwitcher`, `SettingsModal`, dialog, `keymap.ts`, `Toast`).
**Gerbang keluar:** kriteria Fase 4.
**Rilis v0.1:** catatan lokal harian bisa dipakai penuh (tanpa pencarian teks penuh, backlink, dan pemantau eksternal). Mulai dogfooding; catat bug di daftar sendiri. Buat installer percobaan (lihat M10) untuk mendeteksi masalah pengemasan lebih awal.

### M5 — Cadangan R2 → **v0.2**
**Prasyarat keputusan:** jawab pertanyaan `BACKEND.md` §18.3 (pemulihan, mode cermin, `Settings`). Default v1: tidak ada ketiganya.
**Pekerjaan:** Backend B4 (`sync/*`, keyring) + Frontend `SettingsBackup.vue`, `stores/sync.ts`, tombol footer (§7.15).
**Gerbang keluar:** kriteria B4 dan butir R2 di Fase 5. Uji manual dengan akun R2 sungguhan: koneksi, unggah nama file Unicode, pembatalan, sinkron ulang tanpa unggahan, kredensial salah. Simulasikan jaringan putus di tengah unggahan.
**Tindak lanjut:** lakukan satu **uji pemulihan manual** (unduh dari R2, buka sebagai vault) agar kamu yakin cadangannya benar-benar bisa dipulihkan.

### M6 — Integrasi agent → **v0.3**
**Tujuan:** tulisan dari luar (agent) terdeteksi dan tidak pernah menimpa pekerjaan yang belum disimpan.
**Pekerjaan:** Backend B2 (watcher, `NotesCache` terpelihara, klasifikasi `origin`, reconcile) + Frontend Fase 5a (`useVaultEvents`, `ConflictBanner`, pembaruan tab view tanpa kehilangan scroll).
**Gerbang keluar:** kriteria B2 dan butir Fase 5 yang terkait. Skenario uji wajib: agent menulis saat tab `dirty`; dua penulis bergantian cepat; salin folder 100 catatan; 200 file berubah serentak; vault dipindah saat terbuka.

### M7 — Pencarian dan backlink → **v0.4**
**Pekerjaan:** Backend B3 (indeks, `search_query`, `backlinks_*`, `index:status`) + Frontend Fase 5b (`SearchPanel`, `RightSidebar` Backlink + Outline, `PropertiesPanel`, bookmark, autocomplete wikilink, cari-di-catatan).
**Gerbang keluar:** kriteria B3; pencarian dan backlink sesuai target pada vault uji 1.000 catatan; `index.db` dihapus lalu dibangun ulang tanpa error.

### M8 — Live Preview (opsional) → v0.5
**Pekerjaan:** Fase 5c. Dimuat lazy dan dapat dimatikan.
**Boleh ditunda atau dibatalkan** tanpa memengaruhi 1.0; `editMode` tetap `'source'`. Putuskan setelah v0.4 berdasarkan pemakaian nyata.

### M9 — Poles dan performa → Release Candidate
**Pekerjaan:** Fase 6 + B5: tema terang, aksesibilitas (§16.1), overflow `FormatToolbar`, pengukuran semua target, perbaikan yang meleset, audit keamanan akhir.
**Audit akhir:** tidak ada hex/`any`/`console.log`/`unwrap` tersisa; secret R2 tidak ada di berkas vault maupun log; `PERF.md` lengkap; uji pada vault 10.000 catatan.
**Gerbang keluar:** kriteria Fase 6 + B5.

### M10 — Rilis 1.0
**Pekerjaan:**
- Setel versi di `tauri.conf.json` dan `package.json`/`Cargo.toml`; `CHANGELOG.md` final.
- Bangun installer rilis (`bun run tauri build`); uji pada **Windows bersih** (tanpa Node/Rust): instal, buka vault, edit, sinkron R2, copot pasang.
- Tanda tangan kode bersifat opsional; tanpa tanda tangan, Windows SmartScreen akan menampilkan peringatan pada instalasi pertama (catat di README).
- Dokumentasi pengguna singkat: cara membuat bucket dan token R2 (`BACKEND.md` §11.2), cara memulihkan dari R2, lokasi data aplikasi dan `.kensidian/`.
- Tag `v1.0.0`.
**Di luar 1.0:** pembaruan otomatis, versi macOS/Linux (perlu uji keyring dan watcher per OS).

---

## 5. Manajemen Risiko

| Risiko | Dampak | Mitigasi | Dicek di |
|---|---|---|---|
| Kombinasi fitur crate (`reqwest`, `rusty-s3`) tidak terkompilasi | Cadangan R2 terblokir | Spike `cargo check` di M0; cadangan: `reqwest` dengan `rustls` atau pustaka S3 lain (minta persetujuan) | M0 |
| TypeScript 7 / Vite 8 tidak cocok dengan `vue-tsc` atau plugin | Build atau tipe rusak | Spike M0; turunkan satu versi mayor bila perlu dan catat di `DECISIONS.md` | M0 |
| R2 menolak header yang tak ditandatangani | Unggahan gagal | Uji manual; tandatangani header via `headers_mut()` (`BACKEND.md` §16) | M5 |
| Event rename watcher tidak lengkap di Windows | Cache dan tab salah | Aturan "cache sebagai kebenaran" + reconcile (`BACKEND.md` §9) | M6 |
| RAM melebihi 150 MB | Tujuan proyek gagal | Ukur sejak M2 (bukan hanya M9); vault uji 10.000 catatan | M2, M7, M9 |
| Kompilasi Rust lambat di i3 | Siklus kerja lambat | `cargo check` untuk iterasi; `lto = "thin"`; hindari crate berat | Sepanjang jalan |
| Tulisan agent bentrok dengan editor | Kehilangan data | Kunci tulis, `expectedMtime` wajib, `ConflictBanner`, uji M6 | M6 |
| Pencarian tidak menemukan potongan di tengah kata | Kepuasan pengguna | Batasan v1 yang dicatat; evaluasi tokenizer `trigram` pada backlog | M7 |
| Cakupan melebar (fitur "sekalian") | Jadwal molor | Aturan `GEMINI.md` §4; pengecualian dicatat di `DECISIONS.md` | Sepanjang jalan |
| Live Preview memakan waktu | Menunda 1.0 | M8 opsional dan terpisah | M8 |

---

## 6. Gerbang Keputusan

| Sebelum | Keputusan yang harus sudah dijawab |
|---|---|
| M0 | Versi toolchain tetap (TS 7, Vite 8) atau diturunkan setelah spike |
| M2 | Lokasi vault uji dan persetujuan membuat skrip pembangkit vault |
| M5 | `BACKEND.md` §18.3: pemulihan dari R2, mode cermin, pencadangan `Settings` |
| M7 | Tokenizer pencarian (`unicode61` sekarang) cukup atau perlu `trigram` |
| M8 | Live Preview dikerjakan sebelum atau sesudah 1.0 |
| M10 | Tanda tangan kode: ya atau tidak |

---

## 7. Backlog Pasca-1.0

- Pemulihan dari R2 di dalam aplikasi; mode cermin (hapus di R2 mengikuti lokal).
- Unggah multi-bagian untuk file besar.
- Pencarian potongan di tengah kata (`trigram`) dan pencarian properti/tag.
- Pembaruan otomatis dan dukungan macOS/Linux.
- Penguncian satu instance aplikasi per vault.
- Pembatasan tulis per folder (bila terbukti perlu).
- Enkripsi sisi klien untuk cadangan.

---

## 8. Pelacak Kemajuan

Salin ke catatan pribadi dan centang saat gerbang keluar terpenuhi.

- [x] M0 Fondasi dan spike teknis
- [x] M1 Shell dan layout
- [x] M2 Vault dan operasi file
- [x] M3 Editor dan view
- [x] M4 Perintah dan pengaturan — **rilis v0.1**
- [ ] M5 Cadangan R2 — **rilis v0.2**
- [ ] M6 Integrasi agent — **rilis v0.3**
- [ ] M7 Pencarian dan backlink — **rilis v0.4**
- [ ] M8 Live Preview (opsional)
- [ ] M9 Poles dan performa
- [ ] M10 Rilis 1.0
