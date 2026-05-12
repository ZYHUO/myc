<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UiCard, UiButton, UiCopyButton, UiTable } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { getAffiliateStats, getAffiliateActivity, getReferralLink, type AffiliateStats, type AffiliateActivity } from '@/api/affiliate'

const stats = ref<AffiliateStats>({ totalReferrals: 0, availableRebate: 0, totalEarned: 0 })
const activity = ref<AffiliateActivity[]>([])
const referralLink = ref('')
const loading = ref(true)
const transferring = ref(false)
const toast = useToast()
const { confirm } = useConfirm()

onMounted(async () => {
  try {
    const [s, a, l] = await Promise.all([
      getAffiliateStats(),
      getAffiliateActivity(),
      getReferralLink(),
    ])
    stats.value = s
    activity.value = a
    referralLink.value = l
  } catch {
    toast.error('Failed to load affiliate data')
  } finally {
    loading.value = false
  }
})

async function handleTransfer() {
  if (stats.value.availableRebate <= 0) {
    toast.warning('No rebate available to transfer')
    return
  }
  const confirmed = await confirm({
    title: 'Transfer to Balance',
    message: `Transfer ¥${stats.value.availableRebate.toFixed(2)} from affiliate rebate to your account balance?`,
  })
  if (!confirmed) return
  transferring.value = true
  setTimeout(() => {
    const amount = stats.value.availableRebate
    stats.value.availableRebate = 0
    transferring.value = false
    toast.success(`¥${amount.toFixed(2)} transferred to balance`)
  }, 1000)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const statCards = [
  { key: 'totalReferrals' as const, label: 'Total Referrals' },
  { key: 'availableRebate' as const, label: 'Available Rebate' },
  { key: 'totalEarned' as const, label: 'Total Earned' },
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
        <UiCard v-for="card in statCards" :key="card.key">
          <p class="text-4xl font-light tracking-tight tabular-nums font-mono">
            {{ card.key === 'totalReferrals' ? stats[card.key] : `¥${stats[card.key].toFixed(1)}` }}
          </p>
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">{{ card.label }}</p>
        </UiCard>
      </div>

      <!-- Referral Link -->
      <UiCard>
        <p class="text-sm font-medium mb-3">Your referral link</p>
        <div class="flex gap-2">
          <input
            :value="referralLink"
            readonly
            class="flex-1 h-10 rounded-md border border-input bg-card px-3 text-sm text-fg font-mono outline-none"
          />
          <UiCopyButton :text="referralLink" />
        </div>
      </UiCard>

      <!-- Recent Activity -->
      <div class="space-y-5">
        <p class="text-3xl font-display font-normal tracking-tight">Recent activity</p>

        <UiTable>
          <thead>
            <tr class="border-b border-border">
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">User</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Joined</th>
              <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Rebate</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in activity" :key="item.user" class="border-b border-border last:border-0 stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
              <td class="px-4 py-3 text-sm">{{ item.user }}</td>
              <td class="px-4 py-3 text-sm text-muted-fg">{{ formatDate(item.joinedAt) }}</td>
              <td class="px-4 py-3 font-mono text-sm tabular-nums">¥{{ item.rebate.toFixed(2) }}</td>
            </tr>
          </tbody>
        </UiTable>
      </div>

      <!-- Transfer Button -->
      <div>
        <UiButton variant="secondary" :disabled="transferring" @click="handleTransfer">
          {{ transferring ? 'Transferring…' : 'Transfer to Balance' }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
