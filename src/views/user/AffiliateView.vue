<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiButton, UiCopyButton, UiTable } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import { getAffiliateData, transferAffiliateBalance, type AffiliateData } from '@/api/affiliate'

const auth = useAuthStore()
const data = ref<AffiliateData>({
  stats: { totalReferrals: 0, availableRebate: 0, totalEarned: 0, frozenRebate: 0, rebateRatePercent: 0 },
  activity: [],
  referralLink: '',
})
const loading = ref(true)
const transferring = ref(false)
const toast = useToast()
const { confirm } = useConfirm()
const { t, locale } = useI18n()

onMounted(async () => {
  try {
    data.value = await getAffiliateData()
  } catch {
    toast.error(t('affiliate.loadFailed'))
  } finally {
    loading.value = false
  }
})

async function handleTransfer() {
  const amount = data.value.stats.availableRebate
  if (amount <= 0) {
    toast.warning(t('affiliate.noRebate'))
    return
  }
  const amountStr = amount.toFixed(2)
  const confirmed = await confirm({
    title: t('affiliate.transferTitle'),
    message: t('affiliate.transferMsg', { amount: amountStr }),
  })
  if (!confirmed) return
  transferring.value = true
  try {
    await transferAffiliateBalance(amount)
    data.value.stats.availableRebate = 0
    await auth.fetchUser()
    toast.success(t('affiliate.transferOk', { amount: amountStr }))
  } catch {
    toast.error(t('affiliate.transferFail'))
  } finally {
    transferring.value = false
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const statCards = computed(() => [
  { label: t('affiliate.cards.totalReferrals'), value: String(data.value.stats.totalReferrals) },
  { label: t('affiliate.cards.availableRebate'), value: `$${data.value.stats.availableRebate.toFixed(2)}` },
  { label: t('affiliate.cards.totalEarned'), value: `$${data.value.stats.totalEarned.toFixed(2)}` },
])
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('affiliate.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('affiliate.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">
        {{ t('affiliate.subtitle') }}
        <template v-if="data.stats.rebateRatePercent > 0">
          {{ t('affiliate.rateSuffix', { n: data.stats.rebateRatePercent }) }}
        </template>
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="h-28 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    </div>

    <template v-else>
      <!-- Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UiCard v-for="card in statCards" :key="card.label">
          <p class="text-4xl font-light tracking-tight tabular-nums font-mono">{{ card.value }}</p>
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">{{ card.label }}</p>
        </UiCard>
      </div>

      <!-- Referral Link -->
      <UiCard>
        <p class="text-sm font-medium mb-3">{{ t('affiliate.yourLink') }}</p>
        <div class="flex gap-2">
          <input
            :value="data.referralLink"
            readonly
            :aria-label="t('affiliate.yourLink')"
            class="flex-1 h-10 rounded-md border border-input bg-card px-3 text-sm text-fg font-mono outline-none"
          />
          <UiCopyButton :text="data.referralLink" />
        </div>
      </UiCard>

      <!-- Recent Activity -->
      <div class="space-y-5">
        <p class="text-2xl sm:text-3xl font-display font-normal tracking-tight">{{ t('affiliate.recent') }}</p>

        <UiTable v-if="data.activity.length > 0">
          <thead>
            <tr class="border-b border-border">
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('affiliate.cols.user') }}</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('affiliate.cols.joined') }}</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">{{ t('affiliate.cols.rebate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in data.activity" :key="`${item.user}-${idx}`" class="border-b border-border last:border-0 stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
              <td class="px-4 py-3 text-sm">{{ item.user }}</td>
              <td class="px-4 py-3 text-sm text-muted-fg">{{ formatDate(item.joinedAt) }}</td>
              <td class="px-4 py-3 font-mono text-sm tabular-nums">${{ item.rebate.toFixed(2) }}</td>
            </tr>
          </tbody>
        </UiTable>
        <p v-else class="text-sm text-muted-fg">{{ t('affiliate.empty') }}</p>
      </div>

      <!-- Transfer Button -->
      <div>
        <UiButton variant="secondary" :disabled="transferring || data.stats.availableRebate <= 0" @click="handleTransfer">
          {{ transferring ? t('affiliate.transferring') : t('affiliate.transfer') }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
