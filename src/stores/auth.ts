import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client from '@/api/client'
import { isMockMode, delay, unwrap } from '@/api/_util'

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

  async function login(
    emailOrUsername: string,
    password: string,
    turnstileToken?: string,
    geetestToken?: string,
  ) {
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

    // Real API: sub2api's LoginRequest accepts both `turnstile_token` and
    // `geetest_token`; the backend only verifies whichever provider the
    // admin has enabled. We send whichever the SPA collected.
    const body: Record<string, string> = { email: emailOrUsername, password }
    if (turnstileToken) body.turnstile_token = turnstileToken
    if (geetestToken) body.geetest_token = geetestToken
    const res = await client.post<unknown>('/auth/login', body)
    applyLoginResponse(unwrap<LoginResponse>(res))
  }

  /** Maps a sub2api token-pair response into the local user ref + localStorage. */
  function applyLoginResponse(payload: LoginResponse) {
    localStorage.setItem('token', payload.access_token)
    localStorage.setItem('refresh_token', payload.refresh_token)
    const u = payload.user
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
  }

  /**
   * Register a new user. The optional fields are only sent when present so the
   * backend's binding validators don't complain about empty strings; sub2api
   * decides which fields are actually required via /settings/public flags.
   */
  async function register(payload: {
    email: string
    password: string
    verifyCode?: string
    turnstileToken?: string
    geetestToken?: string
    promoCode?: string
    invitationCode?: string
    affCode?: string
  }) {
    if (isMockMode()) {
      await delay(400)
      const token = MOCK_TOKEN_PREFIX + Math.random().toString(36).slice(2)
      localStorage.setItem('token', token)
      user.value = { ...MOCK_USER, email: payload.email, username: payload.email.split('@')[0] }
      return
    }
    const body: Record<string, string> = {
      email: payload.email,
      password: payload.password,
    }
    if (payload.verifyCode) body.verify_code = payload.verifyCode
    if (payload.turnstileToken) body.turnstile_token = payload.turnstileToken
    if (payload.geetestToken) body.geetest_token = payload.geetestToken
    if (payload.promoCode) body.promo_code = payload.promoCode
    if (payload.invitationCode) body.invitation_code = payload.invitationCode
    if (payload.affCode) body.aff_code = payload.affCode

    const res = await client.post<unknown>('/auth/register', body)
    applyLoginResponse(unwrap<LoginResponse>(res))
  }

  /**
   * Request the email verification code that's needed when
   * `email_verify_enabled` is true on the backend. Returns the countdown
   * (in seconds) the client should observe before re-sending.
   */
  async function sendVerifyCode(
    email: string,
    turnstileToken?: string,
    geetestToken?: string,
  ): Promise<number> {
    if (isMockMode()) {
      await delay(400)
      return 60
    }
    const res = await client.post<unknown>('/auth/send-verify-code', {
      email,
      ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
      ...(geetestToken ? { geetest_token: geetestToken } : {}),
    })
    const data = unwrap<{ countdown?: number }>(res)
    return data.countdown ?? 60
  }

  /**
   * Step 1 of password recovery: ask sub2api to email a reset code to
   * `email`. The endpoint accepts `turnstile_token` like /send-verify-code
   * does so the same captcha widget can be reused. Returns the countdown
   * (in seconds) the user must wait before requesting another code.
   */
  async function forgotPassword(
    email: string,
    turnstileToken?: string,
    geetestToken?: string,
  ): Promise<number> {
    if (isMockMode()) {
      await delay(400)
      return 60
    }
    const body: Record<string, string> = { email }
    if (turnstileToken) body.turnstile_token = turnstileToken
    if (geetestToken) body.geetest_token = geetestToken
    const res = await client.post<unknown>('/auth/forgot-password', body)
    const data = unwrap<{ countdown?: number }>(res)
    return data.countdown ?? 60
  }

  /**
   * Step 2 of password recovery: submit the verify code + new password.
   * sub2api responds with a fresh token pair on success — same shape as a
   * successful /auth/login, so we reuse applyLoginResponse to seat the
   * user into pinia + localStorage.
   */
  async function resetPassword(payload: {
    email: string
    verifyCode: string
    newPassword: string
  }) {
    if (isMockMode()) {
      await delay(500)
      const token = MOCK_TOKEN_PREFIX + Math.random().toString(36).slice(2)
      localStorage.setItem('token', token)
      user.value = { ...MOCK_USER, email: payload.email, username: payload.email.split('@')[0] }
      return
    }
    const res = await client.post<unknown>('/auth/reset-password', {
      email: payload.email,
      verify_code: payload.verifyCode,
      new_password: payload.newPassword,
    })
    applyLoginResponse(unwrap<LoginResponse>(res))
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
      const res = await client.get<unknown>('/user/profile')
      const d = unwrap<LoginResponse['user']>(res)
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

  return {
    user, isAuthenticated, initialized,
    login, register, sendVerifyCode, forgotPassword, resetPassword,
    logout, fetchUser,
  }
})
