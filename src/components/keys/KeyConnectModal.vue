<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiModal, UiButton, UiCopyButton } from '@/components/ui'
import { useSettingsStore } from '@/stores/settings'
import { getGatewayBaseUrl, type ApiKey } from '@/api/keys'

const props = defineProps<{
  modelValue: boolean
  apiKey: ApiKey | null
}>()

const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const { t } = useI18n()
const settings = useSettingsStore()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const baseUrl = computed(() => getGatewayBaseUrl(settings.settings.api_base_url))
const keyVisible = ref(false)

watch(open, (v) => {
  if (!v) keyVisible.value = false
})

const displayedKey = computed(() => {
  const k = props.apiKey?.key ?? ''
  if (!k) return ''
  if (keyVisible.value) return k
  if (k.length < 14) return k
  return `${k.slice(0, 7)}…${k.slice(-4)}`
})

// SDK / client snippets. Picked the four sub2api clients we know are widely
// in use: Anthropic curl, OpenAI curl, Anthropic Python, OpenAI Python.
// Each snippet uses literal $AMODEL_KEY placeholders so the user can paste
// + export and the secret never ends up in their shell history.
const platform = computed(() => props.apiKey?.group_name?.toLowerCase() ?? '')

// Tab id → label + body builder.
type Tab = {
  id: string
  label: string
  body: (base: string, keyStr: string) => string
  /** Hint string for the right-rail under the snippet. */
  note?: string
}

const tabs = computed<Tab[]>(() => [
  {
    id: 'anthropic-curl',
    label: 'curl · Anthropic',
    body: (base, k) => `curl ${base}/messages \\
  -H "x-api-key: ${k}" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-4",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
  },
  {
    id: 'openai-curl',
    label: 'curl · OpenAI',
    body: (base, k) => `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
  },
  {
    id: 'anthropic-py',
    label: 'Python · anthropic',
    body: (base, k) => `# pip install anthropic
from anthropic import Anthropic

client = Anthropic(
    base_url="${base}",
    api_key="${k}",
)

msg = client.messages.create(
    model="claude-sonnet-4",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
print(msg.content[0].text)`,
  },
  {
    id: 'openai-py',
    label: 'Python · openai',
    body: (base, k) => `# pip install openai
from openai import OpenAI

client = OpenAI(
    base_url="${base}",
    api_key="${k}",
)

resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)`,
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    body: (base, k) => `# In your shell rc (~/.bashrc, ~/.zshrc, or equivalent):
export ANTHROPIC_BASE_URL="${base}"
export ANTHROPIC_API_KEY="${k}"

# Then run \`claude\` normally — the CLI picks the env vars up
# without any extra config.`,
    note: 'Claude Code reads ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY from the environment.',
  },
])

// Initial tab depends on the key's group platform — Anthropic keys land
// on the curl Anthropic snippet first, OpenAI keys on the OpenAI one.
const activeId = ref(tabs.value[0].id)
watch(
  () => props.apiKey,
  () => {
    if (platform.value.includes('openai') || platform.value.includes('gpt')) {
      activeId.value = 'openai-curl'
    } else {
      activeId.value = 'anthropic-curl'
    }
  },
)

const activeBody = computed(() => {
  const tab = tabs.value.find((t) => t.id === activeId.value) ?? tabs.value[0]
  return tab.body(baseUrl.value, props.apiKey?.key ?? '$AMODEL_KEY')
})
const activeNote = computed(() => tabs.value.find((t) => t.id === activeId.value)?.note)
</script>

<template>
  <UiModal v-model="open" :title="t('keys.connect.title')">
    <div class="space-y-5">
      <!-- Base URL row -->
      <div>
        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.connect.baseUrl') }}</label>
        <div class="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
          <code class="flex-1 font-mono text-sm text-fg truncate">{{ baseUrl }}</code>
          <UiCopyButton :text="baseUrl" />
        </div>
        <p class="mt-1.5 text-[11px] text-muted-fg">{{ t('keys.connect.baseUrlHint') }}</p>
      </div>

      <!-- API Key row, with show/hide toggle -->
      <div>
        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.connect.apiKey') }}</label>
        <div class="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
          <code class="flex-1 font-mono text-sm text-fg truncate" :class="{ 'tracking-wider': !keyVisible }">{{ displayedKey }}</code>
          <button
            type="button"
            class="text-xs text-muted-fg hover:text-fg transition-colors px-2"
            @click="keyVisible = !keyVisible"
          >
            {{ keyVisible ? t('common.actions.hide') : t('common.actions.show') }}
          </button>
          <UiCopyButton :text="apiKey?.key ?? ''" />
        </div>
      </div>

      <!-- Snippet tabs -->
      <div>
        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.connect.useIt') }}</label>
        <div class="flex gap-1 flex-wrap mb-2">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
            :class="tab.id === activeId
              ? 'bg-fg text-bg'
              : 'text-muted-fg hover:bg-muted'"
            @click="activeId = tab.id"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="relative rounded-md border border-border bg-card overflow-hidden">
          <pre class="font-mono text-[12px] leading-relaxed text-fg overflow-x-auto p-4 max-h-72"><code>{{ activeBody }}</code></pre>
          <div class="absolute top-2 right-2">
            <UiCopyButton :text="activeBody" />
          </div>
        </div>
        <p v-if="activeNote" class="mt-2 text-[11px] text-muted-fg leading-relaxed">{{ activeNote }}</p>
      </div>

      <p class="text-[11px] text-muted-fg leading-relaxed border-t border-border pt-3">
        {{ t('keys.connect.endpointsHint') }}
      </p>
    </div>

    <template #footer>
      <UiButton variant="primary" @click="open = false">{{ t('common.confirm') }}</UiButton>
    </template>
  </UiModal>
</template>
