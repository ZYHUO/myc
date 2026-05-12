import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('@/views/LandingView.vue'),
    meta: { public: true, layout: 'none' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { public: true, layout: 'none', title: 'Sign in' },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { public: true, layout: 'none', title: 'Sign up' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/user/DashboardView.vue'),
    meta: { title: '仪表盘' },
  },
  {
    path: '/keys',
    name: 'keys',
    component: () => import('@/views/user/KeysView.vue'),
    meta: { title: '密钥管理' },
  },
  {
    path: '/usage',
    name: 'usage',
    component: () => import('@/views/user/UsageView.vue'),
    meta: { title: '用量统计' },
  },
  {
    path: '/channels',
    name: 'channels',
    component: () => import('@/views/user/ChannelsView.vue'),
    meta: { title: '渠道管理' },
  },
  {
    path: '/status',
    name: 'status',
    component: () => import('@/views/user/StatusView.vue'),
    meta: { title: '服务状态' },
  },
  {
    path: '/subscriptions',
    name: 'subscriptions',
    component: () => import('@/views/user/SubscriptionsView.vue'),
    meta: { title: '订阅管理' },
  },
  {
    path: '/purchase',
    name: 'purchase',
    component: () => import('@/views/user/PurchaseView.vue'),
    meta: { title: '购买套餐' },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/views/user/OrdersView.vue'),
    meta: { title: '订单记录' },
  },
  {
    path: '/redeem',
    name: 'redeem',
    component: () => import('@/views/user/RedeemView.vue'),
    meta: { title: '兑换码' },
  },
  {
    path: '/affiliate',
    name: 'affiliate',
    component: () => import('@/views/user/AffiliateView.vue'),
    meta: { title: '推广返利' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/user/ProfileView.vue'),
    meta: { title: '个人中心' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面未找到' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Scroll behaviour: on a fresh navigation, jump to the top so users don't
  // land halfway down a different view. On browser back/forward, restore
  // the previous position. `behavior: 'smooth'` is intentionally OFF for
  // forward navigations — instant scrollTo feels snappier than a swooping
  // animation when the page swap itself is already animated by the
  // RouterView Transition.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, top: 80 }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  document.title = to.meta.title ? `${to.meta.title as string} · Amodel` : 'Amodel'

  if (to.meta.public) return true

  const auth = useAuthStore()

  // Already authenticated (e.g. just logged in): allow immediately.
  if (auth.isAuthenticated) return true

  // First visit: hydrate from the stored token.
  if (!auth.initialized) {
    await auth.fetchUser()
  }

  if (!auth.isAuthenticated) {
    return {
      name: 'login',
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    }
  }
  return true
})

export default router
