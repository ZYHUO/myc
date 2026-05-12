import { test, expect } from '@playwright/test'

test.describe('Theme switching', () => {
  test('respects prefers-color-scheme: dark on first load when in System mode', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' })
    const page = await ctx.newPage()
    await page.goto('/')
    // System mode is the default — <html> should carry the .dark class.
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)
    await ctx.close()
  })

  test('switching to Light mode pins to light regardless of OS', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' })
    const page = await ctx.newPage()
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Theme' })
    await trigger.click()
    await page.getByRole('option', { name: /Light/ }).click()

    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    await ctx.close()
  })

  test('switching back to System reflects OS', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' })
    const page = await ctx.newPage()
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Theme' })
    await trigger.click()
    await page.getByRole('option', { name: /Dark/ }).click()
    await expect(page.locator('html')).toHaveClass(/\bdark\b/)

    await trigger.click()
    await page.getByRole('option', { name: /System/ }).click()
    // Back to System with OS=light → no .dark class.
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
    await ctx.close()
  })
})
