<script setup lang="ts">
export type BadgeVariant = 'green' | 'amber' | 'red' | 'gray'

withDefaults(
  defineProps<{
    variant?: BadgeVariant
  }>(),
  {
    variant: 'gray',
  },
)
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
    :class="{
      'bg-green/15 text-green': variant === 'green',
      'bg-amber/15 text-amber': variant === 'amber',
      'bg-red/15 text-red': variant === 'red',
      'bg-muted text-muted-fg': variant === 'gray',
    }"
  >
    <slot />
  </span>
</template>
