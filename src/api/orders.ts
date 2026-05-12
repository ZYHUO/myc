import client from './client'
import { delay, isMockMode } from './_util'

export interface Order {
  id: string
  type: 'subscription' | 'topup' | 'redeem'
  amount: number
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  paymentMethod: 'alipay' | 'wechat' | 'card' | 'redeem'
  createdAt: string
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-20260510001',
    type: 'subscription',
    amount: 199.0,
    status: 'completed',
    paymentMethod: 'alipay',
    createdAt: '2026-05-10T14:30:00Z',
  },
  {
    id: 'ORD-20260508002',
    type: 'topup',
    amount: 100.0,
    status: 'completed',
    paymentMethod: 'wechat',
    createdAt: '2026-05-08T09:15:00Z',
  },
  {
    id: 'ORD-20260505003',
    type: 'subscription',
    amount: 299.0,
    status: 'completed',
    paymentMethod: 'alipay',
    createdAt: '2026-05-05T18:40:00Z',
  },
  {
    id: 'ORD-20260502004',
    type: 'redeem',
    amount: 50.0,
    status: 'completed',
    paymentMethod: 'redeem',
    createdAt: '2026-05-02T11:20:00Z',
  },
  {
    id: 'ORD-20260430005',
    type: 'subscription',
    amount: 99.0,
    status: 'pending',
    paymentMethod: 'wechat',
    createdAt: '2026-04-30T16:50:00Z',
  },
  {
    id: 'ORD-20260428006',
    type: 'topup',
    amount: 200.0,
    status: 'completed',
    paymentMethod: 'card',
    createdAt: '2026-04-28T08:00:00Z',
  },
  {
    id: 'ORD-20260425007',
    type: 'subscription',
    amount: 199.0,
    status: 'refunded',
    paymentMethod: 'alipay',
    createdAt: '2026-04-25T20:10:00Z',
  },
]

export async function getOrders(): Promise<Order[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_ORDERS.map((o) => ({ ...o }))
  }
  const res = await client.get<Order[]>('/orders')
  return res.data
}

export async function refundOrder(id: string): Promise<Order> {
  if (isMockMode()) {
    await delay()
    const order = MOCK_ORDERS.find((o) => o.id === id)
    if (!order) throw new Error('Order not found')
    order.status = 'refunded'
    return { ...order }
  }
  const res = await client.post<Order>(`/orders/${id}/refund-request`)
  return res.data
}
