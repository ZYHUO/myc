<script setup lang="ts">
import { useRouter } from 'vue-router'
import { UiButton } from '@/components/ui'

const router = useRouter()
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center px-6">
    <div class="text-center max-w-md">
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">404</p>
      <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">Page not found</h1>
      <p class="mt-4 text-sm text-muted-fg leading-relaxed">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <UiButton variant="secondary" @click="router.back()">Go back</UiButton>
        <UiButton variant="primary" @click="router.push('/dashboard')">Dashboard</UiButton>
      </div>
    </div>
  </div>
</template>
