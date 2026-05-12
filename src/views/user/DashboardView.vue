<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import client from '@/api/client'
import { isMockMode, unwrap } from '@/api/_util'
import { UiCard, UiButton, UiTable, UiStatusDot, UiSkeleton } from '@/components/ui'
import { useCountUp } from '@/composables'

const router = useRouter()
const auth = useAuthStore()
const { t } = useI18n()
const loading = ref(true)

// Stats targets. They start at 0 and rise to the fetched values; useCountUp
// watches each one and animates the displayed number when it changes.
const totalKeys = ref(0)
const totalRequests = ref(0)
const totalTokensThousands = ref(0)
const balanceCents = computed(() => Math.round((auth.user?.balance ?? 0) * 100))

const animatedKeys = useCountUp(totalKeys)
const animatedRequests = useCountUp(totalRequests)
const animatedTokens = useCountUp(totalTokensThousands)
const animatedBalance = useCountUp(balanceCents)

const stats = computed(() => [
  { value: String(animatedKeys.value), label: t('dashboard.cards.totalKeys') },
  { value: animatedRequests.value.toLocaleString(), label: t('dashboard.cards.totalRequests') },
  { value: `${(animatedTokens.value / 1000).toFixed(1)}M`, label: t('dashboard.cards.tokensUsed') },
  { value: `$${(animatedBalance.value / 100).toFixed(2)}`, label: t('dashboard.cards.balance') },
])

const barHeights = ref<number[]>(Array(12).fill(10))
const recentUsage = ref<Array<{ time: string; model: string; tokens: string; cost: string; status: 'online' | 'offline' }>>([])

// sub2api usage row shape (snake_case, integers in micro-USD for *_cost fields).
interface RawUsageLog {
  id?: number
  created_at: string
  model?: string
  input_tokens?: number
  output_tokens?: number
  cache_creation_tokens?: number
  cache_read_tokens?: number
  total_cost?: number
  status_code?: number
}

interface DashboardStats {
  total_api_keys?: number
  total_requests?: number
  total_tokens?: number
}

interface TrendPoint {
  date: string
  requests: number
  total_tokens?: number
  cost?: number
}

function relativeTime(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return iso
  const diff = Math.max(0, Date.now() - time)
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t('common.timeAgo.justNow')
  if (m < 60) return t('common.timeAgo.minute', { n: m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('common.timeAgo.hour', { n: h })
  const d = Math.floor(h / 24)
  return t('common.timeAgo.day', { n: d })
}

function mapRecentUsage(item: RawUsageLog) {
  const tokens = (item.input_tokens || 0) + (item.output_tokens || 0)
  return {
    time: relativeTime(item.created_at),
    model: item.model || 'unknown',
    tokens: tokens.toLocaleString(),
    cost: `$${(item.total_cost || 0).toFixed(4)}`,
    status: (item.status_code === undefined || item.status_code === 200) ? ('online' as const) : ('offline' as const),
  }
}

onMounted(async () => {
  if (isMockMode()) {
    totalKeys.value = 7
    totalRequests.value = 12847
    totalTokensThousands.value = 3200
    recentUsage.value = [
      { time: '2 min ago', model: 'claude-sonnet-4', tokens: '2,847', cost: '$0.085', status: 'online' },
      { time: '5 min ago', model: 'gpt-4o', tokens: '1,230', cost: '$0.062', status: 'online' },
      { time: '12 min ago', model: 'gemini-2.5-pro', tokens: '4,102', cost: '$0.115', status: 'online' },
      { time: '18 min ago', model: 'deepseek-v3', tokens: '890', cost: '$0.009', status: 'offline' },
      { time: '25 min ago', model: 'gpt-4o-mini', tokens: '3,560', cost: '$0.011', status: 'online' },
    ]
    loading.value = false
    return
  }
  try {
    // Aggregate stats already include total_api_keys, so no need for a separate /keys count call.
    const [stats, trend, usage] = await Promise.all([
      client.get('/usage/dashboard/stats').then((r) => unwrap<DashboardStats>(r)),
      client.get('/usage/dashboard/trend', { params: { days: 12 } }).then((r) =>
        unwrap<{ trend?: TrendPoint[] } | TrendPoint[]>(r),
      ),
      client.get('/usage', { params: { page: 1, page_size: 5 } }).then((r) =>
        unwrap<{ items?: RawUsageLog[] } | RawUsageLog[]>(r),
      ),
    ])

    totalKeys.value = stats.total_api_keys ?? 0
    totalRequests.value = stats.total_requests ?? 0
    totalTokensThousands.value = Math.round((stats.total_tokens ?? 0) / 1000)

    const points = Array.isArray(trend) ? trend : trend?.trend ?? []
    if (points.length > 0) {
      const max = Math.max(...points.map((p) => p.requests || 0), 1)
      const heights = points.map((p) => Math.max(8, Math.round(((p.requests || 0) / max) * 100)))
      // Pad to at least 12 buckets on the left so the chart layout is stable.
      const padded = heights.length >= 12 ? heights : [...Array(12 - heights.length).fill(8), ...heights]
      barHeights.value = padded.slice(-12)
    }

    const items = Array.isArray(usage) ? usage : usage?.items ?? []
    recentUsage.value = items.map(mapRecentUsage)
  } catch (e) {
    console.error(t('dashboard.loadFailed') + ':', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('dashboard.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">
        {{ t('dashboard.title') }}
        <template v-if="auth.user?.username">— <span class="font-normal">{{ auth.user.username }}</span></template>
      </h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('dashboard.subtitle') }}</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <template v-if="loading">
        <UiSkeleton v-for="i in 4" :key="i" width="100%" height="120px" class="rounded-xl" />
      </template>
      <UiCard v-for="(stat, idx) in stats" v-else :key="stat.label" class="card-hover stagger-item" :style="{ animationDelay: `${idx * 80}ms` }">
        <p class="text-4xl font-light tracking-tight tabular-nums font-mono">{{ stat.value }}</p>
        <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">{{ stat.label }}</p>
      </UiCard>
    </div>

    <!-- Usage Trend -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('dashboard.chart.title') }}</p>
      <h2 class="text-2xl sm:text-3xl font-display font-normal tracking-tight mt-2">{{ t('dashboard.chart.caption') }}</h2>
      <UiCard class="mt-4">
        <div class="flex items-end gap-2 h-40">
          <div
            v-for="(h, i) in barHeights"
            :key="i"
            class="flex-1 bg-primary/20 rounded-sm transition-all duration-150 hover:bg-primary/40"
            :style="{ height: `${h}%` }"
          />
        </div>
      </UiCard>
    </div>

    <!-- Recent Usage -->
    <div>
      <div class="flex items-center justify-between">
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('dashboard.recent.title') }}</p>
        <router-link
          to="/usage"
          class="text-sm text-muted-fg hover:text-fg transition-colors duration-150"
        >
          {{ t('common.actions.viewAll') }} →
        </router-link>
      </div>
      <UiTable v-if="recentUsage.length > 0" class="mt-4">
        <thead>
          <tr class="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <th class="px-4 py-3 font-medium">{{ t('dashboard.recent.cols.time') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('dashboard.recent.cols.model') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('dashboard.recent.cols.tokens') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('dashboard.recent.cols.cost') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('dashboard.recent.cols.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in recentUsage" :key="idx" class="border-b border-border last:border-0 row-hover stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
            <td class="px-4 py-3 font-mono text-muted-fg text-sm">{{ row.time }}</td>
            <td class="px-4 py-3 text-sm">{{ row.model }}</td>
            <td class="px-4 py-3 font-mono text-sm">{{ row.tokens }}</td>
            <td class="px-4 py-3 font-mono text-sm">{{ row.cost }}</td>
            <td class="px-4 py-3">
              <UiStatusDot :status="row.status" />
            </td>
          </tr>
        </tbody>
      </UiTable>
      <p v-else-if="!loading" class="mt-4 text-sm text-muted-fg">{{ t('dashboard.recent.empty') }}</p>
    </div>

    <!-- Quick Actions -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('dashboard.quickActions.title') }}</p>
      <div class="flex flex-wrap gap-3 mt-4">
        <UiButton variant="primary" @click="router.push('/keys')">{{ t('dashboard.quickActions.newKey') }}</UiButton>
        <UiButton variant="secondary" @click="router.push('/purchase')">{{ t('dashboard.quickActions.purchase') }}</UiButton>
        <UiButton variant="secondary" @click="router.push('/usage')">{{ t('dashboard.quickActions.viewUsage') }}</UiButton>
        <UiButton variant="secondary" @click="router.push('/redeem')">{{ t('dashboard.quickActions.redeem') }}</UiButton>
      </div>
    </div>
  </div>
</template>
