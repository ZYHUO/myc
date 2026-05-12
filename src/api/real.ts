import axios from 'axios'
import type { ApiResponse } from './mock'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Token management
let accessToken = localStorage.getItem('access_token') || ''
let refreshToken = localStorage.getItem('refresh_token') || ''

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  accessToken = ''
  refreshToken = ''
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// Request interceptor - add auth header
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response interceptor - handle 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && refreshToken) {
      try {
        const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
        const { access_token, refresh_token: newRefresh } = res.data.data
        setTokens(access_token, newRefresh)
        error.config.headers.Authorization = `Bearer ${access_token}`
        return api.request(error.config)
      } catch {
        clearTokens()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ============================================================
// Auth API
// ============================================================
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: UserProfile
}

export interface UserProfile {
  id: number
  email: string
  username: string
  role: 'user' | 'admin'
  balance: number
  concurrency: number
  status: string
  allowed_groups: number[]
  last_active_at: string
  created_at: string
  updated_at: string
  balance_notify_enabled: boolean
  balance_notify_threshold_type: string
  balance_notify_threshold: number | null
  balance_notify_extra_emails: string | null
  total_recharged: number
  rpm_limit: number
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', data),

  me: () =>
    api.get<ApiResponse<UserProfile>>('/user/profile'),

  refresh: (token: string) =>
    api.post<ApiResponse<{ access_token: string; refresh_token: string }>>('/auth/refresh', { refresh_token: token }),
}

// ============================================================
// Groups API
// ============================================================
export interface Group {
  id: number
  name: string
  description: string
  platform: string
  rate_multiplier: number
  is_exclusive: boolean
  status: string
  subscription_type: string
  daily_limit_usd: number
  weekly_limit_usd: number
  monthly_limit_usd: number
  allow_image_generation: boolean
  supported_model_scopes: string[]
  account_count: number
  active_account_count: number
  rate_limited_account_count: number
  sort_order: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export const groupsApi = {
  list: (page = 1, pageSize = 20) =>
    api.get<ApiResponse<PaginatedResponse<Group>>>('/admin/groups', { params: { page, page_size: pageSize } }),

  getById: (id: number) =>
    api.get<ApiResponse<Group>>(`/admin/groups/${id}`),
}

// ============================================================
// Usage Logs API
// ============================================================
export interface UsageLog {
  id: number
  user_id: number
  api_key_id: number
  account_id: number
  request_id: string
  model: string
  reasoning_effort: string
  inbound_endpoint: string
  upstream_endpoint: string
  group_id: number
  subscription_id: number | null
  tokens_prompt: number
  tokens_completion: number
  tokens_reasoning: number
  tokens_cached: number
  cost_usd: number
  status_code: number
  latency_ms: number
  created_at: string
}

export const usageApi = {
  list: (params?: { user_id?: number; page?: number; page_size?: number; model?: string }) =>
    api.get<ApiResponse<PaginatedResponse<UsageLog>>>('/admin/usage', { params }),
}

// ============================================================
// Payment API
// ============================================================
export interface PaymentChannel {
  ID: number
  Name: string
  Description: string
  Status: string
  BillingModelSource: string
  RestrictModels: boolean
  Features: string
  FeaturesConfig: Record<string, unknown>
  GroupIDs: number[]
  ModelPricing: Record<string, unknown> | null
}

export interface PaymentOrder {
  id: number
  user_id: number
  channel_id: number
  amount: number
  status: string
  created_at: string
}

export const paymentApi = {
  channels: () =>
    api.get<ApiResponse<PaymentChannel[]>>('/payment/channels'),

  createOrder: (data: { channel_id: number; amount: number; plan_id?: string }) =>
    api.post<ApiResponse<PaymentOrder>>('/payment/orders', data),

  getOrders: (params?: { page?: number; page_size?: number }) =>
    api.get<ApiResponse<PaginatedResponse<PaymentOrder>>>('/payment/orders', { params }),
}

// ============================================================
// Admin Users API
// ============================================================
export const adminApi = {
  getUsers: (params?: { page?: number; page_size?: number }) =>
    api.get<ApiResponse<PaginatedResponse<UserProfile>>>('/admin/users', { params }),

  getUser: (id: number) =>
    api.get<ApiResponse<UserProfile>>(`/admin/users/${id}`),

  updateUser: (id: number, data: Partial<UserProfile>) =>
    api.put<ApiResponse<UserProfile>>(`/admin/users/${id}`, data),
}

export default api
