<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, setLocale, type SupportedLocale } from '@/i18n'

const { locale, t } = useI18n()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const current = computed<SupportedLocale>(() => locale.value as SupportedLocale)
const shortLabel = computed(() => {
  // Compact button text — language family code is friendlier than a flag.
  if (current.value === 'zh-CN') return '中'
  if (current.value === 'ja') return '日'
  return 'EN'
})

function pick(loc: SupportedLocale) {
  setLocale(loc)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-fg transition-colors hover:bg-muted hover:text-fg"
      :aria-label="t('language.label')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 5h12M9 3v2m4 14 4-9 4 9M14 18h6M5 9c0 4 3 7 7 7m1-7c0 2-2 4-4 4" />
      </svg>
      <span class="font-mono text-xs">{{ shortLabel }}</span>
      <svg class="h-3 w-3 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <Transition name="popover">
      <ul
        v-if="open"
        class="absolute right-0 z-30 mt-2 min-w-[160px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
        role="listbox"
      >
        <li v-for="loc in SUPPORTED_LOCALES" :key="loc">
          <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted"
            :class="loc === current ? 'text-fg font-medium' : 'text-muted-fg'"
            role="option"
            :aria-selected="loc === current"
            @click="pick(loc)"
          >
            <span>{{ t(`language.names.${loc}`) }}</span>
            <svg v-if="loc === current" class="h-4 w-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5 9-12" />
            </svg>
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
