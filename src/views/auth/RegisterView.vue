<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables'
import { UiInput, UiButton } from '@/components/ui'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'
import UiTurnstile from '@/components/ui/UiTurnstile.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToast()
const { t } = useI18n()

const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const verifyCode = ref('')
const promoCode = ref('')
const invitationCode = ref('')
const agreed = ref(false)

const submitting = ref(false)
const sendingCode = ref(false)
const codeCountdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const affCode = ref('')
const turnstileToken = ref('')
const turnstileRef = ref<InstanceType<typeof UiTurnstile> | null>(null)

const settings = computed(() => settingsStore.settings)
const registrationEnabled = computed(() => settings.value.registration_enabled)
const needsVerifyCode = computed(() => settings.value.email_verify_enabled)
const needsAgreement = computed(() => settings.value.login_agreement_enabled)
const showPromo = computed(() => settings.value.promo_code_enabled)
const showInvitation = computed(() => settings.value.invitation_code_enabled)
const turnstileEnabled = computed(() => settings.value.turnstile_enabled)
const turnstileSiteKey = computed(() => settings.value.turnstile_site_key || '')

const emailSuffixes = computed(() => settings.value.registration_email_suffix_whitelist ?? [])
const suffixHint = computed(() =>
  emailSuffixes.value.length === 0
    ? ''
    : t('auth.register.suffixHint', { list: emailSuffixes.value.join(', ') }),
)

const redirectTarget = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q.startsWith('/') ? q : '/dashboard'
})

// Escape any string that originates outside our own bundle before splicing it
// into HTML. Admin-controlled values like `doc.name` and `doc.url` are not
// inherently trusted, even though they come from an authenticated settings
// endpoint — defence in depth.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const agreementHtml = computed(() => {
  const docs = settings.value.login_agreement_documents
  const fallback = escapeHtml(t('auth.register.defaultTermsLabel'))
  const termsHtml = docs.length === 0
    ? `<span>${fallback}</span>`
    : docs
        .map((d) => {
          const label = escapeHtml(d?.name || t('auth.register.defaultTermsLabel'))
          // Reject URLs whose scheme isn't http(s) so we can't render
          // `javascript:` or `data:` payloads from a compromised admin setting.
          const url = d?.url || ''
          const safeUrl = /^https?:\/\//i.test(url) ? escapeHtml(url) : ''
          if (safeUrl) {
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-fg underline">${label}</a>`
          }
          return `<span>${label}</span>`
        })
        .join(', ')
  // `t()` itself returns plain text with our `{terms}` placeholder replaced
  // verbatim — vue-i18n doesn't HTML-escape, so this template must not
  // contain any user-controlled values (it doesn't; it's a static string).
  return t('auth.register.agreement', { terms: termsHtml })
})

// {signIn} placeholder in the disabled-banner body, replaced at render-time
// with a real RouterLink (built via JSX-style render fn).
const DisabledBannerBody = {
  setup() {
    return () => {
      const template = t('auth.register.disabledBody')
      const parts = template.split('{signIn}')
      const link = h('a', {
        href: '/login',
        class: 'text-fg underline',
        onClick: (e: MouseEvent) => {
          e.preventDefault()
          router.push('/login')
        },
      }, t('auth.login.submit'))
      return h('p', { class: 'mt-2 text-sm text-muted-fg' }, [parts[0] ?? '', link, parts[1] ?? ''])
    }
  },
}

onMounted(async () => {
  await settingsStore.load()
  const aff = route.query.aff
  if (typeof aff === 'string') affCode.value = aff
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

async function handleSendCode() {
  if (sendingCode.value || codeCountdown.value > 0) return
  if (!email.value.trim()) {
    toast.error(t('auth.register.emailFirst'))
    return
  }
  if (turnstileEnabled.value && !turnstileToken.value) {
    toast.error(t('turnstile.pleaseComplete'))
    return
  }
  sendingCode.value = true
  try {
    const wait = await auth.sendVerifyCode(email.value.trim(), turnstileToken.value || undefined)
    startCountdown(wait || 60)
    toast.success(t('auth.register.sendSuccess'))
  } catch (err) {
    const msg = err instanceof Error ? err.message : t('auth.register.sendFailed')
    toast.error(msg)
    // Turnstile tokens are one-shot; reset so the user can re-verify.
    if (turnstileEnabled.value) turnstileRef.value?.reset()
  } finally {
    sendingCode.value = false
  }
}

function validate(): string | null {
  if (!email.value.trim()) return t('auth.register.vEmailRequired')
  if (!password.value) return t('auth.register.vPasswordRequired')
  if (password.value.length < 6) return t('auth.register.vPasswordShort')
  if (password.value !== passwordConfirm.value) return t('auth.register.vPasswordMismatch')
  if (needsVerifyCode.value && !verifyCode.value.trim()) return t('auth.register.vCodeRequired')
  if (needsAgreement.value && !agreed.value) return t('auth.register.vAgreementRequired')
  if (turnstileEnabled.value && !turnstileToken.value) return t('turnstile.pleaseComplete')
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
    await auth.register({
      email: email.value.trim(),
      password: password.value,
      verifyCode: verifyCode.value.trim() || undefined,
      turnstileToken: turnstileToken.value || undefined,
      promoCode: promoCode.value.trim() || undefined,
      invitationCode: invitationCode.value.trim() || undefined,
      affCode: affCode.value || undefined,
    })
    toast.success(t('auth.register.success'))
    await router.replace(redirectTarget.value)
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('auth.register.failed')
    toast.error(msg)
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
      <div class="w-full max-w-[440px] animate-fade-in">
        <div>
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('auth.register.eyebrow') }}</p>
          <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">{{ t('auth.register.title') }}</h1>
          <p class="mt-3 text-sm text-muted-fg leading-relaxed">{{ t('auth.register.subtitle') }}</p>
        </div>

        <!-- Disabled banner -->
        <div
          v-if="settingsStore.loaded && !registrationEnabled"
          class="mt-6 rounded-xl border border-dashed border-border bg-card p-5"
        >
          <p class="text-sm font-medium text-fg">{{ t('auth.register.disabledTitle') }}</p>
          <DisabledBannerBody />
        </div>

        <!-- Form -->
        <form v-else class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label for="reg-email" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.emailLabel') }}
            </label>
            <UiInput
              id="reg-email"
              v-model="email"
              type="email"
              :placeholder="t('auth.register.emailPlaceholder')"
              autocomplete="email"
              inputmode="email"
            />
            <p v-if="suffixHint" class="mt-1.5 text-xs text-muted-fg">{{ suffixHint }}</p>
          </div>

          <div v-if="needsVerifyCode">
            <label for="reg-code" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.verifyCodeLabel') }}
            </label>
            <div class="flex gap-2">
              <UiInput
                id="reg-code"
                v-model="verifyCode"
                :placeholder="t('auth.register.verifyCodePlaceholder')"
                autocomplete="one-time-code"
                inputmode="numeric"
              />
              <UiButton
                type="button"
                variant="secondary"
                :disabled="sendingCode || codeCountdown > 0 || !email.trim()"
                @click="handleSendCode"
              >
                <template v-if="codeCountdown > 0">{{ codeCountdown }}s</template>
                <template v-else-if="sendingCode">{{ t('auth.register.sendingCode') }}</template>
                <template v-else>{{ t('auth.register.sendCode') }}</template>
              </UiButton>
            </div>
          </div>

          <div>
            <label for="reg-password" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.passwordLabel') }}
            </label>
            <UiInput
              id="reg-password"
              v-model="password"
              type="password"
              :placeholder="t('auth.register.passwordPlaceholder')"
              autocomplete="new-password"
            />
          </div>

          <div>
            <label for="reg-password2" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.passwordConfirmLabel') }}
            </label>
            <UiInput
              id="reg-password2"
              v-model="passwordConfirm"
              type="password"
              :placeholder="t('auth.register.passwordConfirmPlaceholder')"
              autocomplete="new-password"
            />
          </div>

          <div v-if="showInvitation">
            <label for="reg-invitation" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.invitationLabel') }}
            </label>
            <UiInput id="reg-invitation" v-model="invitationCode" :placeholder="t('auth.register.invitationPlaceholder')" />
          </div>

          <div v-if="showPromo">
            <label for="reg-promo" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              {{ t('auth.register.promoLabel') }}
              <span class="text-muted-fg/70 normal-case tracking-normal">{{ t('auth.register.promoOptional') }}</span>
            </label>
            <UiInput id="reg-promo" v-model="promoCode" :placeholder="t('auth.register.promoPlaceholder')" />
          </div>

          <div v-if="affCode" class="rounded-md bg-accent/50 px-3 py-2 text-xs text-accent-fg">
            <span class="font-mono">{{ t('auth.register.referredBy', { code: affCode }) }}</span>
          </div>

          <label v-if="needsAgreement" class="flex items-start gap-2 text-sm">
            <input v-model="agreed" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
            <span class="text-muted-fg leading-relaxed" v-html="agreementHtml"></span>
          </label>

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

          <UiButton type="submit" variant="primary" size="lg" class="w-full" :disabled="submitting">
            {{ submitting ? t('auth.register.submitting') : t('auth.register.submit') }}
          </UiButton>
        </form>

        <p class="mt-6 text-sm text-muted-fg">
          {{ t('auth.register.hasAccount') }}
          <RouterLink to="/login" class="text-fg font-medium underline ml-1">{{ t('auth.login.submit') }}</RouterLink>
        </p>
      </div>
    </main>

    <footer class="px-6 sm:px-8 py-6 text-xs text-muted-fg">© Amodel</footer>
  </div>
</template>
