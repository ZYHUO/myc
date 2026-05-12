import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

// Pin to a known scheme so the axe color-contrast pass is reproducible.
test.use({ colorScheme: 'light' })

/**
 * Wait for the SPA to fully boot: the inline `#app-boot` splash must be
 * gone (main.ts removes it ~280ms after mount), and the entrance
 * animations need to settle so axe doesn't flag mid-fade opacity.
 */
async function waitForReady(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForSelector('#app-boot', { state: 'detached', timeout: 5000 })
  // Give the staggered slide-up animations time to finish (longest delay
  // is 600ms in the hero).
  await page.waitForTimeout(900)
}

test.describe('Landing page', () => {
  test('renders headline, provider strip, and primary CTAs', async ({ page }) => {
    await waitForReady(page)
    await expect(page.locator('h1')).toHaveText(/One key.*every model/s)
    await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' }).first()).toBeVisible()
    // Provider marquee — at minimum Claude and GPT appear (they're duplicated
    // in the marquee strip so .first() is safe).
    await expect(page.getByText('Claude').first()).toBeVisible()
    await expect(page.getByText('GPT').first()).toBeVisible()
  })

  test('"Sign in" navigates to /login with no app chrome', async ({ page }) => {
    await waitForReady(page)
    await page.getByRole('button', { name: 'Sign in' }).first().click()
    await page.waitForURL('**/login')
    await expect(page.getByText('Welcome back', { exact: false })).toBeVisible()
    // No sidebar nav items leak through.
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  })

  test('"Get started" navigates to /register', async ({ page }) => {
    await waitForReady(page)
    await page.getByRole('button', { name: 'Get started' }).first().click()
    await page.waitForURL('**/register')
    // Register page has its own "Get started" h1 plus form fields unique to /register.
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('shows the inline boot splash before the SPA mounts', async ({ page }) => {
    // The splash lives in index.html so it paints before main.ts runs. We
    // delay the entry bundle to make the splash visible long enough to assert.
    await page.route('**/assets/index-*.js', async (route) => {
      await new Promise((r) => setTimeout(r, 400))
      await route.continue()
    })
    await page.goto('/', { waitUntil: 'commit' })
    await expect(page.locator('#app-boot')).toBeVisible({ timeout: 2000 })
    await expect(page.locator('.boot-spinner')).toBeVisible()
  })

  test('has no critical or serious axe violations', async ({ page }) => {
    await waitForReady(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      // `region` flags pages that don't wrap content in a <main>; the
      // landing structure intentionally uses <section>s. Acceptable here.
      .disableRules(['region'])
      .analyze()
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(blocking, JSON.stringify(blocking, null, 2)).toHaveLength(0)
  })
})
