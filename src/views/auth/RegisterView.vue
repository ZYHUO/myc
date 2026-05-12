<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables'
import { UiInput, UiButton } from '@/components/ui'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const toast = useToast()

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

// Affiliate attribution from ?aff=… on the URL is captured at mount and
// preserved across re-renders.
const affCode = ref('')

const settings = computed(() => settingsStore.settings)
const registrationEnabled = computed(() => settings.value.registration_enabled)
const needsVerifyCode = computed(() => settings.value.email_verify_enabled)
const needsAgreement = computed(() => settings.value.login_agreement_enabled)
const showPromo = computed(() => settings.value.promo_code_enabled)
const showInvitation = computed(() => settings.value.invitation_code_enabled)
const turnstileWarning = computed(() => settings.value.turnstile_enabled)

const emailSuffixes = computed(() => settings.value.registration_email_suffix_whitelist ?? [])
const suffixHint = computed(() =>
  emailSuffixes.value.length === 0
    ? ''
    : `Only the following email domains are allowed: ${emailSuffixes.value.join(', ')}`,
)

const redirectTarget = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q.startsWith('/') ? q : '/dashboard'
})

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
    toast.error('Enter your email first')
    return
  }
  sendingCode.value = true
  try {
    const wait = await auth.sendVerifyCode(email.value.trim())
    startCountdown(wait || 60)
    toast.success('Verification code sent. Check your inbox.')
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send code'
    toast.error(msg)
  } finally {
    sendingCode.value = false
  }
}

function validate(): string | null {
  if (!email.value.trim()) return 'Email is required'
  if (!password.value) return 'Password is required'
  if (password.value.length < 6) return 'Password must be at least 6 characters'
  if (password.value !== passwordConfirm.value) return 'Passwords do not match'
  if (needsVerifyCode.value && !verifyCode.value.trim()) return 'Enter the verification code from your email'
  if (needsAgreement.value && !agreed.value) return 'You must accept the terms to continue'
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
      promoCode: promoCode.value.trim() || undefined,
      invitationCode: invitationCode.value.trim() || undefined,
      affCode: affCode.value || undefined,
    })
    toast.success('Welcome to Amodel')
    await router.replace(redirectTarget.value)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Registration failed'
    toast.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <!-- Brand strip -->
    <header class="px-8 py-6">
      <RouterLink to="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">
          A
        </div>
        <span class="text-xl font-display text-fg tracking-tight">Amodel</span>
      </RouterLink>
    </header>

    <main class="flex flex-1 items-center justify-center px-6 py-8">
      <div class="w-full max-w-[440px]">
        <div>
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">CREATE ACCOUNT</p>
          <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">Get started</h1>
          <p class="mt-3 text-sm text-muted-fg leading-relaxed">
            One account, every model. Sign up to manage your API keys, monitor usage, and route
            requests across providers.
          </p>
        </div>

        <!-- Disabled banner -->
        <div
          v-if="settingsStore.loaded && !registrationEnabled"
          class="mt-6 rounded-xl border border-dashed border-border bg-card p-5"
        >
          <p class="text-sm font-medium text-fg">Registration is currently closed</p>
          <p class="mt-2 text-sm text-muted-fg">
            New sign-ups are disabled on this server. Please reach out to your administrator for
            an account, or
            <RouterLink to="/login" class="text-fg underline">sign in</RouterLink>
            with an existing one.
          </p>
        </div>

        <!-- Form -->
        <form v-else class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label for="reg-email" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Email
            </label>
            <UiInput
              id="reg-email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
            <p v-if="suffixHint" class="mt-1.5 text-xs text-muted-fg">{{ suffixHint }}</p>
          </div>

          <div v-if="needsVerifyCode">
            <label for="reg-code" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Verification code
            </label>
            <div class="flex gap-2">
              <UiInput
                id="reg-code"
                v-model="verifyCode"
                placeholder="6-digit code"
                autocomplete="one-time-code"
              />
              <UiButton
                type="button"
                variant="secondary"
                :disabled="sendingCode || codeCountdown > 0 || !email.trim()"
                @click="handleSendCode"
              >
                <template v-if="codeCountdown > 0">{{ codeCountdown }}s</template>
                <template v-else-if="sendingCode">Sending…</template>
                <template v-else>Send code</template>
              </UiButton>
            </div>
          </div>

          <div>
            <label for="reg-password" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Password
            </label>
            <UiInput
              id="reg-password"
              v-model="password"
              type="password"
              placeholder="At least 6 characters"
              autocomplete="new-password"
            />
          </div>

          <div>
            <label for="reg-password2" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Confirm password
            </label>
            <UiInput
              id="reg-password2"
              v-model="passwordConfirm"
              type="password"
              placeholder="Repeat password"
              autocomplete="new-password"
            />
          </div>

          <div v-if="showInvitation">
            <label for="reg-invitation" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Invitation code
            </label>
            <UiInput id="reg-invitation" v-model="invitationCode" placeholder="Required by this server" />
          </div>

          <div v-if="showPromo">
            <label for="reg-promo" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Promo code <span class="text-muted-fg/70 normal-case tracking-normal">(optional)</span>
            </label>
            <UiInput id="reg-promo" v-model="promoCode" placeholder="Apply a promo" />
          </div>

          <div v-if="affCode" class="rounded-md bg-accent/50 px-3 py-2 text-xs text-accent-fg">
            <span class="font-mono">Referred by {{ affCode }}</span>
          </div>

          <label v-if="needsAgreement" class="flex items-start gap-2 text-sm">
            <input v-model="agreed" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-input accent-primary" />
            <span class="text-muted-fg leading-relaxed">
              I have read and agree to the
              <template v-for="(doc, i) in settings.login_agreement_documents" :key="i">
                <a v-if="doc?.url" :href="doc.url" target="_blank" rel="noopener" class="text-fg underline">{{ doc.name || 'Terms' }}</a>
                <template v-if="i < settings.login_agreement_documents.length - 1">, </template>
              </template>
              <template v-if="settings.login_agreement_documents.length === 0">terms of service</template>.
            </span>
          </label>

          <p v-if="turnstileWarning" class="text-xs text-amber leading-relaxed">
            ⚠ This server requires a Cloudflare Turnstile challenge that isn't wired in the SPA
            yet. Registration may fail server-side; ask the administrator to disable Turnstile or
            add the widget.
          </p>

          <UiButton type="submit" variant="primary" size="lg" class="w-full" :disabled="submitting">
            {{ submitting ? 'Creating account…' : 'Create account' }}
          </UiButton>
        </form>

        <p class="mt-6 text-sm text-muted-fg">
          Already have an account?
          <RouterLink to="/login" class="text-fg font-medium underline ml-1">Sign in</RouterLink>
        </p>
      </div>
    </main>

    <footer class="px-8 py-6 text-xs text-muted-fg">© Amodel</footer>
  </div>
</template>
