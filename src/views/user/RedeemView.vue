<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiInput, UiButton, UiBadge, UiTable } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables'
import { redeemCode, getRedeemHistory, type RedeemHistory } from '@/api/redeem'

const code = ref('')
const redeeming = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const toast = useToast()
const auth = useAuthStore()
const { t, locale } = useI18n()

const history = ref<RedeemHistory[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    history.value = await getRedeemHistory()
  } catch {
    toast.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
})

async function handleRedeem() {
  const trimmed = code.value.trim()
  if (!trimmed) {
    message.value = { type: 'error', text: t('redeem.toast.empty') }
    return
  }
  redeeming.value = true
  message.value = null
  try {
    const res = await redeemCode(trimmed)
    if (res.success) {
      // Include the upstream message + the credited amount if available, so
      // the user sees exactly what they got even if their account screen
      // hasn't yet refreshed.
      const detail = res.value !== undefined ? ` · ${formatValue(res.type ?? 'balance', res.value)}` : ''
      message.value = { type: 'success', text: (res.message || t('redeem.toast.success')) + detail }
      code.value = ''
      // Refresh both the history table AND the user balance in the sidebar —
      // a successful redeem almost always changes one of the two.
      await Promise.all([
        getRedeemHistory().then((h) => { history.value = h }),
        auth.fetchUser(),
      ])
    } else {
      message.value = { type: 'error', text: res.message || t('redeem.toast.failed') }
    }
  } catch {
    message.value = { type: 'error', text: t('redeem.toast.failed') }
  } finally {
    redeeming.value = false
  }
}

function onInputKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleRedeem()
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// sub2api's redeem-code statuses: `unused`, `used`, `expired`, `revoked`.
function statusVariant(status: string): BadgeVariant {
  if (status === 'used') return 'green'
  if (status === 'unused') return 'amber'
  if (status === 'expired') return 'gray'
  return 'red'
}

function localizedStatus(status: string): string {
  // `redeem.status.*` keys cover the upstream enum; fall back to the raw
  // value if a deployment introduces a new status we haven't translated.
  const key = `redeem.status.${status}`
  return t(key) === key ? status : t(key)
}

function localizedType(type: string): string {
  const key = `redeem.types.${type}`
  return t(key) === key ? type : t(key)
}

/** Render a redeem `value` according to the code type's units. */
function formatValue(type: string, value: number): string {
  if (type === 'balance' || type === 'admin_balance' || type === 'affiliate_balance') {
    return `$${value.toFixed(2)}`
  }
  if (type === 'concurrency') {
    return t('redeem.unitConcurrency', { n: value })
  }
  if (type === 'subscription') {
    // The `value` for subscription redeems is the validity multiplier; the
    // raw days count comes from `validityDays` on the history row.
    return t('redeem.unitMonths', { n: value })
  }
  return String(value)
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('redeem.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('redeem.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('redeem.subtitle') }}</p>
    </div>

    <!-- Redeem Input -->
    <div class="flex flex-col sm:flex-row gap-3 max-w-xl">
      <div class="flex-1" @keydown="onInputKeydown">
        <UiInput v-model="code" :placeholder="t('redeem.codePlaceholder')" autocomplete="off" />
      </div>
      <UiButton variant="primary" size="md" :disabled="redeeming" @click="handleRedeem">
        {{ redeeming ? t('redeem.submitting') : t('redeem.submit') }}
      </UiButton>
    </div>

    <!-- Message -->
    <p v-if="message" class="text-sm" :class="message.type === 'success' ? 'text-green' : 'text-destructive'">
      {{ message.text }}
    </p>

    <!-- Redemption History -->
    <div class="space-y-5">
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('redeem.history') }}</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-12 rounded-xl border border-border bg-card animate-pulse" />
      </div>

      <p v-else-if="history.length === 0" class="text-sm text-muted-fg">{{ t('redeem.historyEmpty') }}</p>

      <UiTable v-else>
        <thead>
          <tr class="border-b border-border">
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('redeem.cols.code') }}</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('redeem.cols.type') }}</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('redeem.cols.amount') }}</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('redeem.cols.date') }}</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('keys.cols.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history" :key="item.id" class="border-b border-border last:border-0">
            <td class="px-4 py-3 font-mono text-sm" :title="item.notes ?? undefined">{{ item.code }}</td>
            <td class="px-4 py-3 text-sm">{{ localizedType(item.type) }}</td>
            <td class="px-4 py-3 font-mono text-sm tabular-nums">{{ formatValue(item.type, item.value) }}</td>
            <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(item.date) }}</td>
            <td class="px-4 py-3">
              <UiBadge :variant="statusVariant(item.status)">{{ localizedStatus(item.status) }}</UiBadge>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </div>
  </div>
</template>
