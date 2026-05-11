<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiProgressBar from '@/components/ui/UiProgressBar.vue'
import { getSubscriptions, type Subscription } from '@/api/subscriptions'

const subscriptions = ref<Subscription[]>([])
const loading = ref(true)

onMounted(async () => {
  subscriptions.value = await getSubscriptions()
  loading.value = false
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function statusVariant(status: string) {
  if (status === 'active') return 'green'
  if (status === 'expired') return 'gray'
  return 'red'
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">SUBSCRIPTIONS</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Your subscriptions</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-40 rounded-xl border border-border bg-card animate-pulse" />
    </div>

    <!-- Subscription Cards -->
    <div v-else class="space-y-4">
      <UiCard v-for="sub in subscriptions" :key="sub.id">
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <p class="text-lg font-medium">{{ sub.name }}</p>
            <p class="text-sm text-muted-fg">
              Expires {{ formatDate(sub.expiresAt) }}
            </p>
          </div>
          <UiBadge :variant="statusVariant(sub.status) as any">
            {{ sub.status }}
          </UiBadge>
        </div>

        <div class="mt-5 space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-fg">Usage this period</span>
            <span class="tabular-nums font-mono text-fg">{{ sub.usagePercent }}%</span>
          </div>
          <UiProgressBar :value="sub.usagePercent" />
          <p class="text-sm text-muted-fg">
            Daily usage: {{ sub.dailyUsage.toLocaleString() }} tokens
          </p>
        </div>

        <div v-if="sub.status === 'active'" class="mt-5">
          <UiButton variant="secondary" size="sm">Renew</UiButton>
        </div>
      </UiCard>

      <!-- Looking for more? -->
      <div class="rounded-xl border border-dashed border-border p-8 text-center space-y-4">
        <p class="text-lg font-medium">Looking for more?</p>
        <p class="text-sm text-muted-fg">Browse available plans and top up your balance.</p>
        <RouterLink to="/purchase">
          <UiButton variant="primary" size="sm">View Plans</UiButton>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
