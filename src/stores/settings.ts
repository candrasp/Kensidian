import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NoteMode } from '@/lib/ipc/types'

export type ColorScheme = 'nord' | 'onedark' | 'minimal' | 'tokyonight' | 'catppuccin' | 'sepia'

export interface Settings {
  theme: 'dark' | 'light' | 'system'
  colorScheme: ColorScheme
  accentColor: string | null
  fontUi: string | null
  fontText: string | null
  fontMono: string | null
  fontSize: number
  readableLineLength: boolean
  lineWidth: number
  defaultNoteMode: NoteMode
  editMode: 'source' | 'live'
  autosaveMs: number
  showFormatToolbar: boolean
  showLineNumbers: boolean
  spellcheck: boolean
  confirmDelete: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  colorScheme: 'nord',
  accentColor: null,
  fontUi: null,
  fontText: null,
  fontMono: null,
  fontSize: 16,
  readableLineLength: true,
  lineWidth: 900,
  defaultNoteMode: 'view',
  editMode: 'source',
  autosaveMs: 1000,
  showFormatToolbar: true,
  showLineNumbers: false,
  spellcheck: false,
  confirmDelete: true,
}

export const useSettingsStore = defineStore('settings', () => {
  const current = ref<Settings>({ ...DEFAULT_SETTINGS })

  function applyTheme(theme: 'dark' | 'light' | 'system') {
    const isDark = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : theme === 'dark'
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }

  function applyColorScheme(scheme: ColorScheme) {
    document.documentElement.setAttribute('data-scheme', scheme)
  }

  function applyFont(font: string | null) {
    if (font) {
      document.documentElement.style.setProperty('--font-text', font)
    } else {
      document.documentElement.style.removeProperty('--font-text')
    }
  }

  function applyFontMono(font: string | null) {
    if (font) {
      document.documentElement.style.setProperty('--font-mono', font)
    } else {
      document.documentElement.style.removeProperty('--font-mono')
    }
  }

  function applyFontSize(size: number) {
    document.documentElement.style.setProperty('--font-size-text', `${size}px`)
  }

  async function load() {
    try {
      const saved = await (await import('@/lib/ipc')).ipc.settingsLoad()
      if (saved) {
        current.value = { ...DEFAULT_SETTINGS, ...saved }
      }
    } catch {
      // gunakan default
    }
    applyTheme(current.value.theme)
    applyColorScheme(current.value.colorScheme ?? 'nord')
    applyFont(current.value.fontText)
    applyFontMono(current.value.fontMono)
    applyFontSize(current.value.fontSize)
  }

  async function update(partial: Partial<Settings>) {
    current.value = { ...current.value, ...partial }
    if (partial.theme) applyTheme(partial.theme)
    if (partial.colorScheme) applyColorScheme(partial.colorScheme)
    if (partial.fontText !== undefined) applyFont(partial.fontText)
    if (partial.fontMono !== undefined) applyFontMono(partial.fontMono)
    if (partial.fontSize !== undefined) applyFontSize(partial.fontSize)
    try {
      const { ipc } = await import('@/lib/ipc')
      await ipc.settingsSave(current.value)
    } catch (e) {
      console.error('Gagal menyimpan settings:', e)
    }
  }

  return { current, load, update, applyTheme, applyColorScheme, applyFont }
})
