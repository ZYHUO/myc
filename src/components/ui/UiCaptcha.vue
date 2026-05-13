<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import UiTurnstile from './UiTurnstile.vue'
import UiGeetest from './UiGeetest.vue'

/**
 * Unified CAPTCHA host. Reads settings and renders whichever widget the
 * admin has enabled, exposing a single v-model surface so callers don't
 * branch on `turnstile_enabled` vs `geetest_enabled` themselves.
 *
 *   <UiCaptcha v-model="captchaState" />
 *
 * The emitted shape is an object that the caller passes wholesale to the
 * auth endpoint:
 *
 *   { turnstileToken?: string; geetestToken?: string }
 *
 * Auth endpoints accept either; the backend only validates the field
 * matching its enabled provider. When BOTH providers are enabled (rare;
 * an admin sanity-check failed) we render Geetest only — one widget per
 * page is less hostile than two. Pure-frontend behaviour: backend still
 * verifies whichever token arrives.
 */

export interface CaptchaState {
  turnstileToken: string
  geetestToken: string
}

const props = defineProps<{
  modelValue: CaptchaState
}>()

const emit = defineEmits<{
  'update:modelValue': [state: CaptchaState]
  expired: []
  error: [code: string]
}>()

const settings = useSettingsStore()

const turnstileEnabled = computed(() => settings.settings.turnstile_enabled)
const geetestEnabled = computed(() => settings.settings.geetest_enabled)
const turnstileSiteKey = computed(() => settings.settings.turnstile_site_key || '')
const geetestCaptchaId = computed(() => settings.settings.geetest_captcha_id || '')

/** What we'll render. Geetest wins over Turnstile when both are flagged on. */
const active = computed<'geetest' | 'turnstile' | 'none'>(() => {
  if (geetestEnabled.value) return 'geetest'
  if (turnstileEnabled.value) return 'turnstile'
  return 'none'
})

const turnstileRef = ref<InstanceType<typeof UiTurnstile> | null>(null)
const geetestRef = ref<InstanceType<typeof UiGeetest> | null>(null)

function onTurnstileToken(token: string) {
  emit('update:modelValue', { ...props.modelValue, turnstileToken: token })
}
function onGeetestToken(token: string) {
  emit('update:modelValue', { ...props.modelValue, geetestToken: token })
}

function reset() {
  turnstileRef.value?.reset()
  geetestRef.value?.reset()
  emit('update:modelValue', { turnstileToken: '', geetestToken: '' })
}

/** True when the host form should accept the submit. Callers pair it
 *  with a "please complete captcha" toast when false. */
const ready = computed(() => {
  if (active.value === 'turnstile') return !!props.modelValue.turnstileToken
  if (active.value === 'geetest') return !!props.modelValue.geetestToken
  return true // No CAPTCHA enabled — nothing to wait for.
})

defineExpose({ reset, ready })
</script>

<template>
  <div v-if="active !== 'none'" class="pt-1">
    <UiGeetest
      v-if="active === 'geetest'"
      ref="geetestRef"
      :captcha-id="geetestCaptchaId"
      :model-value="props.modelValue.geetestToken"
      @update:model-value="onGeetestToken"
      @expired="$emit('expired')"
      @error="(c) => $emit('error', c)"
    />
    <UiTurnstile
      v-else-if="active === 'turnstile'"
      ref="turnstileRef"
      :sitekey="turnstileSiteKey"
      :model-value="props.modelValue.turnstileToken"
      @update:model-value="onTurnstileToken"
      @expired="$emit('expired')"
      @error="(c) => $emit('error', c)"
    />
  </div>
</template>
