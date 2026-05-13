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
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/auth/ForgotPasswordView.vue'),
    meta: { public: true, layout: 'none', title: 'Forgot password' },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/auth/ResetPasswordView.vue'),
    meta: { public: true, layout: 'none', title: 'Reset password' },
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
    // Public so anonymous visitors arriving from the landing footer
    // don't trigger the auth-redirect path (which would silently sign
    // them in with a stale token). The page itself renders its own
    // brand strip when not authed, and degrades gracefully when the
    // /channel-monitors API call returns 401.
    meta: { public: true, title: '服务状态' },
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

// ─── Top progress bar ─────────────────────────────────────────────────────
//
// Each route component is `() => import(...)` — a separate JS chunk that
// gets fetched on first navigation to that route. On a slow link the
// fetch can take 200-800 ms before the new view paints, during which the
// user sees the previous view unchanged and assumes their click did
// nothing. Show a thin bar pinned to the top so they know work is
// happening. The bar lives in style.css as `.route-progress`.

let progressEl: HTMLElement | null = null
let progressTimer: ReturnType<typeof setTimeout> | null = null

function ensureProgressEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  if (progressEl) return progressEl
  progressEl = document.createElement('div')
  progressEl.className = 'route-progress'
  progressEl.style.width = '100%'
  progressEl.style.transform = 'scaleX(0)'
  progressEl.style.opacity = '0'
  document.body.appendChild(progressEl)
  return progressEl
}

function startProgress() {
  const el = ensureProgressEl()
  if (!el) return
  // Cancel any pending hide.
  if (progressTimer !== null) { clearTimeout(progressTimer); progressTimer = null }
  // 0 → 70% quickly. The remaining 30% is held back so the bar doesn't
  // claim "done" before the chunk actually parses — `finishProgress`
  // completes it on the matching `afterEach`.
  el.style.opacity = '1'
  el.style.transform = 'scaleX(0)'
  // Force a reflow so the browser registers the 0% start before the
  // 70% transition kicks in.
  el.offsetHeight // eslint-disable-line @typescript-eslint/no-unused-expressions
  el.style.transform = 'scaleX(0.7)'
}

function finishProgress() {
  const el = ensureProgressEl()
  if (!el) return
  el.style.transform = 'scaleX(1)'
  progressTimer = setTimeout(() => {
    el.style.opacity = '0'
    progressTimer = setTimeout(() => {
      el.style.transform = 'scaleX(0)'
    }, 240)
  }, 180)
}

router.beforeEach(async (to) => {
  startProgress()
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

router.afterEach(() => { finishProgress() })
router.onError(() => { finishProgress() })

export default router
