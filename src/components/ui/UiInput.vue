<script setup lang="ts">
const model = defineModel<string>()

withDefaults(
  defineProps<{
    placeholder?: string
    type?: string
  }>(),
  {
    placeholder: '',
    type: 'text',
  },
)
</script>

<template>
  <input
    v-model="model"
    :type="type"
    :placeholder="placeholder"
    class="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-fg placeholder:text-muted-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
  />
</template>
