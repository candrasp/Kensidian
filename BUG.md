# BUG.md — Kensidian

> Diaudit secara statis dari kode sumber (`src/`). Belum diuji runtime.  
> Tingkat: 🔴 Kritis · 🟡 Sedang · 🔵 Minor/Teknis

---

## 🔴 Kritis

---

## BUG-01 · [SELESAI] Paste lalu langsung klik View → save gagal diam-diam

**File:** `src/components/editor/EditorPane.vue` & `src/components/layout/AppShell.vue`  
**Tingkat:** 🔴 Kritis  
**Status:** ✅ Selesai di Tahap 1 (sinkronisasi konten synchronous sebelum unmount, pengambilan fallback mtime via `noteRead`, dan proteksi `tab.dirty` di `AppShell`).

**Deskripsi:**  
Alur: buat dokumen baru → paste teks → klik tombol View sebelum autosave debounce selesai (~1 detik). `onBeforeUnmount` EditorPane emit konten terakhir, tapi `mtime` masih `null` (file belum pernah disimpan). `noteWrite` dipanggil dengan `expectedMtime=0` → backend mungkin mengembalikan error → konten hilang tanpa notifikasi ke user.

**Perbaikan yang disarankan:**  
Sebelum switch mode, flush autosave segera (batalkan debounce, panggil save synchronously). Tangani kasus `mtime=null` sebagai "pertama kali simpan" dengan alur `createNote` → `noteWrite`.

---

## 🟡 Sedang

---

## BUG-02 · [SELESAI] `startWidth` stale saat drag sidebar

**File:** `src/composables/useResizable.ts` & `src/components/layout/ResizeHandle.vue`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai di Tahap 1 (`initial` menerima getter `() => number` sehingga selalu mengevaluasi lebar terkini saat drag dimulai).

**Deskripsi:**  
`startWidth` diambil dari `sidebar.width` pada saat `mousedown`, bukan dari lebar DOM nyata elemen sidebar. Jika lebar sidebar pernah diubah secara programatik (mis. toggle collapse lalu expand) tanpa memperbarui `sidebar.width` di store, nilai `startWidth` akan stale dan drag akan melompat.

```ts
// useResizable.ts ~26
const startWidth = sidebar.width  // ← bisa basi
```

**Perbaikan yang disarankan:**  
Ambil `startWidth` dari `el.getBoundingClientRect().width` pada saat `mousedown`.

---

## BUG-03 · [SELESAI] `mtime` file baru `null` → conflict palsu di `noteWrite`

**File:** `src/components/editor/EditorPane.vue` & `src/components/layout/AppShell.vue`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai di Tahap 1 (`saveNote` otomatis membaca file mtime terbaru jika `mtime === null` sebelum mengirim write request).

**Deskripsi:**  
Saat membuat catatan baru, `activeTab.mtime` bernilai `null`. Ketika autosave dipicu, `noteWrite` dipanggil dengan `expectedMtime: tab.mtime ?? 0`. Backend menerima `expectedMtime=0` dan mungkin mengembalikan `CONFLICT` atau `NOT_FOUND` tergantung implementasi, lalu save gagal diam-diam tanpa pesan error ke user.

**Perbaikan yang disarankan:**  
Setelah `createNote()` berhasil, simpan `mtime` yang dikembalikan backend ke `activeTab.mtime` sebelum autosave pertama berjalan.

---

## BUG-04 · [SELESAI] `update:content` emit setiap keystroke — potensi re-render berat

**File:** `src/components/editor/EditorPane.vue`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai di Tahap 1 (emit `update:content` didebounce 300ms dan diflush langsung saat unmount/blur).

**Deskripsi:**  
`scheduleAutosave` memanggil `emit('update:content', content)` di dalam `onChange` CodeMirror yang terpicu setiap perubahan karakter. `AppShell` meneruskan nilai ini ke `ViewPane` untuk render Markdown. Pada dokumen besar, ini memicu `renderMarkdown()` di setiap keystroke.

**Perbaikan yang disarankan:**  
Debounce emit `update:content` terpisah dari debounce autosave (mis. 300 ms). Atau batasi re-render ViewPane dengan `v-memo`.

---

## BUG-05 · [SELESAI] `defaultNoteMode` dari Settings tidak dipakai saat buka file

**File:** `src/components/tree/FileTree.vue`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai (`handleFileClick` meneruskan `{ mode: settingsStore.current.defaultNoteMode }`).

**Deskripsi:**  
`openPath()` selalu dipanggil tanpa opsi `mode`, sehingga tab selalu dibuka dalam mode default hardcoded di store (`'edit'`), mengabaikan preferensi `settings.defaultNoteMode`.

---

## BUG-06 · [SELESAI] Rename file tidak memperbarui `tab.history`

**File:** `src/stores/tabs.ts`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai (`renamePath` memperbarui seluruh entri `tab.history` yang cocok).

**Deskripsi:**  
Saat file di-rename, `tabs.ts` memperbarui `tab.path` tapi tidak memperbarui entri lama di `tab.history`. Navigasi back/forward kemudian mencoba membuka path lama yang sudah tidak ada.

---

## BUG-07 · [SELESAI] `toggleLinePrefix` hanya bekerja pada baris kursor, bukan multi-line selection

**File:** `src/lib/editor/commands.ts`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai (iterasi semua baris dari `startLine` hingga `endLine` pada selection range).

**Deskripsi:**  
Fungsi `toggleLinePrefix` (dipakai untuk toggle bullet, heading, blockquote) hanya mengambil baris kursor aktif. Jika user memilih beberapa baris lalu klik tombol format, hanya baris pertama yang diubah.

---

## BUG-08 · [SELESAI] `submitRename` dipanggil dua kali: Enter keydown + blur

**File:** `src/components/tree/FileTreeItem.vue`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai (flag guard `isSubmitting` dan trigger `inputRef?.blur()` pada Enter keydown).

**Deskripsi:**  
Input rename mendengarkan `@keydown.enter="submitRename"` dan `@blur="submitRename"`. Menekan Enter memicu `keydown` lalu secara otomatis juga memicu `blur` → `submitRename` dipanggil dua kali → IPC rename terpanggil dua kali → error atau nama file ganda.

---

## BUG-09 · [SELESAI] `scrollTop` di `TabState` tidak pernah disimpan atau dipulihkan

**File:** `src/stores/tabs.ts` & `src/components/editor/ViewPane.vue`  
**Tingkat:** 🟡 Sedang  
**Status:** ✅ Selesai (`setScrollTop` di store, event listener scroll pasif, dan pemulihan scroll saat mount/ganti catatan).

**Deskripsi:**  
`TabState` memiliki field `scrollTop` tapi tidak ada kode yang menulis nilainya (saat scroll) maupun membacanya (saat tab aktif berganti). Berpindah antar tab selalu mereset posisi scroll ke atas.

---

## 🔵 Minor

---

## BUG-10 · `NoteMode` didefinisikan dua kali

**File:** `src/stores/settings.ts:4` dan `src/lib/ipc/types.ts:5`  
**Tingkat:** 🔵 Minor

**Deskripsi:**  
Tipe `NoteMode = 'edit' | 'view'` dideklarasikan di dua tempat berbeda. Jika salah satu diubah (mis. ditambah mode `'split'`), yang lain bisa tertinggal dan menyebabkan ketidakkonsistenan tipe.

**Perbaikan yang disarankan:**  
Hapus deklarasi di `settings.ts`, impor dari `types.ts` sebagai satu-satunya sumber kebenaran.

---

## BUG-11 · `insertLink` menempatkan kursor tidak akurat saat ada teks ter-select

**File:** `src/lib/editor/commands.ts:76`  
**Tingkat:** 🔵 Minor

**Deskripsi:**  
Saat teks di-select dan `insertLink` dipanggil, teks selection dipakai sebagai link label `[teks](url)`. Namun posisi kursor setelah insert dihitung dari panjang string tetap `[](url)` bukan dari panjang teks yang sebenarnya di-select, sehingga kursor mendarat di posisi yang salah.

**Perbaikan yang disarankan:**  
Hitung offset kursor berdasarkan `selectedText.length` aktual.

---

## BUG-12 · Tombol Sync R2 tidak memiliki `@click` handler

**File:** `src/components/layout/SidebarFooter.vue:115`  
**Tingkat:** 🔵 Minor

**Deskripsi:**  
Tombol ikon sync R2 dirender tapi tidak ada `@click` terikat. Klik tidak melakukan apa pun.

**Perbaikan yang disarankan:**  
Hubungkan ke IPC command sync yang sesuai, atau sembunyikan tombol jika fitur belum diimplementasi (`v-if="false"`).

---

## BUG-13 · Tombol Help membuka modal `'help'` yang tidak terdaftar di ModalHost

**File:** `src/components/layout/SidebarFooter.vue:116`  
**Tingkat:** 🔵 Minor

**Deskripsi:**  
Klik tombol Help memanggil `ui.openModal('help')`, tapi `ModalHost.vue` hanya menangani `'settings'` dan `'quickSwitcher'`. Modal `'help'` tidak dirender → klik tidak berpengaruh.

**Perbaikan yang disarankan:**  
Daftarkan komponen modal Help di `ModalHost.vue`, atau hapus tombol Help sampai fitur tersedia.

---

## BUG-14 · `md.parse()` dipanggil dua kali untuk satu render

**File:** `src/lib/markdown/render.ts:95-119`  
**Tingkat:** 🔵 Minor/Performa

**Deskripsi:**  
Di dalam callback `highlight` plugin `markdown-it`, `md.parse(str, {})` dipanggil untuk mendapatkan token dan mengekstrak bahasa. Kemudian `md.render()` di luar juga melakukan parse internnya sendiri. Dokumen besar dengan banyak blok kode akan di-parse dua kali.

**Perbaikan yang disarankan:**  
Ekstrak informasi bahasa langsung dari parameter `lang` yang sudah tersedia di callback `highlight(str, lang)` tanpa memanggil `md.parse()` lagi.

---

## BUG-15 · `beforeunload` listener tidak di-cleanup; async save tidak bisa selesai

**File:** `src/composables/useWorkspace.ts:109`  
**Tingkat:** 🔵 Minor

**Deskripsi:**  
`window.addEventListener('beforeunload', handler)` didaftarkan tapi tidak ada `removeEventListener` di `onUnmounted`. Jika composable di-unmount dan di-mount ulang (mis. hot reload), listener terduplikasi.  
Selain itu, handler `beforeunload` bersifat synchronous — `await ipc.noteWrite(...)` di dalamnya tidak akan selesai sebelum window ditutup browser/Tauri.

**Perbaikan yang disarankan:**  
1. Simpan referensi handler dan panggil `removeEventListener` di `onUnmounted`.  
2. Untuk Tauri, gunakan event `tauri://close-requested` yang mendukung async prevention.

---

*Diaudit dari kode sumber secara statis — belum diuji runtime.*  
*Total: 15 bug (1 kritis 🔴, 8 sedang 🟡, 6 minor 🔵)*
