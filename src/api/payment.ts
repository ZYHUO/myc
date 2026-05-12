import client from './client'
import { delay, isMockMode, unwrap } from './_util'

// ─── Public types (what views consume) ──────────────────────────────────────

export interface PaymentConfig {
  enabled: boolean
  /** Minimum top-up amount (USD). */
  min_amount: number
  /** Maximum top-up amount (USD). 0 means no upper bound. */
  max_amount: number
  /** Daily aggregate cap (USD). 0 means unlimited. */
  daily_limit: number
  order_timeout_minutes: number
  max_pending_orders: number
  enabled_payment_types: string[]
  /** Multiplier applied to balance top-ups (1.0 = pay $10 get $10, 1.2 = bonus). */
  balance_recharge_multiplier: number
  /** Fee rate as decimal (0.02 = 2%). */
  recharge_fee_rate: number
  product_name_prefix: string
  product_name_suffix: string
  help_text: string
  help_image_url: string
}

export interface PaymentPlan {
  id: number
  group_id: number
  group_platform: string
  group_name?: string
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
  id: number
  /** Stable string identifier used as the `provider` field on order creation. */
  key: string
  name: string
  description?: string
  enabled: boolean
  group_ids?: number[]
}

export interface PaymentLimits {
  min_amount: number
  max_amount: number
  /** Per-method limits when present, e.g. {alipay: {min, max}}. */
  methods?: Record<string, { min?: number; max?: number }>
}

export interface PaymentOrder {
  id: string
  out_trade_no: string
  type: 'recharge' | 'subscription'
  amount: number
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded' | 'expired' | 'failed'
  provider: string
  payment_method?: string
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
  /** sub2api uses `channel_id` server-side; we accept either provider string or numeric channel. */
  channel_id?: number
  provider?: string
}

export interface CreateOrderResponse {
  order_id: string
  out_trade_no: string
  pay_url?: string
  qr_code?: string
  client_secret?: string
  deeplink?: string
}

export interface CheckoutInfo {
  amount: number
  fee: number
  total: number
  provider: string
  currency: string
}

// ─── Upstream raw shapes ────────────────────────────────────────────────────

interface RawConfig {
  enabled?: boolean
  min_amount?: number
  max_amount?: number
  daily_limit?: number
  order_timeout_minutes?: number
  max_pending_orders?: number
  enabled_payment_types?: string[] | null
  balance_recharge_multiplier?: number
  recharge_fee_rate?: number
  product_name_prefix?: string
  product_name_suffix?: string
  help_text?: string
  help_image_url?: string
}

interface RawChannel {
  ID: number
  Name: string
  Description?: string
  Status: string
  GroupIDs?: number[] | null
}

interface RawLimits {
  global_min?: number
  global_max?: number
  methods?: Record<string, { min?: number; max?: number }>
}

interface RawOrdersList<T> {
  items?: T[]
  total?: number
  page?: number
  page_size?: number
  pages?: number
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapConfig(raw: RawConfig | null | undefined): PaymentConfig {
  const r = raw ?? {}
  return {
    enabled: r.enabled ?? false,
    min_amount: r.min_amount ?? 0,
    max_amount: r.max_amount ?? 0,
    daily_limit: r.daily_limit ?? 0,
    order_timeout_minutes: r.order_timeout_minutes ?? 30,
    max_pending_orders: r.max_pending_orders ?? 3,
    enabled_payment_types: r.enabled_payment_types ?? [],
    balance_recharge_multiplier: r.balance_recharge_multiplier ?? 1,
    recharge_fee_rate: r.recharge_fee_rate ?? 0,
    product_name_prefix: r.product_name_prefix ?? '',
    product_name_suffix: r.product_name_suffix ?? '',
    help_text: r.help_text ?? '',
    help_image_url: r.help_image_url ?? '',
  }
}

function mapChannel(raw: RawChannel): PaymentChannel {
  return {
    id: raw.ID,
    key: String(raw.ID),
    name: raw.Name,
    description: raw.Description,
    enabled: (raw.Status ?? '').toLowerCase() === 'active',
    group_ids: raw.GroupIDs ?? [],
  }
}

function mapLimits(raw: RawLimits | null | undefined): PaymentLimits {
  const r = raw ?? {}
  return {
    min_amount: r.global_min ?? 0,
    max_amount: r.global_max ?? 0,
    methods: r.methods ?? {},
  }
}

// ─── Mock fixtures ──────────────────────────────────────────────────────────

const MOCK_CONFIG: PaymentConfig = {
  enabled: true,
  min_amount: 10,
  max_amount: 1000,
  daily_limit: 500,
  order_timeout_minutes: 30,
  max_pending_orders: 3,
  enabled_payment_types: ['alipay', 'wechat', 'stripe'],
  balance_recharge_multiplier: 1,
  recharge_fee_rate: 0,
  product_name_prefix: '',
  product_name_suffix: '',
  help_text: '',
  help_image_url: '',
}

const MOCK_PLANS: PaymentPlan[] = [
  { id: 1, group_id: 5, group_platform: 'openai', name: 'Basic', description: 'Casual usage', price: 29, validity_days: 30, validity_unit: 'days', features: '5,000 requests/day', product_name: 'Basic Plan', for_sale: true, sort_order: 1 },
  { id: 2, group_id: 7, group_platform: 'openai', name: 'Pro', description: 'Power user', price: 79, original_price: 99, validity_days: 30, validity_unit: 'days', features: '50,000 requests/day', product_name: 'Pro Plan', for_sale: true, sort_order: 2 },
  { id: 3, group_id: 6, group_platform: 'anthropic', name: 'Enterprise', description: 'Unlimited', price: 199, validity_days: 30, validity_unit: 'days', features: 'Unlimited', product_name: 'Enterprise Plan', for_sale: true, sort_order: 3 },
]

const MOCK_CHANNELS: PaymentChannel[] = [
  { id: 1, key: 'alipay', name: 'Alipay', enabled: true },
  { id: 2, key: 'wechat', name: 'WeChat Pay', enabled: true },
  { id: 3, key: 'stripe', name: 'Stripe', enabled: true },
]

const MOCK_LIMITS: PaymentLimits = { min_amount: 10, max_amount: 1000, methods: {} }

// ─── API functions ──────────────────────────────────────────────────────────

export async function getPaymentConfig(): Promise<PaymentConfig> {
  if (isMockMode()) { await delay(); return { ...MOCK_CONFIG } }
  return mapConfig(unwrap<RawConfig>(await client.get('/payment/config')))
}

export async function getPlans(): Promise<PaymentPlan[]> {
  if (isMockMode()) { await delay(); return MOCK_PLANS.map((p) => ({ ...p })) }
  const body = unwrap<PaymentPlan[] | { items?: PaymentPlan[] }>(await client.get('/payment/plans'))
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map((p) => ({ ...p }))
}

export async function getChannels(): Promise<PaymentChannel[]> {
  if (isMockMode()) { await delay(); return MOCK_CHANNELS.map((c) => ({ ...c })) }
  const body = unwrap<RawChannel[] | { items?: RawChannel[] }>(await client.get('/payment/channels'))
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map(mapChannel).filter((c) => c.enabled)
}

export async function getLimits(): Promise<PaymentLimits> {
  if (isMockMode()) { await delay(); return { ...MOCK_LIMITS } }
  return mapLimits(unwrap<RawLimits>(await client.get('/payment/limits')))
}

export async function getCheckoutInfo(params: { amount?: number; plan_id?: number; provider: string }): Promise<CheckoutInfo> {
  if (isMockMode()) {
    await delay()
    const amount = params.amount ?? 0
    return { amount, fee: 0, total: amount, provider: params.provider, currency: 'USD' }
  }
  return unwrap<CheckoutInfo>(await client.get('/payment/checkout-info', { params }))
}

export async function createOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  if (isMockMode()) {
    await delay(500)
    return {
      order_id: `mock_${Date.now()}`,
      out_trade_no: `MOCK${Date.now()}`,
      pay_url: 'https://example.com/mock-pay',
    }
  }
  return unwrap<CreateOrderResponse>(await client.post('/payment/orders', data))
}

export async function getMyOrders(params?: { page?: number; page_size?: number; status?: string }): Promise<{ items: PaymentOrder[]; total: number }> {
  if (isMockMode()) {
    await delay()
    return { items: [], total: 0 }
  }
  const body = unwrap<RawOrdersList<PaymentOrder>>(await client.get('/payment/orders/my', { params }))
  return { items: body.items ?? [], total: body.total ?? 0 }
}

export async function getOrder(id: string): Promise<PaymentOrder> {
  if (isMockMode()) {
    await delay()
    throw new Error('Order not found (mock mode)')
  }
  return unwrap<PaymentOrder>(await client.get(`/payment/orders/${id}`))
}

export async function cancelOrder(id: string): Promise<void> {
  if (isMockMode()) { await delay(); return }
  await client.post(`/payment/orders/${id}/cancel`)
}

export async function requestRefund(id: string): Promise<void> {
  if (isMockMode()) { await delay(); return }
  await client.post(`/payment/orders/${id}/refund-request`)
}

export async function verifyOrder(data: { out_trade_no: string }): Promise<{ status: string; paid: boolean }> {
  if (isMockMode()) { await delay(); return { status: 'paid', paid: true } }
  return unwrap<{ status: string; paid: boolean }>(await client.post('/payment/orders/verify', data))
}

export async function getRefundEligibleProviders(): Promise<string[]> {
  if (isMockMode()) { await delay(); return ['stripe'] }
  const body = unwrap<string[] | { items?: string[] }>(await client.get('/payment/orders/refund-eligible-providers'))
  return Array.isArray(body) ? body : body?.items ?? []
}
