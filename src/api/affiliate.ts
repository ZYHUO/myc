import client from './client'
import { delay, isMockMode } from './_util'

export interface AffiliateStats {
  totalReferrals: number
  availableRebate: number
  totalEarned: number
}

export interface AffiliateActivity {
  user: string
  joinedAt: string
  rebate: number
}

const MOCK_STATS: AffiliateStats = {
  totalReferrals: 23,
  availableRebate: 45.8,
  totalEarned: 312.5,
}

const MOCK_ACTIVITY: AffiliateActivity[] = [
  { user: 'user_a***', joinedAt: '2026-05-09T10:00:00Z', rebate: 15.0 },
  { user: 'dev_zhang', joinedAt: '2026-05-07T14:30:00Z', rebate: 8.5 },
  { user: 'li_test***', joinedAt: '2026-05-03T08:20:00Z', rebate: 12.0 },
  { user: 'ai_fan_99', joinedAt: '2026-04-28T16:45:00Z', rebate: 5.0 },
  { user: 'newbee***', joinedAt: '2026-04-22T11:10:00Z', rebate: 3.5 },
  { user: 'coder_wu', joinedAt: '2026-04-18T09:00:00Z', rebate: 1.8 },
]

export async function getAffiliateStats(): Promise<AffiliateStats> {
  if (isMockMode()) {
    await delay()
    return { ...MOCK_STATS }
  }
  const res = await client.get<AffiliateStats>('/affiliate/stats')
  return res.data
}

export async function getAffiliateActivity(): Promise<AffiliateActivity[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_ACTIVITY.map((a) => ({ ...a }))
  }
  const res = await client.get<AffiliateActivity[]>('/affiliate/activity')
  return res.data
}

export async function getReferralLink(): Promise<string> {
  if (isMockMode()) {
    await delay()
    return 'https://sub2api.com/invite/zhongyang_abc123'
  }
  const res = await client.get<{ url: string }>('/affiliate/referral-link')
  return res.data.url
}
