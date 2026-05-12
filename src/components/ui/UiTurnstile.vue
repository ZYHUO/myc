<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'

/**
 * Cloudflare Turnstile widget. The Turnstile API script is loaded lazily on
 * first mount so we don't pay the bytes on pages that don't need it. The
 * widget calls back into JS with a one-shot `token`, which we emit via
 * v-model so the host form can include it on submit.
 *
 * Backend contract: sub2api accepts the token in the `turnstile_token` field
 * on /auth/register and /auth/send-verify-code (and possibly /auth/login,
 * depending on its `VerifyTurnstileForLogin` setting). We validate against
 * `settings.turnstile_enabled` at the call site before mounting this.
 */
const props = defineProps<{
  /** Cloudflare site key (public). When empty the widget renders a hint. */
  sitekey: string
  /** 'managed' (default), 'non-interactive', or 'invisible'. */
  appearance?: 'always' | 'execute' | 'interaction-only'
}>()

const emit = defineEmits<{
  'update:modelValue': [token: string]
  expired: []
  error: [code: string]
}>()

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const containerRef = ref<HTMLDivElement | null>(null)
const widgetId = ref<string | null>(null)
const { t } = useI18n()
const theme = useThemeStore()

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        opts: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          appearance?: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: (code: string) => void
        },
      ) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.turnstile) return Promise.resolve()
  // Reuse an in-flight load if another instance kicked it off first.
  const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC.split('?')[0]}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script failed to load'))
    document.head.appendChild(s)
  })
}

function render() {
  if (!containerRef.value || !props.sitekey || !window.turnstile) return
  // Remove any previous instance before re-rendering (theme switch, etc.).
  if (widgetId.value) {
    try { window.turnstile.remove(widgetId.value) } catch { /* ignore */ }
    widgetId.value = null
  }
  widgetId.value = window.turnstile.render(containerRef.value, {
    sitekey: props.sitekey,
    theme: theme.resolve() === 'dark' ? 'dark' : 'light',
    appearance: props.appearance,
    callback: (token) => emit('update:modelValue', token),
    'expired-callback': () => {
      emit('update:modelValue', '')
      emit('expired')
    },
    'error-callback': (code) => emit('error', code),
  })
}

const visibleHint = computed(() => !props.sitekey)

onMounted(async () => {
  if (!props.sitekey) return
  try {
    await loadScript()
    // Defer one frame so the container is in the DOM and laid out.
    requestAnimationFrame(render)
  } catch (e) {
    emit('error', e instanceof Error ? e.message : 'load-failed')
  }
})

onBeforeUnmount(() => {
  if (widgetId.value && window.turnstile) {
    try { window.turnstile.remove(widgetId.value) } catch { /* ignore */ }
  }
})

// Re-render on theme change so the widget's own colours track the app theme.
watch(() => theme.resolve(), () => {
  if (widgetId.value && window.turnstile) render()
})

// Re-render if the sitekey changes (e.g. settings re-fetched).
watch(() => props.sitekey, (sk, prev) => {
  if (sk && sk !== prev && window.turnstile) render()
})

/** Imperatively reset the widget (e.g. after a failed submit). */
function reset() {
  if (widgetId.value && window.turnstile) {
    try { window.turnstile.reset(widgetId.value) } catch { /* ignore */ }
  }
}

defineExpose({ reset })
</script>

<template>
  <div>
    <div ref="containerRef" />
    <p v-if="visibleHint" class="text-xs text-amber leading-relaxed">
      {{ t('turnstile.missingSiteKey') }}
    </p>
  </div>
</template>
