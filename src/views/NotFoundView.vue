<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { UiButton } from '@/components/ui'

const router = useRouter()
const { t } = useI18n()
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center px-6">
    <div class="text-center max-w-md">
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">404</p>
      <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">{{ t('notFound.title') }}</h1>
      <p class="mt-4 text-sm text-muted-fg leading-relaxed">{{ t('notFound.subtitle') }}</p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <UiButton variant="secondary" @click="router.back()">{{ t('common.actions.back') }}</UiButton>
        <UiButton variant="primary" @click="router.push('/')">{{ t('notFound.backHome') }}</UiButton>
      </div>
    </div>
  </div>
</template>
