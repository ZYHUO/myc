<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiModal, UiButton, UiInput, UiSelect } from '@/components/ui'
import { useToast } from '@/composables'
import { updateKey, type ApiKey, type UpdateKeyPayload } from '@/api/keys'

const props = defineProps<{
  modelValue: boolean
  apiKey: ApiKey | null
  groups: { id: number; name: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  saved: [key: ApiKey]
}>()

const { t } = useI18n()
const toast = useToast()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// Local form state — copied off `apiKey` on each open so cancelling doesn't
// mutate the original row. We use strings everywhere a number is allowed
// because <input type="number"> binds strings and we want a controlled
// experience for "clear field" cases.
const name = ref('')
const groupId = ref(0)
const status = ref<'active' | 'inactive'>('active')
const expiresAt = ref('')                 // datetime-local form
const quota = ref('')                     // empty → no change
const rate5h = ref('')
const rate1d = ref('')
const rate7d = ref('')
const ipWhitelist = ref('')               // newline-separated user input
const ipBlacklist = ref('')
const resetQuota = ref(false)
const resetRateLimitUsage = ref(false)
const saving = ref(false)

/** ISO 8601 (with tz) → value usable by `<input type="datetime-local">`. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // Strip seconds + milliseconds + TZ offset; datetime-local wants
  // YYYY-MM-DDTHH:MM in the user's local zone.
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(s: string): string {
  // datetime-local → ISO 8601. `new Date()` parses the local-time string
  // and toISOString() produces the canonical UTC form sub2api wants.
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString()
}

watch(
  () => props.apiKey,
  (k) => {
    if (!k) return
    name.value = k.name
    groupId.value = k.group_id
    status.value = (k.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
    expiresAt.value = toLocalInput(k.expires_at)
    quota.value = k.quota > 0 ? String(k.quota) : ''
    rate5h.value = k.rate_limit_5h > 0 ? String(k.rate_limit_5h) : ''
    rate1d.value = k.rate_limit_1d > 0 ? String(k.rate_limit_1d) : ''
    rate7d.value = k.rate_limit_7d > 0 ? String(k.rate_limit_7d) : ''
    ipWhitelist.value = (k.ip_whitelist ?? []).join('\n')
    ipBlacklist.value = (k.ip_blacklist ?? []).join('\n')
    resetQuota.value = false
    resetRateLimitUsage.value = false
  },
  { immediate: true },
)

const statusOptions = computed(() => [
  { value: 'active' as const, label: t('common.status.active') },
  { value: 'inactive' as const, label: t('common.status.paused') },
])

function parseNumber(v: string): number | undefined {
  if (v === '' || v === null) return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function splitIPs(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function handleSave() {
  if (!props.apiKey) return
  saving.value = true
  try {
    // Only send fields the user actually touched. The backend treats absent
    // fields as "no change", but we send the same value (name/group/status)
    // every time because the form always shows them and the user might have
    // edited them.
    const payload: UpdateKeyPayload = {
      name: name.value.trim(),
      group_id: groupId.value,
      status: status.value,
      ip_whitelist: splitIPs(ipWhitelist.value) || [],
      ip_blacklist: splitIPs(ipBlacklist.value) || [],
    }
    const q = parseNumber(quota.value)
    if (q !== undefined) payload.quota = q
    else payload.quota = 0 // explicit "no limit"
    const r5 = parseNumber(rate5h.value); if (r5 !== undefined) payload.rate_limit_5h = r5; else payload.rate_limit_5h = 0
    const r1 = parseNumber(rate1d.value); if (r1 !== undefined) payload.rate_limit_1d = r1; else payload.rate_limit_1d = 0
    const r7 = parseNumber(rate7d.value); if (r7 !== undefined) payload.rate_limit_7d = r7; else payload.rate_limit_7d = 0
    if (expiresAt.value) payload.expires_at = fromLocalInput(expiresAt.value)
    else payload.expires_at = '' // sub2api treats empty string as "clear expiration"
    if (resetQuota.value) payload.reset_quota = true
    if (resetRateLimitUsage.value) payload.reset_rate_limit_usage = true

    const updated = await updateKey(props.apiKey.id, payload)
    toast.success(t('keys.toast.updated'))
    emit('saved', updated)
    open.value = false
  } catch (e) {
    const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message
    toast.error(msg || t('keys.toast.updateFailed'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal v-model="open" :title="t('keys.editTitle')">
    <div class="space-y-5">
      <!-- Name + Group + Status -->
      <div>
        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.modal.nameLabel') }}</label>
        <UiInput v-model="name" :placeholder="t('keys.modal.namePlaceholder')" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.modal.groupLabel') }}</label>
          <UiSelect v-model="groupId" :options="groups.map((g) => ({ value: g.id, label: g.name }))" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.cols.status') }}</label>
          <UiSelect v-model="status" :options="statusOptions" />
        </div>
      </div>

      <!-- Expires + Quota -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.fields.expiresAt') }}</label>
          <input
            v-model="expiresAt"
            type="datetime-local"
            class="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <p class="mt-1 text-[11px] text-muted-fg">{{ t('keys.fields.expiresHint') }}</p>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.fields.quota') }}</label>
          <UiInput v-model="quota" type="number" :placeholder="t('keys.fields.zeroUnlimited')" :show-password-toggle="false" />
        </div>
      </div>

      <!-- Reset usage -->
      <label v-if="apiKey && apiKey.quota_used > 0" class="flex items-center gap-2 text-sm text-muted-fg">
        <input v-model="resetQuota" type="checkbox" class="h-4 w-4 rounded border-input accent-primary" />
        <span>{{ t('keys.fields.resetQuota', { used: apiKey.quota_used.toFixed(2) }) }}</span>
      </label>

      <!-- Rate limits -->
      <div>
        <p class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('keys.fields.rateLimits') }}</p>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-[11px] text-muted-fg mb-1 block">{{ t('keys.fields.rate5h') }}</label>
            <UiInput v-model="rate5h" type="number" placeholder="0" :show-password-toggle="false" />
          </div>
          <div>
            <label class="text-[11px] text-muted-fg mb-1 block">{{ t('keys.fields.rate1d') }}</label>
            <UiInput v-model="rate1d" type="number" placeholder="0" :show-password-toggle="false" />
          </div>
          <div>
            <label class="text-[11px] text-muted-fg mb-1 block">{{ t('keys.fields.rate7d') }}</label>
            <UiInput v-model="rate7d" type="number" placeholder="0" :show-password-toggle="false" />
          </div>
        </div>
        <p class="mt-1.5 text-[11px] text-muted-fg">{{ t('keys.fields.zeroUnlimited') }}</p>
        <label class="flex items-center gap-2 mt-2 text-sm text-muted-fg">
          <input v-model="resetRateLimitUsage" type="checkbox" class="h-4 w-4 rounded border-input accent-primary" />
          <span>{{ t('keys.fields.resetRateUsage') }}</span>
        </label>
      </div>

      <!-- IP allow + block -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.fields.ipWhitelist') }}</label>
          <textarea
            v-model="ipWhitelist"
            rows="3"
            :placeholder="t('keys.fields.ipPlaceholder')"
            class="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-mono text-fg placeholder:text-muted-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.fields.ipBlacklist') }}</label>
          <textarea
            v-model="ipBlacklist"
            rows="3"
            :placeholder="t('keys.fields.ipPlaceholder')"
            class="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-mono text-fg placeholder:text-muted-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="open = false">{{ t('common.cancel') }}</UiButton>
      <UiButton variant="primary" :disabled="saving" @click="handleSave">
        {{ saving ? t('common.loading') : t('common.actions.save') }}
      </UiButton>
    </template>
  </UiModal>
</template>
