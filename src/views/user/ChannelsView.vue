<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UiCard, UiStatusDot, UiSkeleton } from '@/components/ui'
import { getChannels } from '@/api/channels'
import type { Channel } from '@/api/channels'

const channels = ref<Channel[]>([])
const loading = ref(true)

onMounted(async () => {
  channels.value = await getChannels()
  loading.value = false
})

function statusToDot(s: Channel['status']): 'online' | 'degraded' | 'offline' {
  return s
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">CHANNELS</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Available channels</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">
        Browse supported API platforms, models, and pricing tiers.
      </p>
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

    <!-- Channel Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UiCard v-for="(ch, idx) in channels" :key="ch.id" class="card-hover stagger-item" :style="{ animationDelay: `${idx * 80}ms` }">
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-medium">{{ ch.name }}</h3>
          <UiStatusDot :status="statusToDot(ch.status)" />
        </div>

        <div class="flex flex-wrap gap-2 mt-4">
          <span
            v-for="model in ch.models"
            :key="model"
            class="inline-block rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-fg"
          >
            {{ model }}
          </span>
        </div>

        <p class="text-sm text-muted-fg mt-4">{{ ch.pricing }}</p>
      </UiCard>
    </div>
  </div>
</template>
