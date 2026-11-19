import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/main.css'
import { isTauri } from '@/lib/ipc'
import { useSettingsStore } from '@/stores/settings'

const app = createApp(App)
app.use(createPinia())
await useSettingsStore().load()
app.mount('#app')

await nextTick()
if (isTauri) {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow().show()
}

window.addEventListener('contextmenu', (e) => {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return
  }
  e.preventDefault()
})

if (import.meta.env.PROD) {
  window.addEventListener('keydown', (e) => {
    if (
      e.key === 'F5' ||
      (e.ctrlKey && e.key === 'r') ||
      (e.ctrlKey && e.shiftKey && e.key === 'R') ||
      e.key === 'F12' ||
      (e.ctrlKey && e.key === 'p') ||
      (e.ctrlKey && e.key === 'f')
    ) {
      e.preventDefault()
    }
  })
}
