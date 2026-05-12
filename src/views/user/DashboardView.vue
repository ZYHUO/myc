<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import client from '@/api/client'
import { isMockMode, unwrap } from '@/api/_util'
import { UiCard, UiButton, UiTable, UiStatusDot, UiSkeleton } from '@/components/ui'
import { useCountUp } from '@/composables'

const router = useRouter()
const auth = useAuthStore()
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

const stats = [
  { get value() { return String(animatedKeys.value) }, label: 'Total Keys' },
  { get value() { return animatedRequests.value.toLocaleString() }, label: 'Total Requests' },
  { get value() { return `${(animatedTokens.value / 1000).toFixed(1)}M` }, label: 'Tokens Used' },
  { get value() { return `$${(animatedBalance.value / 100).toFixed(2)}` }, label: 'Balance' },
]

const barHeights = ref<number[]>(Array(12).fill(10))
const recentUsage = ref<Array<{ time: string; model: string; tokens: string; cost: string; status: 'online' | 'offline' }>>([])

interface RawUsageLog {
  created_at: string
  model?: string
  tokens_prompt?: number
  tokens_completion?: number
  cost_usd?: number
  status_code?: number
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
  } else {
    try {
      const body = unwrap<{ items?: RawUsageLog[]; total?: number } | RawUsageLog[]>(
        await client.get('/admin/usage', { params: { page: 1, page_size: 5 } }),
      )
      const items = Array.isArray(body) ? body : body?.items ?? []
      const total = Array.isArray(body) ? items.length : body?.total ?? items.length
      totalRequests.value = total
      recentUsage.value = items.map((item) => ({
        time: new Date(item.created_at).toLocaleTimeString(),
        model: item.model || 'unknown',
        tokens: ((item.tokens_prompt || 0) + (item.tokens_completion || 0)).toLocaleString(),
        cost: `$${(item.cost_usd || 0).toFixed(4)}`,
        status: item.status_code === 200 ? ('online' as const) : ('offline' as const),
      }))
    } catch (e) {
      console.error('Failed to fetch usage:', e)
    }
  }
  loading.value = false
})
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">OVERVIEW</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">
        Welcome back, <span class="font-normal">{{ auth.user?.username ?? 'User' }}</span>
      </h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">
        Your API relay at a glance.
      </p>
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
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">USAGE TREND</p>
      <h2 class="text-3xl font-display font-normal tracking-tight mt-2">Requests over time</h2>
      <UiCard class="mt-4">
        <div class="flex items-end gap-2 h-40">
          <div
            v-for="(h, i) in barHeights"
            :key="i"
            class="flex-1 bg-primary/20 rounded-sm transition-all duration-150 hover:bg-primary/40"
            :style="{ height: `${h}%` }"
          />
        </div>
        <div class="flex justify-between mt-3 text-[11px] text-muted-fg">
          <span>Jan</span>
          <span>Dec</span>
        </div>
      </UiCard>
    </div>

    <!-- Recent Usage -->
    <div>
      <div class="flex items-center justify-between">
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">RECENT USAGE</p>
        <router-link
          to="/usage"
          class="text-sm text-muted-fg hover:text-fg transition-colors duration-150"
        >
          View all →
        </router-link>
      </div>
      <h2 class="text-3xl font-display font-normal tracking-tight mt-2">Latest requests</h2>
      <UiTable class="mt-4">
        <thead>
          <tr class="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <th class="px-4 py-3 font-medium">Time</th>
            <th class="px-4 py-3 font-medium">Model</th>
            <th class="px-4 py-3 font-medium">Tokens</th>
            <th class="px-4 py-3 font-medium">Cost</th>
            <th class="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in recentUsage" :key="row.time" class="border-b border-border last:border-0 row-hover stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
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
    </div>

    <!-- Quick Actions -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">QUICK ACTIONS</p>
      <h2 class="text-3xl font-display font-normal tracking-tight mt-2">Get things done</h2>
      <div class="flex gap-3 mt-4">
        <UiButton variant="primary" @click="router.push('/keys')">Create Key</UiButton>
        <UiButton variant="secondary" @click="router.push('/purchase')">Top Up</UiButton>
        <UiButton variant="secondary" @click="router.push('/usage')">View Usage</UiButton>
      </div>
    </div>
  </div>
</template>
