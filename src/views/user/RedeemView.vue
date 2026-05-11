<script setup lang="ts">
import { ref, onMounted } from 'vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiTable from '@/components/ui/UiTable.vue'
import { redeemCode, getRedeemHistory, type RedeemHistory } from '@/api/redeem'

const code = ref('')
const redeeming = ref(false)
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const history = ref<RedeemHistory[]>([])
const loading = ref(true)

onMounted(async () => {
  history.value = await getRedeemHistory()
  loading.value = false
})

async function handleRedeem() {
  if (!code.value.trim()) return
  redeeming.value = true
  message.value = null
  try {
    const res = await redeemCode(code.value.trim())
    if (res.success) {
      message.value = { type: 'success', text: res.message }
      code.value = ''
      history.value = await getRedeemHistory()
    } else {
      message.value = { type: 'error', text: res.message }
    }
  } finally {
    redeeming.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function statusVariant(status: string) {
  if (status === 'success') return 'green'
  if (status === 'expired') return 'gray'
  return 'red'
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">REDEEM</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Redeem code</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">
        Enter a promo or gift code to add balance, concurrency, or subscription credits.
      </p>
    </div>

    <!-- Redeem Input -->
    <div class="flex gap-3 max-w-xl">
      <div class="flex-1">
        <UiInput v-model="code" placeholder="Enter your code" />
      </div>
      <UiButton variant="primary" size="md" :class="{ 'opacity-50': redeeming }" @click="handleRedeem">
        {{ redeeming ? 'Redeeming…' : 'Redeem' }}
      </UiButton>
    </div>

    <!-- Message -->
    <p v-if="message" class="text-sm" :class="message.type === 'success' ? 'text-green' : 'text-destructive'">
      {{ message.text }}
    </p>

    <!-- Redemption History -->
    <div class="space-y-5">
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">REDEMPTION HISTORY</p>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-12 rounded-xl border border-border bg-card animate-pulse" />
      </div>

      <UiTable v-else>
        <thead>
          <tr class="border-b border-border">
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Code</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Reward</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Date</th>
            <th class="px-4 py-3 text-left text-[11px] uppercase tracking-[0.15em] text-muted-fg font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in history" :key="item.code" class="border-b border-border last:border-0">
            <td class="px-4 py-3 font-mono text-sm">{{ item.code }}</td>
            <td class="px-4 py-3 text-sm">{{ item.reward }}</td>
            <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(item.date) }}</td>
            <td class="px-4 py-3">
              <UiBadge :variant="statusVariant(item.status) as any">{{ item.status }}</UiBadge>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </div>
  </div>
</template>
