# BACKEND.md — Spesifikasi Backend Kensidian (Rust / Tauri 2)

Dokumen ini adalah **satu-satunya sumber kebenaran backend**. Bahasa dokumen: **Indonesia**. Kode dan nama identifier: **Inggris**. Pasangannya adalah `FRONTEND.md` (UI dan perilaku layar).

## 0. Cara Memakai Dokumen

1. Kontrak IPC di **§12 identik** dengan `FRONTEND.md` §12. Bagian itu disalin dari `FRONTEND.md`; bila berubah, ubah di `FRONTEND.md` lalu salin ulang di perubahan yang sama.
2. Prioritas bila konflik: **perintah user saat ini → §12 → bagian lain dokumen ini → `FRONTEND.md`** (untuk perilaku UI saja).
3. **WAJIB** dan **DILARANG** mengikat. **Target** adalah angka yang harus diukur (§14).
4. Aturan perilaku agent (tidak menjalankan perintah tanpa diminta, tidak mengarang API, melapor jujur) mengikuti `GEMINI.md`. Karena `GEMINI.md` ditulis untuk Vue/TypeScript, padanan untuk Rust ada di **§13**.
5. Dokumen ini hanya menyebut nama fungsi crate yang sudah diperiksa pada sumber crate (14 Nov 2026). Untuk API lain: **baca definisinya dulu, jangan menebak**.
6. Versi crate dikunci persis (§2). Mengubahnya hanya atas permintaan user.

---

## 1. Ringkasan dan Prinsip (WAJIB)

Backend adalah proses Rust di dalam aplikasi Tauri. Ia melayani frontend lewat IPC, memantau folder vault, membangun indeks pencarian, dan mencadangkan vault ke Cloudflare R2 atas perintah user.

1. **Backend satu-satunya yang menyentuh disk dan jaringan.** Frontend tidak memakai `plugin-fs`, tidak memakai `fetch` ke R2, dan tidak menyimpan secret.
2. **Semua path dari frontend relatif terhadap root vault** dan divalidasi ketat (§6). Path yang keluar dari vault ditolak.
3. **Tidak boleh kehilangan data pengguna.** Penulisan atomik, penulisan kondisional (`expectedMtime`), hapus ke tempat sampah secara default, dan tidak ada operasi destruktif diam-diam.
4. **Isi catatan tidak tepercaya** (bisa ditulis agent). Backend memperlakukan isi hanya sebagai teks; tidak pernah mengeksekusi, mengevaluasi, atau meneruskannya ke shell.
5. **Hemat RAM** (alasan proyek ini ada, lihat `FRONTEND.md` §14): tanpa polling, tanpa timer saat idle, stream untuk file besar, cache SQLite kecil.
6. **Cadangan R2 satu arah dan manual.** Tidak ada sinkron otomatis dalam kondisi apa pun (§11).
7. **Tanpa race condition yang bisa dihindari.** Satu kunci tulis per vault, satu penulis indeks, dan penentuan `origin` berdasarkan sidik jari isi (§8, §9).
8. Tanpa `unsafe`, tanpa `unwrap()`/`expect()` di kode non-test (§13).

---

## 2. Tech Stack (WAJIB, versi dikunci)

Versi stabil terbaru di crates.io per **14 Nov 2026**, dikunci dengan `=` di `Cargo.toml`. `Cargo.lock` **wajib** di-commit.

| Kebutuhan | Crate | Versi | Catatan |
|---|---|---|---|
| Shell desktop | `tauri` | `2.12.5` | fitur `protocol-asset` (untuk `assetProtocol`, `FRONTEND.md` §3.3) |
| Build | `tauri-build` | `2.7.4` | build-dependency. Bila `cargo check` menolak pasangannya dengan `tauri`, ikuti pasangan yang dipakai template `create-tauri-app` |
| Plugin | `tauri-plugin-opener` | `2.7.3` | dipakai dari Rust untuk `reveal_item_in_dir` |
| Plugin | `tauri-plugin-dialog` | `2.8.4` | dipakai frontend untuk memilih folder |
| Serialisasi | `serde` (fitur `derive`), `serde_json` | `1.0.229`, `1.0.154` | |
| Error | `thiserror` | `2.0.21` | |
| Async dan IO | `tokio` (fitur `rt`, `fs`, `io-util`, `sync`, `time`) | `1.54.1` | **bukan** fitur `full` |
| Stream | `tokio-util` (fitur `io`) | `0.7.20` | `ReaderStream`, `CancellationToken` |
| Pemantau file | `notify`, `notify-debouncer-full` | `8.2.2`, `0.7.0` | debouncer-full bergantung pada `notify` 8.2 |
| Indeks | `rusqlite` (fitur `bundled`) | `0.42.0` | FTS5 aktif pada build bundled (`libsqlite3-sys` 0.40.0 membangun dengan `-DSQLITE_ENABLE_FTS5`) |
| Tempat sampah | `trash` | `5.3.0` | `trash::delete(path)` |
| Unicode | `unicode-normalization` | `0.1.26` | NFC |
| Telusur folder | `walkdir` | `2.5.0` | |
| Hash | `sha2` | `0.11.1` | SHA-256 untuk manifest sinkron |
| Kredensial | `keyring` | `4.2.0` | fitur bawaan `v1` (Windows Credential Manager, macOS Keychain, Secret Service di Linux) |
| HTTP | `reqwest` | `0.13.5` | `default-features = false`, fitur `native-tls`, `stream`, `system-proxy` |
| Penanda tangan S3 | `rusty-s3` | `0.11.0` | `default-features = false`, fitur `rustcrypto`; hanya membuat URL bertanda tangan, tanpa HTTP |
| URL | `url` | `2.5.8` | tipe `Url` untuk `rusty-s3` |
| Dev | `tempfile` | `3.27.0` | dev-dependency untuk pengujian (§16) |

Alasan pemilihan:
- **R2 lewat `rusty-s3` + `reqwest`**, bukan `aws-sdk-s3`: SDK AWS sangat berat dikompilasi dan menambah ukuran biner. R2 kompatibel S3, dan kebutuhan kita hanya `PutObject`.
- **`reqwest` dengan `native-tls`**: fitur `rustls` bawaan `reqwest` 0.13 memakai `aws-lc-rs` (pembangunan C yang berat). `native-tls` memakai SChannel di Windows (platform utama). Di Linux butuh paket pengembangan OpenSSL.
- **`rusqlite` `bundled`**: SQLite dibangun bersama aplikasi, sehingga versi dan FTS5 pasti konsisten di semua OS. Butuh compiler C (MSVC Build Tools sudah wajib untuk Tauri).

Status verifikasi: ketersediaan versi dan nama API sudah dicek pada sumber crate. **Kombinasi fitur belum dikompilasi**; Fase B0 wajib menjalankan `cargo check` dan melaporkan hasilnya (§17).

**DILARANG**: `aws-sdk-*`, `tauri-plugin-fs`, `tauri-plugin-http`, `tokio` fitur `full`, `anyhow`, `chrono`/`time` (pakai `std::time`), `once_cell`/`lazy_static` (pakai `std::sync::OnceLock`), `parking_lot` (pakai `std::sync`), `rayon`, `regex` (pemindai tulisan tangan di `links.rs`), `async-trait`, pustaka logging (v1), dan menambah crate tanpa bertanya ke user.

---

## 3. Setup Proyek dan Konfigurasi

### 3.1 `src-tauri/Cargo.toml` (bagian dependensi, WAJIB)
```toml
[dependencies]
tauri = { version = "=2.12.5", features = ["protocol-asset"] }
tauri-plugin-opener = "=2.7.3"
tauri-plugin-dialog = "=2.8.4"
serde = { version = "=1.0.229", features = ["derive"] }
serde_json = "=1.0.154"
thiserror = "=2.0.21"
tokio = { version = "=1.54.1", default-features = false, features = ["rt", "fs", "io-util", "sync", "time"] }
tokio-util = { version = "=0.7.20", features = ["io"] }
notify = "=8.2.2"
notify-debouncer-full = "=0.7.0"
rusqlite = { version = "=0.42.0", features = ["bundled"] }
trash = "=5.3.0"
unicode-normalization = "=0.1.26"
walkdir = "=2.5.0"
sha2 = "=0.11.1"
keyring = "=4.2.0"
reqwest = { version = "=0.13.5", default-features = false, features = ["native-tls", "stream", "system-proxy"] }
rusty-s3 = { version = "=0.11.0", default-features = false, features = ["rustcrypto"] }
url = "=2.5.8"

[build-dependencies]
tauri-build = "=2.7.4"

[dev-dependencies]
tempfile = "=3.27.0"

[profile.release]
opt-level = "s"
lto = "thin"
strip = true
```
Catatan: `lto = "thin"` dipilih agar build rilis tetap wajar di mesin dengan RAM terbatas.

### 3.2 Bootstrap (`lib.rs`)
Urutan di `run()`:
1. `tauri::Builder::default()`, pasang plugin `opener` dan `dialog`.
2. `manage(AppState::new())`; `setup` menyiapkan `AppDirs` (`app_data_dir()`, dibuat bila belum ada).
3. `invoke_handler(generate_handler![...])` berisi **semua** command §12.3 (tidak lebih).
4. Saat aplikasi keluar (`RunEvent::Exit`): jalankan logika `vault_close` secara best-effort (hentikan watcher, batalkan sinkron, checkpoint WAL).
5. Tidak ada logika bisnis di `lib.rs`.

### 3.3 Izin dan CSP
- Backend **tidak** mendefinisikan `AppManifest`; command aplikasi dapat dipanggil dari jendela utama.
- `capabilities/default.json` mengikuti `FRONTEND.md` §3.4. Izin untuk frontend hanya `opener` (buka URL) dan `dialog` (pilih folder). **Tidak ada** izin `fs:*` atau `http:*`.
- CSP mengikuti `FRONTEND.md` §3.3 dan **tidak berubah** untuk fitur R2, karena R2 hanya dihubungi dari Rust.
- `vault_open` mengatur `asset_protocol_scope()` (§7.1).

---

## 4. Struktur Modul dan State

```
src-tauri/
  build.rs  Cargo.toml  tauri.conf.json  capabilities/default.json
  src/
    main.rs              # hanya memanggil lib::run()
    lib.rs               # builder, plugin, state, invoke_handler
    constants.rs         # semua konstanta (§13)
    error.rs             # IpcErrorCode, IpcError, AppError, From<io::Error>
    models.rs            # tipe §12.2 (serde)
    state.rs             # AppState, VaultSession
    commands/            # tipis: validasi argumen → panggil modul → petakan error
      mod.rs  vault.rs  fs.rs  note.rs  search.rs  backlinks.rs  store.rs  sync.rs
    vault/               # path, nama, kunci tulis, cache catatan, config ikon
      mod.rs  paths.rs  names.rs  lock.rs  self_writes.rs  notes_cache.rs  config.rs
    storage/             # penyimpanan lokal di luar vault
      mod.rs  atomic.rs  app_dirs.rs  recent.rs  json_store.rs
    watcher/
      mod.rs  normalize.rs  classify.rs  reconcile.rs
    index/
      mod.rs  db.rs  schema.rs  scan.rs  apply.rs  query.rs  links.rs  resolve.rs  snippet.rs
    sync/
      mod.rs  config.rs  credentials.rs  plan.rs  manifest.rs  upload.rs  run.rs
```

Aturan:
- `commands/*` hanya memvalidasi dan memetakan. Logika ada di modul.
- Satu file satu tanggung jawab; batas ukuran di §13.

### 4.1 State
```rust
struct AppState {
    dirs: AppDirs,                                   // app_data_dir
    session: RwLock<Option<Arc<VaultSession>>>,      // std::sync::RwLock
}
struct VaultSession {
    info: VaultInfo,
    root: PathBuf,                                   // path dari user
    canonical_root: PathBuf,                         // hasil canonicalize saat open
    write_lock: Mutex<()>,                           // satu kunci tulis (§8.4)
    self_writes: Mutex<SelfWrites>,                  // §8.4
    cache: RwLock<NotesCache>,                       // catatan + folder yang diketahui (§9)
    index: IndexHandle,                              // kanal ke thread indexer + koneksi baca (§10)
    watcher: WatcherHandle,                          // §9
    sync: SyncManager,                               // §11
}
```
- Command mengambil `Arc<VaultSession>` di awal (`NOT_FOUND`, pesan "vault is not open", bila tidak ada) dan memakainya sampai selesai. Jadi mengganti vault di tengah command aman: command lama tetap memakai sesi lamanya.
- Setiap command yang menyentuh disk atau SQLite: `async fn` yang membungkus kerja blocking dengan `tauri::async_runtime::spawn_blocking`.
- Mutex **tidak pernah** ditahan melewati `.await`. Urutan kunci bila perlu lebih dari satu: `write_lock` → `self_writes` → `cache`. Mutex yang ter-poison dipulihkan lewat helper `lock()` (bukan `unwrap`).

---

## 5. Error dan Pemetaan Tipe

### 5.1 Error
```rust
#[derive(Serialize)] #[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum IpcErrorCode { NotFound, Conflict, Exists, Denied, TooLarge, InvalidName, Io,
                    SyncNotConfigured, SyncAuth, SyncNetwork, SyncBusy }
#[derive(Serialize)]
struct IpcError { code: IpcErrorCode, message: String }
```
- `AppError` (thiserror) punya `code()`; seluruh command mengembalikan `Result<T, IpcError>`.
- `From<io::Error>`: `NotFound → NOT_FOUND`, `PermissionDenied → DENIED`, `AlreadyExists → EXISTS`, lainnya → `IO`.
- `message`: Inggris, singkat, untuk debugging. **Tidak boleh** memuat path absolut, secret, atau URL bertanda tangan. UI memakai pemetaan kode di `FRONTEND.md` §15.2.

### 5.2 Serde
- Struct IPC: `#[serde(rename_all = "camelCase")]`.
- Enum string: `FileEntry.kind` dan `VaultEvent.kind`/`origin` → `lowercase`; `SyncProgress.phase` dan `SyncResult.status` → `lowercase`; `SyncIssue.kind` → `snake_case`.
- `mtime` dan sejenisnya: `i64` milidetik epoch. `size`: `u64` (aman di bawah 2^53 untuk JS).
- `Settings` dan `Workspace` diperlakukan **tak tembus** (`serde_json::Value`); backend tidak mengubah, menambah, atau menghapus field (§7.3).

---

## 6. Path dan Validasi Nama (`vault/paths.rs`, `vault/names.rs`)

### 6.1 Aturan path relatif (WAJIB)
Fungsi `validate_rel(&str) -> Result<RelPath, AppError>` dijalankan di **setiap** command sebelum menyentuh disk. Root vault = string kosong `''`.

1. Normalisasi ke **NFC** dulu, baru divalidasi.
2. Pemisah hanya `/`. Tolak `\`, awalan `/`, akhiran `/`, `//`, huruf kontrol (termasuk NUL), dan komponen kosong, `.`, atau `..` → `INVALID_NAME`.
3. Tolak komponen yang **diawali `.`** (item tersembunyi dan `.kensidian` dicadangkan) → `INVALID_NAME`.
4. Tolak karakter `< > : " | ? *` di komponen mana pun, nama perangkat Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`, tanpa memandang huruf besar-kecil dan dengan atau tanpa ekstensi), serta komponen yang berakhir `.` atau spasi. Aturan ini berlaku di **semua OS** agar vault portabel dan sama dengan validator frontend.
5. Panjang komponen ≤ `NAME_MAX_CHARS` (255), total ≤ `PATH_MAX_CHARS` (1024).
6. Catatan = file berekstensi `.md` (tanpa memandang huruf besar-kecil). Backend selalu membuat `.md` huruf kecil. Operasi pada file (`note_*`) yang path-nya tidak berakhir `.md` → `INVALID_NAME`.

### 6.2 Resolusi aman ke path absolut
`resolve(session, rel) -> PathBuf`:
1. Gabungkan `canonical_root` dengan `rel`.
2. Bila path ada: `canonicalize`, lalu pastikan `starts_with(canonical_root)`; bila tidak → `DENIED`.
3. Bila path belum ada (membuat file/folder): `canonicalize` **leluhur terdekat yang ada**, pastikan `starts_with(canonical_root)`, lalu tempelkan sisa komponen.
4. Item yang berupa symlink atau reparse point (Windows: atribut `FILE_ATTRIBUTE_REPARSE_POINT` lewat `std::os::windows::fs::MetadataExt`) **dilewati** pada listing, pemindaian, dan sinkron; operasi langsung pada item seperti itu → `DENIED`.

### 6.3 Path absolut → relatif
Untuk event watcher: `strip_prefix(canonical_root)`, gabungkan komponen dengan `/`, NFC. Watcher didaftarkan pada `canonical_root` agar awalan path konsisten.

---

## 7. Vault dan Penyimpanan Lokal

### 7.1 Siklus hidup vault
`vault_open(path)` (urutan WAJIB):
1. Validasi: path absolut, ada, direktori → `NOT_FOUND`/`DENIED`.
2. Tutup sesi lama bila ada (batalkan sinkron, hentikan watcher, tutup indexer, checkpoint WAL, `forbid_directory` pada scope aset lama).
3. Buat `.kensidian/` bila belum ada; hapus sisa file sementara `.*.kensidian-*.tmp` yang lebih tua dari 10 menit.
4. Atur scope aset: `app.asset_protocol_scope().allow_directory(root, true)` lalu `forbid_directory(root/.kensidian, true)`.
5. **Mulai watcher dahulu** (§9), lalu pindai vault (telusur + `stat`, tanpa membaca isi) untuk membangun `NotesCache` (catatan dan folder). Karena pemrosesan event idempoten, tidak ada perubahan yang terlewat di antara keduanya.
6. Buka `index.db` dan kirim job `FullScan` ke thread indexer (latar belakang, §10).
7. Catat ke daftar vault terbaru (§7.2), simpan sesi, kembalikan `VaultInfo`. `vault_open` **tidak** menunggu indeks selesai.

`vault_create(parentPath, name)`: validasi `name` (aturan §6.1 butir 2–5, tanpa awalan `.`) → `INVALID_NAME`; buat folder dengan `create_dir` (`EXISTS` bila sudah ada); lalu jalankan `vault_open` untuk path itu.

`vault_close`: sama dengan langkah 2, lalu hapus sesi.

`VaultInfo.name` = komponen terakhir path.

### 7.2 Lokasi data aplikasi (`app_data_dir()`)
| File | Isi |
|---|---|
| `settings.json` | `Settings` (global, tak tembus) |
| `recent.json` | `VaultInfo[]` (path absolut), maks `RECENT_VAULTS_MAX` (10), terbaru dulu |

- `vault_list_recent` mengembalikan isi `recent.json` apa adanya (tanpa menyaring yang sudah tidak ada).
- `vault_get_current` mengembalikan entri pertama yang direktorinya **masih ada**, selain itu `null`. Perintah ini **tidak** membuka vault.
- Saat vault dibuka: pindahkan ke depan, hapus duplikat berdasarkan path (di Windows tanpa memandang huruf besar-kecil), potong sampai 10.

### 7.3 Berkas di dalam `.kensidian/`
| File | Isi | Ditulis oleh |
|---|---|---|
| `config.json` | `{ "version": 1, "itemStyles": { path: ItemStyle } }` | `item_style_set` (di bawah kunci tulis) |
| `workspace.json` | `Workspace` (tak tembus) | `workspace_save` (di bawah kunci tulis) |
| `sync.json` | `{ "version": 1, "endpoint", "bucket", "prefix" }` | `sync_config_save` (di bawah kunci tulis) |
| `sync-manifest.json` | manifest sinkron (§11.8) | hanya tugas sinkron |
| `index.db` (+ `-wal`, `-shm`) | indeks SQLite | hanya thread indexer |

Aturan penyimpanan JSON (`storage/json_store.rs`), berlaku untuk `settings_load`/`settings_save` dan `workspace_load`/`workspace_save`:
- Semua tulisan **atomik** (§8.2).
- `settings_save`/`workspace_save` menerima `serde_json::Value` objek JSON; ukuran maksimum `MAX_JSON_BYTES` (1 MiB) → `TOO_LARGE`.
- `*_load`: file tidak ada → `null`. JSON rusak → ganti nama menjadi `{nama}.corrupt-{epochMs}.json`, kembalikan `null` (frontend memakai nilai bawaan). Simpan maksimal 3 file `corrupt`, hapus yang lebih lama.
- `vault_config_load` bila `config.json` tidak ada atau rusak → `{ itemStyles: {} }` (yang rusak diganti nama seperti di atas).

### 7.4 `item_style_set(path, style)`
- Dijalankan di bawah kunci tulis.
- `style = null`: hapus key `path` (tanpa cek keberadaan, agar key usang bisa dibersihkan).
- `style != null`: `path` harus `''` atau path yang ada (`NOT_FOUND` bila tidak). `icon.set` ∈ {`lucide`, `fa-brands`}; `icon.name` cocok `^[a-z0-9-]{1,64}$`; `color` salah satu dari 9 nilai `IconColor`. Selain itu → `INVALID_NAME`.
- Migrasi key (dalam kunci yang sama dengan operasi file): `fs_rename(from, to)`: key `from` → `to`, key berawalan `from/` → `to/` + sisanya. `fs_delete(path)`: hapus key `path` dan semua yang berawalan `path/`.
- Rename atau hapus dari luar aplikasi tidak memigrasikan key; key usang tidak berbahaya dan dibersihkan lewat `item_style_set(path, null)`.

---

## 8. Operasi File dan Penulisan

### 8.1 Pola umum command
1. Ambil sesi (§4.1). 2. `validate_rel` semua path (§6). 3. Operasi tulis: ambil `write_lock`. 4. Kerjakan di `spawn_blocking`. 5. Petakan error (§5).

### 8.2 Penulisan atomik (`storage/atomic.rs`)
`atomic_write(target, bytes, precheck)`:
1. Buat file sementara di **folder yang sama**: `.{nama}.kensidian-{pid}-{counter}.tmp` (diawali `.`, jadi diabaikan watcher dan listing).
2. Tulis seluruh byte, `sync_all()`.
3. Jalankan `precheck` (mis. pengecekan mtime, §8.3) — gagal → hapus file sementara, kembalikan error.
4. `std::fs::rename(temp, target)` (menggantikan target; di Windows `rename` Rust menimpa file yang ada).
5. Bila langkah mana pun gagal → hapus file sementara; target **tidak berubah**.
6. Windows: `rename` bisa gagal sesaat karena antivirus atau pengindeks (`PermissionDenied`/sharing violation). Ulangi hingga 3 kali dengan jeda 20, 50, 100 ms sebelum menyerah (`DENIED` atau `IO`).

### 8.3 Perilaku per command
| Command | Perilaku |
|---|---|
| `fs_list_dir(path)` | `read_dir`; kembalikan folder dan file `.md` (bukan symlink, tidak diawali `.`); `mtime`/`size` dari `metadata` (folder: `size = 0`). Bukan direktori atau tidak ada → `NOT_FOUND`. Nama dikembalikan apa adanya dari disk |
| `vault_list_notes` | dari `NotesCache` (tanpa membaca disk) → `NoteRef[]` |
| `note_read(path)` | `metadata`: `size > MAX_NOTE_BYTES` (10 MiB) → `TOO_LARGE` sebelum membaca; baca byte, UTF-8 tidak valid → `IO`; BOM UTF-8 di awal dibuang. Isi **tidak** dinormalisasi (CRLF tetap) |
| `note_write(path, content, expectedMtime)` | di bawah kunci: file harus ada (`NOT_FOUND`; "Simpan ulang" memakai `note_create`); `content > 10 MiB` → `TOO_LARGE`; daftarkan sidik jari ke `self_writes` (§8.4); `atomic_write` dengan `precheck` = baca mtime file asli tepat sebelum rename dan bandingkan dengan `expectedMtime` (milidetik) → beda = `CONFLICT`; kembalikan `{ mtime }` hasil `stat` file akhir. Byte ditulis persis seperti diterima |
| `note_create(path, content?)` | di bawah kunci: `EXISTS` bila ada; buat folder induk (`create_dir_all`, tiap komponen sudah tervalidasi); `atomic_write`; daftarkan sidik jari dan token `create`; kembalikan `{ mtime }` |
| `fs_create_folder(path)` | di bawah kunci: `EXISTS` bila ada; `create_dir_all`; token `create` |
| `fs_rename(from, to)` | di bawah kunci: `from` harus ada; `to` tidak boleh ada (`EXISTS`), **kecuali** perbedaan hanya huruf besar-kecil pada entri yang sama. Catatan harus tetap `.md`. Memindahkan folder ke dalam turunannya sendiri → `INVALID_NAME`. `std::fs::rename`; token `rename`; migrasi key ikon (§7.4); cache dan indeks diperbarui lewat event watcher (§9), bukan oleh command |
| `fs_delete(path, toTrash)` | di bawah kunci: root (`''`) atau `.kensidian` → `DENIED`. `toTrash = true`: `trash::delete`; **bila gagal → `IO`, tidak pernah jatuh ke hapus permanen diam-diam**. `toTrash = false`: `remove_file`/`remove_dir_all`. Token `delete`; hapus key ikon |
| `reveal_in_file_manager(path)` | `resolve` lalu `tauri_plugin_opener::reveal_item_in_dir`; tidak ada → `NOT_FOUND` |

### 8.4 Kunci tulis dan `self_writes` (inti anti-race)
- `write_lock` adalah satu `Mutex<()>` per sesi. Semua command tulis (§12.6 butir 1) menahannya selama seluruh operasi; command baca tidak.
- `SelfWrites`:
  ```rust
  struct Fingerprint { size: u64, hash: u64 }            // hash isi: std::hash::DefaultHasher
  struct SelfWrites {
      files: HashMap<String, (Fingerprint, Instant)>,    // path → sidik jari tulisan kita
      ops: Vec<(OpKind, String, Option<String>, Instant)>, // token create/rename/delete sekali pakai
  }
  ```
- **Urutan WAJIB di dalam kunci**: (1) hitung sidik jari konten, (2) daftarkan ke `files`/`ops`, (3) baru `rename`/operasi disk. Dengan begitu watcher tidak pernah melihat event sebelum catatan terdaftar.
- TTL `SELF_WRITE_TTL_MS` = 5000. Entri kedaluwarsa dibuang setiap kali menambah entri dan setiap watcher melepas batch.
- Penggunaan oleh watcher: §9.5.

---

## 9. Watcher dan Event

### 9.1 Pipeline
`notify-debouncer-full` (timeout `WATCH_DEBOUNCE_MS` = 100 ms, rekursif pada `canonical_root`) → handler mengirim batch lewat `std::sync::mpsc` ke satu **thread pekerja event** → normalisasi → turunkan jenis event → klasifikasi `origin` → perbarui `NotesCache` → kirim job ke indexer → emit `vault:changed`.
Handler debouncer tidak boleh melakukan kerja berat (hanya meneruskan).

### 9.2 Normalisasi dan filter
Event dibuang bila path: berada di dalam atau sama dengan `.kensidian`, memiliki komponen berawalan `.`, atau (untuk file) bukan `.md`. Path diubah menjadi relatif NFC (§6.3). File sementara `.*.tmp` sudah tersaring oleh aturan `.`.

### 9.3 Menurunkan jenis event (cache sebagai kebenaran)
Jenis dari `notify` hanya petunjuk **path mana yang tersentuh**. Jenis akhir ditentukan dari `NotesCache` dan keadaan disk saat ini (`symlink_metadata`):

| Ada di disk | Ada di cache | Hasil |
|---|---|---|
| ya | tidak | `create` |
| ya | ya | `modify` (hanya file; `modify` pada folder dibuang) |
| tidak | ya | `delete` |
| tidak | tidak | dibuang |

- **Rename**: pasangan `from → to` dari debouncer (`RenameMode::Both`). Bila `from` ada di cache dan `to` ada di disk dan belum di cache → event `rename` (satu event untuk folder) dan cache diperbarui (untuk folder: semua key turunan berpindah awalan). Pasangan tidak lengkap diperlakukan sebagai `delete` + `create`.
- **Folder baru dari luar** (mis. salinan folder berisi file): saat `create` folder, pindai subpohonnya, tambahkan semua catatan dan folder ke cache, dan emit `create` untuk folder serta tiap catatan di dalamnya.
- **Folder dihapus**: satu event `delete` untuk folder; semua key turunan dibuang dari cache.

### 9.4 Emit
Batch dikirim sebagai `vault:changed` dengan `VaultEvent[]`, dipecah per `EVENT_CHUNK_SIZE` (500) event. Setiap batch urutannya konsisten dengan urutan pemrosesan. Cache dan indexer diperbarui **sebelum** emit.

### 9.5 Klasifikasi `origin` (race-free)
Dilakukan saat batch dilepas (bukan saat event mentah datang):
1. `create`/`modify` pada file `P`: bila `self_writes.files[P]` ada dan belum kedaluwarsa, hitung sidik jari file **saat ini**; **sama** → `self` (entri dihapus); **beda atau tidak ada entri** → `external`.
2. `create`/`delete`/`rename` (file atau folder) yang punya token `(jenis, path[, to])` belum kedaluwarsa → `self` (token dikonsumsi **sekali**); selain itu `external`.
3. Konsekuensi: tulisan luar yang menyusul tulisan aplikasi (isi beda) tidak pernah salah ditandai `self`. Tulisan luar dengan isi identik dianggap `self` (tidak berbahaya: isinya sama).

### 9.6 Status dan pemulihan
- `vault:watching` = `true` setelah watcher aktif.
- Error watcher atau overflow: emit `vault:watching = false`, jalankan **reconcile** (`watcher/reconcile.rs`): pindai ulang vault, bandingkan dengan cache, hasilkan event `create`/`modify`/`delete` sintetis (`origin: external`; `modify` bila `mtime` atau `size` beda), lalu coba pasang ulang watcher; berhasil → `vault:watching = true`.
- Watcher dan pekerja berhenti saat sesi ditutup (drop).

---

## 10. Indeks, Pencarian, dan Backlink

### 10.1 Berkas dan versi
`.kensidian/index.db`, `PRAGMA user_version = 1`. Versi berbeda atau file rusak → hapus `index.db`, `-wal`, `-shm`, lalu bangun ulang. Indeks hanyalah cache.

### 10.2 Skema
```sql
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  name_lower TEXT NOT NULL,           -- nama tanpa .md, huruf kecil, NFC
  mtime INTEGER NOT NULL,
  size INTEGER NOT NULL,
  indexed INTEGER NOT NULL DEFAULT 0  -- 1 = isi sudah diindeks
);
CREATE INDEX notes_name ON notes(name_lower);

CREATE TABLE lines (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  line INTEGER NOT NULL,              -- 1-based, menghitung baris kosong
  text TEXT NOT NULL
);
CREATE INDEX lines_note ON lines(note_id);

CREATE VIRTUAL TABLE lines_fts USING fts5(
  text, content='lines', content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER lines_ai AFTER INSERT ON lines BEGIN
  INSERT INTO lines_fts(rowid, text) VALUES (new.id, new.text);
END;
CREATE TRIGGER lines_ad AFTER DELETE ON lines BEGIN
  INSERT INTO lines_fts(lines_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;

CREATE TABLE links (
  note_id INTEGER NOT NULL,
  line INTEGER NOT NULL,
  target_norm TEXT NOT NULL,
  target_name TEXT NOT NULL,
  context TEXT NOT NULL
);
CREATE INDEX links_target ON links(target_name);
CREATE INDEX links_note ON links(note_id);
```
- Tidak memakai foreign key atau `ON DELETE CASCADE`. Penghapusan **eksplisit** di dalam satu transaksi: `DELETE FROM lines WHERE note_id = ?` (memicu `lines_ad`), `DELETE FROM links WHERE note_id = ?`, lalu baris `notes`.
- Pencarian memakai tokenizer `unicode61`: cocok per kata dengan awalan, **tidak** mencocokkan potongan di tengah kata (mis. "ana" tidak menemukan "banana"). Ini batasan v1 (§18.2).

### 10.3 Koneksi dan pragma
- Dua koneksi: **penulis** (dimiliki thread indexer) dan **pembaca** (`Mutex<Connection>`, dipakai `search_query`/`backlinks_*` di `spawn_blocking`).
- Pragma: `journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-8192` (8 MiB), `mmap_size=0`, `busy_timeout=2000`. Saat sesi ditutup: `PRAGMA wal_checkpoint(TRUNCATE)`.

### 10.4 Thread indexer (satu-satunya penulis)
- Satu thread memblokir pada kanal `IndexJob`: `FullScan`, `Upsert(path)`, `Remove(path)`, `RemovePrefix(dir)`, `RenamePath{from,to}`, `RenamePrefix{from,to}`, `Shutdown`. Sumber job hanya: `vault_open` (`FullScan`) dan pemroses event watcher (§9). **Command tidak menulis indeks.**
- `FullScan`: bandingkan `NotesCache` dengan tabel `notes`. Catatan baru atau `(mtime, size)` berbeda → `Upsert`; baris tanpa pasangan di cache → hapus.
- `Upsert(path)`: `stat`; baca isi (lewati bila `size > INDEX_MAX_NOTE_BYTES` = 5 MiB: baris `notes` tetap ada dengan `indexed = 0`); satu transaksi: hapus `lines`/`links` lama, sisipkan baris baru, set `indexed = 1`.
- Baris yang diindeks: pecah di `\n` (buang `\r` akhir), lewati baris kosong atau hanya spasi, potong ke `INDEX_MAX_LINE_CHARS` (2000) karakter. Frontmatter ikut diindeks.
- `RenamePrefix`: `UPDATE notes SET path = ?to || substr(path, length(?from) + 1) WHERE substr(path, 1, length(?from) + 1) = ?from || '/'` (tanpa `LIKE`, karena `%` dan `_` valid di nama file). `name_lower` tidak berubah pada rename folder.
- Event `index:status`: `{ indexing: true }` saat antrean tidak kosong, `{ indexing: false }` setelah kosong (ditunda 150 ms agar tidak berkedip).

### 10.5 `search_query(query, caseSensitive, limit)`
1. `limit` dijepit ke 1..=`SEARCH_MAX_LIMIT` (500). Query kosong setelah `trim` → `[]`.
2. Tokenisasi: pecah di spasi Unicode; teks dalam tanda kutip ganda menjadi **satu frasa**. Maksimal `SEARCH_MAX_TERMS` (10) token; sisanya diabaikan.
3. Ekspresi FTS5: tiap token dibungkus `"..."` (tanda kutip di dalamnya digandakan); token **terakhir yang bukan frasa** ditambah `*` (awalan). Token digabung dengan spasi (AND implisit). Contoh: `foo bar` → `"foo" "bar"*`.
4. Pola kueri (harus lolos uji asap §16):
   ```sql
   SELECT n.path, l.line, l.text
   FROM lines_fts JOIN lines l ON l.id = lines_fts.rowid JOIN notes n ON n.id = l.note_id
   WHERE lines_fts MATCH ?1
   ORDER BY lines_fts.rank, n.path, l.line
   LIMIT ?2
   ```
5. `caseSensitive = true`: ambil `min(limit × 5, 2000)` baris, lalu buang yang barisnya tidak memuat **semua** token sebagai substring dengan huruf besar-kecil persis; potong ke `limit`.
6. Setiap hasil menjadi `SearchHit { path, name, line, snippet, ranges }`; `name` = nama file tanpa `.md`. Selama indeks belum selesai, hasil bisa belum lengkap (frontend diberi tahu lewat `index:status`).

### 10.6 Snippet dan `ranges` (`index/snippet.rs`)
- Kerjakan pada `Vec<char>` baris. Pencocokan tak peka huruf memakai `simple_lower(c)`: `c.to_lowercase()` bila hasilnya tepat satu karakter, selain itu `c` (menjaga indeks tetap sejajar).
- Rentang kecocokan = semua kemunculan tiap token (tanpa awalan khusus, substring biasa). Karena FTS mengabaikan diakritik, baris bisa cocok tanpa rentang (mis. `cafe` ↔ `café`): `ranges` kosong, tidak apa-apa.
- Bila panjang baris ≤ `SNIPPET_MAX_CHARS` (200) setelah `trim` → seluruh baris. Selain itu jendela 200 karakter yang memuat rentang pertama, dimulai 40 karakter sebelum rentang (dijepit), dengan `…` di awal/akhir yang terpotong.
- `ranges` adalah offset **UTF-16 code unit** (indeks string JavaScript) **di dalam `snippet` akhir**, termasuk `…` di awal, setengah terbuka `[mulai, akhir)`. Hitung dari awalan jumlah `char::len_utf16()`.

### 10.7 Ekstraksi tautan (`index/links.rs`)
Pemindai tulisan tangan per baris (tanpa `regex`):
1. Abaikan baris di dalam blok kode berpagar (baris yang diawali ≤ 3 spasi lalu ``` atau `~~~`, sampai penutup sejenis) dan teks di dalam kode inline (`` `...` ``).
2. Cari `[[ ... ]]` dalam satu baris, juga `![[ ... ]]` (embed dihitung sebagai tautan).
3. Isi tautan → target: potong di `|` pertama (alias), lalu di `#` pertama (heading/blok), `trim`. Kosong (mis. `[[#Judul]]`) → abaikan.
4. `target_norm` = NFC, ganti `\` dengan `/`, buang akhiran `.md` (tanpa memandang huruf besar-kecil), huruf kecil. `target_name` = segmen terakhir `target_norm`.
5. `context` = baris yang di-`trim`, dipotong 200 karakter dengan `…`.

### 10.8 Resolusi tautan dan backlink (`index/resolve.rs`)
Aturan resolusi sama dengan frontend: cocokkan nama (tanpa `.md`, tak peka huruf besar-kecil) atau path relatif.
1. **Kandidat** untuk tautan `L` dari sumber `S`: semua catatan `N` dengan `N.name_lower = L.target_name` dan (`L.target_norm` tidak mengandung `/`, **atau** path `N` tanpa `.md` huruf kecil sama dengan `L.target_norm`, **atau** berakhir dengan `/` + `L.target_norm`).
2. **Pilih**: kandidat yang foldernya sama dengan folder `S`; bila tidak ada, path terpendek (jumlah karakter); bila seri, urut leksikografis path.
3. `backlinks_get(P)`: ambil `links` dengan `target_name = nama_lower(P)`; untuk tiap tautan hitung resolusi dari sumbernya; simpan bila hasilnya `P` dan sumber ≠ `P` (tautan ke diri sendiri tidak dihitung). Satu `BacklinkRef` per kemunculan, urut path sumber lalu `line`. `P` tidak dikenal → `[]`.
4. `backlinks_count(P)`: jumlah **catatan sumber berbeda** dari hasil yang sama.

---

## 11. Cadangan Cloudflare R2

### 11.1 Cakupan v1
| Ya | Tidak (v1) |
|---|---|
| Unggah satu arah lokal → R2, **hanya saat user menekan tombol** | Sinkron otomatis, terjadwal, atau saat menutup aplikasi |
| Hanya mengunggah file baru atau yang berubah | Pemulihan (unduh) di dalam aplikasi |
| Melanjutkan setelah terputus (manifest) | Menghapus objek di R2 saat file dihapus atau diganti nama di lokal |
| Semua file non-tersembunyi (catatan, gambar, lampiran) + `.kensidian/config.json` | Unggah multi-bagian (file > 100 MiB dilewati) |
| Pembatalan kapan saja | Enkripsi di sisi klien |

Karena objek tidak pernah dihapus, file yang dihapus atau diganti nama di lokal tetap ada di R2 (aman sebagai cadangan, tetapi bucket bisa menyimpan salinan lama). Struktur kunci objek mencerminkan struktur vault, jadi pemulihan manual cukup menyalin balik dari dashboard R2 atau alat S3 seperti rclone.

### 11.2 Persiapan di sisi Cloudflare (dilakukan user, nama menu bisa berubah)
1. Buat bucket R2 (privat).
2. Buat API token R2 dengan izin **Object Read & Write**, dibatasi ke bucket itu.
3. Salin: endpoint S3 (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`), **Access Key ID**, dan **Secret Access Key** (hanya ditampilkan sekali).
4. Isi di Pengaturan > Cadangan (`FRONTEND.md` §7.15).

### 11.3 Konfigurasi dan kredensial
- **Non-rahasia** per vault di `.kensidian/sync.json`: `endpoint`, `bucket`, `prefix`.
  - `endpoint`: skema `https`, host berakhiran `.r2.cloudflarestorage.com`, tanpa path, query, atau kredensial di URL.
  - `bucket`: 3–63 karakter, huruf kecil, angka, dan `-`, tidak diawali/diakhiri `-`.
  - `prefix`: maks 200 karakter, tanpa awalan atau akhiran `/`, tanpa `..`, tanpa huruf kontrol; boleh kosong. Pelanggaran → `INVALID_NAME`.
- **Rahasia** global di keyring OS: satu entri (service `kensidian`, user `r2`) berisi JSON `{ "id", "secret" }`. `hasCredentials` = entri ada. Keyring tidak tersedia (mis. Linux tanpa Secret Service) → `IO`, pesan "credential store unavailable".
- Rahasia **tidak pernah**: dikirim ke frontend, ditulis ke file mana pun (termasuk `.kensidian/`, yang ikut dicadangkan), dimasukkan ke pesan error atau event. Dibaca dari keyring hanya saat `sync_start`/`sync_test`, dibuang setelah run.

### 11.4 Klien dan kunci objek
- `Bucket::new(endpoint, UrlStyle::Path, bucket, "auto")`, `Credentials::new(id, secret)`.
- Kunci objek = `prefix + "/" + pathRelatifNFC` (tanpa `prefix`: hanya path relatif).
- Tiap unggahan: `PutObject::new(&bucket, Some(&creds), key).sign(Duration::from_secs(SYNC_URL_EXPIRY_SECS))` menghasilkan URL bertanda tangan; dikirim dengan `reqwest` `PUT`.
- `reqwest::Client` dibuat sekali per run: `connect_timeout(15s)`, `read_timeout(60s)`, `redirect(Policy::none())`.
- `Content-Length` **wajib** diisi eksplisit (juga untuk file kosong, `0`); `Content-Type` dari ekstensi lewat peta kecil di kode (`md` → `text/markdown; charset=utf-8`, `png`, `jpg`/`jpeg`, `gif`, `webp`, `svg`, `pdf`, `json`, `txt`; selain itu `application/octet-stream`).
- **Semua** error `reqwest` WAJIB dipanggil `.without_url()` sebelum diubah menjadi pesan: URL bertanda tangan memuat kredensial dan tanda tangan dalam query.

### 11.5 Cakupan file
Telusur dari root dengan `walkdir` (tanpa mengikuti symlink):
- Lewati: symlink/reparse point, entri berawalan `.` (termasuk `.git`, `.obsidian`, `.trash`) dan seluruh `.kensidian/` **kecuali** `.kensidian/config.json`.
- Sertakan semua file biasa lainnya, apa pun ekstensinya.
- `size > SYNC_MAX_FILE_BYTES` (100 MiB) → isu `too_large` (tidak diunggah).

### 11.6 Rencana (`sync/plan.rs`)
Fase `scanning` (progres `done`/`total` = jumlah file diperiksa):
1. Muat manifest (§11.8). Bila `target` di manifest ≠ `endpoint|bucket|prefix` sekarang → anggap manifest kosong.
2. Untuk tiap file: entri manifest dengan `(size, mtime)` sama → **tidak berubah** (tanpa menghitung hash). Selain itu hitung SHA-256 (streaming); sama dengan `sha256` manifest → tidak berubah (perbarui `size`/`mtime` entri); berbeda atau tanpa entri → masuk daftar unggah beserta hash-nya.
3. `bytesTotal` = jumlah ukuran daftar unggah.

### 11.7 Unggah (`sync/upload.rs`, `sync/run.rs`)
Fase `uploading` (`done`/`total` = file dalam daftar unggah):
1. Konkurensi `SYNC_CONCURRENCY` = 4 (`Semaphore` + `JoinSet`). File **tidak** dimuat penuh ke memori: `tokio::fs::File` → `ReaderStream` → `reqwest::Body::wrap_stream`.
2. Per file: `stat` awal → unggah sambil menghitung SHA-256 aliran → `stat` akhir. Bila `(size, mtime)` berubah **atau** hash aliran ≠ hash rencana → isu `changed_during_sync`, **tidak** dicatat di manifest (akan diunggah lagi pada sinkron berikutnya). Ini menangani file yang ditulis tidak atomik oleh agent saat dibaca.
3. Sukses (HTTP 2xx) → catat `{ size, mtime, sha256 }` ke manifest dan hitung `bytesDone`.
4. Percobaan ulang: kesalahan jaringan, timeout, HTTP 5xx, 429 → hingga `SYNC_MAX_ATTEMPTS` (3) dengan jeda 1, 2, 4 detik (peka pembatalan). Gagal terakhir → isu `upload_failed`.
5. Kesalahan fatal menghentikan seluruh run: HTTP 401/403 → `SYNC_AUTH`; bucket tidak ada (404 `NoSuchBucket`) → `SYNC_NOT_CONFIGURED`; `SYNC_ABORT_AFTER_FAILURES` (5) kegagalan jaringan **berturut-turut** → `SYNC_NETWORK`. Hasil `failed` dengan `error` terisi.
6. Pembacaan file gagal (izin, dikunci OS) → isu `read_failed`, lanjut ke file berikutnya.
7. Pembatalan (`sync_cancel`): `CancellationToken`; unggahan berjalan dihentikan di potongan berikutnya (PUT yang terputus tidak membuat objek). Hasil `cancelled` dengan hitungan sementara.
8. Progres: `sync:progress` maksimal tiap `SYNC_PROGRESS_MS` (250 ms); satu `sync:finished` di akhir.

### 11.8 Manifest (`.kensidian/sync-manifest.json`)
```json
{ "version": 1, "target": "<endpoint>|<bucket>|<prefix>",
  "files": { "<pathRelatif>": { "size": 0, "mtime": 0, "sha256": "<hex>" } },
  "lastResult": null }
```
- Ditulis atomik oleh tugas sinkron setiap `SYNC_MANIFEST_FLUSH_EVERY` (25) unggahan, saat selesai, dan saat dibatalkan. Crash di antara unggahan dan penulisan → file diunggah ulang (aman karena `PUT` idempoten).
- Entri file yang sudah dihapus di lokal dipertahankan (objeknya tetap di R2).
- `sync_status.lastResult` dibaca dari sini.

### 11.9 Command
- `sync_config_load`: baca `sync.json` + cek keyring → `SyncConfig`.
- `sync_config_save`: validasi §11.3, tulis `sync.json` (di bawah kunci tulis).
- `sync_credentials_set/clear`: keyring.
- `sync_test`: `PUT` objek kosong `{prefix}/.kensidian-check`. 403 → `SYNC_AUTH`, `NoSuchBucket` atau konfigurasi kosong → `SYNC_NOT_CONFIGURED`, jaringan → `SYNC_NETWORK`.
- `sync_start`: tanpa vault → `NOT_FOUND`; konfigurasi atau kredensial kurang → `SYNC_NOT_CONFIGURED`; sudah berjalan → `SYNC_BUSY`. Bila valid, jalankan di `tauri::async_runtime::spawn` lalu langsung kembali.
- `sync_cancel`, `sync_status`: sesuai §12.3. Hanya satu run per sesi (`SyncManager` menyimpan token dan progres terakhir).


---

## 12. Kontrak IPC (Frontend ⇄ Backend Rust)

> Bagian ini **identik** dengan `FRONTEND.md` §12 (disalin 14 Nov 2026). Jangan diubah di sini.

> Bagian ini **harus identik** dengan `BACKEND.md`. Bila ada perubahan, ubah di kedua dokumen dalam satu commit.

### 12.1 Konvensi
- **Path** selalu **relatif terhadap root vault**, pemisah `/`, tanpa `/` di awal. Root = `''`. Path catatan **menyertakan** `.md` (`Riset/Ide.md`). Frontend **tidak pernah** mengirim/menerima path absolut kecuali `VaultInfo.path`.
- **Waktu** (`mtime`) = milidetik epoch (`number`).
- Nama command **snake_case**; argumen dari JS **camelCase** (Tauri mengonversi).
- Error dikembalikan sebagai objek `IpcError` (§12.2). Frontend membungkusnya menjadi `IpcException`.
- Backend menormalkan nama ke Unicode **NFC** dan menolak path yang keluar dari vault (`..`).

### 12.2 Tipe (`src/lib/ipc/types.ts`)
```ts
import type { ItemStyle } from '@/lib/icons/registry'

export interface VaultInfo   { path: string; name: string }          // path absolut: hanya untuk tampilan & convertFileSrc
export interface FileEntry   { path: string; name: string; kind: 'file' | 'folder'; mtime: number; size: number }
export interface NoteRef     { path: string; name: string; mtime: number }   // name = tanpa .md
export interface NoteContent { content: string; mtime: number; size: number }
export interface SearchHit   { path: string; name: string; line: number; snippet: string; ranges: [number, number][] }   // line: 1-based; ranges: offset UTF-16 (indeks string JS) di dalam snippet, [mulai, akhir)
export interface BacklinkRef { path: string; name: string; line: number; context: string }
export interface VaultConfig { itemStyles: Record<string, ItemStyle> }

export type VaultEvent = {
  kind: 'create' | 'modify' | 'delete' | 'rename'
  path: string
  from?: string                    // hanya untuk 'rename'
  origin: 'self' | 'external'      // 'self' = ditulis lewat IPC oleh aplikasi ini
}

export type IpcErrorCode =
  'NOT_FOUND' | 'CONFLICT' | 'EXISTS' | 'DENIED' | 'TOO_LARGE' | 'INVALID_NAME' | 'IO' |
  'SYNC_NOT_CONFIGURED' | 'SYNC_AUTH' | 'SYNC_NETWORK' | 'SYNC_BUSY'
export interface IpcError { code: IpcErrorCode; message: string }

// Cadangan R2 (§12.3, §12.4)
export interface SyncConfigInput { endpoint: string; bucket: string; prefix: string }
export interface SyncConfig extends SyncConfigInput { hasCredentials: boolean }   // hasCredentials: hanya-baca
export interface SyncProgress {
  phase: 'scanning' | 'uploading'
  done: number; total: number              // jumlah file
  bytesDone: number; bytesTotal: number    // hanya file yang perlu diunggah
  current: string | null                   // path relatif yang sedang diproses
}
export interface SyncIssue { path: string; kind: 'too_large' | 'changed_during_sync' | 'read_failed' | 'upload_failed' }
export interface SyncResult {
  status: 'ok' | 'partial' | 'cancelled' | 'failed'   // 'ok' hanya bila issues kosong
  error: IpcErrorCode | null               // diisi bila status 'failed'
  uploaded: number; unchanged: number; bytesUploaded: number
  issues: SyncIssue[]
  startedAt: number; finishedAt: number    // ms epoch
}
export interface SyncStatus { running: boolean; progress: SyncProgress | null; lastResult: SyncResult | null }
```

### 12.3 Daftar command (WAJIB)
| Command | Argumen | Hasil | Error mungkin | Catatan |
|---|---|---|---|---|
| `settings_load` | — | `Settings \| null` | IO | `null` = belum pernah disimpan |
| `settings_save` | `settings: Settings` | `void` | IO | |
| `vault_list_recent` | — | `VaultInfo[]` | — | maks 10, terbaru dulu |
| `vault_get_current` | — | `VaultInfo \| null` | — | vault terakhir yang masih ada di disk |
| `vault_open` | `path: string` (absolut) | `VaultInfo` | NOT_FOUND, DENIED | set scope aset, mulai watcher + indexer |
| `vault_create` | `parentPath: string, name: string` | `VaultInfo` | EXISTS, INVALID_NAME, DENIED | buat folder lalu buka |
| `vault_close` | — | `void` | — | hentikan watcher |
| `vault_config_load` | — | `VaultConfig` | IO | gaya ikon folder/file |
| `item_style_set` | `path: string, style: ItemStyle \| null` | `void` | NOT_FOUND, IO | `null` = hapus gaya. Menggantikan `vault_config_save`: frontend **tidak** pernah menulis seluruh config (mencegah baca-ubah-tulis yang saling menimpa) |
| `workspace_load` / `workspace_save` | — / `workspace: Workspace` | `Workspace \| null` / `void` | IO | per vault |
| `fs_list_dir` | `path: string` | `FileEntry[]` | NOT_FOUND | **hanya** anak langsung; folder + `.md`; tidak diurutkan (frontend mengurutkan); abaikan item tersembunyi (awalan `.`) |
| `vault_list_notes` | — | `NoteRef[]` | — | semua `.md` di vault |
| `note_read` | `path: string` | `NoteContent` | NOT_FOUND, TOO_LARGE, IO | TOO_LARGE bila >10 MB |
| `note_write` | `path: string, content: string, expectedMtime: number` | `{ mtime: number }` | CONFLICT, NOT_FOUND, IO | `CONFLICT` bila mtime di disk ≠ `expectedMtime` (wajib, tidak boleh `null`). Tulis **atomik** (file sementara + rename); lihat §12.6 |
| `note_create` | `path: string, content?: string` | `{ mtime: number }` | EXISTS, INVALID_NAME, IO | otomatis buat folder induk |
| `fs_create_folder` | `path: string` | `void` | EXISTS, INVALID_NAME | |
| `fs_rename` | `from: string, to: string` | `void` | NOT_FOUND, EXISTS, INVALID_NAME | dipakai juga untuk memindahkan. Key `itemStyles` (folder: semua turunan) ikut dipindahkan dalam operasi yang sama |
| `fs_delete` | `path: string, toTrash: boolean` | `void` | NOT_FOUND, DENIED | default `toTrash = true`. Key `itemStyles` terkait ikut dihapus |
| `reveal_in_file_manager` | `path: string` | `void` | NOT_FOUND | |
| `search_query` | `query: string, caseSensitive: boolean, limit: number` | `SearchHit[]` | — | teks penuh (SQLite FTS5); frontend memakai `limit = 100` |
| `backlinks_get` | `path: string` | `BacklinkRef[]` | — | |
| `backlinks_count` | `path: string` | `number` | — | untuk StatusBar; jumlah **catatan** yang menautkan (bukan jumlah baris) |
| `sync_config_load` | — | `SyncConfig` | IO | per vault; `endpoint`/`bucket`/`prefix` kosong bila belum diatur |
| `sync_config_save` | `config: SyncConfigInput` | `void` | INVALID_NAME, IO | memvalidasi endpoint (https, host `*.r2.cloudflarestorage.com`), bucket, prefix |
| `sync_credentials_set` | `accessKeyId: string, secretAccessKey: string` | `void` | IO | disimpan di keyring OS; tulis-saja, tidak pernah dikembalikan |
| `sync_credentials_clear` | — | `void` | IO | |
| `sync_test` | — | `void` | SYNC_NOT_CONFIGURED, SYNC_AUTH, SYNC_NETWORK | menulis objek kecil `{prefix}/.kensidian-check` untuk memastikan izin tulis |
| `sync_start` | — | `void` | NOT_FOUND, SYNC_NOT_CONFIGURED, SYNC_BUSY | kembali segera; berjalan di latar; progres lewat event |
| `sync_cancel` | — | `void` | — | aman dipanggil kapan saja |
| `sync_status` | — | `SyncStatus` | — | untuk memulihkan UI (mis. setelah vault dibuka ulang) |

### 12.4 Event dari backend
| Event | Payload | Keterangan |
|---|---|---|
| `vault:changed` | `VaultEvent[]` | Dikirim **berkelompok** (backend mendebounce ±100ms). Frontend mendengarkan dengan `listen()` sekali saat vault dibuka |
| `vault:watching` | `boolean` | Status pemantau file → `vault.watching` |
| `index:status` | `{ indexing: boolean }` | `true` selama indeks pencarian dibangun/diperbarui di latar → `vault.indexing`; `SearchPanel` menampilkan "Mengindeks catatan…" (12px `fg-faint`) dan mengulang pencarian saat menjadi `false` |
| `sync:progress` | `SyncProgress` | Maks 4 kali per detik |
| `sync:finished` | `SyncResult` | Tepat satu kali per `sync_start` |

Event `origin: 'self'` untuk `modify` pada tab yang sedang terbuka **diabaikan** (mtime sudah diperbarui dari hasil `note_write`).

### 12.5 Pembungkus dan mock
- `ipc/index.ts` mengekspor objek `ipc` bertipe (satu fungsi per command, mis. `ipc.noteRead(path)`) dan `isTauri` (`'__TAURI_INTERNALS__' in window`). Implementasi: `tauri.ts` bila `isTauri`, selain itu `mock.ts`. Variabel `VITE_MOCK_IPC=1` memaksa mock.
- `IpcException extends Error { code: IpcErrorCode }`. Komponen **tidak** memanggil `invoke` langsung; hanya lewat `ipc`.
- **`mock.ts` WAJIB** (agar frontend bisa dikembangkan dan diuji di browser tanpa backend): vault in-memory dengan ±40 catatan di 4 level folder, berisi wikilink (ada yang tak terselesaikan), frontmatter + tags, daftar tugas, tabel, blok kode beberapa bahasa, satu catatan sangat panjang (±300 KB), satu catatan berisi payload uji keamanan §10.3. Latensi simulasi 30–120ms. Tombol rahasia di Pengaturan > Tentang (hanya `import.meta.env.DEV`): "Simulasikan perubahan eksternal" memicu `vault:changed`. Mock juga mensimulasikan R2: config di memori, `sync_start` memancarkan ±20 `sync:progress` selama ±3 detik lalu `sync:finished` (satu `issues` contoh), `sync_test` sukses.
- Resolusi wikilink dilakukan di **frontend** memakai `noteIndex`: cocokkan nama (tanpa `.md`, case-insensitive) atau path relatif; bila ada beberapa kandidat pilih yang sefolder dengan catatan asal, lalu path terpendek.

### 12.6 Jaminan perilaku backend (konkurensi dan `.kensidian/`)
Mengikat `BACKEND.md`. Tujuan: tidak ada race condition antar command, antara command dan watcher, maupun antara aplikasi dan penulis luar (agent).

1. **Satu kunci tulis per vault.** Semua command yang mengubah disk atau konfigurasi (`note_write`, `note_create`, `fs_create_folder`, `fs_rename`, `fs_delete`, `item_style_set`) berjalan berurutan di bawah satu mutex. Command baca (`note_read`, `fs_list_dir`, `vault_list_notes`, `search_query`, `backlinks_*`) tidak memakai kunci.
2. **Tulis kondisional.** Di dalam kunci: tulis ke file sementara, baca mtime file asli **tepat sebelum** rename, bandingkan dengan `expectedMtime`; berbeda → buang file sementara dan kembalikan `CONFLICT`. Celah yang tersisa (penulis luar menulis di antara pengecekan dan rename) sangat sempit dan tidak bisa ditutup tanpa kunci file OS; diterima.
3. **Penentuan `origin`.** Sebelum rename, backend mencatat sidik jari tulisannya (ukuran + hash isi, dihitung dengan `std`) di tabel `self_writes[path]` (di dalam kunci). Saat watcher melepas batch (setelah debounce), event `create`/`modify` berstatus `self` **hanya bila** sidik jari file di disk saat itu sama dengan catatan; selain itu `external`. Catatan dihapus setelah cocok atau setelah 5 detik. Untuk `fs_rename`/`fs_delete`/`fs_create_folder`, backend mencatat token `(jenis, path)` yang dipakai sekali oleh event yang cocok. Dengan cara ini tulisan luar yang menyusul tulisan aplikasi tidak pernah salah ditandai `self`.
4. **Indexer satu penulis.** Indeks hanya diperbarui oleh pemindaian awal dan alur event watcher dalam satu thread; command tidak menulis indeks langsung.
5. **`.kensidian/`** di root vault berisi `config.json` (`VaultConfig`), `workspace.json`, `sync.json` (`SyncConfigInput`), `sync-manifest.json`, dan `index.db` (SQLite FTS5). Dibuat saat `vault_open` bila belum ada. Watcher, `fs_list_dir`, `vault_list_notes`, pencarian, dan backlink **mengabaikan seluruh** `.kensidian/` (agar penulisan indeks tidak memicu event). `index.db` hanya cache: rusak atau skema berbeda → hapus dan bangun ulang. File JSON ditulis atomik di bawah kunci tulis (kecuali `sync-manifest.json`, yang hanya ditulis oleh tugas sinkron). `Settings` (global) disimpan di folder data aplikasi, bukan di vault.
6. **Sinkron R2 hanya membaca vault.** Tidak memakai kunci tulis, sehingga tidak menghambat penyimpanan. Hanya satu sinkron berjalan pada satu waktu (`SYNC_BUSY`). Berkas yang berubah selama dibaca tidak dicatat sebagai terunggah dan dilaporkan sebagai `changed_during_sync`. `vault_open`/`vault_close` membatalkan sinkron yang sedang berjalan. Detail di `BACKEND.md` §11.

---

## 13. Aturan Kode Rust (WAJIB)

Padanan `GEMINI.md` untuk Rust. Agent **tidak menjalankan perintah** (`cargo`, `git`, dsb.) tanpa diminta user pada pesan saat ini; tulis perintah persisnya dan alasannya, lalu tunggu.

| Unit | Batas |
|---|---|
| File `.rs` (di luar `#[cfg(test)]`) | ≤ **250 baris** |
| Satu fungsi | ≤ **30 baris** |
| Parameter fungsi | ≤ **4** (lebih → satu struct) |
| Kedalaman nesting | ≤ **3** (pakai early return dan `?`) |
| File yang diubah dalam satu tugas | ≤ **5** |

Aturan:
1. DILARANG `unsafe`, `unwrap()`, `expect()`, `panic!`, `todo!`, `unimplemented!`, `dbg!`, `println!`/`eprintln!` di kode non-test. Indeks slice yang bisa gagal memakai `get()`.
2. Semua error dipetakan ke `AppError` (§5); tidak ada error yang ditelan diam-diam.
3. Kerja blocking (disk, SQLite, hash) hanya di `spawn_blocking` atau thread khusus; **jangan menahan mutex melewati `.await`**.
4. Urutan kunci: `write_lock` → `self_writes` → `cache`. Hanya thread indexer yang menulis ke SQLite.
5. Tanpa angka ajaib: semua batas di `constants.rs` (tabel di bawah).
6. Tanpa abstraksi prematur (trait/generic untuk satu pemakaian), tanpa kode mati, tanpa komentar yang mengulang kode (komentar hanya menjelaskan **mengapa**).
7. Jangan mengarang API crate. Baca definisinya di sumber crate sebelum dipakai; bila tidak yakin, katakan "saya tidak yakin" dan tanya.
8. Jangan menambah crate atau mengubah versi (§2) tanpa persetujuan user.
9. Kontrak IPC §12 tidak diubah sepihak: bila command yang dibutuhkan tidak ada di tabel, berhenti dan tanya.

### Konstanta (`constants.rs`)
| Nama | Nilai |
|---|---|
| `NAME_MAX_CHARS` / `PATH_MAX_CHARS` | 255 / 1024 |
| `MAX_NOTE_BYTES` | 10 MiB |
| `MAX_JSON_BYTES` | 1 MiB |
| `RECENT_VAULTS_MAX` | 10 |
| `WATCH_DEBOUNCE_MS` / `EVENT_CHUNK_SIZE` | 100 / 500 |
| `SELF_WRITE_TTL_MS` | 5000 |
| `INDEX_MAX_NOTE_BYTES` / `INDEX_MAX_LINE_CHARS` | 5 MiB / 2000 |
| `SEARCH_MAX_TERMS` / `SEARCH_MAX_LIMIT` / `SNIPPET_MAX_CHARS` | 10 / 500 / 200 |
| `SYNC_MAX_FILE_BYTES` | 100 MiB |
| `SYNC_CONCURRENCY` / `SYNC_MAX_ATTEMPTS` / `SYNC_ABORT_AFTER_FAILURES` | 4 / 3 / 5 |
| `SYNC_PROGRESS_MS` / `SYNC_MANIFEST_FLUSH_EVERY` / `SYNC_URL_EXPIRY_SECS` | 250 / 25 / 600 |

### Cek setelah selesai coding
Tanpa menjalankan perintah: periksa diagnostik IDE (rust-analyzer) untuk semua file yang diubah dan perbaiki semua error serta warning dari kode baru. Laporan akhir memakai format `GEMINI.md` §7 dengan baris `Cek Rust:` (salah satu dari: diagnostik bersih / belum bisa diverifikasi / masih ada N masalah) dan menyarankan user menjalankan `cargo check` dan `cargo clippy`. DILARANG mengklaim lolos bila tidak terverifikasi.

---

## 14. Anggaran Performa dan Sumber Daya

Angka di bawah adalah **target** yang diukur di Fase B5 (acuan: laptop i3, RAM 8 GB, 1.000 catatan ±3 KB).

| Metrik | Target |
|---|---|
| RAM proses Rust saat idle (vault 1.000 catatan, indeks selesai) | ≤ 40 MB |
| RAM tambahan selama sinkron (4 unggahan paralel) | ≤ 30 MB |
| `vault_open` kembali (fase pemindaian, tanpa isi) | ≤ 300 ms (1.000) / ≤ 1,5 s (10.000) |
| Pengindeksan penuh di latar | ≤ 5 s (1.000 catatan) |
| `search_query` | ≤ 80 ms p95 |
| `backlinks_get` / `backlinks_count` | ≤ 30 ms |
| `note_read` (100 KB) / `note_write` (termasuk fsync) | ≤ 10 ms / ≤ 50 ms |
| 200 file berubah serentak | batch `vault:changed` terkirim ≤ 500 ms setelah debounce |
| Pemindaian sinkron, 1.000 file tidak berubah | ≤ 2 s (hanya `stat`) |

Aturan:
1. Tanpa polling dan tanpa timer saat idle: watcher berbasis event, indexer memblokir pada kanal, sinkron hanya berjalan saat diminta.
2. Cache SQLite 8 MiB, `mmap_size=0`.
3. Thread tetap: debouncer, pekerja event, indexer. Selebihnya memakai pool blocking Tauri.
4. File besar selalu di-stream (sinkron) atau ditolak (`TOO_LARGE`); tidak ada pembacaan penuh file tak terbatas.

---

## 15. Penanganan Error dan Kasus Tepi

| Situasi | Perilaku |
|---|---|
| Folder vault dihapus/dipindah saat terbuka | watcher error → `vault:watching = false`; command berikutnya `NOT_FOUND` |
| Disk penuh saat menulis | `IO`; file sementara dibersihkan; target tidak berubah |
| File dikunci OS (antivirus, pengindeks Windows) | `rename` diulang 3× (§8.2), lalu `DENIED`/`IO` |
| Catatan bukan UTF-8 | `note_read` → `IO` (tidak dibaca lossy agar tidak merusak file saat disimpan) |
| Symlink atau reparse point | dilewati pada listing/pindai/sinkron; operasi langsung → `DENIED` |
| Nama di disk berbentuk NFD (Linux) | ditampilkan apa adanya; nama baru yang dibuat backend selalu NFC (§6) |
| Banyak event sekaligus | dipecah `EVENT_CHUNK_SIZE`; cache dan indeks diperbarui sebelum emit |
| `index.db` rusak atau versi skema beda | dihapus dan dibangun ulang; pencarian sementara kosong (`index:status` aktif) |
| Keyring tidak tersedia | `IO` "credential store unavailable"; sinkron tidak bisa dimulai |
| Ganti atau tutup vault saat sinkron berjalan | sinkron dibatalkan lebih dulu (hasil `cancelled`) |
| Ganti vault saat command lama berjalan | command lama tetap memakai `Arc` sesi lamanya sampai selesai |
| Dua instance aplikasi pada vault sama | tidak didukung v1 (tidak ada penguncian lintas-proses selain SQLite); lihat §18.2 |

---

## 16. Pengujian

Backend memuat pengujian berikut sebagai bagian tugas (selain daftar ini, jangan menambah test). Gunakan `tempfile` untuk sistem file sementara.

**Unit (`cargo test`)**
1. `validate_rel`: `..`, absolut, `\`, nama perangkat Windows, awalan `.`, NFC vs NFD, batas panjang.
2. `resolve`: symlink keluar vault ditolak; path baru di dalam vault diterima.
3. `atomic_write` + `note_write`: sukses, `CONFLICT` saat mtime berbeda, file sementara dibersihkan saat gagal.
4. Klasifikasi `origin`: tulisan sendiri → `self`; tulisan luar dengan isi beda setelah tulisan kita → `external`; token `rename`/`delete` dikonsumsi sekali; TTL kedaluwarsa.
5. Migrasi key ikon pada rename file/folder dan hapus.
6. Penyusun ekspresi FTS: kutip digandakan, awalan pada token terakhir, batas 10 token, frasa.
7. `snippet`/`ranges`: offset UTF-16 benar untuk emoji dan huruf berakhiran gabungan; jendela dan `…`.
8. Ekstraksi tautan: blok kode berpagar, kode inline, alias, heading, embed, `[[#Judul]]`.
9. Resolusi tautan: folder sama didahulukan, path terpendek, seri leksikografis; tautan ke diri sendiri tidak dihitung.
10. Rencana sinkron: tidak berubah lewat `(size, mtime)`, tidak berubah lewat hash, file baru, target berbeda mengosongkan manifest, file `.kensidian` selain `config.json` dilewati.
11. Pesan error sinkron tidak memuat `X-Amz-` maupun secret.
12. **Uji asap FTS5**: buat `lines_fts` pada SQLite bundled, jalankan pola kueri §10.5 (MATCH + JOIN + `rank`) dan hapus lewat trigger.

**Manual (butuh akun R2)**: `sync_test` sukses; unggah file dengan spasi dan huruf Unicode pada namanya; pembatalan di tengah; jalankan ulang dan pastikan hanya file yang berubah diunggah; kredensial salah → `SYNC_AUTH`. Bila R2 menolak header `Content-Type` yang tidak ikut ditandatangani, tambahkan header itu ke `PutObject::headers_mut()` agar ikut ditandatangani.

---

## 17. Fase Pengembangan

Kerjakan berurutan; satu fase selesai penuh sebelum berikutnya (B4 boleh paralel setelah B1).

### Fase B0 — Kerangka
`Cargo.toml` (§3.1), `lib.rs`, `error.rs`, `models.rs`, `state.rs`, `constants.rs`, stub semua command §12.3 yang mengembalikan `NOT_FOUND`.
**Selesai bila:**
- [ ] `cargo check` bersih dengan versi terkunci (laporkan bila kombinasi fitur `reqwest`/`rusty-s3` perlu disesuaikan).
- [ ] Frontend (non-mock) dapat memanggil setiap command dan menerima `IpcError` terformat.

### Fase B1 — Vault dan operasi file
`paths`, `names`, `atomic`, `write_lock`, `self_writes`, `vault_*`, `fs_*`, `note_*`, `reveal_in_file_manager`, `settings_*`, `workspace_*`, config ikon.
**Selesai bila:**
- [ ] Uji §16 butir 1–3 dan 5 lulus.
- [ ] Membuka vault, membuat/mengubah nama/menghapus (ke tempat sampah) catatan dan folder bekerja; gaya ikon bertahan dan ikut berpindah saat rename.
- [ ] Gambar di vault tampil lewat `asset://`; `.kensidian/` tidak bisa dibaca lewat scope aset.

### Fase B2 — Watcher dan event
Pipeline §9, `NotesCache`, klasifikasi `origin`, reconcile.
**Selesai bila:**
- [ ] Uji §16 butir 4 lulus.
- [ ] Menulis dari editor lain memunculkan `external`; menyimpan dari aplikasi memunculkan `self`; menyalin folder berisi 100 catatan memunculkan event `create` untuk semuanya.
- [ ] 200 file berubah serentak tidak membekukan UI dan batch terkirim sesuai §14.

### Fase B3 — Indeks, pencarian, backlink
Skema, indexer, `search_query`, `backlinks_*`, `index:status`.
**Selesai bila:**
- [ ] Uji §16 butir 6–9 dan 12 lulus.
- [ ] Pencarian dan backlink sesuai target §14; mengganti nama folder tidak memicu pengindeksan ulang isi.
- [ ] Menghapus `index.db` lalu membuka vault membangun ulang indeks tanpa error.

### Fase B4 — Cadangan R2
`sync/*`, command `sync_*`, keyring.
**Selesai bila:**
- [ ] Uji §16 butir 10–11 lulus dan uji manual R2 lulus.
- [ ] Menekan sinkron dua kali berturut-turut: kedua kalinya hanya memindai dan tidak mengunggah apa pun.
- [ ] Secret tidak ditemukan di file mana pun dalam vault maupun di pesan error.
- [ ] RAM tambahan saat sinkron sesuai §14.

### Fase B5 — Poles dan pengukuran
Ukur semua target §14 dan catat di `PERF.md` (hasil, perangkat, versi). Perbaiki yang meleset.

---

## 18. Keputusan, Asumsi, dan Pertanyaan Terbuka

### 18.1 Keputusan yang mengikat
Lihat juga `DECISIONS.md`.
1. Indeks di `.kensidian/index.db` (keputusan user).
2. `origin` berdasarkan sidik jari isi, dicocokkan saat batch dilepas.
3. Satu kunci tulis per vault; `expectedMtime` wajib; tidak ada pembatasan tulis per folder di v1.
4. Cadangan R2: satu arah, manual, tanpa penghapusan di R2, tanpa pemulihan di aplikasi.
5. Klien R2 = `rusty-s3` + `reqwest` (`native-tls`), kredensial di keyring OS.

### 18.2 Asumsi (mohon dikoreksi bila keliru)
1. `Settings` dan `Workspace` diperlakukan tak tembus oleh backend; validasi dan migrasi ada di frontend. `Settings` global di folder data aplikasi, `Workspace` per vault di `.kensidian/`.
2. Backlink dihitung per **catatan sumber**; embed `![[...]]` dihitung sebagai tautan.
3. Pencarian memakai tokenizer `unicode61` (kata dan awalan), tanpa pencocokan di tengah kata.
4. Satu bucket boleh dipakai beberapa vault; awalan folder bawaan = nama vault (diisi frontend).
5. Cadangan mencakup **semua** file non-tersembunyi (termasuk gambar/lampiran), bukan hanya `.md`, ditambah `.kensidian/config.json`. `workspace.json` dan `index.db` tidak dicadangkan.
6. Satu instance aplikasi per pengguna.
7. `line` pada `SearchHit` dan `BacklinkRef` berbasis 1.

### 18.3 Pertanyaan terbuka
1. Apakah **pemulihan dari R2** (unduh balik ke vault) perlu ada di dalam aplikasi? (v1: tidak, pemulihan manual.)
2. Apakah file yang dihapus atau diganti nama di lokal perlu **ikut dihapus di R2** (mode cermin)? (v1: tidak.)
3. Apakah `Settings` perlu ikut dicadangkan? (v1: tidak.)
