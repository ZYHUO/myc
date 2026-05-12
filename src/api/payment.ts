import client from './client'

// ─── Types ───
export interface PaymentConfig {
  enabled_payment_types: string[]
  min_recharge_amount: number
  max_recharge_amount: number
  currency: string
}

export interface PaymentPlan {
  id: number
  group_id: number
  group_platform: string
  name: string
  description: string
  price: number
  original_price?: number
  validity_days: number
  validity_unit: string
  features: string
  product_name: string
  for_sale: boolean
  sort_order: number
}

export interface PaymentChannel {
  key: string
  name: string
  icon: string
  enabled: boolean
}

export interface PaymentOrder {
  id: string
  out_trade_no: string
  type: 'recharge' | 'subscription'
  amount: number
  status: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'expired'
  provider: string
  payment_method: string
  plan_id?: number
  plan_name?: string
  created_at: string
  updated_at: string
  paid_at?: string
}

export interface CreateOrderRequest {
  type: 'recharge' | 'subscription'
  amount?: number
  plan_id?: number
  provider: string
  payment_method?: string
}

export interface CreateOrderResponse {
  order_id: string
  out_trade_no: string
  pay_url?: string
  qr_code?: string
  client_secret?: string // Stripe
  deeplink?: string
}

export interface CheckoutInfo {
  amount: number
  fee: number
  total: number
  provider: string
  currency: string
}

export interface PaymentLimits {
  min_amount: number
  max_amount: number
  daily_limit: number
  daily_used: number
}

// ─── API Calls ───

/** Get payment system configuration */
export const getPaymentConfig = () =>
  client.get<PaymentConfig>('/payment/config')

/** Get available subscription plans */
export const getPlans = () =>
  client.get<PaymentPlan[]>('/payment/plans')

/** Get available payment channels */
export const getChannels = () =>
  client.get<PaymentChannel[]>('/payment/channels')

/** Get checkout info (fee calculation) */
export const getCheckoutInfo = (params: { amount?: number; plan_id?: number; provider: string }) =>
  client.get<CheckoutInfo>('/payment/checkout-info', { params })

/** Get payment limits */
export const getLimits = () =>
  client.get<PaymentLimits>('/payment/limits')

/** Create a payment order */
export const createOrder = (data: CreateOrderRequest) =>
  client.post<CreateOrderResponse>('/payment/orders', data)

/** Get my order list */
export const getMyOrders = (params?: { page?: number; page_size?: number; status?: string }) =>
  client.get<{ items: PaymentOrder[]; total: number }>('/payment/orders/my', { params })

/** Get single order detail */
export const getOrder = (id: string) =>
  client.get<PaymentOrder>(`/payment/orders/${id}`)

/** Cancel a pending order */
export const cancelOrder = (id: string) =>
  client.post(`/payment/orders/${id}/cancel`)

/** Request refund for an order */
export const requestRefund = (id: string) =>
  client.post(`/payment/orders/${id}/refund-request`)

/** Verify order status (polling) */
export const verifyOrder = (data: { out_trade_no: string }) =>
  client.post<{ status: string; paid: boolean }>('/payment/orders/verify', data)

/** Get refund-eligible providers */
export const getRefundEligibleProviders = () =>
  client.get<string[]>('/payment/orders/refund-eligible-providers')
