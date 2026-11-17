# Changelog

Semua perubahan penting pada aplikasi Kensidian akan dicatat di file ini.

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
