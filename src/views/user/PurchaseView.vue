<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiBadge, UiButton, UiInput, UiModal } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import * as payment from '@/api/payment'

const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { t } = useI18n()

// ─── State ──────────────────────────────────────────────────────────────────

const loading = ref(true)
const config = ref<payment.PaymentConfig | null>(null)
const plans = ref<payment.PaymentPlan[]>([])
const channels = ref<payment.PaymentChannel[]>([])
const limits = ref<payment.PaymentLimits | null>(null)

const activeTab = ref<'balance' | 'subscriptions'>('balance')
const selectedAmount = ref(50)
const customAmount = ref('')
const selectedChannelKey = ref<string | null>(null)
const paying = ref(false)
const selectedPlan = ref<number | null>(null)

// QR / order tracking
const orderInProgress = ref<{ out_trade_no: string; qr?: string; pay_url?: string } | null>(null)
const orderModalOpen = ref(false)
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null)

// ─── Computed ───────────────────────────────────────────────────────────────

const paymentEnabled = computed(() => !!config.value?.enabled && channels.value.length > 0)

const presetAmounts = computed(() => {
  const base = [10, 20, 50, 100, 200, 500]
  if (!limits.value) return base
  const { min_amount, max_amount } = limits.value
  return base.filter((v) => (min_amount <= 0 || v >= min_amount) && (max_amount <= 0 || v <= max_amount))
})

const currentTotal = computed(() => {
  if (customAmount.value) return Number(customAmount.value) || 0
  return selectedAmount.value
})

const selectedChannel = computed(() =>
  channels.value.find((c) => c.key === selectedChannelKey.value) ?? channels.value[0] ?? null,
)

// ─── Lifecycle ──────────────────────────────────────────────────────────────

onMounted(async () => {
  try {
    const [cfg, pl, ch, lim] = await Promise.all([
      payment.getPaymentConfig(),
      payment.getPlans(),
      payment.getChannels(),
      payment.getLimits(),
    ])
    config.value = cfg
    plans.value = pl
    channels.value = ch
    limits.value = lim
    if (!selectedChannelKey.value && ch.length > 0) {
      selectedChannelKey.value = ch[0].key
    }
  } catch {
    toast.error(t('purchase.toast.loadFailed'))
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (pollTimer.value !== null) clearInterval(pollTimer.value)
})

// ─── Handlers ───────────────────────────────────────────────────────────────

function selectAmount(amount: number) {
  selectedAmount.value = amount
  customAmount.value = ''
}

function onCustomAmount(val: string) {
  customAmount.value = val
}

async function handleProceedToPay() {
  if (!paymentEnabled.value) {
    toast.warning(t('purchase.toast.disabledWarn'))
    return
  }
  if (!selectedChannel.value) {
    toast.error(t('purchase.toast.pickChannel'))
    return
  }
  const amount = currentTotal.value
  if (amount <= 0) {
    toast.error(t('purchase.toast.pickAmount'))
    return
  }
  const min = limits.value?.min_amount ?? 0
  const max = limits.value?.max_amount ?? 0
  if (min > 0 && amount < min) {
    toast.error(t('purchase.toast.minError', { n: min }))
    return
  }
  if (max > 0 && amount > max) {
    toast.error(t('purchase.toast.maxError', { n: max }))
    return
  }
  const confirmed = await confirm({
    title: t('purchase.toast.confirmTitle'),
    message: t('purchase.toast.confirmTopupMsg', { amount: amount.toFixed(2), channel: selectedChannel.value.name }),
  })
  if (!confirmed) return
  paying.value = true
  try {
    const order = await payment.createOrder({
      order_type: 'recharge',
      amount,
      payment_type: selectedChannel.value.key,
    })
    if (order.pay_url) {
      // Open the provider in a new tab so the SPA state survives.
      window.open(order.pay_url, '_blank', 'noopener')
      orderInProgress.value = { out_trade_no: order.out_trade_no, pay_url: order.pay_url }
      orderModalOpen.value = true
      startPolling(order.out_trade_no)
    } else if (order.qr_code) {
      orderInProgress.value = { out_trade_no: order.out_trade_no, qr: order.qr_code }
      orderModalOpen.value = true
      startPolling(order.out_trade_no)
    } else {
      toast.success(t('purchase.toast.orderCreated'))
    }
  } catch {
    toast.error(t('purchase.toast.orderCreateFailed'))
  } finally {
    paying.value = false
  }
}

function startPolling(outTradeNo: string) {
  if (pollTimer.value !== null) clearInterval(pollTimer.value)
  const deadline = Date.now() + 5 * 60_000
  pollTimer.value = setInterval(async () => {
    try {
      const result = await payment.verifyOrder({ out_trade_no: outTradeNo })
      if (result.paid || result.status === 'paid' || result.status === 'completed') {
        stopPolling()
        orderModalOpen.value = false
        orderInProgress.value = null
        await auth.fetchUser()
        toast.success(t('purchase.toast.received'))
      } else if (Date.now() > deadline) {
        stopPolling()
        toast.warning(t('purchase.toast.checkStopped'))
      }
    } catch {
      // transient; the next tick can retry
    }
  }, 3_000)
}

function stopPolling() {
  if (pollTimer.value !== null) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function handleCancelOrder() {
  if (!orderInProgress.value) return
  try {
    await payment.cancelOrder(orderInProgress.value.out_trade_no)
  } catch {
    // server may not allow cancellation; just close the modal
  }
  stopPolling()
  orderModalOpen.value = false
  orderInProgress.value = null
}

async function handleSelectPlan(plan: payment.PaymentPlan) {
  if (!paymentEnabled.value) {
    toast.warning(t('purchase.toast.disabledWarn'))
    return
  }
  if (!selectedChannel.value) {
    toast.error(t('purchase.toast.noChannel'))
    return
  }
  selectedPlan.value = plan.id
  const confirmed = await confirm({
    title: t('purchase.toast.confirmSubscribeTitle'),
    message: t('purchase.toast.confirmSubscribeMsg', { name: plan.name, price: plan.price.toFixed(2) }),
  })
  if (!confirmed) return
  paying.value = true
  try {
    const order = await payment.createOrder({
      order_type: 'subscription',
      plan_id: plan.id,
      payment_type: selectedChannel.value.key,
    })
    if (order.pay_url) {
      window.open(order.pay_url, '_blank', 'noopener')
      orderInProgress.value = { out_trade_no: order.out_trade_no, pay_url: order.pay_url }
      orderModalOpen.value = true
      startPolling(order.out_trade_no)
    } else if (order.qr_code) {
      orderInProgress.value = { out_trade_no: order.out_trade_no, qr: order.qr_code }
      orderModalOpen.value = true
      startPolling(order.out_trade_no)
    } else {
      toast.success(t('purchase.toast.subOrderCreated'))
    }
  } catch {
    toast.error(t('purchase.toast.subFailed'))
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('purchase.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('purchase.title') }}</h1>
    </div>

    <!-- Disabled banner -->
    <div
      v-if="!loading && !paymentEnabled"
      class="rounded-xl border border-dashed border-border bg-card p-6"
    >
      <p class="text-base font-medium text-fg">{{ t('purchase.disabledTitle') }}</p>
      <i18n-t keypath="purchase.disabledBody" tag="p" class="mt-2 text-sm text-muted-fg leading-relaxed">
        <template #redeem>
          <RouterLink to="/redeem" class="text-fg underline">{{ t('nav.items.redeem') }}</RouterLink>
        </template>
      </i18n-t>
    </div>

    <template v-else-if="!loading">
      <!-- Tab Bar -->
      <div class="border-b border-border flex gap-8">
        <button
          type="button"
          class="pb-3 text-sm font-medium transition-colors duration-150 border-b-2"
          :class="activeTab === 'balance'
            ? 'border-fg text-fg'
            : 'border-transparent text-muted-fg hover:text-fg'"
          @click="activeTab = 'balance'"
        >
          {{ t('purchase.tabs.balance') }}
        </button>
        <button
          type="button"
          class="pb-3 text-sm font-medium transition-colors duration-150 border-b-2"
          :class="activeTab === 'subscriptions'
            ? 'border-fg text-fg'
            : 'border-transparent text-muted-fg hover:text-fg'"
          @click="activeTab = 'subscriptions'"
        >
          {{ t('purchase.tabs.subscriptions') }}
          <span v-if="plans.length === 0" class="text-[10px] uppercase tracking-wider text-muted-fg ml-1">{{ t('purchase.tabs.empty') }}</span>
        </button>
      </div>

      <!-- Balance Tab -->
      <div v-if="activeTab === 'balance'" class="space-y-10">
        <!-- Amount -->
        <div class="space-y-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('purchase.amountLabel') }}</p>
          <div v-if="presetAmounts.length > 0" class="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <button
              v-for="amt in presetAmounts"
              :key="amt"
              type="button"
              class="h-12 rounded-md border text-sm font-medium tabular-nums transition-all duration-150"
              :class="selectedAmount === amt && !customAmount
                ? 'border-fg text-fg bg-fg/5'
                : 'border-border text-muted-fg hover:border-fg hover:text-fg'"
              @click="selectAmount(amt)"
            >
              ${{ amt }}
            </button>
          </div>
          <div class="max-w-xs">
            <UiInput
              :model-value="customAmount"
              type="number"
              :placeholder="t('purchase.customPlaceholder')"
              @update:model-value="onCustomAmount($event as string)"
            />
          </div>
          <p v-if="limits && (limits.min_amount > 0 || limits.max_amount > 0)" class="text-xs text-muted-fg">
            <template v-if="limits.min_amount > 0">{{ t('purchase.minMax.min', { n: limits.min_amount }) }}</template>
            <template v-if="limits.min_amount > 0 && limits.max_amount > 0"> · </template>
            <template v-if="limits.max_amount > 0">{{ t('purchase.minMax.max', { n: limits.max_amount }) }}</template>
          </p>
        </div>

        <!-- Payment Method -->
        <div class="space-y-5">
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('purchase.paymentMethodLabel') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              v-for="ch in channels"
              :key="ch.key"
              type="button"
              class="flex items-center justify-center h-16 rounded-md border text-sm font-medium transition-all duration-150"
              :class="selectedChannelKey === ch.key
                ? 'border-primary text-fg bg-primary/5'
                : 'border-border text-muted-fg hover:border-fg hover:text-fg'"
              @click="selectedChannelKey = ch.key"
            >
              {{ ch.name }}
            </button>
          </div>
        </div>

        <!-- Total + Submit -->
        <div class="border-t border-border pt-6 space-y-5">
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-fg">{{ t('purchase.total') }}</span>
            <span class="text-2xl font-light tabular-nums font-mono">${{ currentTotal.toFixed(2) }}</span>
          </div>
          <UiButton variant="primary" size="lg" class="w-full" :disabled="paying || currentTotal <= 0" @click="handleProceedToPay">
            {{ paying ? t('purchase.processing') : t('purchase.proceed') }}
          </UiButton>
        </div>
      </div>

      <!-- Subscriptions Tab -->
      <div v-if="activeTab === 'subscriptions'">
        <div v-if="plans.length === 0" class="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <p class="text-base font-medium">{{ t('purchase.noPlans') }}</p>
          <p class="text-sm text-muted-fg">{{ t('purchase.noPlansSub') }}</p>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <UiCard v-for="plan in plans" :key="plan.id">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xl font-medium">{{ plan.name }}</p>
                <p class="mt-1 text-3xl font-light tabular-nums font-mono">
                  ${{ plan.price.toFixed(2) }}<span class="text-sm text-muted-fg font-normal">{{ t('purchase.plan.durationSuffix', { n: plan.validity_days }) }}</span>
                </p>
                <p v-if="plan.original_price && plan.original_price > plan.price" class="text-xs text-muted-fg line-through tabular-nums">
                  ${{ plan.original_price.toFixed(2) }}
                </p>
              </div>
              <UiBadge v-if="plan.group_platform" variant="gray">{{ plan.group_platform }}</UiBadge>
            </div>

            <p v-if="plan.description" class="mt-3 text-sm text-muted-fg">{{ plan.description }}</p>
            <ul v-if="plan.features" class="mt-6 space-y-3">
              <li
                v-for="feat in plan.features.split(/\n|;|,/).map((f) => f.trim()).filter(Boolean)"
                :key="feat"
                class="flex items-start gap-2 text-sm text-muted-fg"
              >
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-green" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {{ feat }}
              </li>
            </ul>

            <div class="mt-6">
              <UiButton
                variant="primary"
                size="md"
                class="w-full"
                :disabled="paying"
                @click="handleSelectPlan(plan)"
              >
                {{ selectedPlan === plan.id && paying ? t('purchase.processing') : t('purchase.subscribe') }}
              </UiButton>
            </div>
          </UiCard>
        </div>
      </div>
    </template>

    <!-- Pending Order Modal -->
    <UiModal v-model="orderModalOpen" :title="t('purchase.modal.title')">
      <template v-if="orderInProgress">
        <div v-if="orderInProgress.qr" class="flex flex-col items-center gap-3">
          <p class="text-sm text-muted-fg">{{ t('purchase.modal.qrHint') }}</p>
          <img :src="orderInProgress.qr" alt="" class="h-48 w-48 rounded-md border border-border" />
        </div>
        <div v-else class="space-y-3">
          <p class="text-sm text-muted-fg">{{ t('purchase.modal.newTabHint') }}</p>
          <i18n-t v-if="orderInProgress.pay_url" keypath="purchase.modal.didntOpen" tag="p" class="text-xs text-muted-fg">
            <template #click>
              <a :href="orderInProgress.pay_url" target="_blank" rel="noopener noreferrer" class="text-fg underline">{{ t('purchase.modal.clickHere') }}</a>
            </template>
          </i18n-t>
        </div>
        <p class="mt-4 font-mono text-xs text-muted-fg">{{ t('purchase.modal.orderRef', { id: orderInProgress.out_trade_no }) }}</p>
      </template>
      <template #footer>
        <UiButton variant="secondary" @click="handleCancelOrder">{{ t('purchase.modal.cancelOrder') }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
