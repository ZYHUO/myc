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
  <!--
    Click affordance: scale + translate on `:active` (touch + mouse down)
    gives the user real "I pressed something" tactile feedback. The
    previous version had `translate-y-px` only — invisible on most
    displays. Combined with a faster (110 ms) transition the press feels
    crisp without overshooting.

    Focus ring exposed via `focus-visible:` so keyboard users get a
    visible ring without mouse-users seeing one after every click.
  -->
  <button
    class="inline-flex items-center justify-center gap-2 rounded-md font-medium text-sm
           transition-[transform,opacity,background-color,border-color,box-shadow] duration-100 ease-out
           active:scale-[0.97] active:duration-75
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg
           disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100
           select-none"
    :class="{
      'bg-fg text-bg hover:opacity-90': variant === 'primary',
      'border border-border text-fg hover:bg-muted hover:border-muted-fg/30': variant === 'secondary',
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
