<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { UiButton } from '@/components/ui'

const auth = useAuthStore()
const settingsStore = useSettingsStore()

const isAuthed = computed(() => auth.isAuthenticated)
const showRegister = computed(() => settingsStore.settings.registration_enabled)

onMounted(async () => {
  // We don't await auth.fetchUser() here — if there's a token, the navigation
  // to /dashboard from the CTA will hydrate via the router guard. The landing
  // page itself works for anonymous + authenticated visitors.
  settingsStore.load().catch(() => {
    // optional; the page still renders with default copy
  })
})

interface Feature {
  title: string
  body: string
}

const features: Feature[] = [
  {
    title: 'One gateway, every model',
    body: 'Route to Claude, GPT, Gemini, DeepSeek and a dozen more through a single OpenAI- or Anthropic-compatible endpoint. Keep your application code identical when you switch providers.',
  },
  {
    title: 'Subscription, not metering',
    body: "Buy access to a model family for a month and stop watching the meter. We pool capacity across upstream accounts so you don't pay per-token rates while you experiment.",
  },
  {
    title: 'Honest analytics',
    body: 'Per-key, per-model, per-day cost and latency breakdowns. Set RPM limits and balance alerts. Every request is logged with provenance — no black boxes.',
  },
  {
    title: 'Bring your own keys',
    body: 'Run Amodel against your own provider keys, or use ours. Hybrid setups are first-class — the gateway picks the cheapest healthy upstream for each request.',
  },
]
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-fg">
    <!-- Header -->
    <header class="sticky top-0 z-20 bg-bg/85 backdrop-blur-md border-b border-border">
      <div class="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
        <RouterLink to="/" class="inline-flex items-center gap-3 transition-opacity hover:opacity-80">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">
            A
          </div>
          <span class="text-xl font-display tracking-tight">Amodel</span>
        </RouterLink>

        <nav class="flex items-center gap-2">
          <template v-if="isAuthed">
            <UiButton variant="primary" @click="$router.push('/dashboard')">Open dashboard</UiButton>
          </template>
          <template v-else>
            <RouterLink to="/login">
              <UiButton variant="ghost">Sign in</UiButton>
            </RouterLink>
            <RouterLink v-if="showRegister" to="/register">
              <UiButton variant="primary">Get started</UiButton>
            </RouterLink>
          </template>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <!-- Soft warm ornaments to echo Claude's editorial feel -->
      <div class="pointer-events-none absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full bg-primary/8 blur-3xl" aria-hidden="true"></div>
      <div class="pointer-events-none absolute top-40 -left-32 h-[360px] w-[360px] rounded-full bg-accent/60 blur-3xl" aria-hidden="true"></div>

      <div class="relative mx-auto max-w-[1080px] px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">AI API GATEWAY</p>
        <h1 class="mt-4 font-display font-normal tracking-tight text-5xl sm:text-7xl leading-[1.05] text-balance">
          One key,<br />
          every model.
        </h1>
        <p class="mt-6 max-w-[560px] text-lg sm:text-xl text-muted-fg leading-relaxed">
          Amodel is a unified API gateway for Claude, GPT, Gemini and friends — buy a
          subscription, get a single key, and stop juggling provider dashboards.
        </p>

        <div class="mt-9 flex flex-wrap gap-3">
          <template v-if="isAuthed">
            <RouterLink to="/dashboard">
              <UiButton variant="primary" size="lg">Open dashboard</UiButton>
            </RouterLink>
            <RouterLink to="/keys">
              <UiButton variant="secondary" size="lg">Manage keys</UiButton>
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink v-if="showRegister" to="/register">
              <UiButton variant="primary" size="lg">Create an account</UiButton>
            </RouterLink>
            <RouterLink to="/login">
              <UiButton variant="secondary" size="lg">Sign in</UiButton>
            </RouterLink>
          </template>
        </div>

        <!-- Sample code snippet -->
        <div class="mt-16 max-w-[760px]">
          <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span class="h-2.5 w-2.5 rounded-full bg-muted-fg/30"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-muted-fg/30"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-muted-fg/30"></span>
              <span class="ml-3 font-mono text-[11px] text-muted-fg">curl</span>
            </div>
            <pre class="overflow-x-auto px-5 py-4 font-mono text-[13px] leading-relaxed text-fg"><code><span class="text-muted-fg">$</span> curl <span class="text-primary">https://amodel.example.com/v1/messages</span> \
    -H <span class="text-primary">"Authorization: Bearer $AMODEL_KEY"</span> \
    -d '{ <span class="text-primary">"model"</span>: <span class="text-primary">"claude-sonnet-4"</span>,
          <span class="text-primary">"messages"</span>: [{ <span class="text-primary">"role"</span>: <span class="text-primary">"user"</span>,
                          <span class="text-primary">"content"</span>: <span class="text-primary">"hi"</span> }] }'</code></pre>
          </div>
          <p class="mt-3 text-xs text-muted-fg">
            Same request, swap the model name — Amodel handles the upstream protocol for you.
          </p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="border-t border-border bg-card/40">
      <div class="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
        <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">WHY AMODEL</p>
        <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl">
          Built for teams that ship.
        </h2>

        <div class="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
          <article v-for="f in features" :key="f.title" class="space-y-3">
            <h3 class="text-xl font-display tracking-tight">{{ f.title }}</h3>
            <p class="text-sm text-muted-fg leading-relaxed">{{ f.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="border-t border-border">
      <div class="mx-auto max-w-[1080px] px-6 py-20 sm:py-24 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
        <div class="max-w-[520px]">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">GET STARTED</p>
          <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl">
            Pick a model. Ship in five minutes.
          </h2>
          <p class="mt-4 text-muted-fg leading-relaxed">
            Sign up, generate a key, point your client at the gateway. We'll take care of
            routing, retries and bill consolidation.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <template v-if="isAuthed">
            <RouterLink to="/dashboard">
              <UiButton variant="primary" size="lg">Open dashboard</UiButton>
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink v-if="showRegister" to="/register">
              <UiButton variant="primary" size="lg">Create account</UiButton>
            </RouterLink>
            <RouterLink to="/login">
              <UiButton variant="secondary" size="lg">Sign in</UiButton>
            </RouterLink>
          </template>
        </div>
      </div>
    </section>

    <footer class="border-t border-border">
      <div class="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-6 text-xs text-muted-fg">
        <span>© Amodel</span>
        <span>An AI gateway, kept simple.</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.text-balance { text-wrap: balance; }
</style>
