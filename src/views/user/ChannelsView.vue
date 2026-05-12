<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiStatusDot, UiSkeleton } from '@/components/ui'
import { useToast } from '@/composables'
import { getChannels } from '@/api/channels'
import type { Channel } from '@/api/channels'

const channels = ref<Channel[]>([])
const loading = ref(true)
const toast = useToast()
const { t } = useI18n()

onMounted(async () => {
  try {
    channels.value = await getChannels()
  } catch {
    toast.error(t('channels.loadFailed'))
  } finally {
    loading.value = false
  }
})

function statusToDot(s: Channel['status']): 'online' | 'degraded' | 'offline' {
  return s
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('channels.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('channels.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('channels.subtitle') }}</p>
    </div>

    <!-- Skeleton Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="i in 4" :key="i" class="rounded-xl border border-border bg-card p-6 space-y-4">
        <UiSkeleton width="60%" height="24px" />
        <div class="flex gap-2">
          <UiSkeleton v-for="j in 3" :key="j" width="80px" height="28px" class="rounded-md" />
        </div>
        <UiSkeleton width="40%" height="16px" />
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="channels.length === 0" class="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-fg">
      {{ t('channels.empty') }}
    </div>

    <!-- Channel Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UiCard v-for="(ch, idx) in channels" :key="ch.id" class="card-hover stagger-item" :style="{ animationDelay: `${idx * 80}ms` }">
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-medium">{{ ch.name }}</h3>
          <UiStatusDot :status="statusToDot(ch.status)" />
        </div>

        <div v-if="ch.models.length > 0" class="mt-4">
          <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mb-1.5">{{ t('channels.models') }}</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="model in ch.models"
              :key="model"
              class="inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-fg"
            >
              {{ model }}
            </span>
          </div>
        </div>

        <p class="text-sm text-muted-fg mt-4">
          <span class="text-[11px] uppercase tracking-[0.18em] text-muted-fg mr-2">{{ t('channels.pricing') }}</span>
          {{ ch.pricing }}
        </p>
      </UiCard>
    </div>
  </div>
</template>
