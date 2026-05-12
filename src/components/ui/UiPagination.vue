<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    current?: number
    total?: number
    pageSize?: number
  }>(),
  {
    current: 1,
    total: 0,
    pageSize: 10,
  },
)

const emit = defineEmits<{
  'update:current': [value: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const start = computed(() => (props.current - 1) * props.pageSize + 1)
const end = computed(() => Math.min(props.current * props.pageSize, props.total))

const pages = computed(() => {
  const p: number[] = []
  const maxVisible = 5
  let startPage = Math.max(1, props.current - Math.floor(maxVisible / 2))
  let endPage = startPage + maxVisible - 1

  if (endPage > totalPages.value) {
    endPage = totalPages.value
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    p.push(i)
  }
  return p
})

function goTo(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:current', page)
  }
}
</script>

<template>
  <div class="flex items-center justify-between gap-4 text-sm text-muted-fg">
    <span>
      Showing {{ start }}–{{ end }} of {{ total }} results
    </span>

    <div class="flex items-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        class="flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 hover:bg-muted disabled:opacity-40"
        :disabled="current <= 1"
        @click="goTo(current - 1)"
      >
        <svg class="h-[16px] w-[16px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      <button
        v-for="page in pages"
        :key="page"
        type="button"
        :aria-label="`Go to page ${page}`"
        :aria-current="page === current ? 'page' : undefined"
        class="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors duration-150"
        :class="page === current ? 'bg-fg text-bg font-medium' : 'hover:bg-muted'"
        @click="goTo(page)"
      >
        {{ page }}
      </button>

      <button
        type="button"
        aria-label="Next page"
        class="flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-150 hover:bg-muted disabled:opacity-40"
        :disabled="current >= totalPages"
        @click="goTo(current + 1)"
      >
        <svg class="h-[16px] w-[16px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  </div>
</template>
