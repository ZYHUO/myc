<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiBadge, UiButton, UiProgressBar } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'
import { useToast } from '@/composables'
import { getSubscriptions, type Subscription } from '@/api/subscriptions'
import { useAuthStore } from '@/stores/auth'

const subscriptions = ref<Subscription[]>([])
const loading = ref(true)
const toast = useToast()
const auth = useAuthStore()
const { t, locale } = useI18n()

const balance = computed(() => auth.user?.balance ?? 0)

onMounted(async () => {
  try {
    subscriptions.value = await getSubscriptions()
  } catch {
    toast.error(t('subscriptions.loadFailed'))
  } finally {
    loading.value = false
  }
})

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function localizedStatus(status: string): string {
  if (status === 'active') return t('common.status.active')
  if (status === 'expired') return t('common.status.expired')
  if (status === 'paused') return t('common.status.paused')
  return status
}

function daysUntil(iso: string): number {
  if (!iso) return 0
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

function usagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function formatUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

function statusVariant(status: string): BadgeVariant {
  if (status === 'active') return 'green'
  if (status === 'expired') return 'gray'
  return 'red'
}

function platformIcon(platform: string): string {
  if (platform === 'anthropic') return '🟣'
  if (platform === 'openai') return '🟢'
  return '⚪'
}

// Progress bar color based on usage percentage
function progressColor(percent: number): string {
  if (percent >= 90) return 'var(--destructive)'
  if (percent >= 70) return 'var(--warning, #e5a500)'
  return 'var(--primary)'
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('subscriptions.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('subscriptions.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('subscriptions.subtitle') }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-40 rounded-xl border border-border bg-card animate-pulse" />
    </div>

    <template v-else>
      <!-- Balance Card -->
      <UiCard flat class="relative overflow-hidden">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('dashboard.cards.balance') }}</p>
            <p class="mt-2 text-4xl font-display font-normal tracking-tight tabular-nums">${{ balance.toFixed(2) }}</p>
          </div>
          <RouterLink to="/purchase">
            <UiButton variant="primary">{{ t('dashboard.quickActions.purchase') }}</UiButton>
          </RouterLink>
        </div>
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5" />
      </UiCard>

      <!-- Subscription Cards -->
      <div v-if="subscriptions.length > 0" class="space-y-4">
        <h2 class="text-xl font-display tracking-tight">{{ t('subscriptions.title') }}</h2>
        
        <UiCard v-for="(sub, idx) in subscriptions" :key="sub.id" flat class="card-hover stagger-item" :style="{ animationDelay: `${idx * 80}ms` }">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-base">{{ platformIcon(sub.platform) }}</span>
                <p class="text-lg font-medium">{{ sub.group_name }}</p>
                <UiBadge variant="gray" class="text-[10px]">{{ sub.subscription_type }}</UiBadge>
              </div>
              <p class="text-sm text-muted-fg">
                <template v-if="daysUntil(sub.expires_at) > 0">
                  {{ t('subscriptions.expires', { date: formatDate(sub.expires_at) }) }}
                </template>
                <template v-else>
                  {{ t('subscriptions.expired', { date: formatDate(sub.expires_at) }) }}
                </template>
              </p>
            </div>
            <UiBadge :variant="statusVariant(sub.status)">
              {{ localizedStatus(sub.status) }}
            </UiBadge>
          </div>

          <!-- Usage Limits -->
          <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Daily -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-fg uppercase tracking-wider">{{ t('subscriptions.daily') }}</span>
                <span class="tabular-nums font-mono">
                  {{ formatUSD(sub.daily_usage_usd) }}
                  <template v-if="sub.daily_limit_usd > 0"> / {{ formatUSD(sub.daily_limit_usd) }}</template>
                  <template v-else> / ∞</template>
                </span>
              </div>
              <UiProgressBar 
                :value="sub.daily_limit_usd > 0 ? usagePercent(sub.daily_usage_usd, sub.daily_limit_usd) : 0" 
                :style="{ '--progress-color': progressColor(usagePercent(sub.daily_usage_usd, sub.daily_limit_usd)) }"
              />
            </div>

            <!-- Weekly -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-fg uppercase tracking-wider">{{ t('subscriptions.weekly') }}</span>
                <span class="tabular-nums font-mono">
                  {{ formatUSD(sub.weekly_usage_usd) }}
                  <template v-if="sub.weekly_limit_usd > 0"> / {{ formatUSD(sub.weekly_limit_usd) }}</template>
                  <template v-else> / ∞</template>
                </span>
              </div>
              <UiProgressBar 
                :value="sub.weekly_limit_usd > 0 ? usagePercent(sub.weekly_usage_usd, sub.weekly_limit_usd) : 0"
                :style="{ '--progress-color': progressColor(usagePercent(sub.weekly_usage_usd, sub.weekly_limit_usd)) }"
              />
            </div>

            <!-- Monthly -->
            <div class="space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-fg uppercase tracking-wider">{{ t('subscriptions.monthly') }}</span>
                <span class="tabular-nums font-mono">
                  {{ formatUSD(sub.monthly_usage_usd) }}
                  <template v-if="sub.monthly_limit_usd > 0"> / {{ formatUSD(sub.monthly_limit_usd) }}</template>
                  <template v-else> / ∞</template>
                </span>
              </div>
              <UiProgressBar 
                :value="sub.monthly_limit_usd > 0 ? usagePercent(sub.monthly_usage_usd, sub.monthly_limit_usd) : 0"
                :style="{ '--progress-color': progressColor(usagePercent(sub.monthly_usage_usd, sub.monthly_limit_usd)) }"
              />
            </div>
          </div>

          <!-- Features -->
          <div class="mt-4 flex items-center gap-3 text-xs text-muted-fg">
            <span v-if="sub.rpm_limit > 0">{{ sub.rpm_limit }} RPM</span>
          </div>
        </UiCard>
      </div>

      <!-- Empty state -->
      <div v-if="subscriptions.length === 0" class="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
        <p class="text-lg font-medium">{{ t('subscriptions.empty') }}</p>
      </div>
    </template>
  </div>
</template>
