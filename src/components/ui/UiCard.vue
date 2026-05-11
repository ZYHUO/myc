<script setup lang="ts">
withDefaults(
  defineProps<{
    flat?: boolean
  }>(),
  {
    flat: false,
  },
)
</script>

<template>
  <div
    class="bg-card"
    :class="flat ? 'p-6' : 'border border-border rounded-xl p-6'"
  >
    <slot />
  </div>
</template>
