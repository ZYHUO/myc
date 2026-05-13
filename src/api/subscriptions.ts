import client from './client'
import { delay, isMockMode, unwrap, httpStatus } from './_util'

export interface Subscription {
  id: string
  group_id: number
  group_name: string
  subscription_type: string
  platform: string
  status: 'active' | 'expired' | 'suspended'
  starts_at: string
  expires_at: string
  // Usage
  daily_usage_usd: number
  weekly_usage_usd: number
  monthly_usage_usd: number
  // Limits
  daily_limit_usd: number
  weekly_limit_usd: number
  monthly_limit_usd: number
  // Features
  allow_image_generation: boolean
  rpm_limit: number
}

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '1', group_id: 7, group_name: 'pro20x', subscription_type: 'subscription',
    platform: 'openai', status: 'active',
    starts_at: '2026-05-07T00:00:00Z', expires_at: '2026-06-06T00:00:00Z',
    daily_usage_usd: 7.78, weekly_usage_usd: 61.95, monthly_usage_usd: 61.95,
    daily_limit_usd: 0, weekly_limit_usd: 420, monthly_limit_usd: 1680,
    allow_image_generation: true, rpm_limit: 0,
  },
  {
    id: '2', group_id: 6, group_name: 'mimo', subscription_type: 'subscription',
    platform: 'anthropic', status: 'active',
    starts_at: '2026-04-29T00:00:00Z', expires_at: '2026-05-29T00:00:00Z',
    daily_usage_usd: 0, weekly_usage_usd: 0.19, monthly_usage_usd: 0.19,
    daily_limit_usd: 200, weekly_limit_usd: 1400, monthly_limit_usd: 2000,
    allow_image_generation: false, rpm_limit: 0,
  },
]

function mapSub(raw: any): Subscription {
  const g = raw.group || {}
  return {
    id: String(raw.id),
    group_id: raw.group_id || g.id || 0,
    group_name: g.name || 'Unknown',
    subscription_type: g.subscription_type || 'subscription',
    platform: g.platform || 'openai',
    status: raw.status || 'active',
    starts_at: raw.starts_at || '',
    expires_at: raw.expires_at || '',
    daily_usage_usd: raw.daily_usage_usd || 0,
    weekly_usage_usd: raw.weekly_usage_usd || 0,
    monthly_usage_usd: raw.monthly_usage_usd || 0,
    daily_limit_usd: g.daily_limit_usd || 0,
    weekly_limit_usd: g.weekly_limit_usd || 0,
    monthly_limit_usd: g.monthly_limit_usd || 0,
    allow_image_generation: g.allow_image_generation || false,
    rpm_limit: g.rpm_limit || 0,
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_SUBSCRIPTIONS.map(s => ({ ...s }))
  }
  // Upstream sub2api exposes both /subscriptions (full list) and
  // /subscriptions/active (currently-active only). Canonical first; fall
  // back to /active for forks that disabled the broader endpoint. Both
  // returning 404 means the deployment compiled subscriptions out — we
  // surface an empty list rather than an error toast.
  for (const path of ['/subscriptions', '/subscriptions/active']) {
    try {
      const body = unwrap<{ items?: unknown[] } | unknown[]>(await client.get(path))
      const items = Array.isArray(body) ? body : body?.items ?? []
      return items.map(mapSub)
    } catch (err) {
      if (httpStatus(err) !== 404) throw err
    }
  }
  if (import.meta.env.DEV) {
    console.warn('[subscriptions] neither /subscriptions nor /subscriptions/active responded — deployment lacks the subscription module')
  }
  return []
}
