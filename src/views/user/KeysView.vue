<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiCard, UiButton, UiTable, UiStatusDot, UiBadge, UiCopyButton, UiModal, UiInput, UiSelect } from '@/components/ui'
import KeyEditModal from '@/components/keys/KeyEditModal.vue'
import KeyConnectModal from '@/components/keys/KeyConnectModal.vue'
import { useToast, useConfirm } from '@/composables'
import { getKeys, createKey, deleteKey } from '@/api/keys'
import type { ApiKey } from '@/api/keys'
import client from '@/api/client'
import { unwrap } from '@/api/_util'

const keys = ref<ApiKey[]>([])
const loading = ref(true)
const toast = useToast()
const { confirm } = useConfirm()
const { t } = useI18n()

// Create modal state
const showCreateModal = ref(false)
const creating = ref(false)
const newKeyName = ref('')
const newKeyGroupId = ref<number>(0)
const availableGroups = ref<{ id: number; name: string }[]>([])

// Edit + Connect modal state
const showEditModal = ref(false)
const showConnectModal = ref(false)
const activeKey = ref<ApiKey | null>(null)

async function openEdit(k: ApiKey) {
  // Load groups before opening so the select isn't empty in the modal.
  await loadGroups()
  activeKey.value = k
  showEditModal.value = true
}

function openConnect(k: ApiKey) {
  activeKey.value = k
  showConnectModal.value = true
}

function onKeySaved(updated: ApiKey) {
  const idx = keys.value.findIndex((k) => k.id === updated.id)
  if (idx >= 0) keys.value[idx] = updated
}

onMounted(async () => {
  try {
    keys.value = await getKeys()
  } catch {
    toast.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
})

async function loadGroups() {
  if (availableGroups.value.length > 0) return
  try {
    // sub2api: /groups/available is user-scoped (no admin auth required) and
    // returns a bare list with each group's id + name + platform + status.
    const body = unwrap<Array<{ id: number; name: string }> | { items?: Array<{ id: number; name: string }> }>(
      await client.get('/groups/available'),
    )
    const items = Array.isArray(body) ? body : body?.items ?? []
    availableGroups.value = items.map((g) => ({ id: g.id, name: g.name }))
    if (availableGroups.value.length > 0 && newKeyGroupId.value === 0) {
      newKeyGroupId.value = availableGroups.value[0].id
    }
  } catch {
    // Fallback groups if upstream is unreachable
    availableGroups.value = [
      { id: 2, name: 'idk' },
      { id: 3, name: 'pro20x 1' },
      { id: 4, name: '20x' },
      { id: 5, name: 'free' },
    ]
    newKeyGroupId.value = 5
  }
}

async function handleDelete(key: ApiKey) {
  const confirmed = await confirm({
    title: t('keys.toast.deleteTitle'),
    message: t('keys.toast.deleteMsg', { name: key.name || key.id }),
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await deleteKey(key.id)
    keys.value = keys.value.filter((k) => k.id !== key.id)
    toast.success(t('keys.toast.deleted'))
  } catch {
    toast.error(t('keys.toast.deleteFailed'))
  }
}

async function openCreateModal() {
  newKeyName.value = ''
  await loadGroups()
  showCreateModal.value = true
}

async function handleCreate() {
  if (!newKeyName.value.trim()) {
    toast.error(t('keys.toast.createFailed'))
    return
  }
  creating.value = true
  try {
    const newKey = await createKey({
      name: newKeyName.value.trim(),
      group_id: newKeyGroupId.value,
    })
    keys.value.unshift(newKey)
    showCreateModal.value = false
    newKeyName.value = ''
    toast.success(t('keys.toast.created'))
  } catch {
    toast.error(t('keys.toast.createFailed'))
  } finally {
    creating.value = false
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatLastUsed(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('common.timeAgo.justNow')
  if (mins < 60) return t('common.timeAgo.minute', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('common.timeAgo.hour', { n: hours })
  const days = Math.floor(hours / 24)
  return t('common.timeAgo.day', { n: days })
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return key
  return key.slice(0, 7) + '...' + key.slice(-4)
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('keys.eyebrow') }}</p>
        <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('keys.title') }}</h1>
        <p class="mt-2 text-sm text-muted-fg">{{ t('keys.subtitle') }}</p>
      </div>
      <UiButton variant="primary" @click="openCreateModal">{{ t('keys.create') }}</UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-muted animate-pulse" />
    </div>

    <!-- Empty -->
    <UiCard v-else-if="keys.length === 0" flat class="py-12 text-center text-sm text-muted-fg">
      {{ t('keys.empty') }}
    </UiCard>

    <!-- Desktop table (md+) -->
    <UiCard v-else flat class="hidden md:block">
      <UiTable>
        <thead>
          <tr class="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <th class="px-4 py-3 font-medium">{{ t('keys.cols.name') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('keys.cols.key') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('keys.cols.group') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('keys.cols.status') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('keys.cols.used') }}</th>
            <th class="px-4 py-3 font-medium">{{ t('keys.cols.created') }}</th>
            <th class="px-4 py-3 font-medium text-right" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(key, idx) in keys" :key="key.id" class="border-b border-border last:border-0 row-hover stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
            <td class="px-4 py-3 text-sm font-medium">{{ key.name || '—' }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <code class="font-mono text-sm text-muted-fg">{{ maskKey(key.key) }}</code>
                <UiCopyButton :text="key.key" />
              </div>
            </td>
            <td class="px-4 py-3">
              <UiBadge variant="gray">{{ key.group_name }}</UiBadge>
            </td>
            <td class="px-4 py-3">
              <UiStatusDot :status="key.status === 'active' ? 'online' : 'disabled'" />
            </td>
            <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatLastUsed(key.last_used_at) }}</td>
            <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(key.created_at) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-0.5">
                <UiButton variant="ghost" size="sm" @click="openConnect(key)">
                  {{ t('keys.actions.use') }}
                </UiButton>
                <UiButton variant="ghost" size="sm" @click="openEdit(key)">
                  {{ t('common.actions.edit') }}
                </UiButton>
                <UiButton variant="ghost" size="sm" class="text-destructive" @click="handleDelete(key)">
                  {{ t('common.actions.delete') }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>

    <!-- Mobile cards (< md) — a 7-column table on a 360 px screen is
         basically unusable; render each key as a stacked card instead. -->
    <div v-if="!loading && keys.length > 0" class="md:hidden space-y-3">
      <UiCard v-for="(key, idx) in keys" :key="key.id" class="stagger-item" :style="{ animationDelay: `${idx * 50}ms` }">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium truncate">{{ key.name || '—' }}</p>
              <UiStatusDot :status="key.status === 'active' ? 'online' : 'disabled'" />
            </div>
            <div class="mt-1 flex items-center gap-2">
              <code class="font-mono text-xs text-muted-fg truncate">{{ maskKey(key.key) }}</code>
              <UiCopyButton :text="key.key" />
            </div>
          </div>
          <UiBadge variant="gray" class="shrink-0">{{ key.group_name }}</UiBadge>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-fg">
          <div>
            <span class="uppercase tracking-[0.12em]">{{ t('keys.cols.used') }}</span>
            <span class="ml-2 font-mono">{{ formatLastUsed(key.last_used_at) }}</span>
          </div>
          <div>
            <span class="uppercase tracking-[0.12em]">{{ t('keys.cols.created') }}</span>
            <span class="ml-2 font-mono">{{ formatDate(key.created_at) }}</span>
          </div>
        </div>

        <div class="mt-3 flex items-center gap-1 border-t border-border pt-2 -mx-1">
          <UiButton variant="ghost" size="sm" class="flex-1" @click="openConnect(key)">
            {{ t('keys.actions.use') }}
          </UiButton>
          <UiButton variant="ghost" size="sm" class="flex-1" @click="openEdit(key)">
            {{ t('common.actions.edit') }}
          </UiButton>
          <UiButton variant="ghost" size="sm" class="flex-1 text-destructive" @click="handleDelete(key)">
            {{ t('common.actions.delete') }}
          </UiButton>
        </div>
      </UiCard>
    </div>

    <!-- Create Key Modal -->
    <UiModal v-model="showCreateModal" :title="t('keys.modal.createTitle')">
      <div class="space-y-4">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.modal.nameLabel') }}</label>
          <UiInput v-model="newKeyName" :placeholder="t('keys.modal.namePlaceholder')" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('keys.modal.groupLabel') }}</label>
          <UiSelect
            v-model="newKeyGroupId"
            :options="availableGroups.map((g) => ({ value: g.id, label: g.name }))"
            :placeholder="t('keys.modal.groupLabel')"
          />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showCreateModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" :disabled="creating" @click="handleCreate">
          {{ creating ? t('common.loading') : t('keys.modal.submit') }}
        </UiButton>
      </template>
    </UiModal>

    <!-- Edit + Use modals -->
    <KeyEditModal
      v-model="showEditModal"
      :api-key="activeKey"
      :groups="availableGroups"
      @saved="onKeySaved"
    />
    <KeyConnectModal
      v-model="showConnectModal"
      :api-key="activeKey"
    />
  </div>
</template>
