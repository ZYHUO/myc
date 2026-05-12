<script setup lang="ts">
const model = defineModel<boolean>({ default: false })

defineProps<{
  label?: string
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    class="inline-flex items-center gap-2.5 cursor-pointer select-none"
    @click="model = !model"
  >
    <span
      :class="[
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200',
        model ? 'bg-primary' : 'bg-muted',
      ]"
    >
      <span
        :class="[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 m-0.5',
          model ? 'translate-x-4' : 'translate-x-0',
        ]"
      />
    </span>
    <span v-if="label" class="text-sm text-fg">{{ label }}</span>
  </button>
</template>
