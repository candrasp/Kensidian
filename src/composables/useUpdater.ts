import { ref } from 'vue'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

// Shared state across components
const isChecking = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const availableVersion = ref<string | null>(null)
const releaseDate = ref<string | null>(null)
const releaseNotes = ref<string | null>(null)

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
        releaseNotes.value = update.body ?? null
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
