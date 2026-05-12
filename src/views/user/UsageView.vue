<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiTable, UiStatusDot, UiInput, UiPagination, UiSkeleton, UiEmptyState } from '@/components/ui'
import { getUsageLogs, getUsageStats } from '@/api/usage'
import type { UsageLog, UsageStats } from '@/api/usage'

const { t, locale } = useI18n()

const stats = ref<UsageStats | null>(null)
const logs = ref<UsageLog[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(true)

const dateFrom = ref('')
const dateTo = ref('')
const modelFilter = ref('')
const keyFilter = ref('')

const modelOptions = ['claude-sonnet-4', 'gpt-4o', 'gemini-2.5-pro', 'deepseek-v3', 'gpt-4o-mini', 'claude-haiku-3.5']
const keyOptions = ['生产环境-主密钥', '测试环境', 'Claude 专用', 'GPT-4o 测试']

const filteredLogs = computed(() => {
  let result = logs.value
  if (keyFilter.value) {
    result = result.filter((l) => l.keyName === keyFilter.value)
  }
  if (dateFrom.value) {
    result = result.filter((l) => new Date(l.time) >= new Date(dateFrom.value))
  }
  if (dateTo.value) {
    const to = new Date(dateTo.value)
    to.setHours(23, 59, 59, 999)
    result = result.filter((l) => new Date(l.time) <= to)
  }
  return result
})

async function fetchData() {
  loading.value = true
  try {
    const result = await getUsageLogs({
      page: page.value,
      pageSize,
      model: modelFilter.value || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
    })
    logs.value = result.data
    total.value = result.total
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const [s] = await Promise.all([getUsageStats(), fetchData()])
  stats.value = s
})

function handlePageChange(p: number) {
  page.value = p
  fetchData()
}

function handleFilterChange() {
  page.value = 1
  fetchData()
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const statCards = computed(() => [
  { value: stats.value ? stats.value.totalRequests.toLocaleString() : '—', label: t('dashboard.cards.totalRequests') },
  { value: stats.value ? `${(stats.value.totalTokens / 1_000_000).toFixed(1)}M` : '—', label: t('dashboard.cards.tokensUsed') },
  { value: stats.value ? `$${stats.value.totalCost.toFixed(2)}` : '—', label: t('usage.cols.cost') },
  { value: stats.value ? formatDuration(stats.value.avgDuration) : '—', label: t('usage.cols.latency') },
])
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('usage.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('usage.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('usage.subtitle') }}</p>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <UiCard v-for="stat in statCards" :key="stat.label">
        <p class="text-4xl font-light tracking-tight tabular-nums font-mono">{{ stat.value }}</p>
        <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mt-2">{{ stat.label }}</p>
      </UiCard>
    </div>

    <!-- Filter Bar -->
    <UiCard flat>
      <div class="flex flex-wrap items-end gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium">{{ t('usage.filters.from') }}</label>
          <UiInput v-model="dateFrom" type="date" @update:model-value="handleFilterChange" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium">{{ t('usage.filters.to') }}</label>
          <UiInput v-model="dateTo" type="date" @update:model-value="handleFilterChange" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium">{{ t('usage.filters.model') }}</label>
          <select
            v-model="modelFilter"
            class="h-10 rounded-md border border-input bg-card px-3 text-sm text-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
            @change="handleFilterChange"
          >
            <option value="">{{ t('usage.filters.allModels') }}</option>
            <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium">{{ t('usage.filters.key') }}</label>
          <select
            v-model="keyFilter"
            class="h-10 rounded-md border border-input bg-card px-3 text-sm text-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
            @change="handleFilterChange"
          >
            <option value="">{{ t('usage.filters.allKeys') }}</option>
            <option v-for="k in keyOptions" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
      </div>
    </UiCard>

    <!-- Usage Table -->
    <UiCard flat>
      <!-- Skeleton loading -->
      <template v-if="loading">
        <div class="space-y-3 p-4">
          <UiSkeleton v-for="i in 8" :key="i" width="100%" height="40px" class="rounded-md" />
        </div>
      </template>
      <!-- Empty state -->
      <UiEmptyState
        v-else-if="filteredLogs.length === 0"
        :title="t('usage.empty')"
        :description="t('common.noData')"
      />
      <!-- Table -->
      <UiTable v-else>
        <thead>
          <tr class="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.time') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.model') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.filters.key') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.inputTokens') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.outputTokens') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.cost') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.latency') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('usage.cols.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, idx) in filteredLogs" :key="log.id" class="border-b border-border last:border-0 row-hover stagger-item" :style="{ animationDelay: `${idx * 40}ms` }">
            <td class="px-4 py-3 font-mono text-muted-fg text-sm">{{ formatTime(log.time) }}</td>
            <td class="px-4 py-3 text-sm">{{ log.model }}</td>
            <td class="px-4 py-3 text-sm text-muted-fg">{{ log.keyName }}</td>
            <td class="px-4 py-3 font-mono text-sm">{{ log.promptTokens.toLocaleString() }}</td>
            <td class="px-4 py-3 font-mono text-sm">{{ log.completionTokens.toLocaleString() }}</td>
            <td class="px-4 py-3 font-mono text-sm">${{ log.cost.toFixed(4) }}</td>
            <td class="px-4 py-3 font-mono text-sm">{{ formatDuration(log.duration) }}</td>
            <td class="px-4 py-3">
              <UiStatusDot :status="log.status === 'success' ? 'online' : 'offline'" />
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>

    <!-- Pagination -->
    <UiPagination
      v-if="!loading && filteredLogs.length > 0"
      :current="page"
      :total="total"
      :page-size="pageSize"
      @update:current="handlePageChange"
    />
  </div>
</template>
