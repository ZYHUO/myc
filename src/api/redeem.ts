import client from './client'
import { delay, isMockMode } from './_util'

export interface RedeemHistory {
  code: string
  reward: string
  date: string
  status: 'success' | 'expired' | 'invalid'
}

export interface RedeemResult {
  success: boolean
  message: string
  reward?: string
}

const MOCK_HISTORY: RedeemHistory[] = [
  {
    code: 'SUB2API-2026-ABC123',
    reward: '余额 ¥50.00',
    date: '2026-05-02T11:20:00Z',
    status: 'success',
  },
  {
    code: 'WELCOME-VIP-XYZ789',
    reward: '旗舰版 7天试用',
    date: '2026-03-15T09:30:00Z',
    status: 'success',
  },
  {
    code: 'EXPIRED-OLD-CODE',
    reward: '余额 ¥20.00',
    date: '2026-01-10T14:00:00Z',
    status: 'expired',
  },
  {
    code: 'BAD-CODE-XXXX',
    reward: '-',
    date: '2026-04-20T17:45:00Z',
    status: 'invalid',
  },
]

export async function redeemCode(code: string): Promise<RedeemResult> {
  if (isMockMode()) {
    await delay(500)
    if (code === 'EXPIRED-OLD-CODE') {
      return { success: false, message: '兑换码已过期' }
    }
    if (code === 'BAD-CODE-XXXX' || code.length < 8) {
      return { success: false, message: '无效的兑换码' }
    }
    return { success: true, message: '兑换成功！', reward: '余额 ¥10.00' }
  }
  const res = await client.post<RedeemResult>('/redeem', { code })
  return res.data
}

export async function getRedeemHistory(): Promise<RedeemHistory[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_HISTORY.map((h) => ({ ...h }))
  }
  const res = await client.get<RedeemHistory[]>('/redeem/history')
  return res.data
}
