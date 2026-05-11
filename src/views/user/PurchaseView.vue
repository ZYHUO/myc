<script setup lang="ts">
import { ref } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'

const activeTab = ref<'balance' | 'subscriptions'>('balance')

const presetAmounts = [10, 25, 50, 100, 200, 500]
const selectedAmount = ref(100)
const customAmount = ref('')

const paymentMethods = ['Stripe', 'WeChat Pay', 'USDT'] as const
type PaymentMethod = (typeof paymentMethods)[number]
const selectedMethod = ref<PaymentMethod>('Stripe')

function selectAmount(amount: number) {
  selectedAmount.value = amount
  customAmount.value = ''
}

function onCustomAmountInput(val: string) {
  customAmount.value = val
  selectedAmount.value = 0
}

const currentTotal = () => {
  const amt = customAmount.value ? Number(customAmount.value) : selectedAmount.value
  return amt
}

interface PlanFeature {
  name: string
  features: string[]
  price: number
  popular?: boolean
}

const plans: PlanFeature[] = [
  {
    name: 'Basic',
    price: 29,
    features: ['5,000 requests/day', 'GPT-4o & Claude 3.5', 'Standard speed', 'Email support'],
  },
  {
    name: 'Pro',
    price: 79,
    popular: true,
    features: ['50,000 requests/day', 'All models included', 'Priority speed', 'API access', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: 199,
    features: ['Unlimited requests', 'All models + early access', 'Dedicated infrastructure', 'Custom rate limits', 'Dedicated account manager', 'SLA guarantee'],
  },
]

const selectedPlan = ref<string | null>(null)
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">PURCHASE</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Top up or subscribe</h1>
    </div>

    <!-- Tab Bar -->
    <div class="border-b border-border flex gap-8">
      <button
        class="pb-3 text-sm font-medium transition-colors duration-0.15s border-b-2"
        :class="activeTab === 'balance'
          ? 'border-fg text-fg'
          : 'border-transparent text-muted-fg hover:text-fg'"
        @click="activeTab = 'balance'"
      >
        Balance
      </button>
      <button
        class="pb-3 text-sm font-medium transition-colors duration-0.15s border-b-2"
        :class="activeTab === 'subscriptions'
          ? 'border-fg text-fg'
          : 'border-transparent text-muted-fg hover:text-fg'"
        @click="activeTab = 'subscriptions'"
      >
        Subscriptions
      </button>
    </div>

    <!-- Balance Tab -->
    <div v-if="activeTab === 'balance'" class="space-y-10">
      <!-- Amount -->
      <div class="space-y-5">
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">AMOUNT</p>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
          <button
            v-for="amt in presetAmounts"
            :key="amt"
            class="h-12 rounded-md border text-sm font-medium tabular-nums transition-all duration-0.15s"
            :class="selectedAmount === amt && !customAmount
              ? 'border-fg text-fg bg-fg/5'
              : 'border-border text-muted-fg hover:border-fg hover:text-fg'"
            @click="selectAmount(amt)"
          >
            ¥{{ amt }}
          </button>
        </div>
        <div class="max-w-xs">
          <UiInput
            :model-value="customAmount"
            type="number"
            placeholder="Custom amount"
            @update:model-value="onCustomAmountInput($event as string)"
          />
        </div>
      </div>

      <!-- Payment Method -->
      <div class="space-y-5">
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">PAYMENT METHOD</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            v-for="method in paymentMethods"
            :key="method"
            class="flex items-center justify-center h-16 rounded-md border text-sm font-medium transition-all duration-0.15s"
            :class="selectedMethod === method
              ? 'border-primary text-fg bg-primary/5'
              : 'border-border text-muted-fg hover:border-fg hover:text-fg'"
            @click="selectedMethod = method"
          >
            {{ method }}
          </button>
        </div>
      </div>

      <!-- Divider + Total + Button -->
      <div class="border-t border-border pt-6 space-y-5">
        <div class="flex items-center justify-between">
          <span class="text-sm text-muted-fg">Total</span>
          <span class="text-2xl font-light tabular-nums font-mono">¥{{ currentTotal().toFixed(2) }}</span>
        </div>
        <UiButton variant="primary" size="lg" class="w-full">Proceed to Pay</UiButton>
      </div>
    </div>

    <!-- Subscriptions Tab -->
    <div v-if="activeTab === 'subscriptions'" class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <UiCard v-for="plan in plans" :key="plan.name">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xl font-medium">{{ plan.name }}</p>
            <p class="mt-1 text-3xl font-light tabular-nums font-mono">
              ¥{{ plan.price }}<span class="text-sm text-muted-fg font-normal">/mo</span>
            </p>
          </div>
          <UiBadge v-if="plan.popular" variant="green">Popular</UiBadge>
        </div>

        <ul class="mt-6 space-y-3">
          <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2 text-sm text-muted-fg">
            <svg class="mt-0.5 h-4 w-4 shrink-0 text-green" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {{ feature }}
          </li>
        </ul>

        <div class="mt-6">
          <UiButton
            :variant="plan.popular ? 'primary' : 'secondary'"
            size="md"
            class="w-full"
            @click="selectedPlan = plan.name"
          >
            {{ selectedPlan === plan.name ? 'Selected' : 'Select' }}
          </UiButton>
        </div>
      </UiCard>
    </div>
  </div>
</template>
