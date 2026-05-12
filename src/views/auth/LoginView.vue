<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables'
import { UiInput, UiButton } from '@/components/ui'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'
import UiTurnstile from '@/components/ui/UiTurnstile.vue'
import { isMockMode } from '@/api/_util'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const turnstileToken = ref('')
const turnstileRef = ref<InstanceType<typeof UiTurnstile> | null>(null)

const settings = computed(() => settingsStore.settings)
const showRegister = computed(() => settings.value.registration_enabled)
const showPasswordReset = computed(() => settings.value.password_reset_enabled)
const turnstileEnabled = computed(() => settings.value.turnstile_enabled)
const turnstileSiteKey = computed(() => settings.value.turnstile_site_key || '')

onMounted(() => {
  settingsStore.load().catch(() => {
    // Optional; we still render with default flag values
  })
})

const redirectTarget = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q.startsWith('/') ? q : '/dashboard'
})

async function handleSubmit() {
  if (submitting.value) return
  if (!email.value.trim() || !password.value) {
    toast.error(t('auth.login.emailRequired'))
    return
  }
  if (turnstileEnabled.value && !turnstileToken.value) {
    toast.error(t('turnstile.pleaseComplete'))
    return
  }
  submitting.value = true
  try {
    await auth.login(email.value.trim(), password.value, turnstileToken.value || undefined)
    toast.success(t('auth.login.success'))
    await router.replace(redirectTarget.value)
  } catch (err) {
    const message = err instanceof Error ? err.message : t('auth.login.failed')
    toast.error(message)
    if (turnstileEnabled.value) turnstileRef.value?.reset()
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <!-- Brand strip -->
    <header class="px-6 sm:px-8 py-5 flex items-center justify-between">
      <RouterLink to="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">
          A
        </div>
        <span class="text-xl font-display text-fg tracking-tight">Amodel</span>
      </RouterLink>
      <div class="flex items-center gap-1">
        <UiLanguageSwitcher />
        <UiThemeSwitcher />
      </div>
    </header>

    <main class="flex flex-1 items-center justify-center px-6 py-8">
      <div class="w-full max-w-[420px] animate-fade-in">
        <div>
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('auth.login.eyebrow') }}</p>
          <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">{{ t('auth.login.title') }}</h1>
          <p class="mt-3 text-sm text-muted-fg leading-relaxed">{{ t('auth.login.subtitle') }}</p>
        </div>

        <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label for="login-email" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('common.email') }}
            </label>
            <UiInput
              id="login-email"
              v-model="email"
              placeholder="your@email.com"
              autocomplete="email"
              inputmode="email"
            />
          </div>

          <div>
            <label for="login-password" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('common.password') }}
            </label>
            <UiInput
              id="login-password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </div>

          <div v-if="turnstileEnabled" class="pt-1">
            <UiTurnstile
              ref="turnstileRef"
              :sitekey="turnstileSiteKey"
              :model-value="turnstileToken"
              @update:model-value="turnstileToken = $event"
              @expired="turnstileToken = ''"
              @error="turnstileToken = ''"
            />
          </div>

          <UiButton
            type="submit"
            variant="primary"
            size="lg"
            class="w-full"
            :disabled="submitting"
          >
            {{ submitting ? t('auth.login.submitting') : t('auth.login.submit') }}
          </UiButton>
        </form>

        <p v-if="showRegister" class="mt-6 text-sm text-muted-fg">
          {{ t('auth.login.noAccount') }}
          <RouterLink to="/register" class="text-fg font-medium underline ml-1">{{ t('auth.login.register') }}</RouterLink>
        </p>
        <p v-if="showPasswordReset" class="mt-2 text-xs text-muted-fg">
          <RouterLink to="/forgot-password" class="underline">{{ t('auth.login.forgotPassword') }}</RouterLink>
        </p>

        <p v-if="isMockMode()" class="mt-6 text-xs text-muted-fg leading-relaxed">
          <span class="inline-block rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-fg mr-1">MOCK</span>
          {{ t('auth.login.mockHint') }}
        </p>
      </div>
    </main>

    <footer class="px-6 sm:px-8 py-6 text-xs text-muted-fg">© Amodel</footer>
  </div>
</template>
