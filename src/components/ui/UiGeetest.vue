<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'

/**
 * Geetest v4 (gcaptcha4) slider/puzzle widget. Lifecycle matches
 * UiTurnstile so callers can swap between them by name only:
 *
 *   <UiGeetest :captcha-id="..." v-model="token" />
 *
 * The widget emits a JSON-encoded blob of the four challenge fields
 * (lot_number, captcha_output, pass_token, gen_time). Backend
 * `GeetestService.VerifyToken` parses the JSON and forwards to
 * https://gcaptcha4.geetest.com/validate with the server-side
 * captcha_key. Frontend never sees the key.
 *
 * The Geetest SDK is `initGeetest4(opts, cb)`. It manages its own DOM
 * lifecycle but offers an `appendTo` selector for mounting; we point
 * it at our containerRef and let it draw inside.
 */
const props = defineProps<{
  /** Public captcha ID issued by Geetest. Empty disables rendering. */
  captchaId: string
  /**
   * Geetest v4 product type:
   *   - 'popup'   → renders a "click to verify" button inline; the slider
   *                 opens in an overlay on click. Right default for an
   *                 auth-form context (visible affordance, no full-page
   *                 takeover).
   *   - 'float'   → floating button anchored bottom-right of the viewport
   *   - 'bind'    → no UI; you call `showCaptcha()` from your own button.
   *                 Useless as a default — the widget renders nothing.
   *   - 'custom'  → fully custom DOM, advanced.
   */
  product?: 'popup' | 'float' | 'bind' | 'custom'
}>()

const emit = defineEmits<{
  'update:modelValue': [token: string]
  expired: []
  error: [code: string]
}>()

const SCRIPT_SRC = 'https://static.geetest.com/v4/gt4.js'
const containerRef = ref<HTMLDivElement | null>(null)
const captchaObj = ref<GeetestCaptchaInstance | null>(null)
const { t } = useI18n()
const theme = useThemeStore()

interface GeetestSuccessPayload {
  lot_number: string
  captcha_output: string
  pass_token: string
  gen_time: string
}

interface GeetestCaptchaInstance {
  appendTo(selector: string | HTMLElement): GeetestCaptchaInstance
  onReady(cb: () => void): GeetestCaptchaInstance
  onSuccess(cb: () => void): GeetestCaptchaInstance
  onError(cb: (err: { code?: string; msg?: string }) => void): GeetestCaptchaInstance
  onClose?(cb: () => void): GeetestCaptchaInstance
  getValidate(): GeetestSuccessPayload | null
  reset(): void
  showCaptcha?(): void
  destroy?(): void
}

declare global {
  interface Window {
    initGeetest4?: (
      opts: {
        captchaId: string
        product?: string
        riskType?: string
        language?: string
        // Geetest v4 has light/dark themes — names differ from CSS
        // ('whitepurple' / 'blackgold' etc.). Default 'whitepurple' for
        // light mode; 'blackgold' looks decent on dark.
        hideBar?: string[]
        protocol?: 'http://' | 'https://'
      },
      callback: (captcha: GeetestCaptchaInstance) => void,
    ) => void
  }
}

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.initGeetest4) return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>(`script[src^="${SCRIPT_SRC}"]`)
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Geetest script failed to load')), { once: true })
    })
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Geetest script failed to load'))
    document.head.appendChild(s)
  })
}

function render() {
  if (!containerRef.value || !props.captchaId || !window.initGeetest4) return
  if (captchaObj.value?.destroy) {
    try { captchaObj.value.destroy() } catch { /* ignore */ }
    captchaObj.value = null
  }
  window.initGeetest4(
    {
      captchaId: props.captchaId,
      product: props.product || 'popup',
      language: detectLanguage(),
    },
    (captcha) => {
      captchaObj.value = captcha
      if (containerRef.value) {
        captcha.appendTo(containerRef.value)
      }
      captcha.onReady(() => {
        // No-op: widget rendered.
      })
      captcha.onSuccess(() => {
        const v = captcha.getValidate()
        if (v) emit('update:modelValue', JSON.stringify(v))
      })
      captcha.onError((err) => {
        emit('update:modelValue', '')
        emit('error', err?.code || err?.msg || 'unknown')
      })
      captcha.onClose?.(() => {
        // Treat user-dismiss the same as an expiry: clear the token so the
        // host form re-prompts on submit.
        emit('update:modelValue', '')
        emit('expired')
      })
    },
  )
}

function detectLanguage(): string {
  // Geetest v4 language tags: 'eng', 'zho-cn' (simplified), 'zho-tw',
  // 'zho-hk', 'jpn', 'kor', 'rus', etc. Plain 'zho' is not a valid v4
  // tag — it silently falls back to English. Best-effort; unknown
  // locales fall back to English.
  if (typeof navigator === 'undefined') return 'eng'
  const tag = (navigator.language || 'en').toLowerCase()
  if (tag.startsWith('zh-tw')) return 'zho-tw'
  if (tag.startsWith('zh-hk')) return 'zho-hk'
  if (tag.startsWith('zh')) return 'zho-cn'
  if (tag.startsWith('ja')) return 'jpn'
  if (tag.startsWith('ko')) return 'kor'
  if (tag.startsWith('ru')) return 'rus'
  return 'eng'
}

const visibleHint = computed(() => !props.captchaId)

onMounted(async () => {
  if (!props.captchaId) return
  try {
    await loadScript()
    requestAnimationFrame(render)
  } catch (e) {
    emit('error', e instanceof Error ? e.message : 'load-failed')
  }
})

onBeforeUnmount(() => {
  if (captchaObj.value?.destroy) {
    try { captchaObj.value.destroy() } catch { /* ignore */ }
  }
})

// Re-render when the captchaId becomes available (settings load is async).
watch(() => props.captchaId, (id, prev) => {
  if (id && id !== prev && window.initGeetest4) render()
})

// Geetest doesn't ship a theme API; the SDK reads its own. We still
// trigger a re-render on theme change so a future custom-CSS overlay
// can pick up the new tokens.
watch(() => theme.resolve(), () => {
  if (captchaObj.value && window.initGeetest4) render()
})

function reset() {
  try { captchaObj.value?.reset() } catch { /* ignore */ }
}

defineExpose({ reset })
</script>

<template>
  <div>
    <div ref="containerRef" />
    <p v-if="visibleHint" class="text-xs text-amber leading-relaxed">
      {{ t('geetest.missingCaptchaId') }}
    </p>
  </div>
</template>
