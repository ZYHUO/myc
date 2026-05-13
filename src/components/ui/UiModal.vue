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
      <!--
        Outer wrapper. Padding visible on ALL sizes so the dialog reads as
        a centered card with margin, not a screen-filling sheet. The
        previous attempt at `items-stretch` on mobile fixed the trap-bug
        but made the modal look like a full new page — visually
        disorienting.

        `items-center justify-center` keeps the dialog as a card; the
        `max-h-[calc(100dvh-1.5rem)]` on the dialog itself ensures the
        wrapper's padding stays visible even when content overflows.
      -->
      <div
        v-if="model"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
        @click.self="onBackdrop"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="onBackdrop" />

        <!-- Dialog. Three-row flex (header / body / footer); only the body
             scrolls. Header + footer stay anchored so the close button and
             the action buttons are always reachable regardless of content
             length. Max-height leaves a sliver of backdrop visible on top
             and bottom — visually anchors the modal as a "card", not a
             "page". -->
        <div
          ref="dialogRef"
          class="relative w-full max-w-[480px] rounded-xl bg-card border border-border shadow-xl flex flex-col"
          :style="{ maxHeight: 'min(640px, calc(100dvh - 1.5rem))' }"
          role="dialog"
          aria-modal="true"
        >
          <!-- Header — always visible. `shrink-0` keeps it pinned when the
               body overflows. -->
          <div v-if="title" class="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border bg-card rounded-t-xl">
            <h2 class="text-base sm:text-lg font-semibold text-fg truncate">{{ title }}</h2>
            <button
              type="button"
              aria-label="Close dialog"
              class="-mr-1 rounded-md p-2 text-muted-fg hover:text-fg hover:bg-muted transition-colors shrink-0"
              @click="model = false"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <!-- Lightweight close button when there's no title — without a
               header bar above the body, there'd be no way out without a
               keyboard. -->
          <button
            v-else
            type="button"
            aria-label="Close dialog"
            class="absolute top-3 right-3 z-10 rounded-md p-2 text-muted-fg hover:text-fg hover:bg-muted transition-colors"
            @click="model = false"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Body — scrolls when content exceeds remaining height.
               `min-h-0` is the magic that lets a flex child actually shrink
               (without it, flex items refuse to be smaller than their
               content). `-webkit-overflow-scrolling` keeps iOS Safari's
               momentum scrolling smooth. -->
          <div
            class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 sm:py-5"
            style="-webkit-overflow-scrolling: touch"
          >
            <slot />
          </div>

          <!-- Footer — also pinned. Padding includes the iOS home-indicator
               safe area so action buttons aren't covered on notched
               devices. -->
          <div
            v-if="$slots.footer"
            class="shrink-0 flex items-center justify-end gap-3 px-5 sm:px-6 pt-3 pb-4 sm:pb-5 border-t border-border bg-card rounded-b-xl"
            style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
          >
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
