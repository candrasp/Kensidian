# TODO — Distribusi & Instalasi Terminal

Daftar tugas untuk menyediakan instalasi **Kensidian** melalui package manager terminal di Windows, macOS, dan Linux setelah rilis GitHub (`candrasp/kensidian`) diterbitkan.

---

## 1. Windows

Artefak dari `windows-latest` (`release.yml`): `.msi` dan NSIS `-setup.exe`.

### A. WinGet (`winget install CandraSP.Kensidian`)
- [ ] Pastikan minimal satu rilis publik sudah terbit di GitHub Releases dengan installer `.msi` atau `-setup.exe`.
- [ ] Pasang `wingetcreate` (`winget install Microsoft.WingetCreate`).
- [ ] Generate manifest awal dari URL installer rilis GitHub:
  - `wingetcreate new https://github.com/candrasp/kensidian/releases/download/v<VERSI>/Kensidian_<VERSI>_x64_en-US.msi`
- [ ] Verifikasi metadata manifest (`PackageIdentifier: CandraSP.Kensidian`, `PackageName: Kensidian`, `License: GPL-3.0`, `Publisher: CandraSP`, `InstallerType: wix` / `nsis`) dan validasi lokal dengan `winget validate --manifest <folder-manifest>`.
- [ ] Submit Pull Request pertama ke repositori `microsoft/winget-pkgs` hingga lolos validasi bot & di-merge.
- [ ] Tambahkan otomatisasi PR manifest pada setiap rilis di `.github/workflows/release.yml` menggunakan `vedantmgoyal9/winget-releaser` (butuh `WINGET_TOKEN` di GitHub Secrets).

### B. Code Signing Windows (Disarankan)
- [ ] Evaluasi sertifikat Authenticode (mis. SignPath Foundation untuk open-source atau Azure Trusted Signing) agar installer dari WinGet tidak memicu peringatan Windows Defender SmartScreen.

---

## 2. macOS

Artefak dari `macos-latest` (`release.yml`): `--target universal-apple-darwin` (`.dmg` dan `.app.tar.gz`).

### A. Homebrew Cask (`brew tap candrasp/tap && brew install --cask kensidian`)
- [ ] Buat repo GitHub `candrasp/homebrew-tap` dengan folder `Casks/`.
- [ ] Buat file `Casks/kensidian.rb`:
  - `version` dan `sha256` dari file `.dmg` universal (`universal-apple-darwin`).
  - `url "https://github.com/candrasp/kensidian/releases/download/v#{version}/Kensidian_#{version}_universal.dmg"`
  - `app "Kensidian.app"`
  - `zap trash: ["~/Library/Application Support/app.kensidian.desktop", "~/Library/Caches/app.kensidian.desktop", "~/Library/Preferences/app.kensidian.desktop.plist"]`
- [ ] Jalankan validasi formula/cask (`brew audit --cask candrasp/tap/kensidian` dan `brew style --fix`).
- [ ] Tambahkan step auto-update `Casks/kensidian.rb` di `.github/workflows/release.yml` saat tag baru terbit (pakai GitHub Action bump cask / script commit ke `homebrew-tap`).
- [ ] (Opsional jangka panjang) Daftarkan ke `homebrew/homebrew-cask` resmi setelah memenuhi syarat minimal *notability* (stars/forks/unduhan) dan app sudah di-sign/notarize.

### B. Apple Code Signing & Notarization (Penting di macOS)
- [ ] Jika belum memiliki Apple Developer ID ($99/tahun), tambahkan catatan di `README.md` dan cask `caveats` untuk mengatasi Gatekeeper (*"Kensidian is damaged / unidentified developer"*): `xattr -cr /Applications/Kensidian.app`.
- [ ] Jika sudah memiliki Apple Developer ID, tambahkan secret `APPLE_CERTIFICATE`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` di `.github/workflows/release.yml` untuk notarization otomatis.

---

## 3. Linux

Artefak dari `ubuntu-22.04` (`release.yml`): `.deb` dan `.AppImage` (fokus pada distro desktop terbanyak & paling mudah dirawat).

### A. Ubuntu / Debian (`.deb`) & Universal (`AppImage`) — Tanpa Maintenance Tambahan
- [ ] Dokumentasikan perintah instalasi langsung dari GitHub Releases di `README.md`:
  - **Ubuntu / Debian / Mint (`apt`):** unduh `.deb` lalu `sudo apt install ./Kensidian_*.deb`
  - **Distro Lain / Universal (`AppImage`):** `chmod +x Kensidian_*.AppImage && ./Kensidian_*.AppImage` *(satu-satunya format Linux yang mendukung auto-update in-app Tauri)*

### B. Arch Linux — AUR (`yay -S kensidian-bin`) — Opsional
- [ ] Buat akun di `aur.archlinux.org` dan daftarkan SSH key.
- [ ] Buat `PKGBUILD` (`kensidian-bin`) yang mengambil `.deb` atau `.AppImage` dari GitHub Releases.
- [ ] Generate `.SRCINFO` (`makepkg --printsrcinfo > .SRCINFO`), uji dengan `namcap`, lalu push ke repo AUR `kensidian-bin`.
- [ ] (Opsional) Otomatiskan pembaruan `PKGBUILD` & `.SRCINFO` via GitHub Actions setiap rilis baru.

---

## 4. Sinkronisasi dengan Tauri Auto-Updater (`latest.json`) & Dokumentasi
- [ ] Pastikan satu sumber versi SemVer (`package.json`, `tauri.conf.json`, `Cargo.toml`, tag `vX.Y.Z`, `latest.json`, dan seluruh manifest package manager).
- [ ] Jalankan job bump manifest (`winget`, `homebrew-tap`, `AUR`) di `.github/workflows/release.yml` hanya **setelah** `publish-release` (`draft=false`) selesai agar URL & `latest.json` sudah publik.
- [ ] Di Linux, pastikan UI / `useUpdater.ts` menangani perbedaan `.AppImage` (mendukung auto-update *in-app*) vs `.deb` / `AUR` (arahkan update via package manager sistem atau halaman Releases).
- [ ] Perbarui bagian **Instalasi** di `README.md` dengan daftar perintah terminal untuk Windows (`winget`), macOS (`brew`), dan Linux (`apt`, `AppImage`, `yay`).
- [ ] Pastikan skema penamaan file installer hasil `tauri-action` di GitHub Releases selalu konsisten di setiap tag versi baru agar skrip auto-update WinGet, Homebrew, dan AUR tidak rusak.
