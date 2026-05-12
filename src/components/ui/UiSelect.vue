<script setup lang="ts" generic="T extends string | number">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * A styled dropdown that matches the rest of the design system instead of
 * surfacing the OS-native `<select>` chrome (which on mobile is a sheet
 * popover with system fonts and colours that look out of place).
 *
 * v-model: the value of the currently-selected option.
 *
 *   <UiSelect
 *     v-model="newKeyGroupId"
 *     :options="availableGroups.map((g) => ({ value: g.id, label: g.name }))"
 *     placeholder="Pick a group"
 *   />
 *
 * Behaviour notes:
 * - Click anywhere outside or press Escape to close.
 * - Up/Down arrows move the highlight; Enter selects; Home/End jump.
 * - Renders an `<input type="hidden">` mirror so the component can sit
 *   inside a `<form>` and submit a value (sub2api forms don't actually
 *   use that today, but it's free and avoids surprise later).
 * - The trigger keeps a single hard-coded height (h-10) that lines up with
 *   UiInput so a Select beside an Input in a row has matching baselines.
 */

// Exported so callers can type their own option arrays without copy-paste.
// (And so vue-tsc doesn't complain about a private name leaking through the
// generated component declaration.)
export interface SelectOption<V> {
  value: V
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: T | null | undefined
  options: SelectOption<T>[]
  placeholder?: string
  disabled?: boolean
  /** Optional id forwarded to the visible trigger (for `<label for>`). */
  id?: string
  /** Optional name attached to the hidden form input. */
  name?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const { t } = useI18n()
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLUListElement | null>(null)
const activeIndex = ref(-1)

const selected = computed(() =>
  props.options.find((o) => o.value === props.modelValue) ?? null,
)

const displayLabel = computed(
  () => selected.value?.label ?? props.placeholder ?? t('common.actions.search'),
)

function toggleOpen() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    // Highlight the currently-selected option (or first enabled) for keyboard
    // navigation continuity.
    const idx = selected.value
      ? props.options.findIndex((o) => o.value === selected.value!.value)
      : props.options.findIndex((o) => !o.disabled)
    activeIndex.value = idx
    // Scroll the highlighted option into view after the popover paints.
    nextTick(scrollActiveIntoView)
  }
}

function pick(opt: SelectOption<T>) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  open.value = false
}

function moveActive(delta: number) {
  if (!props.options.length) return
  let i = activeIndex.value
  for (let step = 0; step < props.options.length; step++) {
    i = (i + delta + props.options.length) % props.options.length
    if (!props.options[i].disabled) break
  }
  activeIndex.value = i
  scrollActiveIntoView()
}

function scrollActiveIntoView() {
  const list = listRef.value
  if (!list || activeIndex.value < 0) return
  const el = list.querySelector<HTMLElement>(`[data-idx="${activeIndex.value}"]`)
  el?.scrollIntoView({ block: 'nearest' })
}

function onKey(e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    open.value = false
    return
  }
  if (!open.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleOpen()
    }
    return
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1) }
  else if (e.key === 'Home') { e.preventDefault(); activeIndex.value = 0; scrollActiveIntoView() }
  else if (e.key === 'End') { e.preventDefault(); activeIndex.value = props.options.length - 1; scrollActiveIntoView() }
  else if (e.key === 'Enter') {
    e.preventDefault()
    const opt = props.options[activeIndex.value]
    if (opt) pick(opt)
  }
}

function onDocClick(e: MouseEvent) {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})

// Close the dropdown if the options list shrinks past the active index
// (e.g. an async refresh removed entries while it was open).
watch(() => props.options.length, () => {
  if (activeIndex.value >= props.options.length) activeIndex.value = -1
})
</script>

<template>
  <div ref="rootRef" class="relative" @keydown="onKey">
    <!-- Visible trigger -->
    <button
      :id="id"
      type="button"
      class="w-full h-10 flex items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm text-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      :class="{ 'text-muted-fg': !selected }"
      :disabled="disabled"
      :aria-haspopup="'listbox'"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <span class="truncate">{{ displayLabel }}</span>
      <svg class="h-4 w-4 text-muted-fg shrink-0 transition-transform" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6" />
      </svg>
    </button>

    <!-- Hidden mirror so the value participates in native form submission -->
    <input v-if="name" type="hidden" :name="name" :value="modelValue ?? ''" />

    <!-- Popover -->
    <Transition name="select-popover">
      <ul
        v-if="open"
        ref="listRef"
        role="listbox"
        class="absolute left-0 right-0 z-30 mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg"
      >
        <li
          v-for="(opt, idx) in options"
          :key="String(opt.value)"
          :data-idx="idx"
          role="option"
          :aria-selected="opt.value === modelValue"
          :aria-disabled="opt.disabled || undefined"
          class="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors cursor-pointer select-none"
          :class="[
            opt.disabled ? 'text-muted-fg/60 cursor-not-allowed' : 'text-fg',
            idx === activeIndex && !opt.disabled ? 'bg-muted' : '',
            opt.value === modelValue ? 'font-medium' : '',
          ]"
          @click="pick(opt)"
          @mouseenter="!opt.disabled && (activeIndex = idx)"
        >
          <span class="truncate">{{ opt.label }}</span>
          <svg
            v-if="opt.value === modelValue"
            class="h-4 w-4 text-primary shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12l5 5 9-12" />
          </svg>
        </li>
        <li v-if="options.length === 0" class="px-3 py-2 text-sm text-muted-fg">
          {{ t('common.noData') }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.select-popover-enter-active,
.select-popover-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.select-popover-enter-from,
.select-popover-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
