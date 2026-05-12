const useMock = import.meta.env.VITE_USE_MOCK === 'true'

// Mock exports (always available for type imports)
export type { User, Subscription, ApiKey, Model, UsageLog, PaymentChannel, PaymentOrder, DashboardStats, LoginRequest, LoginResponse, PaginatedResponse } from './mock'
export { mockDelay } from './mock'

// Conditionally export the active API modules
export async function getAuthApi() {
  if (useMock) {
    return import('./mock').then(m => m.authApi)
  }
  return import('./real').then(m => m.authApi)
}

export async function getSubscriptionsApi() {
  if (useMock) {
    return import('./mock').then(m => m.subscriptionsApi)
  }
  // Real API doesn't have subscriptions endpoint yet
  return import('./mock').then(m => m.subscriptionsApi)
}

export async function getModelsApi() {
  if (useMock) {
    return import('./mock').then(m => m.modelsApi)
  }
  return import('./mock').then(m => m.modelsApi)
}

export async function getKeysApi() {
  if (useMock) {
    return import('./mock').then(m => m.keysApi)
  }
  return import('./mock').then(m => m.keysApi)
}

export async function getUsageApi() {
  if (useMock) {
    return import('./mock').then(m => m.usageApi)
  }
  return import('./real').then(m => m.usageApi)
}

export async function getPaymentApi() {
  if (useMock) {
    return import('./mock').then(m => m.paymentApi)
  }
  return import('./real').then(m => m.paymentApi)
}

export async function getDashboardApi() {
  if (useMock) {
    return import('./mock').then(m => m.dashboardApi)
  }
  return import('./mock').then(m => m.dashboardApi)
}
