<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    variant: 'secondary',
    size: 'md',
  },
)
</script>

<template>
  <button
    class="inline-flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-all duration-150 active:translate-y-px"
    :class="{
      'bg-fg text-bg hover:opacity-90': variant === 'primary',
      'border border-border text-fg hover:bg-muted': variant === 'secondary',
      'bg-transparent text-fg hover:bg-muted': variant === 'ghost',
      'bg-primary text-primary-fg hover:opacity-90': variant === 'accent',
      'border border-destructive text-destructive hover:bg-destructive/10': variant === 'danger',
      'h-8 px-3 text-xs': size === 'sm',
      'h-10 px-4': size === 'md',
      'h-12 px-6 text-base': size === 'lg',
    }"
  >
    <slot />
  </button>
</template>
