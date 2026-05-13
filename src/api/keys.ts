import client from './client'
import { delay, isMockMode, unwrap } from './_util'

/**
 * Front-end-facing shape of an API key. Mirrors sub2api's DTO (see
 * backend/internal/handler/api_key_handler.go) with two adjustments:
 *   - id is stringified for v-for stability.
 *   - group_name is hoisted from the nested `group` object that sub2api
 *     emits, so views don't have to reach through `key.group.name`.
 *
 * IP whitelists / blacklists are string[] upstream — the previous frontend
 * typed them as `string | null` which silently broke on the wire.
 */
export interface ApiKey {
  id: string
  name: string
  key: string
  group_id: number
  group_name: string
  /**
   * Platform of the bound group. Drives which client tabs the "Use this
   * key" modal shows (Claude Code vs Codex vs Gemini CLI vs …).
   */
  group_platform: 'anthropic' | 'openai' | 'gemini' | 'antigravity' | string
  /**
   * For OpenAI-platform groups: whether the gateway will dispatch incoming
   * `/v1/messages` (Anthropic protocol) requests to OpenAI upstreams. When
   * true we also offer Claude Code as a client option on such keys.
   */
  group_allow_messages_dispatch: boolean
  /** sub2api uses `active` and `inactive`; we render the rest defensively. */
  status: 'active' | 'inactive' | 'disabled' | 'error'
  ip_whitelist: string[] | null
  ip_blacklist: string[] | null
  last_used_at: string | null
  quota: number
  quota_used: number
  expires_at: string | null
  created_at: string
  updated_at: string
  rate_limit_5h: number
  rate_limit_1d: number
  rate_limit_7d: number
  usage_5h: number
  usage_1d: number
  usage_7d: number
}

/**
 * Fields the backend accepts on `PUT /keys/:id`. Every field is optional —
 * the server treats omitted fields as "no change". The two reset booleans
 * trigger a counter wipe without altering the limit value itself.
 */
export interface UpdateKeyPayload {
  name?: string
  group_id?: number
  status?: 'active' | 'inactive'
  ip_whitelist?: string[] | null
  ip_blacklist?: string[] | null
  quota?: number
  /** ISO 8601 string, or empty string `""` to clear the expiration. */
  expires_at?: string | null
  reset_quota?: boolean
  rate_limit_5h?: number
  rate_limit_1d?: number
  rate_limit_7d?: number
  reset_rate_limit_usage?: boolean
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: '1', name: 'production-backend', key: 'sk-proABC123abcdef9876543210fedcba0987654321abcdef0123456789ABCDEFo5p6',
    group_id: 2, group_name: 'default', group_platform: 'anthropic', group_allow_messages_dispatch: false,
    status: 'active',
    ip_whitelist: null, ip_blacklist: null, last_used_at: '2026-05-12T01:21:16Z',
    quota: 0, quota_used: 12.4, expires_at: null,
    created_at: '2025-11-02T08:30:00Z', updated_at: '2026-05-12T01:21:16Z',
    rate_limit_5h: 0, rate_limit_1d: 0, rate_limit_7d: 0,
    usage_5h: 0, usage_1d: 0, usage_7d: 0,
  },
  {
    id: '2', name: 'test', key: 'sk-tes456DEFabc987654321def0987654321abcdef0123456789ABCDEF123456l5k4',
    group_id: 5, group_name: 'free', group_platform: 'openai', group_allow_messages_dispatch: true,
    status: 'active',
    ip_whitelist: null, ip_blacklist: null, last_used_at: '2026-05-10T14:20:00Z',
    quota: 0, quota_used: 0, expires_at: null,
    created_at: '2025-12-15T14:20:00Z', updated_at: '2026-05-10T14:20:00Z',
    rate_limit_5h: 0, rate_limit_1d: 0, rate_limit_7d: 0,
    usage_5h: 0, usage_1d: 0, usage_7d: 0,
  },
]

interface RawApiKey {
  id: number
  name?: string | null
  key?: string
  group_id?: number
  group_name?: string
  group?: { id: number; name: string; platform?: string; allow_messages_dispatch?: boolean }
  status?: string
  ip_whitelist?: string[] | null
  ip_blacklist?: string[] | null
  last_used_at?: string | null
  quota?: number
  quota_used?: number
  expires_at?: string | null
  created_at?: string
  updated_at?: string
  rate_limit_5h?: number
  rate_limit_1d?: number
  rate_limit_7d?: number
  usage_5h?: number
  usage_1d?: number
  usage_7d?: number
}

function mapKey(raw: RawApiKey): ApiKey {
  return {
    id: String(raw.id),
    name: raw.name || '',
    key: raw.key || '',
    group_id: raw.group_id ?? 0,
    group_name: raw.group?.name || raw.group_name || '—',
    group_platform: (raw.group?.platform as ApiKey['group_platform']) || 'anthropic',
    group_allow_messages_dispatch: raw.group?.allow_messages_dispatch ?? false,
    status: (raw.status as ApiKey['status']) || 'active',
    ip_whitelist: raw.ip_whitelist ?? null,
    ip_blacklist: raw.ip_blacklist ?? null,
    last_used_at: raw.last_used_at ?? null,
    quota: raw.quota ?? 0,
    quota_used: raw.quota_used ?? 0,
    expires_at: raw.expires_at ?? null,
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || '',
    rate_limit_5h: raw.rate_limit_5h ?? 0,
    rate_limit_1d: raw.rate_limit_1d ?? 0,
    rate_limit_7d: raw.rate_limit_7d ?? 0,
    usage_5h: raw.usage_5h ?? 0,
    usage_1d: raw.usage_1d ?? 0,
    usage_7d: raw.usage_7d ?? 0,
  }
}

export async function getKeys(): Promise<ApiKey[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_KEYS.map((k) => ({ ...k }))
  }
  const body = unwrap<{ items?: RawApiKey[] } | RawApiKey[]>(await client.get('/keys'))
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map(mapKey)
}

export async function createKey(data: { name: string; group_id: number }): Promise<ApiKey> {
  if (isMockMode()) {
    await delay()
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: data.name,
      key: `sk-mock-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 64),
      group_id: data.group_id,
      group_name: 'default',
      group_platform: 'anthropic',
      group_allow_messages_dispatch: false,
      status: 'active',
      ip_whitelist: null, ip_blacklist: null, last_used_at: null,
      quota: 0, quota_used: 0, expires_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      rate_limit_5h: 0, rate_limit_1d: 0, rate_limit_7d: 0,
      usage_5h: 0, usage_1d: 0, usage_7d: 0,
    }
    MOCK_KEYS.unshift(newKey)
    return newKey
  }
  return mapKey(unwrap<RawApiKey>(await client.post('/keys', data)))
}

export async function updateKey(id: string, payload: UpdateKeyPayload): Promise<ApiKey> {
  if (isMockMode()) {
    await delay()
    const idx = MOCK_KEYS.findIndex((k) => k.id === id)
    if (idx < 0) throw new Error('Key not found')
    const next: ApiKey = { ...MOCK_KEYS[idx] }
    if (payload.name !== undefined) next.name = payload.name
    if (payload.group_id !== undefined) next.group_id = payload.group_id
    if (payload.status !== undefined) next.status = payload.status
    if (payload.ip_whitelist !== undefined) next.ip_whitelist = payload.ip_whitelist
    if (payload.ip_blacklist !== undefined) next.ip_blacklist = payload.ip_blacklist
    if (payload.quota !== undefined) next.quota = payload.quota
    if (payload.expires_at !== undefined) next.expires_at = payload.expires_at || null
    if (payload.reset_quota) next.quota_used = 0
    if (payload.rate_limit_5h !== undefined) next.rate_limit_5h = payload.rate_limit_5h
    if (payload.rate_limit_1d !== undefined) next.rate_limit_1d = payload.rate_limit_1d
    if (payload.rate_limit_7d !== undefined) next.rate_limit_7d = payload.rate_limit_7d
    if (payload.reset_rate_limit_usage) { next.usage_5h = 0; next.usage_1d = 0; next.usage_7d = 0 }
    next.updated_at = new Date().toISOString()
    MOCK_KEYS[idx] = next
    return { ...next }
  }
  return mapKey(unwrap<RawApiKey>(await client.put(`/keys/${id}`, payload)))
}

export async function deleteKey(id: string): Promise<void> {
  if (isMockMode()) {
    await delay()
    const idx = MOCK_KEYS.findIndex((k) => k.id === id)
    if (idx >= 0) MOCK_KEYS.splice(idx, 1)
    return
  }
  await client.delete(`/keys/${id}`)
}

/**
 * Where the gateway speaks — different path from the management API.
 * sub2api admins can override via `api_base_url` in /settings/public; we
 * fall back to the current origin + /v1.
 *
 * Treat the returned URL as the "OpenAI-style" base. Anthropic SDKs accept
 * the same root; the path layout matches both (/v1/messages,
 * /v1/chat/completions, /v1/models, /v1/responses).
 */
export function getGatewayBaseUrl(adminOverride?: string): string {
  if (adminOverride && adminOverride.trim()) {
    return adminOverride.replace(/\/+$/, '')
  }
  if (typeof window === 'undefined') return '/v1'
  return `${window.location.origin}/v1`
}
