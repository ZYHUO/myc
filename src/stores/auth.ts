import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import { isMockMode, delay } from '@/api/_util'

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  balance: number
  role?: string
  status?: string
  concurrency?: number
  allowed_groups?: number[]
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  user: {
    id: number
    email: string
    username: string
    role: string
    balance: number
    concurrency: number
    status: string
    allowed_groups: number[]
  }
}

const MOCK_USER: User = {
  id: 'usr_001',
  username: 'zhongyang',
  email: 'zhongyang@example.com',
  avatar: '',
  balance: 128.5,
}

const MOCK_TOKEN_PREFIX = 'mock_'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const isAuthenticated = computed(() => !!user.value)

  async function login(emailOrUsername: string, password: string) {
    if (isMockMode()) {
      await delay(400)
      if (!emailOrUsername || !password) {
        throw new Error('Username and password are required')
      }
      const token = MOCK_TOKEN_PREFIX + Math.random().toString(36).slice(2)
      localStorage.setItem('token', token)
      user.value = { ...MOCK_USER, username: emailOrUsername }
      return
    }

    // Real API: send email + password
    console.log('[Auth] calling login API...')
    const res = await client.post('/auth/login', {
      email: emailOrUsername,
      password,
    })
    console.log('[Auth] API response code:', res.data?.code)

    // Response is wrapped: {code, message, data: {access_token, refresh_token, user}}
    const payload = res.data.data || res.data
    console.log('[Auth] payload keys:', Object.keys(payload))
    localStorage.setItem('token', payload.access_token)
    localStorage.setItem('refresh_token', payload.refresh_token)

    const u = payload.user
    console.log('[Auth] user:', u.email, u.role)
    user.value = {
      id: String(u.id),
      username: u.username || u.email.split('@')[0],
      email: u.email,
      avatar: '',
      balance: u.balance,
      role: u.role,
      status: u.status,
      concurrency: u.concurrency,
      allowed_groups: u.allowed_groups,
    }
    console.log('[Auth] login complete, user set')
  }

  async function logout() {
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    if (!isMockMode()) {
      try {
        await client.post('/auth/logout')
      } catch {
        // Server-side invalidation is best-effort
      }
    }
  }

  async function fetchUser() {
    const token = localStorage.getItem('token')
    if (!token) {
      user.value = null
      initialized.value = true
      return
    }

    if (isMockMode() && token.startsWith(MOCK_TOKEN_PREFIX)) {
      user.value = { ...MOCK_USER }
      initialized.value = true
      return
    }

    try {
      const res = await client.get('/user/profile')
      const d = res.data.data || res.data
      user.value = {
        id: String(d.id),
        username: d.username || d.email?.split('@')[0] || '',
        email: d.email || '',
        avatar: '',
        balance: d.balance ?? 0,
        role: d.role,
        status: d.status,
        concurrency: d.concurrency,
        allowed_groups: d.allowed_groups,
      }
    } catch {
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  return { user, isAuthenticated, initialized, login, logout, fetchUser }
})
