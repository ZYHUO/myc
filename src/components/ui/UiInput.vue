<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

// Don't auto-fall-through attrs to the root <div>; we want id / autocomplete /
// inputmode / aria-* etc. to land on the actual <input> so callers' `<label
// for>` associations and screen-reader hints work as expected.
defineOptions({ inheritAttrs: false })

const model = defineModel<string>()

const props = withDefaults(
  defineProps<{
    placeholder?: string
    type?: string
    /** Show a clickable eye icon to reveal the value when type="password". */
    showPasswordToggle?: boolean
  }>(),
  {
    placeholder: '',
    type: 'text',
    showPasswordToggle: true,
  },
)

const { t } = useI18n()
const revealed = ref(false)

const isPassword = computed(() => props.type === 'password')
const showToggle = computed(() => isPassword.value && props.showPasswordToggle)
const effectiveType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type))

function toggleReveal() {
  revealed.value = !revealed.value
}
</script>

<template>
  <div class="relative">
    <input
      v-bind="$attrs"
      v-model="model"
      :type="effectiveType"
      :placeholder="placeholder"
      class="h-10 w-full rounded-md border border-input bg-card text-sm text-fg placeholder:text-muted-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
      :class="showToggle ? 'pl-3 pr-10' : 'px-3'"
    />
    <!-- Password show/hide. The toggle stays tab-able so keyboard users
         get the same affordance; aria-pressed reflects the current state. -->
    <button
      v-if="showToggle"
      type="button"
      class="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-md text-muted-fg transition-colors hover:text-fg hover:bg-muted"
      :aria-label="revealed ? t('common.actions.hide') : t('common.actions.show')"
      :aria-pressed="revealed"
      @click="toggleReveal"
    >
      <svg v-if="!revealed" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7c2.5 0 4.6.9 6.3 2M22 12s-3.5 7-10 7c-2.5 0-4.6-.9-6.3-2M3 3l18 18M9.9 9.9a3 3 0 1 0 4.2 4.2" />
      </svg>
    </button>
  </div>
</template>
