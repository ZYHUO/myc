import axios from 'axios'
import router from '@/router'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      // Lazy-load the auth store to avoid a circular import — stores/auth.ts
      // imports THIS file, so a static import would deadlock during boot.
      try {
        const { useAuthStore } = await import('@/stores/auth')
        useAuthStore().user = null
      } catch {
        // Pinia not initialised yet (very early boot); localStorage clearing
        // is sufficient — the store will read no token on next fetchUser().
      }
      const current = router.currentRoute.value
      if (current.name !== 'login' && current.meta.public !== true) {
        router.push({
          name: 'login',
          query: { redirect: current.fullPath },
        })
      }
    }
    return Promise.reject(error)
  },
)

export default client
