import client from './client'
import { delay, isMockMode, unwrap } from './_util'

/**
 * Sub2API's upstream response from `GET /user/aff`. Field names are
 * intentionally preserved (snake_case + `aff_*` prefix) because that's what
 * the backend returns; the consolidated `AffiliateData` shape below is what
 * the view layer consumes.
 */
interface UpstreamAffiliate {
  user_id: number
  aff_code: string
  aff_count: number
  aff_quota: number
  aff_frozen_quota: number
  aff_history_quota: number
  effective_rebate_rate_percent: number
  invitees: UpstreamInvitee[]
}

interface UpstreamInvitee {
  user_id?: number
  username?: string
  email?: string
  joined_at?: string
  created_at?: string
  rebate?: number
  rebate_quota?: number
}

export interface AffiliateData {
  /** Earnings summary; values are denominated in USD (sub2api stores quota as cents internally). */
  stats: {
    totalReferrals: number
    availableRebate: number
    totalEarned: number
    frozenRebate: number
    rebateRatePercent: number
  }
  /** Invitees / recent activity table rows. */
  activity: Array<{ user: string; joinedAt: string; rebate: number }>
  /** Pre-rendered referral URL. */
  referralLink: string
}

const MOCK: AffiliateData = {
  stats: {
    totalReferrals: 23,
    availableRebate: 45.8,
    totalEarned: 312.5,
    frozenRebate: 0,
    rebateRatePercent: 20,
  },
  activity: [
    { user: 'user_a***', joinedAt: '2026-05-09T10:00:00Z', rebate: 15.0 },
    { user: 'dev_zhang', joinedAt: '2026-05-07T14:30:00Z', rebate: 8.5 },
    { user: 'li_test***', joinedAt: '2026-05-03T08:20:00Z', rebate: 12.0 },
    { user: 'ai_fan_99', joinedAt: '2026-04-28T16:45:00Z', rebate: 5.0 },
    { user: 'newbee***', joinedAt: '2026-04-22T11:10:00Z', rebate: 3.5 },
    { user: 'coder_wu', joinedAt: '2026-04-18T09:00:00Z', rebate: 1.8 },
  ],
  referralLink: 'https://sub2api.com/invite/zhongyang_abc123',
}

/** sub2api stores monetary amounts as integer micro-units in some places; aff_quota is already in USD. */
const toUSD = (v: number | undefined) => (typeof v === 'number' ? v : 0)

function buildReferralLink(code: string): string {
  // Upstream doesn't surface a pre-rendered URL — derive it from the same host
  // the SPA is loaded from. Works for any deployment without extra config.
  if (typeof window === 'undefined') return ''
  const { origin } = window.location
  return `${origin}/register?aff=${encodeURIComponent(code)}`
}

// Exported for unit tests. Used in-module by getAffiliateData.
export function mapInvitee(raw: UpstreamInvitee): { user: string; joinedAt: string; rebate: number } {
  const display = raw.username || raw.email || (raw.user_id ? `user_${raw.user_id}` : 'unknown')
  return {
    user: display,
    joinedAt: raw.joined_at || raw.created_at || '',
    rebate: toUSD(raw.rebate ?? raw.rebate_quota),
  }
}

export async function getAffiliateData(): Promise<AffiliateData> {
  if (isMockMode()) {
    await delay()
    return { stats: { ...MOCK.stats }, activity: MOCK.activity.map((a) => ({ ...a })), referralLink: MOCK.referralLink }
  }
  const raw = unwrap<UpstreamAffiliate>(await client.get('/user/aff'))
  return {
    stats: {
      totalReferrals: raw.aff_count ?? 0,
      availableRebate: toUSD(raw.aff_quota),
      totalEarned: toUSD(raw.aff_history_quota),
      frozenRebate: toUSD(raw.aff_frozen_quota),
      rebateRatePercent: raw.effective_rebate_rate_percent ?? 0,
    },
    activity: (raw.invitees ?? []).map(mapInvitee),
    referralLink: buildReferralLink(raw.aff_code ?? ''),
  }
}

/**
 * Transfer the pending rebate balance into the user's spendable balance.
 * Returns the new account balance so callers can refresh the UI.
 */
export async function transferAffiliateBalance(amount: number): Promise<{ newBalance: number }> {
  if (isMockMode()) {
    await delay(400)
    return { newBalance: amount }
  }
  // sub2api accepts `{amount}` and returns `{new_balance}` (in USD).
  const body = unwrap<{ new_balance?: number; balance?: number }>(
    await client.post('/user/aff/transfer', { amount }),
  )
  return { newBalance: toUSD(body.new_balance ?? body.balance) }
}
