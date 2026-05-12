<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

onMounted(async () => {
  try {
    data.value = await getAffiliateData()
  } catch {
    toast.error('Failed to load affiliate data')
  } finally {
    loading.value = false
  }
})

async function handleTransfer() {
  const amount = data.value.stats.availableRebate
  if (amount <= 0) {
    toast.warning('No rebate available to transfer')
    return
  }
  const confirmed = await confirm({
    title: 'Transfer to Balance',
    message: `Transfer $${amount.toFixed(2)} from affiliate rebate to your account balance?`,
  })
  if (!confirmed) return
  transferring.value = true
  try {
    await transferAffiliateBalance(amount)
    data.value.stats.availableRebate = 0
    await auth.fetchUser()
    toast.success(`$${amount.toFixed(2)} transferred to balance`)
  } catch {
    toast.error('Transfer failed')
  } finally {
    transferring.value = false
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const statCards = [
  { label: 'Total Referrals', get value() { return String(data.value.stats.totalReferrals) } },
  { label: 'Available Rebate', get value() { return `$${data.value.stats.availableRebate.toFixed(2)}` } },
  { label: 'Total Earned', get value() { return `$${data.value.stats.totalEarned.toFixed(2)}` } },
]
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">AFFILIATE</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Referral program</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">
        Invite friends and earn rebates on their usage.
        <template v-if="data.stats.rebateRatePercent > 0">
          Your current rate is <span class="text-fg font-medium">{{ data.stats.rebateRatePercent }}%</span>.
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
        <p class="text-sm font-medium mb-3">Your referral link</p>
        <div class="flex gap-2">
          <input
            :value="data.referralLink"
            readonly
            aria-label="Referral link"
            class="flex-1 h-10 rounded-md border border-input bg-card px-3 text-sm text-fg font-mono outline-none"
          />
          <UiCopyButton :text="data.referralLink" />
        </div>
      </UiCard>

      <!-- Recent Activity -->
      <div class="space-y-5">
        <p class="text-3xl font-display font-normal tracking-tight">Recent activity</p>

        <UiTable v-if="data.activity.length > 0">
          <thead>
            <tr class="border-b border-border">
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">User</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Joined</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Rebate</th>
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
        <p v-else class="text-sm text-muted-fg">No referrals yet. Share your link to start earning.</p>
      </div>

      <!-- Transfer Button -->
      <div>
        <UiButton variant="secondary" :disabled="transferring || data.stats.availableRebate <= 0" @click="handleTransfer">
          {{ transferring ? 'Transferring…' : 'Transfer to Balance' }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
