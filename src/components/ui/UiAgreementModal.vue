<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiButton, UiModal } from '@/components/ui'
import { renderMarkdown } from '@/utils/markdown'

/**
 * Modal that displays one of sub2api's `login_agreement_documents`. The
 * upstream shape is `{ id, title, content_md }`, where `content_md` is
 * Markdown text — NOT a URL. We render it inline so users never leave the
 * registration page.
 *
 * The list of documents is paged: clicking a tab in the header switches
 * between them so a single modal serves all four standard docs (terms,
 * usage policy, supported regions, service-specific terms).
 */
interface AgreementDoc {
  id?: string
  title?: string
  content_md?: string
  // Tolerate older field names from non-conformant deployments.
  name?: string
  url?: string
}

const props = defineProps<{
  modelValue: boolean
  documents: AgreementDoc[]
  /** id of the doc to open initially. */
  initialId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const activeIdx = ref(0)

// Reset to the requested initial document each time the modal opens.
// `watch(open)` would also work but `computed` covers the typical usage
// where the caller flips the modelValue from false to true.
function syncInitial() {
  if (!props.initialId) return
  const idx = props.documents.findIndex((d) => d.id === props.initialId)
  if (idx >= 0) activeIdx.value = idx
}

const active = computed(() => props.documents[activeIdx.value])
const html = computed(() => renderMarkdown(active.value?.content_md ?? ''))
const isEmpty = computed(() => !html.value)
</script>

<template>
  <UiModal v-model="open" :title="t('agreement.modalTitle')" @update:model-value="$event && syncInitial()">
    <!-- Tab strip if multiple docs -->
    <div v-if="documents.length > 1" class="-mt-2 mb-4 flex gap-4 border-b border-border overflow-x-auto">
      <button
        v-for="(doc, i) in documents"
        :key="doc.id ?? i"
        type="button"
        class="pb-2 text-sm whitespace-nowrap transition-colors duration-150 border-b-2"
        :class="i === activeIdx
          ? 'border-fg text-fg font-medium'
          : 'border-transparent text-muted-fg hover:text-fg'"
        @click="activeIdx = i"
      >
        {{ doc.title || doc.name || `Document ${i + 1}` }}
      </button>
    </div>

    <!-- Rendered Markdown content. v-html is safe here because renderMarkdown
         escapes input before injecting structural tags and constrains link
         hrefs to http(s) / mailto. -->
    <div v-if="!isEmpty" class="prose-amodel max-h-[60vh] overflow-y-auto text-sm leading-relaxed text-fg" v-html="html"></div>

    <!-- Placeholder for the (very common) case where the admin enabled the
         flag but hasn't published content yet. Better than a silent empty
         dialog. -->
    <p v-else class="text-sm text-muted-fg italic">{{ t('agreement.empty') }}</p>

    <template #footer>
      <UiButton variant="primary" @click="open = false">{{ t('common.confirm') }}</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
/* Light typography for legal text. Generic-enough class names that we can
 * later swap to @tailwindcss/typography without changing markup. */
.prose-amodel :deep(h3) { font-size: 1.05rem; font-weight: 500; margin: 1.25rem 0 0.5rem; }
.prose-amodel :deep(h4) { font-size: 0.95rem; font-weight: 500; margin: 1rem 0 0.4rem; }
.prose-amodel :deep(h5) { font-size: 0.9rem; font-weight: 500; margin: 0.85rem 0 0.35rem; }
.prose-amodel :deep(p) { margin: 0 0 0.75rem; }
.prose-amodel :deep(ul) { margin: 0 0 0.75rem 1.25rem; list-style: disc; }
.prose-amodel :deep(ol) { margin: 0 0 0.75rem 1.25rem; list-style: decimal; }
.prose-amodel :deep(li) { margin-bottom: 0.25rem; }
.prose-amodel :deep(a) { color: var(--color-primary); text-decoration: underline; }
.prose-amodel :deep(hr) { margin: 1rem 0; border-color: var(--color-border); }
.prose-amodel :deep(strong) { font-weight: 600; }
</style>
