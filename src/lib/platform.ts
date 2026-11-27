/** Deteksi platform OS untuk penyesuaian shortcut dan label UI. */

export const isMac: boolean =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

/** Tombol modifier utama: '⌘' di macOS, 'Ctrl' di Windows/Linux. */
export const modKey = isMac ? '⌘' : 'Ctrl'

/** Tombol modifier sekunder: '⌥' di macOS, 'Alt' di Windows/Linux. */
export const altKey = isMac ? '⌥' : 'Alt'

/** Tombol hapus: '⌘⌫' di macOS, 'Delete' di Windows/Linux. */
export const delKey = isMac ? '⌘⌫' : 'Delete'

/** Gabungkan bagian shortcut dengan '+'. */
export function fmt(...keys: string[]): string {
  return keys.join('+')
}
