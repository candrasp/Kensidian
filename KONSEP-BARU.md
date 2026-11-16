# KONSEP-BARU.md — Evaluasi Kritis & Konsep Sederhana Kensidian

Dokumen ini memuat analisis terhadap desain antarmuka Kensidian saat ini, evaluasi kritis diri (kelebihan & risiko pemangkasan), serta arsitektur baru yang dioptimalkan untuk **kecepatan, kesederhanaan, dan kenyamanan membaca serta menulis Markdown**.

---

## 1. Masalah Utama Tampilan Saat Ini

Dari hasil implementasi dan pengujian visual, antarmuka saat ini mengadopsi struktur Obsidian secara terlalu kaku sehingga menimbulkan **kelebihan beban visual (UI bloat)**:

1. **Header Menumpuk 3 Tingkat (Total ±116px terbuang)**:
   - Tingkat 1: `TabBar` (40px)
   - Tingkat 2: `NavHeader` (40px)
   - Tingkat 3: `FormatToolbar` (36px)
   - *Dampak:* Ruang vertikal untuk membaca dan mengetik terpotong signifikan. Pengguna harus melihat 3 baris tombol sebelum mencapai baris pertama catatan.
2. **Sidebar Kiri Terlalu Ramai Sebelum Daftar File**:
   - Baris tab (`Berkas` / `Cari` / `Bookmark` — 40px)
   - Baris toolbar file (`Catatan Baru`, `Folder Baru`, `Urutkan`, `Auto-reveal`, `Ciutkan` — 36px)
   - *Dampak:* Ada 2 lantai tombol navigasi sebelum nama file pertama terlihat.
3. **Kerumitan State Tab (`tabsStore`)**:
   - Mengelola multi-tab, tab history per tab, sinkronisasi tab reordering, dan penutupan tab menambah kompleksitas kode yang jarang dimanfaatkan pengguna yang fokus pada satu catatan dalam satu waktu.

---

## 2. Koreksi Diri & Analisis Kritis (Self-Critique)

Apakah ide *"buang saja semua tab dan toolbar"* sudah merupakan keputusan terbaik? Mari kita bedah secara kritis risiko dan trade-off-nya:

### Kritik A: Bahaya Menghilangkan Tab Secara Total
- **Risiko:** Pengguna sering kali perlu membuka 2 catatan bergantian (misalnya: membaca referensi di Catatan A sambil menulis draf di Catatan B). Jika sistem tab dihapus 100% tanpa kompensasi, pengguna dipaksa bolak-balik mengeklik sidebar, yang bisa mereset posisi baca dan terasa melelahkan.
- **Koreksi yang Lebih Cerdas:**
  - **Opsi Tab Bar Otomatis Sembunyi (Auto-Hide Single Tab):** Jika hanya ada 1 catatan terbuka, TabBar **tidak perlu dirender sama sekali** (0px tinggi). TabBar hanya muncul tipis (28px) jika pengguna sengaja membuka tab kedua (`Ctrl+T` atau Ctrl+Klik).
  - Atau navigasi antar-catatan mengandalkan pintasan cepat: `Ctrl+O` (Quick Switcher) atau tombol riwayat `Alt+←` / `Alt+→` tanpa butuh baris tab fisik yang memakan tempat.

### Kritik B: Format Toolbar yang Menempel Terus-Menerus
- **Risiko:** Penulis Markdown terbiasa mengetik sintaks secara langsung (`**tebal**`, `## judul`, `- list`). Toolbar tombol statis di atas teks sering kali diabaikan setelah pengguna hafal pintasan.
- **Koreksi yang Lebih Cerdas:**
  - Jadikan `FormatToolbar` **opsional**: bisa dimatikan/dinyalakan lewat pintasan (`Ctrl+Shift+T`), atau default disembunyikan.
  - Alternatif modern: **Floating Bubble Menu** (toolbar kecil hanya muncul saat teks diblok dengan kursor mouse, seperti Notion/Medium), sehingga area atas catatan selalu 100% bersih.

### Kritik C: Memanfaatkan TitleBar yang 80% Kosong
- **Kondisi Saat Ini:** TitleBar (32px) di bagian atas hanya menampilkan judul `"Kensidian - Kensidian"` di tengah dan kontrol window di kanan. Ruang kosongnya sangat besar.
- **Peluang Optimasi:** Pindahkan tombol esensial (seperti toggle sidebar kiri, nama catatan, dan tombol toggle mode Baca/Tulis) langsung ke **TitleBar**. Ini memangkas 1 baris header utuh.

---

## 3. Desain Konsep Baru yang Diusulkan

### A. Struktur Layout Bersih (Zero-Clutter)

```
┌─────────────────────────────────────────────────────────────┐
│ [📁 Sidebar]  Judul Catatan Aktif      [👁/✎ Mode]  [ _ ▢ ✕ ]│ <- TitleBar Terintegrasi (36px)
├───────────────┬─────────────────────────────────────────────┤
│ 📁 Nama Vault │                                             │
│ [+] Baru  [🔍]│                                             │
│ ───────────── │                                             │
│ 📁 projek     │               AREA CATATAN                  │
│   📄 Catatan  │         (Maksimal ruang vertikal,           │
│   📄 Referensi│         tanpa tumpukan header bar)          │
│               │                                             │
│               │                                             │
├───────────────┤                                             │
│ ⚙ Pengaturan  │                                   450 kata  │
└───────────────┴─────────────────────────────────────────────┘
```

### B. Perubahan Spesifik per Bagian

1. **Header Catatan**:
   - **Hapus `NavHeader` dan satukan ke `TitleBar`**.
   - Tombol alih mode baca/tulis (`👁`/`✎`) dan panah kembali/maju ditaruh di pojok kanan TitleBar atau floating halus.
   - Menghilangkan minimal 40px–76px pemborosan vertikal.

2. **Sidebar Kiri**:
   - Hilangkan tab *Cari* & *Bookmark* yang terpisah.
   - Baris atas sidebar cukup: Nama Vault + Tombol `+` (Catatan Baru) + Ikon/Input Cari Cepat.
   - Langsung menampilkan pohon berkas (`FileTree`).

3. **Area Editor & Mode Baca**:
   - Mode Baca (`ViewPane`): Langsung merender teks bersih dengan tipografi *Plus Jakarta Sans*.
   - Mode Tulis (`EditorPane`): CodeMirror 6 dengan font teks yang nyaman, kursor aksen, dan autosave hening.
   - `FormatToolbar`: Disembunyikan secara default, atau tampil hanya saat diaktifkan via setting / shortcut.

4. **Status Bar**:
   - Dibuat ultra-minimalis: hanya angka kata (misal `1.022 kata`) berwarna samar di pojok kanan bawah, tanpa border kotak yang mengganggu.

---

## 4. Keuntungan Teknis & Pengalaman Pengguna

1. **Performa Lebih Ringan**:
   - Mengurangi puluhan listener DOM, komponen dropdown menu berlebih, dan komputasi riwayat multi-tab.
2. **Kerapian Kode**:
   - Membuang abstraksi yang belum tentu dipakai membuat basis kode mudah dipelihara dan tidak rentan error sinkronisasi state.
3. **Pengalaman Menulis (Zen Writing)**:
   - Mengembalikan esensi aplikasi: membuka cepat, langsung mengetik, dan membaca tanpa gangguan antarmuka yang rumit.
