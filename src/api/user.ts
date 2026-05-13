import client from './client'
import { delay, isMockMode, unwrap } from './_util'

/**
 * User profile + identity-bindings API. Wraps sub2api's:
 *
 *   GET    /user/profile         — full profile incl. identities
 *   PUT    /user                  — partial update (4 fields, all optional)
 *   PUT    /user/password         — change password
 *
 * Identities (the OAuth / email account bindings the user has linked) are
 * surfaced on /user/profile and on /auth/me alike; we type them once here
 * so both call sites share the shape.
 */

/**
 * Per-provider binding info. sub2api emits `bind_start_path` as a URL the
 * frontend redirects to in order to start the OAuth dance for binding.
 */
export interface IdentityBinding {
  provider: string
  /** True when the user has linked this provider. */
  bound: boolean
  /** How many distinct accounts of this provider are linked (usually 0 or 1). */
  bound_count: number
  /** Display label coming from the provider (e.g. "z***5@gmail.com"). */
  display_name?: string
  /** Stable hint of the bound subject (masked email or username). */
  subject_hint?: string
  /** Whether the user is allowed to start a new bind flow. */
  can_bind: boolean
  /** Whether the user is allowed to detach this binding. */
  can_unbind: boolean
  /** URL to GET to start the OAuth bind flow (provider-side); empty when can_bind=false. */
  bind_start_path?: string
  /** Optional explanatory note from the backend. */
  note?: string
  note_key?: string
  /** When the binding was verified (email providers). */
  verified_at?: string
  /** Provider-side key (e.g. "email", "github"). */
  provider_key?: string
}

export interface UserProfile {
  id: number
  email: string
  username: string
  role: string
  status: string
  balance: number
  total_recharged: number
  concurrency: number
  rpm_limit: number
  allowed_groups: number[]
  balance_notify_enabled: boolean
  balance_notify_threshold: number | null
  balance_notify_extra_emails: string[] | null
  created_at: string
  updated_at: string
  /** Map of provider → binding info. Keys include 'email', 'github',
   *  'google', 'linuxdo', 'wechat', 'oidc' — whichever the backend
   *  supports for this deployment. */
  identities: Record<string, IdentityBinding>
}

export interface UpdateProfilePayload {
  username?: string
  avatar_url?: string
  balance_notify_enabled?: boolean
  balance_notify_threshold?: number
}

const MOCK_PROFILE: UserProfile = {
  id: 1,
  email: 'demo@example.com',
  username: 'demo',
  role: 'user',
  status: 'active',
  balance: 42.5,
  total_recharged: 100,
  concurrency: 10,
  rpm_limit: 0,
  allowed_groups: [2, 5],
  balance_notify_enabled: false,
  balance_notify_threshold: null,
  balance_notify_extra_emails: null,
  created_at: '2026-01-15T08:00:00Z',
  updated_at: '2026-05-12T00:00:00Z',
  identities: {
    email: {
      provider: 'email',
      bound: true,
      bound_count: 1,
      display_name: 'demo@example.com',
      can_bind: false,
      can_unbind: false,
    },
    github: {
      provider: 'github',
      bound: false,
      bound_count: 0,
      can_bind: true,
      can_unbind: false,
      bind_start_path: '/api/v1/auth/oauth/github/bind/start',
    },
  },
}

export async function getProfile(): Promise<UserProfile> {
  if (isMockMode()) {
    await delay()
    return { ...MOCK_PROFILE, identities: { ...MOCK_PROFILE.identities } }
  }
  return unwrap<UserProfile>(await client.get('/user/profile'))
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  if (isMockMode()) {
    await delay(400)
    if (payload.username !== undefined) MOCK_PROFILE.username = payload.username
    if (payload.balance_notify_enabled !== undefined) MOCK_PROFILE.balance_notify_enabled = payload.balance_notify_enabled
    if (payload.balance_notify_threshold !== undefined) MOCK_PROFILE.balance_notify_threshold = payload.balance_notify_threshold
    return { ...MOCK_PROFILE }
  }
  return unwrap<UserProfile>(await client.put('/user', payload))
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  if (isMockMode()) {
    await delay(500)
    if (oldPassword === 'wrong') throw new Error('Old password is incorrect')
    return
  }
  await client.put('/user/password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

/**
 * Open the OAuth bind flow for a provider. The browser navigates to the
 * provider-supplied URL (which round-trips through sub2api's OAuth state
 * server-side); on completion, the user lands back on the SPA. The
 * profile page should refetch /user/profile on mount so the binding list
 * stays in sync.
 */
export function startBind(binding: IdentityBinding): void {
  if (!binding.bind_start_path) return
  // Same-origin redirect — works regardless of where the SPA is hosted.
  window.location.href = binding.bind_start_path
}
