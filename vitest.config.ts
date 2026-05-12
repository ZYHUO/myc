/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Kept separate from vite.config.ts because the dev server config (port/proxy)
// has no business leaking into the test runner. Tailwind isn't needed for unit
// tests so we skip the plugin to keep cold-start fast.
export default defineConfig({
  plugins: [vue()],
  // The runtime watchdog (src/utils/update-check.ts) references these
  // build-time constants. We don't actually call it from tests, but TS
  // compilation walks the imports, so the constants must resolve.
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __APP_BUILT_AT__: JSON.stringify(new Date(0).toISOString()),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/__tests__/**', 'src/i18n/locales/**'],
    },
  },
})
