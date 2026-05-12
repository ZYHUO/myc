<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

defineProps<{
  title?: string
}>()

const model = defineModel<boolean>({ default: false })
const dialogRef = ref<HTMLElement | null>(null)
let lastActive: HTMLElement | null = null

function onBackdrop() {
  model.value = false
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusables(): HTMLElement[] {
  if (!dialogRef.value) return []
  return Array.from(dialogRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((el) => el.offsetParent !== null) // skip hidden
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    model.value = false
    return
  }
  if (e.key !== 'Tab') return
  // Trap focus inside the dialog so Tab doesn't escape to the page underneath.
  const els = focusables()
  if (els.length === 0) return
  const first = els[0]
  const last = els[els.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(model, async (open) => {
  if (open) {
    lastActive = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown)
    document.body.style.overflow = 'hidden'
    // Auto-focus the first input (or focusable element) so keyboard users can
    // start typing immediately. nextTick lets Vue render the dialog body first.
    await nextTick()
    const els = focusables()
    // Prefer the first text input over the close button; fall back to anything.
    const target =
      els.find((el) => el instanceof HTMLInputElement && el.type !== 'hidden') ?? els[0]
    target?.focus()
  } else {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
    // Return focus to whatever element triggered the modal — keeps keyboard
    // navigation predictable.
    lastActive?.focus?.()
    lastActive = null
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
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
          ref="dialogRef"
          class="relative w-full max-w-[480px] rounded-xl bg-card border border-border shadow-xl"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header -->
          <div v-if="title" class="flex items-center justify-between px-6 pt-5 pb-0">
            <h2 class="text-lg font-semibold text-fg">{{ title }}</h2>
            <button
              type="button"
              aria-label="Close dialog"
              class="rounded-md p-1.5 text-muted-fg hover:text-fg hover:bg-muted transition-colors"
              @click="model = false"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
