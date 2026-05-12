import client from './client'
import { delay, isMockMode, unwrap } from './_util'

/**
 * sub2api's `RedeemCode` DTO (see backend/internal/handler/dto/types.go).
 * Kept here verbatim so the mapping into our view-facing shape is explicit.
 */
interface RawRedeemCode {
  id: number
  code: string
  type: string // balance | concurrency | subscription | invitation | affiliate_balance
  value: number
  status: string // used | unused | revoked | expired
  used_by: number | null
  used_at: string | null
  created_at: string
  group_id: number | null
  validity_days: number
  notes?: string | null
}

/** Backend response when redeeming succeeds (handler.RedeemResponse). */
interface RawRedeemResponse {
  message: string
  type: string
  value: number
  new_balance?: number
  new_concurrency?: number
}

export interface RedeemHistory {
  id: number
  /** sub2api stores the code in its full form; we surface it masked so a
   *  shoulder-surfer at a coffee shop can't note it down. */
  code: string
  type: string
  value: number
  status: string
  /** ISO timestamp the code was redeemed (or created if not used). */
  date: string
  validityDays: number
  /** Admin annotations are surfaced for admin_balance entries so the user
   *  knows why their balance was adjusted. */
  notes?: string | null
}

export interface RedeemResult {
  success: boolean
  message: string
  type?: string
  value?: number
  newBalance?: number
  newConcurrency?: number
}

const MOCK_HISTORY: RawRedeemCode[] = [
  { id: 3, code: '7b296e98df94e91d2ddc8983bca37228', type: 'balance', value: 50, status: 'used', used_by: 1, used_at: '2026-05-02T11:20:00Z', created_at: '2026-05-02T10:00:00Z', group_id: null, validity_days: 0 },
  { id: 2, code: 'abcdef0123456789abcdef0123456789', type: 'subscription', value: 1, status: 'used', used_by: 1, used_at: '2026-03-15T09:30:00Z', created_at: '2026-03-14T12:00:00Z', group_id: 7, validity_days: 30 },
  { id: 1, code: 'expired112233445566778899aabbcc', type: 'balance', value: 20, status: 'expired', used_by: null, used_at: null, created_at: '2026-01-01T00:00:00Z', group_id: null, validity_days: 0 },
]

function maskCode(code: string): string {
  if (!code || code.length < 12) return code
  return `${code.slice(0, 6)}…${code.slice(-4)}`
}

function mapHistory(raw: RawRedeemCode): RedeemHistory {
  return {
    id: raw.id,
    code: maskCode(raw.code),
    type: raw.type,
    value: raw.value,
    status: raw.status,
    date: raw.used_at || raw.created_at,
    validityDays: raw.validity_days,
    notes: raw.notes ?? null,
  }
}

export async function redeemCode(code: string): Promise<RedeemResult> {
  if (isMockMode()) {
    await delay(500)
    if (code.toLowerCase().includes('expired')) {
      return { success: false, message: 'Redeem code has expired' }
    }
    if (code.length < 8) {
      return { success: false, message: 'Invalid code format' }
    }
    return { success: true, message: 'Code redeemed', type: 'balance', value: 10, newBalance: 138.5 }
  }
  try {
    const raw = unwrap<RawRedeemResponse>(await client.post('/redeem', { code }))
    return {
      success: true,
      message: raw.message,
      type: raw.type,
      value: raw.value,
      newBalance: raw.new_balance,
      newConcurrency: raw.new_concurrency,
    }
  } catch (err) {
    // sub2api returns { code, message, reason } on failure; axios surfaces
    // that as `error.response.data`. We translate it into our shape so the
    // view can display the upstream message verbatim.
    const data = (err as { response?: { data?: { message?: string } } }).response?.data
    const message =
      data?.message ||
      (err instanceof Error ? err.message : '') ||
      'Redemption failed'
    return { success: false, message }
  }
}

export async function getRedeemHistory(): Promise<RedeemHistory[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_HISTORY.map(mapHistory)
  }
  // sub2api returns a bare array, not a paginated envelope.
  const body = unwrap<RawRedeemCode[] | { items?: RawRedeemCode[] }>(
    await client.get('/redeem/history'),
  )
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map(mapHistory)
}
