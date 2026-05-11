<script setup lang="ts">
withDefaults(
  defineProps<{
    status?: 'online' | 'degraded' | 'offline' | 'disabled'
  }>(),
  {
    status: 'disabled',
  },
)
</script>

<template>
  <span
    class="inline-block h-2 w-2 rounded-full"
    :class="{
      'bg-green': status === 'online',
      'bg-amber': status === 'degraded',
      'bg-red': status === 'offline',
      'bg-muted-fg': status === 'disabled',
    }"
  />
</template>
