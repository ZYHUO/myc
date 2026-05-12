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
}

interface LoginResponse {
  token: string
  user: User
}

const MOCK_USER: User = {
  id: 'usr_001',
  username: 'zhongyang',
  email: 'zhongyang@example.com',
  avatar: '',
  balance: 128.5,
}

const MOCK_TOKEN_PREFIX = '__mock__.'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const isAuthenticated = computed(() => !!user.value)

  async function login(username: string, password: string) {
    if (isMockMode()) {
      await delay(400)
      if (!username || !password) {
        throw new Error('Username and password are required')
      }
      const token = MOCK_TOKEN_PREFIX + Math.random().toString(36).slice(2)
      localStorage.setItem('token', token)
      user.value = { ...MOCK_USER, username }
      return
    }
    const res = await client.post<LoginResponse>('/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
    user.value = res.data.user
  }

  async function logout() {
    user.value = null
    localStorage.removeItem('token')
    if (!isMockMode()) {
      try {
        await client.post('/auth/logout')
      } catch {
        // Server-side invalidation is best-effort; the client is already signed out.
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
      const res = await client.get<User>('/auth/me')
      user.value = res.data
    } catch {
      // 401 has already cleared the token via the response interceptor.
      user.value = null
    } finally {
      initialized.value = true
    }
  }

  return { user, isAuthenticated, initialized, login, logout, fetchUser }
})
