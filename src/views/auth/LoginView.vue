<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables'
import { UiInput, UiButton } from '@/components/ui'
import { isMockMode } from '@/api/_util'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const submitting = ref(false)

const redirectTarget = computed(() => {
  const q = route.query.redirect
  return typeof q === 'string' && q.startsWith('/') ? q : '/dashboard'
})

async function handleSubmit() {
  if (submitting.value) return
  if (!email.value.trim() || !password.value) {
    toast.error('Please enter both email and password')
    return
  }
  submitting.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    toast.success('Welcome back')
    // Force redirect using window.location for reliability
    const target = redirectTarget.value
    window.location.href = target
  } catch (err: any) {
    // If navigation aborted (e.g. guard redirected), that's OK
    if (err?.type === 1 /* NavigationFailureType.aborted */ || err?.message?.includes('navigation')) {
      // Navigation was redirected, probably to dashboard - that's fine
    } else {
      const message = err instanceof Error ? err.message : 'Login failed'
      toast.error(message)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg">
    <!-- Brand strip -->
    <header class="px-8 py-6">
      <div class="flex items-center gap-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">
          S
        </div>
        <span class="text-xl font-display text-fg tracking-tight">Sub2API</span>
      </div>
    </header>

    <!-- Card -->
    <main class="flex flex-1 items-center justify-center px-6">
      <div class="w-full max-w-[420px]">
        <div>
          <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">SIGN IN</p>
          <h1 class="mt-3 text-4xl font-display font-normal tracking-tight">Welcome back</h1>
          <p class="mt-3 text-sm text-muted-fg leading-relaxed">
            Sign in to manage your API keys, usage, and billing.
          </p>
        </div>

        <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div>
            <label for="login-email" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Email
            </label>
            <UiInput
              id="login-email"
              v-model="email"
              placeholder="your@email.com"
              autocomplete="email"
            />
          </div>

          <div>
            <label for="login-password" class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">
              Password
            </label>
            <UiInput
              id="login-password"
              v-model="password"
              type="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </div>

          <UiButton
            type="submit"
            variant="primary"
            size="lg"
            class="w-full"
            :disabled="submitting"
          >
            {{ submitting ? 'Signing in…' : 'Sign in' }}
          </UiButton>
        </form>

          <p v-if="isMockMode()" class="mt-6 text-xs text-muted-fg leading-relaxed">
          <span class="inline-block rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-fg mr-1">MOCK</span>
          Any non-empty email and password are accepted. Set
          <code class="font-mono text-[11px]">VITE_USE_MOCK=false</code> to use the real backend.
        </p>
      </div>
    </main>

    <footer class="px-8 py-6 text-xs text-muted-fg">
      © Sub2API
    </footer>
  </div>
</template>
