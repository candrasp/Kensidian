import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  id: string
  message: string
  kind: ToastKind
  timeoutMs: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])

  function dismiss(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function show(message: string, kind: ToastKind = 'info', timeoutMs = 3000) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const item: ToastItem = { id, message, kind, timeoutMs }
    toasts.value.push(item)

    if (timeoutMs > 0) {
      setTimeout(() => {
        dismiss(id)
      }, timeoutMs)
    }
  }

  const success = (msg: string) => show(msg, 'success')
  const error = (msg: string) => show(msg, 'error', 4500)
  const warn = (msg: string) => show(msg, 'warning', 4000)

  return { toasts, show, dismiss, success, error, warn }
})
