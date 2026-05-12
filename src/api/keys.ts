import client from './client'
import { delay, isMockMode } from './_util'

export interface ApiKey {
  id: string
  name: string
  key: string
  group_id: number
  group_name: string
  status: 'active' | 'inactive' | 'disabled'
  ip_whitelist: string | null
  ip_blacklist: string | null
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

const MOCK_KEYS: ApiKey[] = [
  {
    id: '1', name: '生产环境-主密钥', key: 'sk-pro...o5p6',
    group_id: 2, group_name: 'default', status: 'active',
    ip_whitelist: null, ip_blacklist: null, last_used_at: '2026-05-12T01:21:16Z',
    quota: 0, quota_used: 0, expires_at: null,
    created_at: '2025-11-02T08:30:00Z', updated_at: '2026-05-12T01:21:16Z',
    rate_limit_5h: 0, rate_limit_1d: 0, rate_limit_7d: 0,
    usage_5h: 0, usage_1d: 0, usage_7d: 0,
  },
  {
    id: '2', name: '测试环境', key: 'sk-tes...l5k4',
    group_id: 5, group_name: 'free', status: 'active',
    ip_whitelist: null, ip_blacklist: null, last_used_at: '2026-05-10T14:20:00Z',
    quota: 0, quota_used: 0, expires_at: null,
    created_at: '2025-12-15T14:20:00Z', updated_at: '2026-05-10T14:20:00Z',
    rate_limit_5h: 0, rate_limit_1d: 0, rate_limit_7d: 0,
    usage_5h: 0, usage_1d: 0, usage_7d: 0,
  },
]

// Map real API response to our interface
function mapKey(raw: any): ApiKey {
  return {
    id: String(raw.id),
    name: raw.name || '',
    key: raw.key || '',
    group_id: raw.group_id || 0,
    group_name: raw.group?.name || raw.group_name || '--',
    status: raw.status || 'active',
    ip_whitelist: raw.ip_whitelist,
    ip_blacklist: raw.ip_blacklist,
    last_used_at: raw.last_used_at,
    quota: raw.quota || 0,
    quota_used: raw.quota_used || 0,
    expires_at: raw.expires_at,
    created_at: raw.created_at || '',
    updated_at: raw.updated_at || '',
    rate_limit_5h: raw.rate_limit_5h || 0,
    rate_limit_1d: raw.rate_limit_1d || 0,
    rate_limit_7d: raw.rate_limit_7d || 0,
    usage_5h: raw.usage_5h || 0,
    usage_1d: raw.usage_1d || 0,
    usage_7d: raw.usage_7d || 0,
  }
}

export async function getKeys(): Promise<ApiKey[]> {
  if (isMockMode()) {
    await delay()
    return [...MOCK_KEYS]
  }
  const res = await client.get('/keys')
  const items = res.data.data?.items || res.data.items || res.data
  return Array.isArray(items) ? items.map(mapKey) : []
}

export async function createKey(data: { name: string; group_id: number }): Promise<ApiKey> {
  if (isMockMode()) {
    await delay()
    return {
      id: String(Date.now()),
      name: data.name,
      key: `sk-mock-${Math.random().toString(36).slice(2, 10)}`,
      group_id: data.group_id,
      group_name: 'default',
      status: 'active',
      ip_whitelist: null, ip_blacklist: null, last_used_at: null,
      quota: 0, quota_used: 0, expires_at: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      rate_limit_5h: 0, rate_limit_1d: 0, rate_limit_7d: 0,
      usage_5h: 0, usage_1d: 0, usage_7d: 0,
    }
  }
  const res = await client.post('/keys', data)
  return mapKey(res.data.data || res.data)
}

export async function updateKey(id: string, data: Partial<{ name: string; group_id: number; status: string }>): Promise<ApiKey> {
  if (isMockMode()) {
    await delay()
    const key = MOCK_KEYS.find(k => k.id === id)
    if (!key) throw new Error('Key not found')
    Object.assign(key, data)
    return { ...key }
  }
  const res = await client.put(`/keys/${id}`, data)
  return mapKey(res.data.data || res.data)
}

export async function deleteKey(id: string): Promise<void> {
  if (isMockMode()) {
    await delay()
    return
  }
  await client.delete(`/keys/${id}`)
}
