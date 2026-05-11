import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: string
  username: string
  email: string
  avatar: string
  balance: number
}

const MOCK_USER: User = {
  id: 'usr_001',
  username: 'zhongyang',
  email: 'zhongyang@example.com',
  avatar: '',
  balance: 128.5,
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)

  async function login(username: string, _password: string) {
    // Mock login — accept any credentials
    user.value = { ...MOCK_USER, username }
    localStorage.setItem('token', 'mock-jwt-token')
  }

  async function logout() {
    user.value = null
    localStorage.removeItem('token')
  }

  async function fetchUser() {
    const token = localStorage.getItem('token')
    if (!token) {
      user.value = null
      return
    }
    // Mock: return hardcoded user
    user.value = { ...MOCK_USER }
  }

  return { user, isAuthenticated, login, logout, fetchUser }
})
