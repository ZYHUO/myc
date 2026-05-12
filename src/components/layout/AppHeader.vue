<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'

defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const { t, te } = useI18n()

const pageTitle = computed(() => {
  const name = route.name as string
  if (!name) return ''
  // Prefer translated nav label when present; otherwise prettify the name.
  const key = `nav.items.${name}`
  if (te(key)) return t(key)
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
})
</script>

<template>
  <header class="sticky top-0 z-20 flex h-[80px] items-center justify-between border-b border-border bg-bg/80 backdrop-blur-md px-4 sm:px-6">
    <!-- Left -->
    <div class="flex items-center gap-4 min-w-0">
      <button
        type="button"
        :aria-label="t('header.toggleNav')"
        class="flex h-9 w-9 items-center justify-center rounded-md text-muted-fg transition-colors duration-150 hover:text-fg lg:hidden"
        @click="$emit('toggle-sidebar')"
      >
        <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <span class="font-display text-base sm:text-lg text-fg tracking-tight truncate">{{ pageTitle }}</span>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-1">
      <UiLanguageSwitcher />
      <UiThemeSwitcher />
    </div>
  </header>
</template>
