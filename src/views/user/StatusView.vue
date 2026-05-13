<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiBadge, UiSkeleton, UiButton } from '@/components/ui'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'
import { getChannelMonitors } from '@/api/channels'
import type { ChannelMonitor } from '@/api/channels'
import { useAuthStore } from '@/stores/auth'
import { httpStatus } from '@/api/_util'

const monitors = ref<ChannelMonitor[]>([])
const loading = ref(true)
/** True when the most recent fetch returned 401 — we surface a clearer
 *  "live data needs sign-in" state instead of the generic empty box. */
const needsAuth = ref(false)
const lastRefresh = ref<Date>(new Date())
const refreshInterval = ref<ReturnType<typeof setInterval> | null>(null)
const { t, locale } = useI18n()
const auth = useAuthStore()

const isAuthed = computed(() => auth.isAuthenticated)

async function fetchMonitors() {
  try {
    monitors.value = await getChannelMonitors(t)
    needsAuth.value = false
    lastRefresh.value = new Date()
  } catch (err) {
    if (httpStatus(err) === 401) {
      needsAuth.value = true
      // Stop polling — without a token, retrying every 30s is just noise.
      if (refreshInterval.value) {
        clearInterval(refreshInterval.value)
        refreshInterval.value = null
      }
    }
    // Other errors: keep prior data, the interval will retry.
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

function statusBadgeVariant(s: ChannelMonitor['status']): 'green' | 'amber' | 'red' | 'gray' {
  if (s === 'healthy') return 'green'
  if (s === 'degraded') return 'amber'
  if (s === 'down') return 'red'
  return 'gray' // unknown → neutral, never red
}

function statusLabel(s: ChannelMonitor['status']): string {
  if (s === 'healthy') return t('common.status.healthy')
  if (s === 'degraded') return t('common.status.degraded')
  if (s === 'down') return t('common.status.down')
  return t('common.status.unknown')
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
  <!-- When unauthenticated the App.vue layout decision drops the sidebar
       and we render this view bare. Add a public brand strip + footer so
       the page doesn't sit floating in the middle of an empty viewport. -->
  <div :class="!isAuthed && 'min-h-screen flex flex-col bg-bg'">
    <header
      v-if="!isAuthed"
      class="px-6 sm:px-10 py-5 flex items-center justify-between border-b border-border"
    >
      <RouterLink to="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">
          A
        </div>
        <span class="text-xl font-display text-fg tracking-tight">Amodel</span>
      </RouterLink>
      <div class="flex items-center gap-1">
        <UiLanguageSwitcher />
        <UiThemeSwitcher />
        <RouterLink to="/login" class="ml-2 text-sm text-muted-fg hover:text-fg transition-colors">
          {{ t('common.signIn') }}
        </RouterLink>
      </div>
    </header>

    <main :class="!isAuthed ? 'flex-1 mx-auto w-full max-w-[1200px] px-6 sm:px-10 py-10' : ''">
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

    <!-- Sign-in required: sub2api gates /channel-monitors behind JWT auth.
         Surface this honestly instead of an ambiguous "no data" box. -->
    <div
      v-else-if="needsAuth"
      class="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3"
    >
      <p class="text-base font-medium text-fg">{{ t('status.signInRequiredTitle') }}</p>
      <p class="text-sm text-muted-fg max-w-md mx-auto leading-relaxed">{{ t('status.signInRequiredBody') }}</p>
      <div class="pt-2">
        <UiButton variant="primary" size="md" @click="$router.push('/login?redirect=/status')">
          {{ t('common.signIn') }}
        </UiButton>
      </div>
    </div>

    <!-- Empty: backend reachable but no monitors configured. -->
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

        <!-- Uptime bars: ONE bar per real health check, not a fake 30-day
             strip. When the upstream has no timeline data we show an empty
             state instead of inventing green bars from the availability %. -->
        <div class="mt-5">
          <div v-if="m.uptimeHistory.length > 0" class="flex gap-0.5">
            <div
              v-for="(seg, i) in m.uptimeHistory"
              :key="i"
              class="flex-1 h-6 rounded-sm transition-colors duration-150"
              :class="uptimeSegmentColor(seg)"
              :title="seg"
            />
          </div>
          <div v-else class="h-6 rounded-sm bg-muted/40" />
          <p class="mt-2 text-[11px] uppercase tracking-[0.15em] text-muted-fg tabular-nums">{{ m.uptimeSpanLabel }}</p>
        </div>
      </UiCard>
    </div>
      </div>
    </main>

    <footer v-if="!isAuthed" class="px-6 sm:px-10 py-6 text-xs text-muted-fg border-t border-border">© Amodel</footer>
  </div>
</template>
