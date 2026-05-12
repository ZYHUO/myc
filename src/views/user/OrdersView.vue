<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UiTable, UiBadge, UiButton } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import * as payment from '@/api/payment'

const orders = ref<payment.PaymentOrder[]>([])
const loading = ref(true)
const toast = useToast()
const { confirm } = useConfirm()

onMounted(async () => {
  try {
    const result = await payment.getMyOrders({ page: 1, page_size: 50 })
    orders.value = result.items
  } catch {
    toast.error('Failed to load orders')
  } finally {
    loading.value = false
  }
})

async function handleRefund(order: payment.PaymentOrder) {
  const confirmed = await confirm({
    title: 'Request Refund',
    message: `Are you sure you want to request a refund for order ${order.out_trade_no} ($${order.amount.toFixed(2)})?`,
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await payment.requestRefund(String(order.id))
    // Optimistic: server may async-process; reflect immediately and re-fetch.
    const idx = orders.value.findIndex((o) => o.id === order.id)
    if (idx !== -1) orders.value[idx] = { ...orders.value[idx], status: 'refunded' }
    toast.success('Refund request submitted')
    const result = await payment.getMyOrders({ page: 1, page_size: 50 })
    orders.value = result.items
  } catch {
    toast.error('Refund request failed')
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusVariant(status: payment.PaymentOrder['status']): BadgeVariant {
  if (status === 'paid' || status === 'completed') return 'green'
  if (status === 'pending') return 'amber'
  if (status === 'refunded') return 'gray'
  return 'red'
}

function formatType(type: string) {
  const map: Record<string, string> = {
    subscription: 'Subscription',
    recharge: 'Top-up',
    topup: 'Top-up',
  }
  return map[type] || type
}

function formatMethod(order: payment.PaymentOrder) {
  return order.payment_method || order.provider || '—'
}

function canRefund(status: payment.PaymentOrder['status']): boolean {
  return status === 'paid' || status === 'completed'
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

    <!-- Empty -->
    <div v-else-if="orders.length === 0" class="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
      <p class="text-base font-medium">No orders yet</p>
      <p class="text-sm text-muted-fg">
        Once you top up your balance or subscribe to a plan, the orders will show up here.
      </p>
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
        <tr v-for="order in orders" :key="order.id" class="border-b border-border last:border-0 row-hover">
          <td class="px-4 py-3 font-mono text-sm">{{ order.out_trade_no }}</td>
          <td class="px-4 py-3 text-sm">{{ formatType(order.type) }}</td>
          <td class="px-4 py-3 font-mono text-sm tabular-nums">${{ order.amount.toFixed(2) }}</td>
          <td class="px-4 py-3">
            <UiBadge :variant="statusVariant(order.status)">{{ order.status }}</UiBadge>
          </td>
          <td class="px-4 py-3 text-sm">{{ formatMethod(order) }}</td>
          <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(order.created_at) }}</td>
          <td class="px-4 py-3">
            <UiButton v-if="canRefund(order.status)" variant="ghost" size="sm" class="text-destructive" @click="handleRefund(order)">
              Refund
            </UiButton>
          </td>
        </tr>
      </tbody>
    </UiTable>
  </div>
</template>
