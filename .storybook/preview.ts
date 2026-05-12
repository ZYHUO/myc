import type { Preview } from '@storybook/vue3-vite'
import { createPinia } from 'pinia'
import { setup } from '@storybook/vue3-vite'

// Pull in the same global stylesheet the SPA uses so Tailwind utility classes
// and our Claude design-system CSS variables resolve identically in stories.
import '../src/style.css'
import { i18n } from '../src/i18n'

// Apply Pinia + vue-i18n to every story instance — without these, any
// component that calls `useI18n()` or `useAuthStore()` throws inside the
// Storybook iframe.
setup((app) => {
  app.use(createPinia())
  app.use(i18n)
})

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'paper',
      values: [
        { name: 'paper', value: '#FAF9F5' },
        { name: 'card', value: '#FFFFFF' },
        { name: 'dark', value: '#262624' },
      ],
    },
  },
  // Add a top-level toggle so every story can be previewed in dark mode.
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Toggle Claude design-system theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  decorators: [
    (story, context) => {
      const theme = context.globals.theme as 'light' | 'dark'
      // Re-apply on every render so the toolbar toggle is live.
      document.documentElement.classList.toggle('dark', theme === 'dark')
      return { components: { story }, template: '<story />' }
    },
  ],
}

export default preview
