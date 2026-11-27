import { ref } from 'vue'
import { idMessages, type Messages } from './locales/id'
import { enMessages } from './locales/en'

export type Locale = 'id' | 'en'

const locales: Record<Locale, Messages> = {
  id: idMessages,
  en: enMessages,
}

export const currentLocale = ref<Locale>('id')

export function setLocale(locale: Locale) {
  currentLocale.value = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

export const t: Messages = new Proxy({} as Messages, {
  get(_target, prop: string) {
    return locales[currentLocale.value][prop as keyof Messages]
  },
})
