<script setup lang="ts">
import { ref, computed, watch, h, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiModal, UiButton, UiCopyButton } from '@/components/ui'
import { useSettingsStore } from '@/stores/settings'
import { getGatewayBaseUrl, type ApiKey } from '@/api/keys'

/**
 * Mirrors sub2api's own "Use this key" modal — different clients want
 * different config files, often in OS-specific shells. The matrix is:
 *
 *   Platform anthropic  → Claude Code (3 shells) + VSCode settings + OpenCode
 *   Platform openai     → Codex CLI (2 OSes) + Codex CLI WebSockets v2 +
 *                          Claude Code (if group.allow_messages_dispatch) +
 *                          OpenCode
 *   Platform gemini     → Gemini CLI (3 shells) + OpenCode
 *   Platform antigravity → Claude Code (over /antigravity) + Gemini CLI +
 *                          OpenCode
 *
 * Every snippet uses the user's REAL API key + base URL, with a Copy button
 * per file. No leaving the modal needed.
 */
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
const platform = computed(() => props.apiKey?.group_platform ?? 'anthropic')
const allowDispatch = computed(() => props.apiKey?.group_allow_messages_dispatch ?? false)

// ─── Icons (inline render fns; no new dep) ─────────────────────────────────
const Apple: Component = {
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
    h('path', { d: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' }),
  ]),
}
const Windows: Component = {
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': 'true' }, [
    h('path', { d: 'M3 12V6.75l6-1.32v6.48L3 12zm17-9v8.75l-10 .15V5.21L20 3zM3 13l6 .09v6.81l-6-1.15V13zm7 .25l10 .15V21l-10-1.91v-5.84z' }),
  ]),
}
const Terminal: Component = {
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'aria-hidden': 'true' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'm6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 17.25V6.75A2.25 2.25 0 0 0 18.75 4.5H5.25A2.25 2.25 0 0 0 3 6.75v10.5A2.25 2.25 0 0 0 5.25 20.25Z' }),
  ]),
}
const Sparkle: Component = {
  render: () => h('svg', { class: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'aria-hidden': 'true' }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z' }),
  ]),
}

interface ClientTab { id: string; label: string; icon: Component }
interface ShellTab { id: string; label: string; icon: Component }
interface FileConfig { path: string; content: string; hint?: string }

// ─── Client tabs depend on platform ────────────────────────────────────────
const clientTabs = computed<ClientTab[]>(() => {
  switch (platform.value) {
    case 'openai': {
      const tabs: ClientTab[] = [
        { id: 'codex', label: 'Codex CLI', icon: Terminal },
        { id: 'codex-ws', label: 'Codex CLI (WS)', icon: Terminal },
      ]
      if (allowDispatch.value) {
        tabs.push({ id: 'claude', label: 'Claude Code', icon: Terminal })
      }
      tabs.push({ id: 'opencode', label: 'OpenCode', icon: Terminal })
      tabs.push({ id: 'curl', label: 'curl / SDK', icon: Terminal })
      return tabs
    }
    case 'gemini':
      return [
        { id: 'gemini', label: 'Gemini CLI', icon: Sparkle },
        { id: 'opencode', label: 'OpenCode', icon: Terminal },
        { id: 'curl', label: 'curl / SDK', icon: Terminal },
      ]
    case 'antigravity':
      return [
        { id: 'claude', label: 'Claude Code', icon: Terminal },
        { id: 'gemini', label: 'Gemini CLI', icon: Sparkle },
        { id: 'opencode', label: 'OpenCode', icon: Terminal },
      ]
    default: // anthropic
      return [
        { id: 'claude', label: 'Claude Code', icon: Terminal },
        { id: 'opencode', label: 'OpenCode', icon: Terminal },
        { id: 'curl', label: 'curl / SDK', icon: Terminal },
      ]
  }
})

const activeClient = ref<string>('claude')
const activeShell = ref<string>('unix')

// Default starting tab depends on platform.
watch(
  () => props.apiKey,
  () => {
    if (!props.apiKey) return
    switch (platform.value) {
      case 'openai': activeClient.value = 'codex'; break
      case 'gemini': activeClient.value = 'gemini'; break
      default: activeClient.value = 'claude'
    }
    activeShell.value = 'unix'
  },
  { immediate: true },
)
watch(activeClient, () => { activeShell.value = 'unix' })

// ─── Shell tabs vary by client ─────────────────────────────────────────────
const codexShellTabs: ShellTab[] = [
  { id: 'unix', label: 'macOS / Linux', icon: Apple },
  { id: 'windows', label: 'Windows', icon: Windows },
]
const envShellTabs: ShellTab[] = [
  { id: 'unix', label: 'macOS / Linux', icon: Apple },
  { id: 'cmd', label: 'Windows CMD', icon: Windows },
  { id: 'powershell', label: 'PowerShell', icon: Windows },
]
const currentShellTabs = computed<ShellTab[]>(() => {
  if (activeClient.value === 'opencode' || activeClient.value === 'curl') return []
  if (activeClient.value === 'codex' || activeClient.value === 'codex-ws') return codexShellTabs
  return envShellTabs
})

// ─── Snippet generators ────────────────────────────────────────────────────

// Strip trailing /v1 and ensure single /v1 suffix
function ensureV1(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1'
}
function antigravityBase(url: string): string {
  return ensureV1(url.replace(/\/+$/, '').replace(/\/v1$/, '') + '/antigravity')
}
function geminiV1Beta(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/v1(?:beta)?$/, '') + '/v1beta'
}

function claudeCodeFiles(base: string, key: string): FileConfig[] {
  const path = activeShell.value === 'unix' ? 'Terminal'
    : activeShell.value === 'cmd' ? 'Command Prompt' : 'PowerShell'
  const content = activeShell.value === 'unix'
    ? `export ANTHROPIC_BASE_URL="${base}"
export ANTHROPIC_AUTH_TOKEN="${key}"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
    : activeShell.value === 'cmd'
      ? `set ANTHROPIC_BASE_URL=${base}
set ANTHROPIC_AUTH_TOKEN=${key}
set CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
      : `$env:ANTHROPIC_BASE_URL="${base}"
$env:ANTHROPIC_AUTH_TOKEN="${key}"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
  const settingsPath = activeShell.value === 'unix'
    ? '~/.claude/settings.json'
    : '%userprofile%\\.claude\\settings.json'
  const settingsContent = `{
  "env": {
    "ANTHROPIC_BASE_URL": "${base}",
    "ANTHROPIC_AUTH_TOKEN": "${key}",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
}`
  return [
    { path, content },
    { path: settingsPath, content: settingsContent, hint: 'VSCode Claude Code' },
  ]
}

function geminiCliFiles(base: string, key: string): FileConfig[] {
  const model = 'gemini-2.5-pro'
  const note = t('keys.connect.modelComment')
  const path = activeShell.value === 'unix' ? 'Terminal'
    : activeShell.value === 'cmd' ? 'Command Prompt' : 'PowerShell'
  const content = activeShell.value === 'unix'
    ? `export GOOGLE_GEMINI_BASE_URL="${base}"
export GEMINI_API_KEY="${key}"
export GEMINI_MODEL="${model}"  # ${note}`
    : activeShell.value === 'cmd'
      ? `set GOOGLE_GEMINI_BASE_URL=${base}
set GEMINI_API_KEY=${key}
set GEMINI_MODEL=${model}
REM ${note}`
      : `$env:GOOGLE_GEMINI_BASE_URL="${base}"
$env:GEMINI_API_KEY="${key}"
$env:GEMINI_MODEL="${model}"  # ${note}`
  return [{ path, content }]
}

function codexFiles(base: string, key: string, websocketsV2: boolean): FileConfig[] {
  const configDir = activeShell.value === 'windows' ? '%userprofile%\\.codex' : '~/.codex'
  const wsLines = websocketsV2
    ? `
supports_websockets = true
requires_openai_auth = true

[features]
responses_websockets_v2 = true`
    : `
requires_openai_auth = true`
  const config = `model_provider = "OpenAI"
model = "gpt-5.4"
review_model = "gpt-5.4"
model_reasoning_effort = "xhigh"
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true
model_context_window = 1000000
model_auto_compact_token_limit = 900000

[model_providers.OpenAI]
name = "OpenAI"
base_url = "${base}"
wire_api = "responses"${wsLines}`
  const auth = `{
  "OPENAI_API_KEY": "${key}"
}`
  return [
    { path: `${configDir}/config.toml`, content: config, hint: t('keys.connect.codexConfigHint') },
    { path: `${configDir}/auth.json`, content: auth },
  ]
}

function openCodeFile(provider: string, base: string, key: string): FileConfig {
  const json = {
    provider: {
      [provider]: {
        options: { baseURL: base, apiKey: key },
      },
    },
    $schema: 'https://opencode.ai/config.json',
  }
  return {
    path: 'opencode.json',
    content: JSON.stringify(json, null, 2),
    hint: t('keys.connect.openCodeHint'),
  }
}

function curlAndSdkFiles(base: string, key: string): FileConfig[] {
  if (platform.value === 'openai') {
    return [
      {
        path: 'curl',
        content: `curl ${base}/chat/completions \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
      },
      {
        path: 'Python · openai',
        content: `# pip install openai
from openai import OpenAI
client = OpenAI(base_url="${base}", api_key="${key}")
resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
)
print(resp.choices[0].message.content)`,
      },
    ]
  }
  if (platform.value === 'gemini') {
    const geminiBase = geminiV1Beta(base)
    return [
      {
        path: 'curl',
        content: `curl ${geminiBase}/models/gemini-2.5-pro:generateContent \\
  -H "x-goog-api-key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"parts": [{"text": "Hello"}]}]
  }'`,
      },
    ]
  }
  // anthropic / antigravity
  return [
    {
      path: 'curl',
      content: `curl ${base}/messages \\
  -H "x-api-key: ${key}" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-4",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'`,
    },
    {
      path: 'Python · anthropic',
      content: `# pip install anthropic
from anthropic import Anthropic
client = Anthropic(base_url="${base}", api_key="${key}")
msg = client.messages.create(
    model="claude-sonnet-4",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
print(msg.content[0].text)`,
    },
  ]
}

// Files for the current (platform, client, shell) tuple.
const currentFiles = computed<FileConfig[]>(() => {
  const base = baseUrl.value
  const key = props.apiKey?.key ?? '$AMODEL_KEY'

  if (activeClient.value === 'opencode') {
    const provider =
      platform.value === 'openai' ? 'openai'
      : platform.value === 'gemini' ? 'gemini'
      : platform.value === 'antigravity' ? 'anthropic'
      : 'anthropic'
    const providerBase =
      platform.value === 'gemini' ? geminiV1Beta(base)
      : platform.value === 'antigravity' ? antigravityBase(base)
      : ensureV1(base)
    return [openCodeFile(provider, providerBase, key)]
  }
  if (activeClient.value === 'curl') {
    return curlAndSdkFiles(base, key)
  }
  if (activeClient.value === 'gemini') {
    const geminiBase = platform.value === 'antigravity' ? geminiV1Beta(antigravityBase(base).replace(/\/v1$/, '')) : geminiV1Beta(base)
    return geminiCliFiles(geminiBase, key)
  }
  if (activeClient.value === 'codex') {
    return codexFiles(base, key, false)
  }
  if (activeClient.value === 'codex-ws') {
    return codexFiles(base, key, true)
  }
  // claude code
  const claudeBase = platform.value === 'antigravity' ? antigravityBase(base) : base
  return claudeCodeFiles(claudeBase, key)
})

const keyVisible = ref(false)
watch(open, (v) => { if (!v) keyVisible.value = false })
const displayedKey = computed(() => {
  const k = props.apiKey?.key ?? ''
  if (!k) return ''
  if (keyVisible.value) return k
  if (k.length < 14) return k
  return `${k.slice(0, 7)}…${k.slice(-4)}`
})
</script>

<template>
  <UiModal v-model="open" :title="t('keys.connect.title')">
    <div class="space-y-5">
      <!-- Base URL + API key (always visible across all tabs) -->
      <div class="grid grid-cols-1 gap-3">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.connect.baseUrl') }}</label>
          <div class="flex items-center gap-2 rounded-md border border-input bg-muted/30 px-3 py-2">
            <code class="flex-1 font-mono text-sm text-fg truncate">{{ baseUrl }}</code>
            <UiCopyButton :text="baseUrl" />
          </div>
        </div>
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
      </div>

      <!-- Client tabs (Claude Code / Codex / Gemini / OpenCode / curl) -->
      <div class="-mx-1 px-1 overflow-x-auto">
        <div class="flex gap-1 border-b border-border min-w-max">
          <button
            v-for="tab in clientTabs"
            :key="tab.id"
            type="button"
            class="flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors duration-150"
            :class="tab.id === activeClient
              ? 'border-fg text-fg font-medium'
              : 'border-transparent text-muted-fg hover:text-fg'"
            @click="activeClient = tab.id"
          >
            <component :is="tab.icon" />
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Shell tabs (only for env-var or codex clients) -->
      <div v-if="currentShellTabs.length > 0" class="flex gap-1 flex-wrap">
        <button
          v-for="tab in currentShellTabs"
          :key="tab.id"
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
          :class="tab.id === activeShell
            ? 'bg-fg text-bg'
            : 'text-muted-fg hover:bg-muted'"
          @click="activeShell = tab.id"
        >
          <component :is="tab.icon" />
          {{ tab.label }}
        </button>
      </div>

      <!-- File panels — one per config file the current client needs -->
      <div class="space-y-3">
        <div v-for="(file, i) in currentFiles" :key="`${activeClient}-${activeShell}-${i}`">
          <p v-if="file.hint" class="mb-1 text-[11px] text-amber leading-relaxed">⚠ {{ file.hint }}</p>
          <div class="relative rounded-md border border-border bg-card overflow-hidden">
            <div class="flex items-center justify-between border-b border-border px-3 py-1.5">
              <span class="font-mono text-[11px] text-muted-fg truncate">{{ file.path }}</span>
              <UiCopyButton :text="file.content" />
            </div>
            <pre class="p-3 sm:p-4 font-mono text-[11px] sm:text-[12px] leading-relaxed text-fg overflow-x-auto max-h-64"><code>{{ file.content }}</code></pre>
          </div>
        </div>
      </div>

      <!-- Footer note: enumerates real endpoints + platform reminder -->
      <p class="text-[11px] text-muted-fg leading-relaxed border-t border-border pt-3">
        {{ t('keys.connect.endpointsHint') }}
      </p>
    </div>

    <template #footer>
      <UiButton variant="primary" @click="open = false">{{ t('common.confirm') }}</UiButton>
    </template>
  </UiModal>
</template>
