import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'

function loadInitial(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch { /* localStorage may be blocked */ }
  return 'system'
}

function resolveEffective(t: Theme): 'light' | 'dark' {
  if (t === 'system') {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return t
}

function paint(t: Theme) {
  if (typeof document === 'undefined') return
  const eff = resolveEffective(t)
  document.documentElement.classList.toggle('dark', eff === 'dark')
  // `color-scheme` hint helps the browser style native scrollbars and form
  // controls to match the theme.
  document.documentElement.style.colorScheme = eff
}

/**
 * Run before app mount so the first paint already carries the right theme —
 * otherwise dark-preferring users get a flash of light theme.
 */
export function applyInitialTheme(): void {
  paint(loadInitial())
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(loadInitial())

  function setTheme(next: Theme) {
    theme.value = next
  }

  function toggle() {
    const order: Theme[] = ['light', 'dark', 'system']
    const idx = order.indexOf(theme.value)
    theme.value = order[(idx + 1) % order.length]
  }

  function resolve(t: Theme = theme.value): 'light' | 'dark' {
    return resolveEffective(t)
  }

  // React to live OS preference changes while in `system` mode.
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => { if (theme.value === 'system') paint('system') }
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
    }
  }

  watch(
    theme,
    (t) => {
      try { localStorage.setItem(STORAGE_KEY, t) } catch { /* ignored */ }
      paint(t)
    },
    { immediate: true },
  )

  return { theme, setTheme, toggle, resolve }
})
