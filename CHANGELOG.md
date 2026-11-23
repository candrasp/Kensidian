# Changelog

Semua perubahan penting pada aplikasi Kensidian akan dicatat di file ini.

## [1.2.4] - 2026-11-23
### Ditambahkan
- **Fitur Hapus Vault dari Riwayat Sesi (Remove from Recent):**
  - Menambahkan opsi untuk menghapus entri vault dari daftar riwayat (*recent vaults*) tanpa menghapus folder fisik maupun berkas catatan di disk.
  - Menambahkan command IPC backend Rust `vault_remove_recent` dengan penyimpanan atomik (`atomic_write`) dan normalisasi separator path Windows yang konsisten.
  - Menambahkan modal konfirmasi dialog (`RemoveRecentModal.vue`) yang informatif dan aman, menegaskan bahwa berkas catatan di komputer pengguna tetap aman dan hanya referensi sesi riwayat yang dibersihkan.
  - Menyediakan tombol aksi hapus (ikon `X`) yang muncul saat baris di-hover pada dropdown pemilih vault di footer sidebar (`SidebarFooter.vue`) dan pada layar awal (`WelcomeScreen.vue`).
  - Memisahkan elemen tombol buka vault dan tombol hapus riwayat secara fisik untuk mencegah konflik event bubbling yang dapat memicu pembukaan vault saat menghapus sesi.

## [1.2.3] - 2026-11-20
### Diperbaiki
- **Urutan Angka Otomatis pada Daftar Nomor (Ordered List):**
  - Memperbaiki rendering Live Preview untuk daftar bernomor (`1.`, `1.`, `1.`) agar otomatis dihitung dan ditampilkan berurutan secara visual (`1.`, `2.`, `3.`, dst.) sesuai spesifikasi CommonMark dan standar Obsidian.
  - Memperbaiki tombol toolbar "Daftar Nomor (1.)" (`toggleOrderedList`) sehingga ketika beberapa baris dipilih dan tombol diklik, penomoran otomatis diurutkan secara berurutan (`1. `, `2. `, `3. `, dst.) dengan mempertahankan indentasi asli, serta dapat di-toggle untuk menghapus nomor.
- **Interaksi & Manajemen Tabel di Live Preview:**
  - Menambahkan tombol aksi **Hapus tabel** pada footer tabel yang memungkinkan pengguna menghapus seluruh blok tabel dari dokumen dengan satu klik.
  - Menambahkan tombol **Show Markdown** di sebelah tombol aksi tabel untuk menampilkan dan menyeleksi sintaks markdown mentah tabel secara langsung tanpa flicker layout.
  - Menghapus transisi otomatis ke markdown mentah saat mengklik di luar area tabel, menjaga tampilan tabel visual tetap stabil saat berinteraksi dengan catatan.
  - Menghapus tooltip native/floating pada tombol tabel guna mencegah bug glitch tooltip yang mengambang di layar.
  - Mendukung shortcut seleksi seluruh tabel (`Ctrl+A` / `Cmd+A` saat sel tabel aktif) dan seleksi lintas tabel di editor, sehingga tabel dapat langsung dihapus menggunakan tombol `Backspace` atau `Delete`.

## [1.2.2] - 2026-11-20
### Diperbaiki
- **Optimasi Buka Vault & Overlay Transisi:** Memperbaiki freeze UI dan delay responsif saat beralih atau membuka vault dengan menambahkan overlay transisi (`VaultLoadingOverlay`), memindahkan parsing konfigurasi workspace setelah event load selesai, serta menunda pembacaan riwayat vault agar pembukaan berkas terasa instan.
- **Konsistensi State Tab saat Ganti Vault:** Memastikan seluruh state tab dan file aktif sebelumnya dibersihkan dengan benar saat membuka vault baru sehingga editor tidak mempertahankan file dari vault sebelumnya.
- **Render Pencarian Editor (Ctrl+F):** Memperbaiki pemisahan dan styling tombol navigasi dan panel pencarian CodeMirror agar tidak glitch atau menumpuk saat diaktifkan berulang kali.
- **Scroll & Seleksi Editor:** Menyelaraskan styling seleksi dan scroll editor pada berbagai tema warna agar tetap kontras dan nyaman dibaca.

## [1.2.1] - 2026-11-20
### Diperbaiki
- **Duplikasi Entri Vault Terbaru:** Memperbaiki normalisasi path vault di backend Rust (`vault.rs`) dengan menghapus prefix verbatim Windows (`\\?\`), mencegah vault yang sama tampil dua kali di daftar riwayat vault.

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
