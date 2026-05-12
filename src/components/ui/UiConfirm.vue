<script setup lang="ts">
import UiModal from './UiModal.vue'
import { useConfirm } from '@/composables/useConfirm'

const { visible, options, handleConfirm, handleCancel } = useConfirm()
</script>

<template>
  <UiModal v-model="visible" :title="options.title ?? 'Confirm'">
    <p class="text-sm text-muted-fg">{{ options.message }}</p>

    <template #footer>
      <button
        class="h-9 rounded-md border border-border px-4 text-sm font-medium text-fg hover:bg-muted transition-colors"
        @click="handleCancel"
      >
        Cancel
      </button>
      <button
        :class="[
          'h-9 rounded-md px-4 text-sm font-medium transition-colors',
          options.variant === 'danger'
            ? 'bg-red text-white hover:opacity-90'
            : 'bg-primary text-primary-fg hover:opacity-90',
        ]"
        @click="handleConfirm"
      >
        Confirm
      </button>
    </template>
  </UiModal>
</template>
