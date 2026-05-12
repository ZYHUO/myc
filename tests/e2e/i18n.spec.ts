import { test, expect } from '@playwright/test'

test.describe('Locale switching', () => {
  test('detects English by default and switches to 简体中文', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    // Open the language switcher (its trigger has the language icon).
    const trigger = page.getByRole('button', { name: 'Language' })
    await trigger.click()
    await page.getByRole('option', { name: /简体中文/ }).click()

    // <html lang> updates and Chinese strings appear in the hero.
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
    await expect(page.locator('h1')).toContainText('一把密钥')
  })

  test('Auto follows the browser locale at switch time', async ({ page, context }) => {
    // Brand-new context with French; "Auto" should land on English since
    // we don't support fr- and our fallback chain is en.
    await context.clearCookies()
    await page.goto('/')

    const trigger = page.getByRole('button', { name: 'Language' })
    await trigger.click()
    await page.getByRole('option', { name: /Auto/ }).click()

    // English shows in <html lang> because navigator.language is en-US here.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('persisted choice survives a reload', async ({ page }) => {
    await page.goto('/')
    const trigger = page.getByRole('button', { name: 'Language' })
    await trigger.click()
    await page.getByRole('option', { name: /日本語/ }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
    // Hero should still be Japanese on reload.
    await expect(page.locator('h1')).toContainText('すべてのモデルへ')
  })
})
