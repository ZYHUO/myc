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

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

// Email is normally pre-filled from the ForgotPasswordView's query string,
// but the user might also land here directly (e.g. from an email link in
// the future) so we expose it as editable too.
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const code = ref('')
const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)

const settings = computed(() => settingsStore.settings)
const passwordResetEnabled = computed(() => settings.value.password_reset_enabled)

onMounted(() => {
  settingsStore.load().catch(() => {})
})

function validate(): string | null {
  if (!email.value.trim()) return t('auth.reset.vEmailRequired')
  if (!code.value.trim()) return t('auth.reset.vCodeRequired')
  if (!password.value) return t('auth.register.vPasswordRequired')
  if (password.value.length < 6) return t('auth.register.vPasswordShort')
  if (password.value !== passwordConfirm.value) return t('auth.register.vPasswordMismatch')
  return null
}

async function handleSubmit() {
  if (submitting.value) return
  const err = validate()
  if (err) {
    toast.error(err)
    return
  }
  submitting.value = true
  try {
    await auth.resetPassword({
      email: email.value.trim(),
      verifyCode: code.value.trim(),
      newPassword: password.value,
    })
    toast.success(t('auth.reset.success'))
    // The reset endpoint also signs the user in; jump straight to dashboard.
    await router.replace('/dashboard')
  } catch (e) {
    const data = (e as { response?: { data?: { message?: string } } }).response?.data
    toast.error(data?.message || t('auth.reset.failed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <header class="px-6 sm:px-8 py-5 flex items-center justify-between">
      <RouterLink to="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">A</div>
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
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('auth.reset.eyebrow') }}</p>
          <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">{{ t('auth.reset.title') }}</h1>
          <p class="mt-3 text-sm text-muted-fg leading-relaxed">{{ t('auth.reset.subtitle') }}</p>
        </div>

        <div
          v-if="settingsStore.loaded && !passwordResetEnabled"
          class="mt-6 rounded-xl border border-dashed border-border bg-card p-5"
        >
          <p class="text-sm font-medium text-fg">{{ t('auth.forgot.disabledTitle') }}</p>
          <p class="mt-2 text-sm text-muted-fg">{{ t('auth.forgot.disabledBody') }}</p>
        </div>

        <form v-else class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label for="reset-email" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('common.email') }}
            </label>
            <UiInput id="reset-email" v-model="email" type="email" placeholder="you@example.com" autocomplete="email" inputmode="email" />
          </div>

          <div>
            <label for="reset-code" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.verifyCodeLabel') }}
            </label>
            <UiInput id="reset-code" v-model="code" :placeholder="t('auth.register.verifyCodePlaceholder')" autocomplete="one-time-code" inputmode="numeric" />
            <p class="mt-1.5 text-xs text-muted-fg">{{ t('auth.reset.codeHint') }}</p>
          </div>

          <div>
            <label for="reset-password" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.passwordLabel') }}
            </label>
            <UiInput id="reset-password" v-model="password" type="password" :placeholder="t('auth.register.passwordPlaceholder')" autocomplete="new-password" />
          </div>

          <div>
            <label for="reset-password2" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.passwordConfirmLabel') }}
            </label>
            <UiInput id="reset-password2" v-model="passwordConfirm" type="password" :placeholder="t('auth.register.passwordConfirmPlaceholder')" autocomplete="new-password" />
          </div>

          <UiButton type="submit" variant="primary" size="lg" class="w-full" :disabled="submitting">
            {{ submitting ? t('auth.reset.submitting') : t('auth.reset.submit') }}
          </UiButton>
        </form>

        <p class="mt-6 text-sm text-muted-fg">
          <RouterLink to="/forgot-password" class="text-fg font-medium underline">{{ t('auth.reset.resend') }}</RouterLink>
        </p>
      </div>
    </main>

    <footer class="px-6 sm:px-8 py-6 text-xs text-muted-fg">© Amodel</footer>
  </div>
</template>
