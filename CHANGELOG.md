# Changelog

Semua perubahan penting pada aplikasi Kensidian akan dicatat di file ini.

## [1.2.0] - 2026-11-19
### Keamanan
- **Sanitasi HTML Markdown (Anti-Stored XSS):** Mengintegrasikan sanitasi menyeluruh menggunakan `DOMPurify` pada hasil parsing Markdown (`renderMarkdown`) dengan profil aman untuk HTML, SVG, MathML, atribut `data-*`, dan protokol lokal (`asset:`), mencegah potensi eksekusi skrip berbahaya dari catatan maupun release notes.

### Diperbaiki
- **Highlight Seleksi Mouse pada Blok Kode:** Menghapus layer tiruan `drawSelection()` CodeMirror yang tersembunyi di belakang background solid blok kode dan beralih ke native browser selection dengan styling semi-transparan (`rgba`), sehingga seleksi teks di dalam blok kode tampil alami di atas background kode tanpa menghalangi keterbacaan huruf.
- **Tampilan Pratinjau Blok Kode SVG (Live Preview):** Memperbaiki styling pratinjau SVG yang sebelumnya berantakan dan bertumpuk vertikal dengan menyematkan class `view-content`, mengganti teks tombol dengan ikon SVG presisi (tombol transparansi kotak-kotak dan salin kode), serta menyelaraskan tombol toggle segmen ("Kode" / "Pratinjau") agar mulus saat beralih mode.
- **Pencarian Dokumen (Ctrl + F):** Memblokir search bar bawaan browser WebView yang muncul saat menekan `Ctrl + F` dan mengarahkannya langsung ke panel pencarian editor CodeMirror.
- **Desain Panel Pencarian:** Merombak tampilan panel pencarian editor menjadi floating bar minimalis modern bergaya Obsidian/VS Code dengan tombol navigasi panah `↑` dan `↓`, tombol close `×` yang proporsional dan sejajar tanpa tumpang tindih, serta membersihkan input replace dan checkbox opsi lanjutan yang mengotori tampilan form.

### Dihapus
- **Pembersihan Dead Code:** Menghapus komponen tak terpakai yang sudah ditinggalkan (`NavHeader.vue`, `SidebarTabs.vue`, dan `ViewPane.vue`) guna merampingkan ukuran bundle dan mempermudah pemeliharaan kode.

## [1.1.9] - 2026-11-19
### Diperbaiki
- **Navigasi Daftar Isi (Outline):** Perbaikan posisi scroll saat mengklik heading pada Outline agar judul target langsung mendarat tepat di bagian atas viewport editor (`y: 'start'` dengan margin atas) dan tidak tertutup atau berada di bawah layar.
- **Scroll Past End di Editor:** Menambahkan ekstensi `scrollPastEnd` pada CodeMirror agar dokumen di bagian akhir tetap dapat di-scroll leluasa ke atas saat navigasi heading.
- **Highlight Heading Aktif:** Menambahkan status aktif pada butir Outline yang sedang dipilih agar pengguna mengetahui posisi heading saat ini.
- **Bug Tooltip Macet saat Dropdown Terbuka:** Memperbaiki tooltip yang tetap melayang ketika menu dropdown atau modal dibuka dengan menambahkan kontrol deaktivasi otomatis tooltip pada `IconButton` dan `Tooltip`.
- **Desain Tooltip Standar:** Mengganti seluruh atribut native `title` pada Tab, tombol tab, dan footer sidebar dengan komponen custom `Tooltip` bergaya desain Kensidian (`bg-panel-alt`, border, shadow).
- **Tata Letak Tab Bar:** Memindahkan aksi dokumen (Salin, Edit/View, menu opsi lainnya) langsung ke sisi kanan tab bar dengan spasi proporsional agar tidak berdempetan.
- **Konfirmasi Hapus Dokumen:** Menambahkan modal konfirmasi sebelum menghapus file aktif melalui menu opsi tab bar.
- **Informasi Jumlah Berkas & Folder:** Memindahkan label ringkasan total berkas dan folder di sidebar kiri ke baris terpisah di atas footer tanpa garis pembatas yang sesak, dilengkapi tooltip nama vault aktif.
- **Modal Pembaruan Aplikasi (UpdateModal):** Memperbaiki kontras warna tombol "Unduh & Instal" agar teks terbaca jelas di seluruh tema, memperluas area catatan perubahan, serta memberi ruang napas vertikal agar teks tidak menempel ke border bawah.
- **UTF-8 BOM pada Metadata Updater:** Memastikan file metadata `latest.json` bersih dari karakter BOM agar parser updater Tauri tidak mengalami kegagalan saat memeriksa pembaruan.

## [1.1.8] - 2026-11-18
### Diperbaiki
- Perbaikan sinkronisasi scroll antara mode Edit dan View: mengganti mekanisme berbasis rasio ke jangkar nomor baris sumber.
- Area kosong di CodeMirror setelah beralih mode sudah tidak terjadi lagi.
- Posisi scroll tidak lagi bergeser (drift) saat berganti mode Edit ↔ View berulang kali.
- **Flicker Markdown Mentah saat Scroll Cepat (Mode View):** Menghilangkan kemunculan sesaat simbol Markdown (`###`, `**`, `-`, dll.) saat scroll naik/turun pada dokumen panjang dengan menerapkan sistem pre-emptive decoration buffer (±3.000 karakter di luar viewport).
- **Tipografi List & Hanging Indent:** Menyejajarkan teks baris kedua dan seterusnya saat text-wrap pada bullet list (`•`) dan nomor (`1.`, `2.`, dst.) secara presisi tanpa celah berlebih (hanging indent).
- **Jarak Antar Item List:** Menambahkan ruang napas vertikal antar butir daftar agar teks panjang tidak menumpuk rapat.
- **Spasi Semu di Sekitar Inline Code:** Menyesuaikan padding horizontal badge kode inline sehingga tanda baca setelahnya (seperti titik, koma, kurung) menempel wajar tanpa celah kosong.
- **Spasi Heading:** Menambahkan jarak pemisah vertikal proporsional pada judul (H1–H6) agar tidak mepet dengan teks atau list di bawahnya.
- **Tabel Interaktif In-Place:** Editor tabel interaktif langsung di mode live preview tanpa terbongkar menjadi Markdown mentah saat diklik, dilengkapi navigasi Tab/Enter serta tombol tambah dan hapus baris/kolom.

## [1.1.7] - 2026-11-18
### Diperbaiki
- Perbaikan ekstraksi otomatis catatan perubahan pada GitHub Actions (ganti `awk` bash dengan PowerShell untuk kompatibilitas runner Windows).

## [1.1.6] - 2026-11-17
### Ditambahkan
- Integrasi otomatis ekstraksi catatan perubahan rilis dari `CHANGELOG.md` ke GitHub Release dan Tauri Updater.
- Tampilan detail Markdown rilis langsung di dalam modal Pembaruan Aplikasi.

## [1.1.5] - 2026-11-17
### Ditambahkan
- Tooltip nama lengkap catatan dan folder saat di-hover pada sidebar pohon berkas (file tree).
- Penempatan posisi tooltip secara dinamis di sebelah kanan kursor mouse dengan tema visual gelap Kensidian.

## [1.1.4] - 2026-11-17
### Ditambahkan
- Dialog pop-up pembaruan otomatis (`UpdateModal`) saat aplikasi dibuka jika ada rilis baru.
- Penampilan catatan perubahan (Changelog/Release Notes) langsung di dialog pembaruan menggunakan markdown rendering.
- Opsi "Nanti Saja" untuk menunda instalasi pembaruan tanpa mengganggu alur kerja.

## [1.1.3] - 2026-11-17
### Diperbaiki
- Perbaikan reaktivitas tombol cek pembaruan di modal Bantuan & Tentang.
- Penambahan feedback status inline ketika versi sudah terbaru atau terjadi kesalahan jaringan.
- Penampilan tanggal rilis pembaruan jika versi baru tersedia.

## [1.1.2] - 2026-11-17
### Ditambahkan
- Pengaturan updater otomatis melalui GitHub Actions dan Tauri Updater plugin.
- Integrasi Minisign signature untuk pengunduhan paket rilis yang aman.
