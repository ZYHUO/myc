import { createI18n } from 'vue-i18n'
import en from './locales/en'

export type SupportedLocale = 'en' | 'zh-CN' | 'ja'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh-CN', 'ja']

const STORAGE_KEY = 'amodel.locale'

/**
 * Decide which locale to start with: user choice in localStorage trumps
 * everything; otherwise sniff `navigator.language`; English is the fallback.
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

/**
 * English is bundled into the main chunk (it's the fallback and any missing
 * key in another locale falls back to it). The other locales are dynamic
 * imports so Vite splits them into their own chunks loaded only when the
 * user selects them. Net: ~2 KB gzip off the initial bundle.
 */
const lazyLoaders: Record<Exclude<SupportedLocale, 'en'>, () => Promise<{ default: typeof en }>> = {
  'zh-CN': () => import('./locales/zh-CN'),
  ja: () => import('./locales/ja'),
}

const loaded = new Set<SupportedLocale>(['en'])

export const i18n = createI18n({
  legacy: false,
  locale: 'en',                   // overwritten below once we know the target
  fallbackLocale: 'en',
  // Empty placeholders for the lazy locales keep vue-i18n's locale-type
  // inference broad — without them `locale.value = 'zh-CN'` becomes a TS
  // error because the union narrows to just 'en'.
  messages: { en, 'zh-CN': {}, ja: {} },
  // We render plenty of dynamic UI text from API responses; not every key has
  // a translation, and missing keys are fine — vue-i18n's warnings just spam
  // the console.
  missingWarn: false,
  fallbackWarn: false,
})

async function ensureLoaded(loc: SupportedLocale): Promise<void> {
  if (loaded.has(loc)) return
  if (loc === 'en') return  // already in initial bundle
  const mod = await lazyLoaders[loc]()
  i18n.global.setLocaleMessage(loc, mod.default)
  loaded.add(loc)
}

export async function setLocale(loc: SupportedLocale): Promise<void> {
  await ensureLoaded(loc)
  i18n.global.locale.value = loc
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(STORAGE_KEY, loc) } catch { /* localStorage may be blocked */ }
    document.documentElement.lang = loc
  }
}

/**
 * Called from main.ts before app.mount() so the first paint uses the right
 * locale. If it's not English, we await the dynamic import — a tiny delay
 * (~50 ms over a fast connection) but avoids a flash of English content.
 */
export async function bootstrapLocale(): Promise<void> {
  const target = detectLocale()
  if (target !== 'en') {
    try {
      await ensureLoaded(target)
    } catch {
      // Network failed — stay on English, the fallback.
      return
    }
  }
  i18n.global.locale.value = target
  if (typeof window !== 'undefined') {
    document.documentElement.lang = target
  }
}
