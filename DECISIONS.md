# DECISIONS.md — Keputusan Desain Kensidian

## 2026-11-14

1. **Lokasi indeks**: `index.db` (SQLite FTS5) disimpan di `.kensidian/` dalam vault. Diputuskan user. Rincian: FRONTEND.md §12.6.
2. **Penentuan `origin` (`self` / `external`)**: sidik jari tulisan (ukuran + hash isi) dicatat di dalam kunci tulis, dicocokkan saat watcher melepas batch. Rekomendasi, disetujui user. Alasan: pencocokan berdasarkan waktu atau path saja bisa salah menandai tulisan agent sebagai `self`.
3. **Pembatasan akses tulis per folder (pertanyaan §18.3 no. 3)**: **tidak ada di v1**. Perlindungan: satu kunci tulis per vault, `expectedMtime` wajib pada `note_write`, tulis atomik, dan `ConflictBanner`. Pembatasan per folder ditinjau ulang bila terbukti perlu.
4. **`note_write.expectedMtime` tidak boleh `null`** (sebelumnya boleh, sehingga bisa menimpa tulisan agent tanpa pengecekan).
5. **Config ikon**: `vault_config_save` diganti `item_style_set(path, style | null)`. Backend yang memigrasikan key saat `fs_rename`/`fs_delete`.
6. **Menu klik kanan**: lihat FRONTEND.md §7.4. Asumsi: `Hapus ikon` menghapus ikon dan warna; `Ubah warna ikon` nonaktif untuk file tanpa ikon kustom; `Ubah ikon…` di area kosong = ikon root vault (tampil di footer sidebar); item `Bookmark` dihapus dari menu tree (tetap ada di menu `⋮` dan tab Bookmark).

## 2026-11-14 (cadangan R2 dan backend)

7. **Cadangan Cloudflare R2**: satu arah, manual (tombol sinkron), tanpa penghapusan objek di R2, tanpa pemulihan di aplikasi pada v1. Diminta user. Rincian: BACKEND.md §11.
8. **Klien R2**: `rusty-s3` (penanda tangan URL) + `reqwest` dengan `native-tls`, bukan `aws-sdk-s3` (berat dikompilasi). Kredensial di keyring OS, tidak pernah di file vault.
9. **Cakupan cadangan**: semua file non-tersembunyi + `.kensidian/config.json`; `workspace.json`, `sync.json`, dan `index.db` tidak ikut.
10. **`backlinks_count`** = jumlah catatan sumber berbeda; `SearchHit.line` dan `BacklinkRef.line` berbasis 1.
11. **Event baru `index:status`** agar UI bisa menandai hasil pencarian yang belum lengkap selama pengindeksan.
