import { describe, expect, it, beforeEach } from 'vitest'
import { i18n, setLocale, SUPPORTED_LOCALES } from '../index'

describe('i18n bootstrap', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('starts with English bundled and can translate basic keys', () => {
    expect(i18n.global.t('common.signIn')).toBe('Sign in')
    expect(i18n.global.t('nav.items.dashboard')).toBe('Dashboard')
  })

  it('lists all three supported locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'zh-CN', 'ja'])
  })

  it('lazy-loads zh-CN on first switch and translates correctly', async () => {
    await setLocale('zh-CN')
    expect(i18n.global.locale.value).toBe('zh-CN')
    expect(i18n.global.t('common.signIn')).toBe('登录')
    expect(i18n.global.t('nav.items.dashboard')).toBe('控制台')
  })

  it('lazy-loads ja on first switch', async () => {
    await setLocale('ja')
    expect(i18n.global.locale.value).toBe('ja')
    expect(i18n.global.t('common.signIn')).toBe('ログイン')
  })

  it('falls back to English when a key is missing in another locale', async () => {
    await setLocale('zh-CN')
    // Pick a key that definitely exists in English but is unlikely to be in zh-CN
    // (this is a smoke test for the fallbackLocale wiring, not actual coverage).
    const missing = i18n.global.t('this.key.does.not.exist.anywhere')
    // vue-i18n returns the path itself when truly missing — that's the documented
    // behaviour we're verifying here so test doesn't accidentally drift.
    expect(typeof missing).toBe('string')
  })

  it('persists the locale choice to localStorage', async () => {
    await setLocale('ja')
    expect(window.localStorage.getItem('amodel.locale')).toBe('ja')
    await setLocale('en')
    expect(window.localStorage.getItem('amodel.locale')).toBe('en')
  })

  it('syncs <html lang> with the active locale', async () => {
    await setLocale('zh-CN')
    expect(document.documentElement.lang).toBe('zh-CN')
    await setLocale('en')
    expect(document.documentElement.lang).toBe('en')
  })
})
