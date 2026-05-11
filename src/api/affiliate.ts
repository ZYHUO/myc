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
  await delay()
  return { ...MOCK_STATS }
}

export async function getAffiliateActivity(): Promise<AffiliateActivity[]> {
  await delay()
  return MOCK_ACTIVITY.map((a) => ({ ...a }))
}

export async function getReferralLink(): Promise<string> {
  await delay()
  return 'https://sub2api.com/invite/zhongyang_abc123'
}

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}
