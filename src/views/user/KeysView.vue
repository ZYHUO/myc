<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UiCard, UiButton, UiTable, UiStatusDot, UiBadge, UiCopyButton, UiModal, UiInput } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { getKeys, createKey, deleteKey } from '@/api/keys'
import type { ApiKey } from '@/api/keys'
import client from '@/api/client'
import { unwrap } from '@/api/_util'

const keys = ref<ApiKey[]>([])
const loading = ref(true)
const toast = useToast()
const { confirm } = useConfirm()

// Create modal state
const showCreateModal = ref(false)
const creating = ref(false)
const newKeyName = ref('')
const newKeyGroupId = ref<number>(0)
const availableGroups = ref<{ id: number; name: string }[]>([])

onMounted(async () => {
  try {
    keys.value = await getKeys()
  } catch {
    toast.error('Failed to load API keys')
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

async function handleDelete(id: string) {
  const confirmed = await confirm({
    title: 'Delete API Key',
    message: 'Are you sure you want to delete this key? This action cannot be undone.',
    variant: 'danger',
  })
  if (!confirmed) return
  try {
    await deleteKey(id)
    keys.value = keys.value.filter((k) => k.id !== id)
    toast.success('Key deleted successfully')
  } catch {
    toast.error('Failed to delete key')
  }
}

async function openCreateModal() {
  newKeyName.value = ''
  await loadGroups()
  showCreateModal.value = true
}

async function handleCreate() {
  if (!newKeyName.value.trim()) {
    toast.error('Please enter a key name')
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
    toast.success('Key created successfully')
  } catch {
    toast.error('Failed to create key')
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
  if (!iso) return 'Never'
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function maskKey(key: string): string {
  if (!key || key.length < 12) return key
  return key.slice(0, 7) + '...' + key.slice(-4)
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">API KEYS</p>
        <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Your keys</h1>
        <p class="mt-2 text-sm text-muted-fg">{{ keys.length }} key{{ keys.length !== 1 ? 's' : '' }} total</p>
      </div>
      <UiButton variant="primary" @click="openCreateModal">Create key</UiButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-muted animate-pulse" />
    </div>

    <!-- Keys Table -->
    <UiCard v-else flat>
      <UiTable>
        <thead>
          <tr class="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Key</th>
            <th class="px-4 py-3 font-medium">Group</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Last Used</th>
            <th class="px-4 py-3 font-medium">Created</th>
            <th class="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(key, idx) in keys" :key="key.id" class="border-b border-border last:border-0 row-hover stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
            <td class="px-4 py-3 text-sm font-medium">{{ key.name || '--' }}</td>
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
              <div class="flex items-center justify-end gap-1">
                <UiButton variant="ghost" size="sm" class="text-destructive" @click="handleDelete(key.id)">
                  Delete
                </UiButton>
              </div>
            </td>
          </tr>
          <tr v-if="keys.length === 0">
            <td colspan="7" class="px-4 py-12 text-center text-muted-fg text-sm">
              No API keys yet. Create one to get started.
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>

    <!-- Create Key Modal -->
    <UiModal v-model="showCreateModal" title="Create API Key">
      <div class="space-y-4">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Name</label>
          <UiInput v-model="newKeyName" placeholder="e.g. Production Key" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Group</label>
          <select
            v-model="newKeyGroupId"
            class="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option v-for="g in availableGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showCreateModal = false">Cancel</UiButton>
        <UiButton variant="primary" :disabled="creating" @click="handleCreate">
          {{ creating ? 'Creating...' : 'Create' }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
