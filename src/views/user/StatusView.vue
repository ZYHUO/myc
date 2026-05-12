<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiBadge, UiSkeleton } from '@/components/ui'
import { getChannelMonitors } from '@/api/channels'
import type { ChannelMonitor } from '@/api/channels'

const monitors = ref<ChannelMonitor[]>([])
const loading = ref(true)
const lastRefresh = ref<Date>(new Date())
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)
const { t, locale } = useI18n()

async function fetchMonitors() {
  try {
    monitors.value = await getChannelMonitors()
    lastRefresh.value = new Date()
  } catch {
    // Silent: keep prior data, refresh will retry on next interval.
  } finally {
    loading.value = false
  }
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
  if (s === 'healthy') return t('common.status.healthy')
  if (s === 'degraded') return t('common.status.degraded')
  return t('common.status.down')
}

function uptimeSegmentColor(s: 'up' | 'down' | 'degraded'): string {
  if (s === 'up') return 'bg-green'
  if (s === 'degraded') return 'bg-amber'
  return 'bg-red'
}

function formatRefreshTime(d: Date): string {
  return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('status.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('status.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('status.subtitle') }}</p>
      <!-- Auto-refresh indicator -->
      <div class="flex items-center gap-2 mt-3">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green"></span>
        </span>
        <span class="text-xs text-muted-fg">{{ formatRefreshTime(lastRefresh) }}</span>
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

    <!-- Empty -->
    <div v-else-if="monitors.length === 0" class="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-fg">
      {{ t('status.empty') }}
    </div>

    <!-- Monitor Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UiCard v-for="(m, idx) in monitors" :key="m.id" class="card-hover stagger-item" :style="{ animationDelay: `${idx * 80}ms` }">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-lg font-medium truncate">{{ m.name }}</h3>
          <UiBadge :variant="statusBadgeVariant(m.status)">{{ statusLabel(m.status) }}</UiBadge>
        </div>

        <div class="flex items-end gap-8 mt-4">
          <div>
            <p class="text-3xl font-light tracking-tight tabular-nums">{{ m.availability }}%</p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">{{ t('status.availability') }}</p>
          </div>
          <div>
            <p class="font-mono text-lg text-muted-fg">{{ m.latency }}ms</p>
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">{{ t('status.latency') }}</p>
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
