<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables'
import { UiInput, UiButton } from '@/components/ui'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'
import UiCaptcha, { type CaptchaState } from '@/components/ui/UiCaptcha.vue'

const router = useRouter()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const email = ref('')
const sending = ref(false)
const codeCountdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null
const captcha = ref<CaptchaState>({ turnstileToken: '', geetestToken: '' })
const captchaRef = ref<InstanceType<typeof UiCaptcha> | null>(null)

const settings = computed(() => settingsStore.settings)
const captchaRequired = computed(
  () => settings.value.turnstile_enabled || settings.value.geetest_enabled,
)
const passwordResetEnabled = computed(() => settings.value.password_reset_enabled)

onMounted(() => {
  settingsStore.load().catch(() => {})
})

onBeforeUnmount(() => {
  if (countdownTimer !== null) clearInterval(countdownTimer)
})

function startCountdown(seconds: number) {
  codeCountdown.value = seconds
  if (countdownTimer !== null) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    codeCountdown.value -= 1
    if (codeCountdown.value <= 0 && countdownTimer !== null) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

async function handleSubmit() {
  if (sending.value || codeCountdown.value > 0) return
  if (!email.value.trim()) {
    toast.error(t('auth.forgot.emailRequired'))
    return
  }
  if (captchaRequired.value && !(captchaRef.value?.ready)) {
    toast.error(t('turnstile.pleaseComplete'))
    return
  }
  sending.value = true
  try {
    const wait = await auth.forgotPassword(
      email.value.trim(),
      captcha.value.turnstileToken || undefined,
      captcha.value.geetestToken || undefined,
    )
    startCountdown(wait || 60)
    toast.success(t('auth.forgot.sendSuccess'))
    // Pre-fill email on the reset page so the user doesn't retype it.
    router.push({ name: 'reset-password', query: { email: email.value.trim() } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('auth.forgot.sendFailed')
    toast.error(msg)
    if (captchaRequired.value) captchaRef.value?.reset()
  } finally {
    sending.value = false
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
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('auth.forgot.eyebrow') }}</p>
          <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">{{ t('auth.forgot.title') }}</h1>
          <p class="mt-3 text-sm text-muted-fg leading-relaxed">{{ t('auth.forgot.subtitle') }}</p>
        </div>

        <!-- Disabled banner: admin can turn this off; show a clear notice. -->
        <div
          v-if="settingsStore.loaded && !passwordResetEnabled"
          class="mt-6 rounded-xl border border-dashed border-border bg-card p-5"
        >
          <p class="text-sm font-medium text-fg">{{ t('auth.forgot.disabledTitle') }}</p>
          <p class="mt-2 text-sm text-muted-fg">{{ t('auth.forgot.disabledBody') }}</p>
        </div>

        <form v-else class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label for="forgot-email" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('common.email') }}
            </label>
            <UiInput
              id="forgot-email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              inputmode="email"
            />
          </div>

          <UiCaptcha
            v-if="captchaRequired"
            ref="captchaRef"
            v-model="captcha"
            @error="captcha = { turnstileToken: '', geetestToken: '' }"
          />

          <UiButton type="submit" variant="primary" size="lg" class="w-full" :disabled="sending || codeCountdown > 0">
            <template v-if="codeCountdown > 0">{{ t('auth.forgot.cooldown', { n: codeCountdown }) }}</template>
            <template v-else-if="sending">{{ t('auth.forgot.sending') }}</template>
            <template v-else>{{ t('auth.forgot.sendCode') }}</template>
          </UiButton>
        </form>

        <p class="mt-6 text-sm text-muted-fg">
          {{ t('auth.forgot.remember') }}
          <RouterLink to="/login" class="text-fg font-medium underline ml-1">{{ t('common.signIn') }}</RouterLink>
        </p>
      </div>
    </main>

    <footer class="px-6 sm:px-8 py-6 text-xs text-muted-fg">© Amodel</footer>
  </div>
</template>
