# Changelog

Semua perubahan penting pada aplikasi Kensidian akan dicatat di file ini.

## [1.3.1] - 2026-11-28
### Ditambahkan
- **Tautan Repositori Remote di Kartu Status Git (`GitStatusCard.vue`, `project.rs`, `state.rs`):** Membaca URL remote `origin` satu kali per sesi vault (disimpan di memori `VaultSession`), mengonversi format SSH/HTTPS secara aman, dan menampilkan tombol klik langsung ke GitHub/GitLab/Remote di header kartu Status Git.
- **Panduan, Template & Aksi Cepat Dokumen Proyek (`ProjectDocsModal.vue`, `projectDocsGuide.ts`, `RoadmapCard.vue`, `ChangelogCard.vue`):** Menambahkan tombol `Dokumen` di header Dashboard Proyek untuk melihat fungsi dokumen standar proyek (termasuk kategori *Desain & Spesifikasi*: `DESIGN.md`, `CONTRACT.md`, `FRONTEND.md`, `BACKEND.md` beserta 3 aturan penulisan), membuat file template dalam 1 klik, atau menyalin prompt AI agent, serta menambahkan aksi cepat pada *empty-state* kartu Roadmap dan Changelog.
- **Tombol Salin Prompt AI Agent di Modal Devlog (`DevlogModal.vue` & `projectDevlog.ts`):** Menambahkan banner cepat *"Catat otomatis pakai AI Agent"* di bagian atas modal devlog untuk menyalin prompt siap pakai dengan tanggal dan jam sistem lokal, instruksi pembuatan folder `devlog/`, serta format sesi yang kompatibel dengan parser dashboard.
- **Deteksi Tech Stack Multi-Ekosistem & Monorepo (`projectStack.ts`):** Menambahkan deteksi otomatis untuk Python, Go, PHP/Laravel, Ruby, Java/Kotlin/Android, Dart/Flutter, Swift, dan C/C++, deteksi package manager (`Bun`, `pnpm`, `Yarn`, `npm`), label `Monorepo`, serta pengumpulan dependensi lintas sub-package tanpa duplikasi.
- **Popover Perintah CLI (`ProjectCliPopover.vue` & `projectCommands.ts`):** Menambahkan tombol `CLI` di header Dashboard Proyek untuk melihat dan menyalin perintah `dev`, `build`, `test`, dll. lintas ekosistem (JS/TS, Tauri, Rust, Laravel, Go, Python, Flutter, Makefile) dalam satu klik.
- **Berkas Lisensi Resmi (`LICENSE`):** Menambahkan berkas lisensi GNU General Public License v3.0 (GPL-3.0) di root proyek.
- **Inisialisasi Git Langsung dari Dashboard (`project.rs`, `GitStatusCard.vue`, `ProjectDashboard.vue`):** Menambahkan command `project_init_git` (`git init` via `spawn_blocking`) dan tombol **Inisialisasi Git** pada *empty state* kartu Status Git untuk proyek baru.

### Diubah
- **Pembaruan Dokumentasi Presentasi (`README.md`):** Menyusun ulang `README.md` sebagai dokumentasi presentasi produk (editor Markdown, organisasi vault, dan Mode Proyek) lengkap dengan tangkapan layar dari folder `screenshot/` serta tautan ke lisensi GPL-3.0 dan `DEVELOPMENT.md`.

### Diperbaiki
- **UX Dashboard untuk Proyek Mentah (`GitStatusCard.vue`, `ProjectDashboard.vue`, `ChangelogCard.vue`):** Menampilkan keterangan *"Belum ada commit"* saat repo belum memiliki commit, menyembunyikan tombol **CLI** di header ketika belum ada perintah terdeteksi, serta menurunkan tombol `Buat CHANGELOG.md` ke gaya sekunder.
- **Deteksi Status Git 2-Tahap & Peringatan `.gitignore` (`project.rs`, `models.rs`, `GitStatusCard.vue`):** Memindahkan eksekusi `git status` ke `spawn_blocking`, menggunakan ekspansi penuh (`-uall`) hanya saat aman agar hitungan berkas *untracked* akurat setara IDE (dengan batas 200 path pada daftar UI), serta mendeteksi `.gitignore` yang hilang atau folder berat *untracked* (`node_modules`, `target`, `.venv`, dll.) untuk mencegah pemindaian berat dan menampilkan peringatan di kartu Status Git.
- **Workflow Rilis Multi-Platform (`.github/workflows/release.yml`):** Menambahkan matrix build `ubuntu-22.04` dan `macos-latest` (`universal-apple-darwin`), dependensi sistem Linux, ekstraksi changelog lintas-platform via `bun`, serta mekanisme `releaseDraft: true` + job `publish-release` agar `latest.json` dan aset rilis terpublikasi utuh untuk semua OS.
- **Pintasan & Label UI Lintas OS (`platform.ts`, `FileTree.vue`, `HelpModal.vue`, `TabBar.vue`, `SidebarFooter.vue`, `TitleBar.vue`, `RightSidebar.vue`, `FormatToolbar.vue`, `id.ts`):** Menambahkan deteksi platform macOS pada `platform.ts` (`⌘`, `⌥`, `⌘⌫`) untuk label pintasan dinamis lintas OS, serta menambahkan dukungan `Cmd + Backspace` untuk menghapus file/folder di `FileTree.vue`.
- **Kompatibilitas Path Unix & Terminal Linux (`paths.rs`, `project.rs`, `ProjectDashboard.vue`):** Memperbaiki `path_starts_with` di `paths.rs` agar konversi separator `/` → `\` hanya berjalan di Windows (mencegah error path di macOS/Linux), menambahkan fallback multi-terminal Linux pada `project_open_terminal`, serta menampilkan toast error jika terminal gagal dibuka.
- **Deteksi & Mode Eksplisit Proyek Baru (`vault.rs`, `models.rs`, `WelcomeScreen.vue`, `SidebarFooter.vue`):** Memperluas deteksi otomatis marker proyek (Python, Go, PHP, Flutter, Ruby, Java, C/C++, Swift, Makefile) serta menyimpan flag `isProject` di `.kensidian/config.json` ketika pengguna membuka folder lewat *"Buka folder proyek..."* agar proyek baru tanpa `.git` tetap menampilkan Dashboard Proyek.
- **Auto-Refresh Selektif Dashboard Proyek (`ProjectDashboard.vue`):** Menambahkan listener `vault:changed` dengan filter path dan debounce 250ms agar penghapusan atau perubahan pada `devlog/`, `CHANGELOG.md`, maupun dokumen target langsung memperbarui kartu terkait secara otomatis tanpa membebani RAM/CPU.
- **Kartu Devlog Dashboard Proyek (`LastSessionCard.vue` & `projectDevlog.ts`):** Menambahkan dropdown pemilih tanggal file devlog, menampilkan seluruh sesi pada hari terpilih dalam area scrollable, mendukung teks multi-baris, serta membersihkan sintaks Markdown mentah agar tampilan tetap rapi.
- **Daftar Checklist Dashboard Proyek (`RoadmapCard.vue` & `projectChecklist.ts`):** Memprioritaskan tugas yang belum selesai agar langsung terlihat di daftar (dengan opsi *Tampilkan selesai* dan dukungan scroll penuh tanpa terpotong 8 item pertama), serta membersihkan sintaks tautan Markdown `[label](url)` di teks tugas.
- **Penyempurnaan UI Dashboard Proyek:** Menghilangkan *nested card* dan *pill* berlebihan pada header serta kartu Status Git/Sesi Koding Terakhir, memperbaiki kebocoran identifier `__project_dashboard__` di title bar, menyembunyikan tombol toolbar catatan pada tab Dashboard, merapikan scrollbar dan kontras teks, serta mengurutkan tech stack agar framework utama tampil lebih dulu.
- **Filter Folder Non-Markdown di Mode Proyek (`fs.rs`):** Menyembunyikan folder yang hanya berisi berkas kode/non-Markdown pada tree Mode Proyek menggunakan traversal rekursif non-blocking (`spawn_blocking`) dengan short-circuit dan batas kedalaman, sambil tetap menampilkan folder yang benar-benar kosong.
- **Visibilitas Kontekstual Sidebar Kanan (`AppShell.vue` & `TabBar.vue`):** Menyembunyikan sidebar kanan (*Daftar Isi*) beserta tombol pembukanya saat tab aktif adalah Dashboard Proyek atau tab kosong (`NewTabPage`), tanpa mengubah preferensi `rightSidebarVisible` pengguna sehingga sidebar otomatis tampil kembali saat berpindah ke tab catatan.

## [1.3.0] - 2026-11-24
### Ditambahkan
- **Fitur Mode Proyek (Project Tracker untuk Solo Developer):**
  - **Pembeda Mode Proyek & Filter Direktori:** Menambahkan opsi *"Buka folder proyek..."* pada menu dropdown pemilih vault di footer sidebar (`SidebarFooter.vue`) dan pada layar awal (`WelcomeScreen.vue`), lengkap dengan deteksi otomatis dan penanda badge proyek (`isProject`).
  - **Smart Ignore Direktori Build & Dependensi:** Backend Rust secara otomatis mengabaikan direktori beban berat seperti `node_modules`, `target`, `dist`, `.git`, `.vscode`, dan folder build lainnya dari penjelajahan pohon berkas dan pengindeksan catatan guna menjaga konsumsi memori tetap ringan dan performa file-watcher tetap optimal.
  - **Safety Guard Penghapusan Direktori:** Menambahkan proteksi pada command `fs_delete` di backend Rust untuk mencegah penghapusan folder penting kode sumber dan dependensi proyek secara tidak sengaja.
  - **Integrasi Metadata Git:** Menambahkan command IPC `project_get_git_status` untuk membaca status repositori Git lokal secara cepat (nama branch aktif, commit terakhir berserta hash, pesan, author, dan timestamp, serta deteksi berkas belum ter-commit / uncommitted changes).
  - **Antarmuka Dashboard Proyek:** Menyediakan komponen dashboard modular (`ProjectDashboard.vue`, `GitStatusCard.vue`, `RoadmapCard.vue`, `SessionNoteCard.vue`, dan `DevlogModal.vue`) yang memungkinkan developer memantau progres checklist roadmap/TODO markdown dan mencatat log sesi koding (*Where I Left Off*) langsung ke berkas markdown.

### Diperbaiki
- **Penanganan Pemotongan UTF-8 pada Pencarian Dokumen (BUG-01 & BUG-10):**
  - Memperbaiki potensi *panic* runtime Rust saat pembuatan snippet hasil pencarian catatan di `search.rs` dengan memanfaatkan fungsi snap batas karakter (`floor_char_boundary` dan `ceil_char_boundary`) sebelum pemotongan string byte, sehingga karakter multi-byte (emoji, aksara Asia/non-Latin) tidak lagi menyebabkan crash aplikasi.
  - Menyelaraskan penghitungan panjang byte pencarian berbasis query lowercase agar pencarian teks multi-byte tidak melompat melebihi batas string.
- **Pelepasan Blocking Async pada Operasi Tulis Berkas (BUG-02):**
  - Menghapus pemanggilan `thread::sleep` sinkron di dalam fungsi `atomic_write` (`atomic.rs`) yang sebelumnya berisiko menyebabkan freeze antarmuka sementara (starvation worker thread async Tokio).
- **Pembersihan File Watcher saat Ganti/Tutup Vault (BUG-03):**
  - Menambahkan penghentian dan pelepasan listener watcher lama secara eksplisit (`*watcher = None`) saat menutup vault (`vault_close`) atau membuka vault baru (`vault_open`), mencegah kebocoran resource memori dan duplikasi pengiriman event `vault:changed`.
- **Perbaikan Command Penyimpanan Aset Biner (BUG-04):**
  - Menulis ulang fungsi `fs_write_asset` di `fs.rs` agar dapat menerima seluruh jenis berkas biner (gambar PNG, JPG, GIF, WebP, dll.) dan menyimpannya ke folder `.kensidian/assets` dengan penomoran unik otomatis dan penguncian tulis (`write_lock`), menggantikan logika duplikat sebelumnya yang keliru membatasi hanya berkas Markdown/teks.
- **Konsistensi Resolusi Timestamp Catatan (BUG-05):**
  - Menambahkan fallback `now_millis()` pada `note_write` ketika filesystem memiliki granularitas mtime kasar (seperti FAT32 atau NTFS) agar frontend tidak salah mendeteksi konflik perubahan (*false conflict*) pada penyimpanan berurutan dalam durasi singkat.
- **Mitigasi Race Condition TOCTOU pada Operasi Berkas (BUG-06):**
  - Memperbaiki pengecekan keberadaan berkas/folder pada `fs_create_folder` dan `fs_rename` dengan mengandalkan respons error langsung dari sistem operasi untuk mencegah tabrakan konkurensi (TOCTOU).
- **Parsing Output Status Git yang Lebih Andal (BUG-07 & BUG-16):**
  - Mengubah pemanggilan Git status di `project.rs` menggunakan format `-z` (*NUL-terminated output*) sehingga berkas dengan spasi, karakter khusus, maupun berkas yang di-rename (`R`) diparsing dengan presisi tanpa pemotongan string yang salah.
  - Menambahkan validasi `output.status.success()` pada perintah Git (`branch`, `rev-parse`, `status`) agar output error saat perintah gagal tidak disalahartikan sebagai hasil sukses.
- **Sinkronisasi Konkurensi Penyimpanan Aset (BUG-08):**
  - Menambahkan `write_lock` pada `fs_save_asset` di `fs.rs` untuk mencegah race condition (TOCTOU) saat penentuan nama berkas unik dan operasi penyalinan aset berlangsung bersamaan.
- **Pencegahan Potensi Deadlock Sesi Vault (BUG-09):**
  - Memperbaiki alur `vault_get_current` di `vault.rs` dengan menyelesaikan iterasi dan seleksi path vault sebelum membuka session baru, mencegah potensi konflik penguncian resource (*lock contention*).
- **Normalisasi Path Multi-Platform (BUG-11):**
  - Menyesuaikan penanganan separator path di `normalize_path_str` agar transformasi separator hanya berjalan di Windows (`#[cfg(windows)]`) dan menjaga keutuhan nama berkas di platform non-Windows.
- **Peringatan Encoding Berkas Non-UTF8 (BUG-12):**
  - Menambahkan pengecekan encoding eksplisit pada `fs_import_external` di `fs.rs` dengan pencatatan peringatan ke console developer saat mengimpor berkas teks dengan encoding bukan UTF-8 murni.
- **Proteksi Batas Ukuran Berkas JSON Konfigurasi (BUG-13):**
  - Mengaktifkan batas keamanan `MAX_JSON_BYTES` (1 MiB) di `store.rs` untuk pemuatan berkas pengaturan, workspace, dan konfigurasi vault guna mencegah konsumsi memori berlebih (OOM) dari berkas yang korup.
- **Validasi Path Component-Aware (BUG-14):**
  - Mengganti pencocokan awalan path string biasa dengan perbandingan berbasis segmen komponen path (`Path::components()`) di `paths.rs` untuk mencegah lolosnya akses path semu di luar root vault (contoh: folder `C:\foobar` tidak dianggap berada di dalam `C:\foo`).
- **Normalisasi Path UNC pada File Watcher (BUG-15):**
  - Membersihkan prefix verbatim Windows (`\\?\`) pada path event sebelum filter folder `.kensidian` agar event perubahan berkas konsisten terdeteksi di berbagai driver filesystem.

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
