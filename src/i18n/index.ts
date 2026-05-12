import { createI18n } from 'vue-i18n'
import en from './locales/en'

/** Locales the app can actually display. */
export type SupportedLocale = 'en' | 'zh-CN' | 'ja'

/** What the user can pick. `auto` means "follow the browser language". */
export type LocalePreference = SupportedLocale | 'auto'

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'zh-CN', 'ja']
export const LOCALE_OPTIONS: LocalePreference[] = ['auto', 'en', 'zh-CN', 'ja']

const STORAGE_KEY = 'amodel.locale'

/** Map navigator.language to one of our supported locales. */
function detectFromBrowser(): SupportedLocale {
  if (typeof window === 'undefined') return 'en'
  const nav = (window.navigator.language || '').toLowerCase()
  if (nav.startsWith('zh')) return 'zh-CN'
  if (nav.startsWith('ja')) return 'ja'
  return 'en'
}

/** What the user saved in localStorage, or `auto` if nothing/unknown. */
function loadPreference(): LocalePreference {
  if (typeof window === 'undefined') return 'auto'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'auto') return 'auto'
    if (saved && (SUPPORTED_LOCALES as string[]).includes(saved)) {
      return saved as SupportedLocale
    }
  } catch {
    // localStorage may be disabled / quota-full
  }
  return 'auto'
}

/** Resolve a preference into an effective locale. */
export function resolvePreference(pref: LocalePreference): SupportedLocale {
  return pref === 'auto' ? detectFromBrowser() : pref
}

let currentPref: LocalePreference = loadPreference()

export function getLocalePreference(): LocalePreference {
  return currentPref
}

/**
 * English is bundled into the main chunk (the fallback). The other locales
 * are dynamic imports so Vite splits them into separate chunks loaded only
 * when needed. Net: ~12 KB gzip off the initial bundle for English users.
 */
const lazyLoaders: Record<Exclude<SupportedLocale, 'en'>, () => Promise<{ default: typeof en }>> = {
  'zh-CN': () => import('./locales/zh-CN'),
  ja: () => import('./locales/ja'),
}

const loaded = new Set<SupportedLocale>(['en'])

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  // Empty placeholders for the lazy locales keep vue-i18n's locale-type
  // inference broad — without them `locale.value = 'zh-CN'` is a TS error
  // because the union narrows to just 'en'.
  messages: { en, 'zh-CN': {}, ja: {} },
  missingWarn: false,
  fallbackWarn: false,
})

async function ensureLoaded(loc: SupportedLocale): Promise<void> {
  if (loaded.has(loc)) return
  if (loc === 'en') return
  const mod = await lazyLoaders[loc]()
  i18n.global.setLocaleMessage(loc, mod.default)
  loaded.add(loc)
}

function syncHtmlLang(loc: SupportedLocale) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = loc
  }
}

/**
 * Persist a preference (auto / en / zh-CN / ja) and apply the effective
 * locale. When the user picks `auto`, the effective locale is recomputed
 * from `navigator.language` and may differ from the persisted value.
 */
export async function setLocalePreference(pref: LocalePreference): Promise<void> {
  currentPref = pref
  const effective = resolvePreference(pref)
  await ensureLoaded(effective)
  i18n.global.locale.value = effective
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      /* ignored */
    }
    syncHtmlLang(effective)
  }
}

/**
 * Back-compat helper for tests and direct callers: pin to a concrete
 * locale (no auto). Persists the chosen locale as the preference.
 */
export async function setLocale(loc: SupportedLocale): Promise<void> {
  await setLocalePreference(loc)
}

/**
 * Called from main.ts before app.mount() so the first paint uses the right
 * locale. If it's a non-English target, awaits the dynamic import so the
 * user doesn't see a flash of English content.
 */
export async function bootstrapLocale(): Promise<void> {
  const pref = loadPreference()
  currentPref = pref
  const effective = resolvePreference(pref)
  if (effective !== 'en') {
    try {
      await ensureLoaded(effective)
    } catch {
      return // Network failed — stay on English.
    }
  }
  i18n.global.locale.value = effective
  syncHtmlLang(effective)
}
