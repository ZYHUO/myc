import client from './client'
import { delay, isMockMode } from './_util'

export interface Subscription {
  id: string
  name: string
  usagePercent: number
  dailyUsage: number
  expiresAt: string
  status: 'active' | 'expired' | 'suspended'
}

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub_001',
    name: '旗舰版 · 月度套餐',
    usagePercent: 42.5,
    dailyUsage: 3420,
    expiresAt: '2026-06-15T00:00:00Z',
    status: 'active',
  },
  {
    id: 'sub_002',
    name: 'Claude 专项 · 季度套餐',
    usagePercent: 78.3,
    dailyUsage: 1280,
    expiresAt: '2026-08-01T00:00:00Z',
    status: 'active',
  },
  {
    id: 'sub_003',
    name: '基础版 · 月度套餐',
    usagePercent: 95.1,
    dailyUsage: 890,
    expiresAt: '2026-05-20T00:00:00Z',
    status: 'active',
  },
  {
    id: 'sub_004',
    name: '试用套餐',
    usagePercent: 100,
    dailyUsage: 0,
    expiresAt: '2026-04-01T00:00:00Z',
    status: 'expired',
  },
]

export async function getSubscriptions(): Promise<Subscription[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_SUBSCRIPTIONS.map((s) => ({ ...s }))
  }
  const res = await client.get<Subscription[]>('/subscriptions')
  return res.data
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_SUBSCRIPTIONS.filter((s) => s.status === 'active').map((s) => ({ ...s }))
  }
  const res = await client.get<Subscription[]>('/subscriptions/active')
  return res.data
}
