# Changelog

Semua perubahan penting pada aplikasi Kensidian akan dicatat di file ini.

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
