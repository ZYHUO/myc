import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
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
  ],
})

router.beforeEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - Sub2API` : 'Sub2API'
})

export default router
