import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'light')

  function applyTheme(t: Theme) {
    const html = document.documentElement
    if (t === 'dark') {
      html.classList.add('dark')
    } else if (t === 'light') {
      html.classList.remove('dark')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('dark', prefersDark)
    }
  }

  function setTheme(t: Theme) {
    theme.value = t
  }

  function toggle() {
    const order: Theme[] = ['light', 'dark', 'system']
    const idx = order.indexOf(theme.value)
    theme.value = order[(idx + 1) % order.length]
  }

  watch(
    theme,
    (t) => {
      localStorage.setItem('theme', t)
      applyTheme(t)
    },
    { immediate: true },
  )

  return { theme, setTheme, toggle }
})
