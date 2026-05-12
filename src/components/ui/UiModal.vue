<script setup lang="ts">
defineProps<{
  title?: string
}>()

const model = defineModel<boolean>({ default: false })

function onBackdrop() {
  model.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') model.value = false
}

import { watch } from 'vue'

watch(model, (open) => {
  if (open) {
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="model"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="onBackdrop"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="onBackdrop" />

        <!-- Dialog -->
        <div
          class="relative w-full max-w-[480px] rounded-xl bg-card border border-border shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div v-if="title" class="flex items-center justify-between px-6 pt-5 pb-0">
            <h2 class="text-lg font-semibold text-fg">{{ title }}</h2>
            <button
              class="rounded-md p-1.5 text-muted-fg hover:text-fg hover:bg-muted transition-colors"
              @click="model = false"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="flex items-center justify-end gap-3 px-6 pb-5 pt-0">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > :last-child,
.modal-leave-to > :last-child {
  transform: scale(0.95);
}
</style>
