<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import AppLayout from "@/components/layout/AppLayout.vue"
import UiToast from "@/components/ui/UiToast.vue"
import UiConfirm from "@/components/ui/UiConfirm.vue"

const route = useRoute()

// The router is awaited in main.ts before mounting, so by the time this
// renders the route is already resolved — `route.name` is always populated.
// Public routes opt out of the app chrome via `meta.layout: 'none'`.
const useChrome = computed(() => Boolean(route.name) && route.meta.layout !== "none")
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
