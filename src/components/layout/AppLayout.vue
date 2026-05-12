<script setup lang="ts">
import { useSidebar } from '@/composables'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar()
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

      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
