<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import AppLayout from "@/components/layout/AppLayout.vue"
import UiToast from "@/components/ui/UiToast.vue"
import UiConfirm from "@/components/ui/UiConfirm.vue"

const route = useRoute()
const auth = useAuthStore()

// Three guards on showing app chrome (sidebar + header):
//   1. route.name — until router.isReady() resolves we render no chrome.
//   2. meta.layout !== 'none' — public routes (landing/login/register) opt out.
//   3. auth.isAuthenticated — without this, logging out from /dashboard
//      shows the sidebar with stale "Guest" state for the brief window
//      between `user = null` and `router.push('/login')`. A 401 from any
//      authed request hits the same race.
const useChrome = computed(
  () =>
    Boolean(route.name) &&
    route.meta.layout !== "none" &&
    auth.isAuthenticated,
)
</script>

<template>
  <component :is="useChrome ? AppLayout : 'div'">
    <RouterView v-slot="{ Component, route: r }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="r.fullPath" />
      </Transition>
    </RouterView>
  </component>
  <UiToast />
  <UiConfirm />
</template>
