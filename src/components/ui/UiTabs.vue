<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

interface Tab {
  id: string
  label: string
}

const props = defineProps<{
  tabs: Tab[]
}>()

const active = defineModel<string>({ default: '' })
const tabRefs = ref<HTMLElement[]>([])
const indicatorStyle = ref<Record<string, string>>({})

function updateIndicator() {
  const idx = props.tabs.findIndex((t) => t.id === active.value)
  const el = tabRefs.value[idx]
  if (el) {
    indicatorStyle.value = {
      left: `${el.offsetLeft}px`,
      width: `${el.offsetWidth}px`,
    }
  }
}

onMounted(() => {
  if (!active.value && props.tabs.length) {
    active.value = props.tabs[0].id
  }
  updateIndicator()
})

watch(active, () => {
  updateIndicator()
})
</script>

<template>
  <div class="relative border-b border-border">
    <div class="flex gap-1">
      <button
        v-for="(tab, i) in tabs"
        :key="tab.id"
        :ref="(el) => { if (el) tabRefs[i] = el as HTMLElement }"
        :class="[
          'relative px-4 py-2.5 text-sm font-medium transition-colors',
          active === tab.id ? 'text-fg' : 'text-muted-fg hover:text-fg',
        ]"
        @click="active = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Indicator -->
    <div
      class="absolute bottom-0 h-0.5 bg-primary rounded-full transition-all duration-200 ease-out"
      :style="indicatorStyle"
    />
  </div>
</template>
