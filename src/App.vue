<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import UiToast from "@/components/ui/UiToast.vue"
import UiConfirm from "@/components/ui/UiConfirm.vue"
</script>

<template>
  <AppLayout>
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </AppLayout>
  <UiToast />
  <UiConfirm />
</template>
