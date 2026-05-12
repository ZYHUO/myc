<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { UiCard, UiBadge, UiSkeleton } from '@/components/ui'
import { getChannelMonitors } from '@/api/channels'
import type { ChannelMonitor } from '@/api/channels'

const monitors = ref<ChannelMonitor[]>([])
const loading = ref(true)
const lastRefresh = ref<Date>(new Date())
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

async function fetchMonitors() {
  monitors.value = await getChannelMonitors()
  lastRefresh.value = new Date()
  loading.value = false
}

onMounted(() => {
  fetchMonitors()
  refreshInterval.value = setInterval(fetchMonitors, 30000)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
})

function statusBadgeVariant(s: ChannelMonitor['status']): 'green' | 'amber' | 'red' {
  if (s === 'healthy') return 'green'
  if (s === 'degraded') return 'amber'
  return 'red'
}

function statusLabel(s: ChannelMonitor['status']): string {
  if (s === 'healthy') return 'Healthy'
  if (s === 'degraded') return 'Degraded'
  return 'Down'
}

function uptimeSegmentColor(s: 'up' | 'down' | 'degraded'): string {
  if (s === 'up') return 'bg-green'
  if (s === 'degraded') return 'bg-amber'
  return 'bg-red'
}

function formatRefreshTime(d: Date): string {
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">MONITORING</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Channel status</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">
        Real-time health monitoring across all API channels.
      </p>
      <!-- Auto-refresh indicator -->
      <div class="flex items-center gap-2 mt-3">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green"></span>
        </span>
        <span class="text-xs text-muted-fg">Auto-refreshing · Last updated {{ formatRefreshTime(lastRefresh) }}</span>
      </div>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="rounded-xl border border-border bg-card p-6 space-y-4">
        <UiSkeleton width="50%" height="24px" />
        <UiSkeleton width="100%" height="20px" />
        <UiSkeleton width="100%" height="24px" class="rounded-sm" />
      </div>
    </div>

    <!-- Monitor Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UiCard v-for="(m, idx) in monitors" :key="m.id" class="card-hover stagger-item" :style="{ animationDelay: `${idx * 80}ms` }">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium">{{ m.name }}</h3>
          <UiBadge :variant="statusBadgeVariant(m.status)">{{ statusLabel(m.status) }}</UiBadge>
        </div>

        <div class="flex items-end gap-8 mt-4">
          <div>
            <p class="text-3xl font-light tracking-tight tabular-nums">{{ m.availability }}%</p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">Availability</p>
          </div>
          <div>
            <p class="font-mono text-lg text-muted-fg">{{ m.latency }}ms</p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">Latency</p>
          </div>
        </div>

        <!-- Uptime Bar -->
        <div class="flex gap-0.5 mt-5">
          <div
            v-for="(seg, i) in m.uptimeHistory"
            :key="i"
            class="flex-1 h-6 rounded-sm transition-colors duration-150"
            :class="uptimeSegmentColor(seg)"
          />
        </div>
      </UiCard>
    </div>
  </div>
</template>
