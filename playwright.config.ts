import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke / a11y suite for the public surface of the SPA.
 *
 * We boot `vite preview` against a fresh production build — this matches
 * what a real visitor sees (no HMR, no /node_modules requests). The dev
 * server's API proxy isn't replicated in `vite preview`, so the tests run
 * in mock mode where the SPA stays self-contained. Real-backend E2E
 * belongs in a separate suite that we'd point at staging.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'en-US',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `--mode test` loads `.env.test`, which pins VITE_USE_MOCK=true. This
    // beats whatever a developer has in `.env.local` (Vite's mode-specific
    // env files take precedence over the catch-all). `vue-tsc -b` is part
    // of the regular `pnpm build`; for E2E we skip it to halve the cold
    // start — we already run vue-tsc via `pnpm test` in CI.
    command:
      'pnpm exec vite build --mode test && pnpm preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
