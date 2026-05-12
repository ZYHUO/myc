<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  LOCALE_OPTIONS,
  getLocalePreference,
  resolvePreference,
  setLocalePreference,
  type LocalePreference,
} from '@/i18n'

const { locale, t } = useI18n()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const pref = ref<LocalePreference>(getLocalePreference())

// Compact label on the trigger: shows the EFFECTIVE locale (not the
// preference) so the user sees what they're currently reading.
const shortLabel = computed(() => {
  if (locale.value === 'zh-CN') return '中'
  if (locale.value === 'ja') return '日'
  return 'EN'
})

async function pick(p: LocalePreference) {
  open.value = false
  pref.value = p
  // Errors are non-fatal — vue-i18n keeps the previous locale if the
  // dynamic import fails (network blip).
  try {
    await setLocalePreference(p)
  } catch {
    /* stay on previous locale */
  }
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
        class="absolute right-0 z-30 mt-2 min-w-[200px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
        role="listbox"
      >
        <li v-for="opt in LOCALE_OPTIONS" :key="opt">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted"
            :class="opt === pref ? 'text-fg font-medium' : 'text-muted-fg'"
            role="option"
            :aria-selected="opt === pref"
            @click="pick(opt)"
          >
            <span>
              {{ t(`language.modes.${opt}`) }}
              <span v-if="opt === 'auto'" class="ml-1 text-xs text-muted-fg/80 normal-case font-normal">
                · {{ resolvePreference('auto') }}
              </span>
            </span>
            <svg v-if="opt === pref" class="h-4 w-4 text-primary shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
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
