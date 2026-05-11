<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const emit = defineEmits<{
  'toggle-sidebar': []
  'toggle-theme': []
}>()

const route = useRoute()

const pageTitle = computed(() => {
  const name = route.name as string
  if (!name) return 'Dashboard'
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
})
</script>

<template>
  <header class="sticky top-0 z-20 flex h-[80px] items-center justify-between border-b border-border bg-bg/80 backdrop-blur-md px-6">
    <!-- Left -->
    <div class="flex items-center gap-4">
      <button
        class="flex h-9 w-9 items-center justify-center rounded-md text-muted-fg transition-colors duration-0.15s hover:text-fg lg:hidden"
        @click="emit('toggle-sidebar')"
      >
        <svg class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>
      <span class="font-display text-lg text-fg tracking-tight">{{ pageTitle }}</span>
    </div>

    <!-- Right -->
    <button
      class="flex h-9 w-9 items-center justify-center rounded-md text-muted-fg transition-colors duration-0.15s hover:text-fg"
      @click="emit('toggle-theme')"
    >
      <!-- Sun icon -->
      <svg class="h-[18px] w-[18px] dark:hidden" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
      <!-- Moon icon -->
      <svg class="hidden h-[18px] w-[18px] dark:block" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    </button>
  </header>
</template>
