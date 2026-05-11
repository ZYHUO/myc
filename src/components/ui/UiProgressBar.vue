<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value?: number
  }>(),
  {
    value: 0,
  },
)

const clamped = computed(() => Math.max(0, Math.min(100, props.value)))
</script>

<template>
  <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
    <div
      class="h-full rounded-full bg-primary transition-all duration-0.15s"
      :style="{ width: `${clamped}%` }"
    />
  </div>
</template>
