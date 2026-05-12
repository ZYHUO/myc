<script setup lang="ts">
import { computed } from "vue"
import { useRoute } from "vue-router"
import AppLayout from "@/components/layout/AppLayout.vue"
import UiToast from "@/components/ui/UiToast.vue"
import UiConfirm from "@/components/ui/UiConfirm.vue"

const route = useRoute()
const useChrome = computed(() => route.meta.layout !== "none")
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
