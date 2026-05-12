import { createI18n } from 'vue-i18n'
import en from './locales/en'
import zhCN from './locales/zh-CN'
import ja from './locales/ja'

export type SupportedLocale = 'en' | 'zh-CN' | 'ja'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh-CN', 'ja']

const STORAGE_KEY = 'amodel.locale'

/**
 * Decide which locale to start with: user choice in localStorage trumps
 * everything; otherwise we sniff `navigator.language` and pick the best
 * match; English is the final fallback.
 */
function detectLocale(): SupportedLocale {
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved && (SUPPORTED_LOCALES as string[]).includes(saved)) {
      return saved as SupportedLocale
    }
    const nav = (window.navigator.language || '').toLowerCase()
    if (nav.startsWith('zh')) return 'zh-CN'
    if (nav.startsWith('ja')) return 'ja'
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
    ja,
  },
  // We render plenty of dynamic UI text from API responses; not every key has
  // a translation, and missing keys are fine — vue-i18n's warnings just spam
  // the console.
  missingWarn: false,
  fallbackWarn: false,
})

export function setLocale(loc: SupportedLocale) {
  i18n.global.locale.value = loc
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, loc)
    document.documentElement.lang = loc
  }
}

// Keep <html lang> in sync on first render so screen readers and Tailwind
// `lang:` selectors (if any) get the right value.
if (typeof window !== 'undefined') {
  document.documentElement.lang = i18n.global.locale.value
}
