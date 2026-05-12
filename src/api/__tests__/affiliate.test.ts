import { describe, expect, it } from 'vitest'
import { mapInvitee } from '../affiliate'

describe('mapInvitee', () => {
  it('prefers username, then email, then user_id', () => {
    expect(mapInvitee({ username: 'alice', email: 'a@x', user_id: 7 }).user).toBe('alice')
    expect(mapInvitee({ email: 'b@x', user_id: 7 }).user).toBe('b@x')
    expect(mapInvitee({ user_id: 7 }).user).toBe('user_7')
    expect(mapInvitee({}).user).toBe('unknown')
  })

  it('prefers joined_at over created_at', () => {
    expect(mapInvitee({ joined_at: '2026-01-01', created_at: '2025-01-01' }).joinedAt).toBe('2026-01-01')
    expect(mapInvitee({ created_at: '2025-01-01' }).joinedAt).toBe('2025-01-01')
    expect(mapInvitee({}).joinedAt).toBe('')
  })

  it('reads rebate, falling back to rebate_quota; defaults to 0', () => {
    expect(mapInvitee({ rebate: 5 }).rebate).toBe(5)
    expect(mapInvitee({ rebate_quota: 9 }).rebate).toBe(9)
    expect(mapInvitee({ rebate: 5, rebate_quota: 9 }).rebate).toBe(5)
    expect(mapInvitee({}).rebate).toBe(0)
  })

  it('ignores non-numeric rebate values', () => {
    // toUSD only accepts numbers; anything else falls back to 0.
    // @ts-expect-error — deliberately wrong type to mimic a sloppy upstream payload
    expect(mapInvitee({ rebate: 'lol' }).rebate).toBe(0)
  })
})
