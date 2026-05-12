<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiInput, UiButton, UiBadge, UiTable } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'
import { useToast } from '@/composables'
import { redeemCode, getRedeemHistory, type RedeemHistory } from '@/api/redeem'

const code = ref('')
const redeeming = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const toast = useToast()
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
      message.value = { type: 'success', text: res.message || t('redeem.toast.success') }
      code.value = ''
      history.value = await getRedeemHistory()
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
  return new Date(iso).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function statusVariant(status: RedeemHistory['status']): BadgeVariant {
  if (status === 'success') return 'green'
  if (status === 'expired') return 'gray'
  return 'red'
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
        <UiInput v-model="code" :placeholder="t('redeem.codePlaceholder')" />
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
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('redeem.cols.amount') }}</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('redeem.cols.date') }}</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('keys.cols.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history" :key="item.code" class="border-b border-border last:border-0">
            <td class="px-4 py-3 font-mono text-sm">{{ item.code }}</td>
            <td class="px-4 py-3 text-sm">{{ item.reward }}</td>
            <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(item.date) }}</td>
            <td class="px-4 py-3">
              <UiBadge :variant="statusVariant(item.status)">{{ item.status }}</UiBadge>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </div>
  </div>
</template>
