import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Login + Register pages', () => {
  test('login renders without app chrome and has no critical axe issues', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('#app-boot', { state: 'detached', timeout: 5000 })
    await page.waitForTimeout(400) // settle entrance animations
    // No sidebar links exist on a public page.
    await expect(page.getByRole('link', { name: 'API Keys' })).toHaveCount(0)
    // Form fields are present and labelled.
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['region'])
      .analyze()
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(blocking, JSON.stringify(blocking, null, 2)).toHaveLength(0)
  })

  test('register page shows i18n-driven form in mock mode', async ({ page }) => {
    await page.goto('/register')
    await page.waitForSelector('#app-boot', { state: 'detached', timeout: 5000 })
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('At least 6 characters')).toBeVisible()
    await expect(page.getByPlaceholder('Repeat password')).toBeVisible()
  })

  test('mock login lands on /dashboard with the AppLayout chrome', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('whatever123')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.waitForURL('**/dashboard')
    // Sidebar should now appear (chrome is gated on auth.isAuthenticated).
    await expect(page.getByRole('link', { name: 'API Keys' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  })
})
