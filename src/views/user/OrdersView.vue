<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiTable from '@/components/ui/UiTable.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { getOrders, type Order } from '@/api/orders'

const orders = ref<Order[]>([])
const loading = ref(true)

onMounted(async () => {
  orders.value = await getOrders()
  loading.value = false
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusVariant(status: string) {
  if (status === 'completed') return 'green'
  if (status === 'pending') return 'amber'
  if (status === 'refunded') return 'gray'
  return 'red'
}

function formatType(type: string) {
  const map: Record<string, string> = {
    subscription: 'Subscription',
    topup: 'Top-up',
    redeem: 'Redeem',
  }
  return map[type] || type
}

function formatMethod(method: string) {
  const map: Record<string, string> = {
    alipay: 'Alipay',
    wechat: 'WeChat',
    card: 'Card',
    redeem: 'Redeem',
  }
  return map[method] || method
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">ORDERS</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Order history</h1>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-12 rounded-xl border border-border bg-card animate-pulse" />
    </div>

    <!-- Table -->
    <UiTable v-else>
      <thead>
        <tr class="border-b border-border">
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Order ID</th>
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Type</th>
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Amount</th>
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Status</th>
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Method</th>
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Date</th>
          <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id" class="border-b border-border last:border-0">
          <td class="px-4 py-3 font-mono text-sm">{{ order.id }}</td>
          <td class="px-4 py-3 text-sm">{{ formatType(order.type) }}</td>
          <td class="px-4 py-3 font-mono text-sm tabular-nums">¥{{ order.amount.toFixed(2) }}</td>
          <td class="px-4 py-3">
            <UiBadge :variant="statusVariant(order.status) as any">{{ order.status }}</UiBadge>
          </td>
          <td class="px-4 py-3 text-sm">{{ formatMethod(order.paymentMethod) }}</td>
          <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(order.createdAt) }}</td>
          <td class="px-4 py-3">
            <UiButton v-if="order.status === 'completed'" variant="ghost" size="sm">Refund</UiButton>
          </td>
        </tr>
      </tbody>
    </UiTable>
  </div>
</template>
