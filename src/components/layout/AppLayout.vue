<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSidebar } from '@/composables'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar()
const route = useRoute()
const mainRef = ref<HTMLElement | null>(null)

// The router-level scrollBehavior() only scrolls `window`, but our scroll
// container is <main> (so the sidebar + header stay pinned). Watch the
// route and scroll <main> back to the top on navigation. Skip when only
// the query string changes (e.g. filters mutating on Usage view).
watch(
  () => route.path,
  (path, prev) => {
    if (path === prev) return
    if (mainRef.value) mainRef.value.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  },
)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-bg">
    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 bg-black/40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <AppSidebar
      :open="sidebarOpen"
      @close="sidebarOpen = false"
    />

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <AppHeader @toggle-sidebar="toggleSidebar" />

      <main ref="mainRef" class="flex-1 overflow-y-auto p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
