import { ref } from 'vue'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export function useUpdater() {
  const isChecking = ref(false)
  const isDownloading = ref(false)
  const downloadProgress = ref(0)
  const availableVersion = ref<string | null>(null)
  const releaseNotes = ref<string | null>(null)

  async function checkForUpdate() {
    isChecking.value = true
    availableVersion.value = null
    releaseNotes.value = null

    try {
      const update = await check()
      if (update) {
        availableVersion.value = update.version
        releaseNotes.value = update.body ?? null
        return update
      }
      return null
    } catch (error) {
      console.error('Gagal mengecek update:', error)
      return null
    } finally {
      isChecking.value = false
    }
  }

  async function downloadAndInstall() {
    const update = await check()
    if (!update) return

    isDownloading.value = true
    downloadProgress.value = 0
    let downloaded = 0
    let contentLength = 0

    try {
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
      throw error
    } finally {
      isDownloading.value = false
    }
  }

  return {
    isChecking,
    isDownloading,
    downloadProgress,
    availableVersion,
    releaseNotes,
    checkForUpdate,
    downloadAndInstall,
  }
}
