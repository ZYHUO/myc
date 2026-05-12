<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { UiButton } from '@/components/ui'
import UiLanguageSwitcher from '@/components/ui/UiLanguageSwitcher.vue'
import UiThemeSwitcher from '@/components/ui/UiThemeSwitcher.vue'
import { useCountUp } from '@/composables'

const router = useRouter()
const auth = useAuthStore()
const settingsStore = useSettingsStore()
const { t, tm } = useI18n()

const isAuthed = computed(() => auth.isAuthenticated)
const showRegister = computed(() => settingsStore.settings.registration_enabled)

// ─── Mobile nav drawer ──────────────────────────────────────────────────────
const drawerOpen = ref(false)
function closeDrawer() { drawerOpen.value = false }
watch(drawerOpen, (open) => {
  // Body scroll lock while the drawer is open.
  if (typeof document !== 'undefined') {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  }
})

// ─── Stats count-up (animates from 0 once they're visible) ──────────────────
const statTargets = ref({ models: 0, uptime: 0, regions: 0 })
const statsRef = ref<HTMLElement | null>(null)
const animatedModels = useCountUp(computed(() => statTargets.value.models))
const animatedUptime = useCountUp(computed(() => statTargets.value.uptime))
const animatedRegions = useCountUp(computed(() => statTargets.value.regions))

// ─── FAQ accordion ──────────────────────────────────────────────────────────
const openFaq = ref<number | null>(0)
function toggleFaq(i: number) { openFaq.value = openFaq.value === i ? null : i }

// ─── Reveal-on-scroll ───────────────────────────────────────────────────────
let observer: IntersectionObserver | null = null
function setupReveals() {
  if (typeof IntersectionObserver === 'undefined') {
    // Older browsers: just show everything.
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))
    return
  }
  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        observer?.unobserve(entry.target)
        // First time the stats strip enters the viewport, trigger the count-up.
        if (entry.target === statsRef.value) {
          statTargets.value.models = 12
          statTargets.value.uptime = 999 // displayed as 99.9
          statTargets.value.regions = 8
        }
      }
    }
  }, { rootMargin: '0px 0px -80px 0px', threshold: 0.08 })

  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))
  if (statsRef.value) observer.observe(statsRef.value)
}

// ─── Pause hero animations when scrolled past ──────────────────────────────
// The marquee + floating blurs are decorative. As soon as the hero is fully
// off-screen we toggle `.is-offscreen` (style.css pauses animations on it),
// reclaiming significant GPU/CPU on long sessions.
const heroSection = ref<HTMLElement | null>(null)
const heroOffscreen = ref(false)
let heroObserver: IntersectionObserver | null = null
function setupHeroPause() {
  if (typeof IntersectionObserver === 'undefined' || !heroSection.value) return
  heroObserver = new IntersectionObserver(
    ([entry]) => { heroOffscreen.value = !entry.isIntersecting },
    { threshold: 0 },
  )
  heroObserver.observe(heroSection.value)
}

onMounted(() => {
  settingsStore.load().catch(() => {})
  // Run after the DOM has settled.
  requestAnimationFrame(() => {
    setupReveals()
    setupHeroPause()
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  heroObserver?.disconnect()
  if (typeof document !== 'undefined') document.documentElement.style.overflow = ''
})

// ─── Static content ─────────────────────────────────────────────────────────
const providers = ['Claude', 'GPT', 'Gemini', 'DeepSeek', 'Llama', 'Mistral', 'Qwen', 'Cohere', 'Groq', 'Grok']

// Spread the providers across the marquee strip twice so the loop is seamless.
const marqueeProviders = computed(() => [...providers, ...providers])

const featureKeys = ['unified', 'subscription', 'analytics', 'byok', 'secure', 'fast'] as const

const howSteps = ['signup', 'key', 'request'] as const

const faqItems = computed(() => {
  const items = tm('landing.faq.items') as Array<{ q: string; a: string }>
  return Array.isArray(items) ? items : []
})

const paygFeatures = computed(() => tm('landing.pricing.plans.payg.features') as string[])
const subFeatures = computed(() => tm('landing.pricing.plans.sub.features') as string[])

function scrollTo(id: string) {
  closeDrawer()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function go(path: string) {
  closeDrawer()
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen bg-bg text-fg">
    <!-- ─── Header ─────────────────────────────────────────────────────── -->
    <header class="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-border">
      <div class="mx-auto flex max-w-[1200px] items-center justify-between px-4 sm:px-6 py-3.5">
        <!-- Brand -->
        <RouterLink to="/" class="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0" @click="closeDrawer">
          <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">A</div>
          <span class="text-lg sm:text-xl font-display tracking-tight">Amodel</span>
        </RouterLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-7">
          <button type="button" class="text-sm text-muted-fg transition-colors hover:text-fg" @click="scrollTo('features')">{{ t('landing.nav.features') }}</button>
          <button type="button" class="text-sm text-muted-fg transition-colors hover:text-fg" @click="scrollTo('models')">{{ t('landing.nav.models') }}</button>
          <button type="button" class="text-sm text-muted-fg transition-colors hover:text-fg" @click="scrollTo('pricing')">{{ t('landing.nav.pricing') }}</button>
          <button type="button" class="text-sm text-muted-fg transition-colors hover:text-fg" @click="scrollTo('faq')">{{ t('landing.nav.faq') }}</button>
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <UiLanguageSwitcher />
          <UiThemeSwitcher />
          <template v-if="isAuthed">
            <UiButton variant="primary" size="md" class="hidden sm:inline-flex" @click="router.push('/dashboard')">
              {{ t('common.openDashboard') }}
            </UiButton>
          </template>
          <template v-else>
            <button type="button" class="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-fg transition-colors hover:text-fg" @click="router.push('/login')">
              {{ t('common.signIn') }}
            </button>
            <UiButton v-if="showRegister" variant="primary" size="md" class="hidden sm:inline-flex" @click="router.push('/register')">
              {{ t('common.getStarted') }}
            </UiButton>
          </template>

          <!-- Mobile menu trigger -->
          <button
            type="button"
            class="md:hidden flex h-9 w-9 items-center justify-center rounded-md text-fg transition-colors hover:bg-muted"
            :aria-label="t('landing.nav.features')"
            :aria-expanded="drawerOpen"
            @click="drawerOpen = !drawerOpen"
          >
            <svg v-if="!drawerOpen" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile drawer (slides down under the header) -->
      <Transition name="drawer">
        <div v-if="drawerOpen" class="md:hidden border-t border-border bg-bg">
          <nav class="mx-auto max-w-[1200px] px-4 py-4 space-y-1">
            <button type="button" class="w-full text-left px-3 py-2.5 text-base rounded-md text-fg hover:bg-muted" @click="scrollTo('features')">{{ t('landing.nav.features') }}</button>
            <button type="button" class="w-full text-left px-3 py-2.5 text-base rounded-md text-fg hover:bg-muted" @click="scrollTo('models')">{{ t('landing.nav.models') }}</button>
            <button type="button" class="w-full text-left px-3 py-2.5 text-base rounded-md text-fg hover:bg-muted" @click="scrollTo('pricing')">{{ t('landing.nav.pricing') }}</button>
            <button type="button" class="w-full text-left px-3 py-2.5 text-base rounded-md text-fg hover:bg-muted" @click="scrollTo('faq')">{{ t('landing.nav.faq') }}</button>
          </nav>
          <div class="border-t border-border px-4 py-4 space-y-2">
            <template v-if="isAuthed">
              <UiButton variant="primary" size="lg" class="w-full" @click="go('/dashboard')">{{ t('common.openDashboard') }}</UiButton>
            </template>
            <template v-else>
              <UiButton v-if="showRegister" variant="primary" size="lg" class="w-full" @click="go('/register')">{{ t('common.getStarted') }}</UiButton>
              <UiButton variant="secondary" size="lg" class="w-full" @click="go('/login')">{{ t('common.signIn') }}</UiButton>
            </template>
          </div>
        </div>
      </Transition>
    </header>

    <!-- ─── Hero ───────────────────────────────────────────────────────── -->
    <section ref="heroSection" class="relative overflow-hidden" :class="{ 'is-offscreen': heroOffscreen }">
      <!-- Decorative blurs / orbs -->
      <div class="pointer-events-none absolute -top-32 -right-24 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl animate-float-slow" aria-hidden="true"></div>
      <div class="pointer-events-none absolute top-40 -left-24 h-[400px] w-[400px] rounded-full bg-accent/70 blur-3xl animate-float-slow" style="animation-delay: 2s" aria-hidden="true"></div>

      <div class="relative mx-auto max-w-[1200px] px-4 sm:px-6 pt-16 sm:pt-24 pb-16 sm:pb-24">
        <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium animate-slide-up" style="animation-delay: 40ms">{{ t('landing.hero.eyebrow') }}</p>
        <h1 class="mt-4 font-display font-normal tracking-tight text-[42px] leading-[1.05] sm:text-[64px] md:text-[80px] text-balance">
          <span class="block animate-slide-up" style="animation-delay: 120ms">{{ t('landing.hero.headlineLine1') }}</span>
          <span class="block animate-slide-up" style="animation-delay: 220ms">{{ t('landing.hero.headlineLine2') }}</span>
        </h1>
        <p class="mt-6 max-w-[600px] text-base sm:text-lg md:text-xl text-muted-fg leading-relaxed animate-slide-up" style="animation-delay: 360ms">
          {{ t('landing.hero.lead') }}
        </p>

        <div class="mt-9 flex flex-wrap gap-3 animate-slide-up" style="animation-delay: 480ms">
          <template v-if="isAuthed">
            <UiButton variant="primary" size="lg" @click="router.push('/dashboard')">{{ t('landing.hero.authedPrimary') }}</UiButton>
            <UiButton variant="secondary" size="lg" @click="router.push('/keys')">{{ t('landing.hero.authedSecondary') }}</UiButton>
          </template>
          <template v-else>
            <!-- When `registration_enabled` is false, the primary slot
                 becomes "Sign in" so the hero never looks lonely with one
                 button; the secondary slot then anchors to the features
                 section so curious visitors have somewhere to go. -->
            <UiButton
              v-if="showRegister"
              variant="primary"
              size="lg"
              @click="router.push('/register')"
            >
              {{ t('landing.hero.ctaPrimary') }}
            </UiButton>
            <UiButton
              :variant="showRegister ? 'secondary' : 'primary'"
              size="lg"
              @click="router.push('/login')"
            >
              {{ t('landing.hero.ctaSecondary') }}
            </UiButton>
            <UiButton
              v-if="!showRegister"
              variant="secondary"
              size="lg"
              @click="scrollTo('features')"
            >
              {{ t('common.learnMore') }}
            </UiButton>
          </template>
        </div>

        <!-- Code snippet card -->
        <div class="mt-14 sm:mt-16 max-w-[760px] animate-scale-in" style="animation-delay: 600ms">
          <div class="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <span class="h-2.5 w-2.5 rounded-full bg-muted-fg/30"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-muted-fg/30"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-muted-fg/30"></span>
              <span class="ml-3 font-mono text-[11px] text-muted-fg">curl</span>
            </div>
            <pre class="overflow-x-auto px-4 sm:px-5 py-4 font-mono text-[12px] sm:text-[13px] leading-relaxed text-fg"><code><span class="text-muted-fg">$</span> curl <span class="code-accent">https://amodel.example.com/v1/messages</span> \
    -H <span class="code-accent">"Authorization: Bearer $AMODEL_KEY"</span> \
    -d '{ <span class="code-accent">"model"</span>: <span class="code-accent">"claude-sonnet-4"</span>,
          <span class="code-accent">"messages"</span>: [{ <span class="code-accent">"role"</span>: <span class="code-accent">"user"</span>,
                          <span class="code-accent">"content"</span>: <span class="code-accent">"hi"</span> }] }'<span class="animate-blink text-primary">▍</span></code></pre>
          </div>
          <p class="mt-3 text-xs sm:text-sm text-muted-fg">{{ t('landing.hero.codeCaption') }}</p>
        </div>
      </div>

      <!-- Provider marquee. Use the plain page background (not bg-card/30)
           so the fade-edge gradient blends seamlessly in both themes. -->
      <div id="models" class="relative border-t border-border overflow-hidden">
        <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-8">
          <p class="text-center text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('landing.hero.trustedBy') }}</p>
          <div class="mt-6 relative">
            <div class="flex animate-marquee w-max gap-12">
              <div v-for="(p, i) in marqueeProviders" :key="`${p}-${i}`" class="flex items-center gap-3 shrink-0">
                <span class="h-1.5 w-1.5 rounded-full bg-primary/40" aria-hidden="true"></span>
                <span class="font-display text-2xl sm:text-3xl tracking-tight text-muted-fg/80">{{ p }}</span>
              </div>
            </div>
            <!-- Fade edges. The 3-stop gradient (solid → 60% → transparent)
                 keeps the cut-off visible in dark mode where a 2-stop
                 bg→transparent fade is essentially invisible. -->
            <div class="marquee-edge marquee-edge-left" aria-hidden="true"></div>
            <div class="marquee-edge marquee-edge-right" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Stats ──────────────────────────────────────────────────────── -->
    <section ref="statsRef" class="border-t border-border">
      <!-- Smaller heading font on mobile so wide values like "<1 分钟" never
           overflow their column on a 360 px viewport. `min-w-0` on each cell
           lets text shrink (or wrap) instead of pushing the grid to 1-col. -->
      <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 sm:py-20 grid grid-cols-2 md:grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-4 sm:gap-x-6">
        <div class="reveal min-w-0">
          <p class="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight tabular-nums">{{ animatedModels }}+</p>
          <p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-fg">{{ t('landing.stats.models') }}</p>
        </div>
        <div class="reveal reveal-delay-1 min-w-0">
          <p class="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight tabular-nums">{{ (animatedUptime / 10).toFixed(1) }}%</p>
          <p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-fg">{{ t('landing.stats.uptime') }}</p>
        </div>
        <div class="reveal reveal-delay-2 min-w-0">
          <p class="font-display text-3xl sm:text-5xl md:text-6xl tracking-tight whitespace-nowrap">{{ t('landing.stats.setupValue') }}</p>
          <p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-fg">{{ t('landing.stats.setup') }}</p>
        </div>
        <div class="reveal reveal-delay-3 min-w-0">
          <p class="font-display text-4xl sm:text-5xl md:text-6xl tracking-tight tabular-nums">{{ animatedRegions }}</p>
          <p class="mt-2 text-[11px] uppercase tracking-[0.18em] text-muted-fg">{{ t('landing.stats.regions') }}</p>
        </div>
      </div>
    </section>

    <!-- ─── Features ───────────────────────────────────────────────────── -->
    <section id="features" class="border-t border-border bg-card/40 cv-auto">
      <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28">
        <div class="reveal">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('landing.features.eyebrow') }}</p>
          <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl md:text-5xl">
            {{ t('landing.features.title') }}
          </h2>
        </div>

        <div class="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          <article
            v-for="(key, i) in featureKeys"
            :key="key"
            class="reveal card-hover space-y-3 p-1"
            :class="`reveal-delay-${(i % 6) + 1}`"
          >
            <div class="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center font-display text-lg">
              {{ i + 1 }}
            </div>
            <h3 class="text-xl font-display tracking-tight">{{ t(`landing.features.items.${key}.title`) }}</h3>
            <p class="text-sm text-muted-fg leading-relaxed">{{ t(`landing.features.items.${key}.body`) }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ─── How it works ────────────────────────────────────────────────── -->
    <section class="border-t border-border cv-auto">
      <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28">
        <div class="reveal">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('landing.howItWorks.eyebrow') }}</p>
          <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl md:text-5xl">{{ t('landing.howItWorks.title') }}</h2>
        </div>
        <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="(s, i) in howSteps" :key="s" class="reveal" :class="`reveal-delay-${i + 1}`">
            <div class="flex items-baseline gap-3">
              <span class="font-display text-5xl text-primary/80 tabular-nums">{{ String(i + 1).padStart(2, '0') }}</span>
              <h3 class="text-xl font-display tracking-tight">{{ t(`landing.howItWorks.steps.${s}.title`) }}</h3>
            </div>
            <p class="mt-3 text-sm text-muted-fg leading-relaxed">{{ t(`landing.howItWorks.steps.${s}.body`) }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Pricing ────────────────────────────────────────────────────── -->
    <section id="pricing" class="border-t border-border bg-card/40 cv-auto">
      <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28">
        <div class="reveal max-w-2xl">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('landing.pricing.eyebrow') }}</p>
          <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl md:text-5xl">{{ t('landing.pricing.title') }}</h2>
          <p class="mt-4 text-muted-fg leading-relaxed">{{ t('landing.pricing.lead') }}</p>
        </div>

        <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="reveal reveal-delay-1 rounded-2xl border border-border bg-card p-7 card-hover">
            <p class="text-sm font-medium text-muted-fg uppercase tracking-wider">{{ t('landing.pricing.plans.payg.name') }}</p>
            <p class="mt-3 font-display text-5xl tabular-nums tracking-tight">
              {{ t('landing.pricing.plans.payg.price') }}
              <span class="text-base font-normal text-muted-fg ml-1">{{ t('landing.pricing.plans.payg.unit') }}</span>
            </p>
            <ul class="mt-7 space-y-3">
              <li v-for="feat in paygFeatures" :key="feat" class="flex items-start gap-2 text-sm">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-green" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span class="text-muted-fg">{{ feat }}</span>
              </li>
            </ul>
            <div class="mt-7">
              <UiButton variant="secondary" size="md" class="w-full" @click="router.push(showRegister ? '/register' : '/login')">
                {{ t('landing.pricing.plans.payg.cta') }}
              </UiButton>
            </div>
          </div>

          <div class="reveal reveal-delay-2 rounded-2xl border-2 border-primary/40 bg-card p-7 card-hover relative">
            <span class="absolute -top-3 right-6 rounded-full bg-primary text-primary-fg text-[10px] font-medium uppercase tracking-wider px-2.5 py-1">{{ t('common.new') }}</span>
            <p class="text-sm font-medium text-primary uppercase tracking-wider">{{ t('landing.pricing.plans.sub.name') }}</p>
            <p class="mt-3 font-display text-5xl tabular-nums tracking-tight">
              {{ t('landing.pricing.plans.sub.price') }}
              <span class="text-base font-normal text-muted-fg ml-1">{{ t('landing.pricing.plans.sub.unit') }}</span>
            </p>
            <ul class="mt-7 space-y-3">
              <li v-for="feat in subFeatures" :key="feat" class="flex items-start gap-2 text-sm">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span class="text-muted-fg">{{ feat }}</span>
              </li>
            </ul>
            <div class="mt-7">
              <UiButton variant="primary" size="md" class="w-full" @click="router.push(isAuthed ? '/purchase' : '/register')">
                {{ t('landing.pricing.plans.sub.cta') }}
              </UiButton>
            </div>
          </div>
        </div>

        <p class="reveal reveal-delay-3 mt-8 text-xs text-muted-fg">{{ t('landing.pricing.note') }}</p>
      </div>
    </section>

    <!-- ─── FAQ ────────────────────────────────────────────────────────── -->
    <section id="faq" class="border-t border-border cv-auto">
      <div class="mx-auto max-w-[840px] px-4 sm:px-6 py-20 sm:py-28">
        <div class="reveal">
          <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('landing.faq.eyebrow') }}</p>
          <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl md:text-5xl">{{ t('landing.faq.title') }}</h2>
        </div>

        <div class="mt-12 divide-y divide-border border-y border-border">
          <div v-for="(item, i) in faqItems" :key="i" class="reveal py-1" :class="`reveal-delay-${Math.min(i + 1, 6)}`">
            <button
              type="button"
              class="w-full flex items-start justify-between gap-6 py-5 text-left transition-colors hover:text-fg"
              :aria-expanded="openFaq === i"
              :aria-controls="`faq-panel-${i}`"
              @click="toggleFaq(i)"
            >
              <span class="text-lg sm:text-xl font-display tracking-tight">{{ item.q }}</span>
              <span class="shrink-0 mt-1 transition-transform" :class="openFaq === i ? 'rotate-45' : ''">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <Transition name="accordion">
              <div v-if="openFaq === i" :id="`faq-panel-${i}`" class="overflow-hidden">
                <p class="pb-5 text-sm sm:text-base text-muted-fg leading-relaxed">{{ item.a }}</p>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA ────────────────────────────────────────────────────────── -->
    <section class="border-t border-border bg-card/40">
      <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-20 sm:py-28">
        <div class="reveal flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div class="max-w-[560px]">
            <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('landing.cta.eyebrow') }}</p>
            <h2 class="mt-3 font-display font-normal tracking-tight text-3xl sm:text-4xl md:text-5xl">{{ t('landing.cta.title') }}</h2>
            <p class="mt-4 text-muted-fg leading-relaxed">{{ t('landing.cta.lead') }}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <template v-if="isAuthed">
              <UiButton variant="primary" size="lg" @click="router.push('/dashboard')">{{ t('common.openDashboard') }}</UiButton>
            </template>
            <template v-else>
              <UiButton v-if="showRegister" variant="primary" size="lg" @click="router.push('/register')">{{ t('common.createAccount') }}</UiButton>
              <UiButton variant="secondary" size="lg" @click="router.push('/login')">{{ t('common.signIn') }}</UiButton>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Footer ─────────────────────────────────────────────────────── -->
    <footer class="border-t border-border">
      <div class="mx-auto max-w-[1200px] px-4 sm:px-6 py-12 sm:py-14">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
          <div class="col-span-2">
            <RouterLink to="/" class="inline-flex items-center gap-2.5">
              <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-fg text-sm font-display font-medium">A</div>
              <span class="text-lg font-display tracking-tight">Amodel</span>
            </RouterLink>
            <p class="mt-4 text-sm text-muted-fg max-w-[360px]">{{ t('landing.footer.tagline') }}</p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium">{{ t('landing.footer.sections.product') }}</p>
            <ul class="mt-4 space-y-2.5 text-sm">
              <li><button type="button" class="text-muted-fg hover:text-fg transition-colors" @click="scrollTo('features')">{{ t('landing.footer.links.features') }}</button></li>
              <li><button type="button" class="text-muted-fg hover:text-fg transition-colors" @click="scrollTo('pricing')">{{ t('landing.footer.links.pricing') }}</button></li>
              <li><RouterLink to="/status" class="text-muted-fg hover:text-fg transition-colors">{{ t('landing.footer.links.status') }}</RouterLink></li>
            </ul>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium">{{ t('landing.footer.sections.legal') }}</p>
            <ul class="mt-4 space-y-2.5 text-sm">
              <li><a href="#" class="text-muted-fg hover:text-fg transition-colors">{{ t('landing.footer.links.terms') }}</a></li>
              <li><a href="#" class="text-muted-fg hover:text-fg transition-colors">{{ t('landing.footer.links.privacy') }}</a></li>
            </ul>
          </div>
        </div>

        <div class="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-fg">
          <span>{{ t('landing.footer.copyright') }}</span>
          <span>{{ t('landing.footer.tagline') }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.text-balance { text-wrap: balance; }

/* Provider-marquee fade edges. A 3-stop gradient (solid → 60% → transparent)
   stays visible in dark mode where a plain bg-to-transparent fade is almost
   indistinguishable from the surrounding page colour. Wider on `sm+` for
   desktop, modest on mobile to leave room for the wordmarks. */
.marquee-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 56px;
  pointer-events: none;
  z-index: 1;
}
@media (min-width: 640px) {
  .marquee-edge { width: 96px; }
}
.marquee-edge-left {
  left: 0;
  background: linear-gradient(
    to right,
    var(--color-bg) 0%,
    color-mix(in srgb, var(--color-bg) 70%, transparent) 55%,
    transparent 100%
  );
}
.marquee-edge-right {
  right: 0;
  background: linear-gradient(
    to left,
    var(--color-bg) 0%,
    color-mix(in srgb, var(--color-bg) 70%, transparent) 55%,
    transparent 100%
  );
}

/* Mobile drawer slide */
.drawer-enter-active, .drawer-leave-active {
  transition: max-height 0.25s ease, opacity 0.2s ease;
  overflow: hidden;
}
.drawer-enter-from, .drawer-leave-to {
  max-height: 0;
  opacity: 0;
}
.drawer-enter-to, .drawer-leave-from {
  max-height: 480px;
  opacity: 1;
}

/* FAQ accordion */
.accordion-enter-active, .accordion-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  overflow: hidden;
}
.accordion-enter-from, .accordion-leave-to {
  max-height: 0;
  opacity: 0;
}
.accordion-enter-to, .accordion-leave-from {
  max-height: 280px;
  opacity: 1;
}
</style>
