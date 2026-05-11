<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const sidebarOpen = ref(false)
const isDark = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}
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
      <AppHeader
        @toggle-sidebar="toggleSidebar"
        @toggle-theme="toggleTheme"
      />

      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
