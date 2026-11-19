import { ref } from 'vue'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const GITHUB_REPO = 'candrasp/kensidian'
const DEFAULT_NOTES = 'Tidak ada catatan rilis untuk versi ini.'

// Shared state across components
const isChecking = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const availableVersion = ref<string | null>(null)
const releaseDate = ref<string | null>(null)
const releaseNotes = ref<string | null>(null)

async function fetchNotesFromGitHub(version: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/v${version}`,
      { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal },
    )
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json() as { body?: unknown }
    const body = typeof data.body === 'string' ? data.body.trim() : ''
    return body || null
  } catch {
    return null
  }
}

export function useUpdater() {
  async function checkForUpdate() {
    isChecking.value = true
    availableVersion.value = null
    releaseDate.value = null
    releaseNotes.value = null

    try {
      const update = await check()
      if (update) {
        availableVersion.value = update.version
        releaseDate.value = update.date ?? null
        let notes = update.body?.trim() || null
        if (!notes) notes = await fetchNotesFromGitHub(update.version)
        releaseNotes.value = notes ?? DEFAULT_NOTES
        return update
      }
      return null
    } catch (error) {
      console.error('Gagal mengecek update:', error)
      throw error
    } finally {
      isChecking.value = false
    }
  }

  async function downloadAndInstall() {
    isDownloading.value = true
    downloadProgress.value = 0

    try {
      const update = await check()
      if (!update) {
        throw new Error('Tidak ada update tersedia')
      }

      let downloaded = 0
      let contentLength = 0

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0
            break
          case 'Progress':
            downloaded += event.data.chunkLength
            if (contentLength > 0) {
              downloadProgress.value = Math.round((downloaded / contentLength) * 100)
            }
            break
          case 'Finished':
            downloadProgress.value = 100
            break
        }
      })

      await relaunch()
    } catch (error) {
      console.error('Gagal mengunduh/memasang update:', error)
      isDownloading.value = false
      downloadProgress.value = 0
      throw error
    }
  }

  return {
    isChecking,
    isDownloading,
    downloadProgress,
    availableVersion,
    releaseDate,
    releaseNotes,
    checkForUpdate,
    downloadAndInstall,
  }
}
