import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|js)'],
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  /**
   * Storybook uses the same vite config as the SPA, which includes
   * vite-plugin-pwa. The PWA plugin chokes on Storybook's large internal
   * runtime chunks (Workbox precache cap is 2 MB and Storybook's
   * `sb-manager/globals-runtime.js` is ~3 MB). Strip it out — we don't
   * want a service worker in the docs preview anyway.
   */
  viteFinal: async (config) => {
    config.plugins = (config.plugins ?? []).filter(
      (p) => !(p && typeof p === 'object' && 'name' in p && String((p as { name?: unknown }).name).includes('pwa')),
    )
    return config
  },
}
export default config
