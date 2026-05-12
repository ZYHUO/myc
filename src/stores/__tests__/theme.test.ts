import { describe, expect, it } from 'vitest'
import { resolveEffective } from '../theme'

describe('resolveEffective', () => {
  it('returns the explicit mode unchanged for light/dark', () => {
    expect(resolveEffective('light')).toBe('light')
    expect(resolveEffective('dark')).toBe('dark')
  })

  it('uses the injected prefersDark flag for system mode', () => {
    expect(resolveEffective('system', true)).toBe('dark')
    expect(resolveEffective('system', false)).toBe('light')
  })

  it('falls back to light in system mode when matchMedia is unavailable', () => {
    // happy-dom provides matchMedia by default; we override it to confirm the fallback path.
    const original = window.matchMedia
    // @ts-expect-error — deliberately stripping matchMedia
    delete window.matchMedia
    try {
      expect(resolveEffective('system')).toBe('light')
    } finally {
      window.matchMedia = original
    }
  })
})
