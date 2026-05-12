<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore, type Theme } from '@/stores/theme'

const theme = useThemeStore()
const { t } = useI18n()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const options: Array<{ value: Theme; icon: 'sun' | 'moon' | 'system' }> = [
  { value: 'light', icon: 'sun' },
  { value: 'dark', icon: 'moon' },
  { value: 'system', icon: 'system' },
]

const effective = computed<'light' | 'dark'>(() => theme.resolve())

function pick(m: Theme) {
  theme.setTheme(m)
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
      class="flex h-9 w-9 items-center justify-center rounded-md text-muted-fg transition-colors hover:bg-muted hover:text-fg"
      :aria-label="t('theme.label')"
      :aria-expanded="open"
      @click="open = !open"
    >
      <!-- Sun (light) -->
      <svg v-if="effective === 'light'" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path stroke-linecap="round" d="M12 3v2m0 14v2M5 12H3m18 0h-2M5.6 5.6L4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4" />
      </svg>
      <!-- Moon (dark) -->
      <svg v-else class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.5A8.5 8.5 0 0 1 11.5 3a7 7 0 0 0 9.5 9.5Z" />
      </svg>
    </button>

    <Transition name="popover">
      <ul
        v-if="open"
        class="absolute right-0 z-30 mt-2 min-w-[170px] overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
        role="listbox"
      >
        <li v-for="opt in options" :key="opt.value">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-muted"
            :class="opt.value === theme.theme ? 'text-fg font-medium' : 'text-muted-fg'"
            role="option"
            :aria-selected="opt.value === theme.theme"
            @click="pick(opt.value)"
          >
            <svg v-if="opt.icon === 'sun'" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path stroke-linecap="round" d="M12 3v2m0 14v2M5 12H3m18 0h-2M5.6 5.6L4.2 4.2m15.6 15.6-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4" />
            </svg>
            <svg v-else-if="opt.icon === 'moon'" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.5A8.5 8.5 0 0 1 11.5 3a7 7 0 0 0 9.5 9.5Z" />
            </svg>
            <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M9 21h6M12 17v4" stroke-linecap="round" />
            </svg>
            <span class="flex-1 text-left">{{ t(`theme.modes.${opt.value}`) }}</span>
            <svg v-if="opt.value === theme.theme" class="h-4 w-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
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
