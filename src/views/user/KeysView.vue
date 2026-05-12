<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UiCard, UiButton, UiTable, UiStatusDot, UiBadge, UiCopyButton, UiModal, UiInput } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { getKeys, deleteKey } from '@/api/keys'
import type { ApiKey } from '@/api/keys'

const keys = ref<ApiKey[]>([])
const toast = useToast()
const { confirm } = useConfirm()

// Create modal state
const showCreateModal = ref(false)
const newKeyName = ref('')
const newKeyGroup = ref('default')
const newKeyCustom = ref('')

const groupOptions = ['default', 'production', 'staging', 'development']

onMounted(async () => {
  keys.value = await getKeys()
})

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

function handleCreate() {
  if (!newKeyName.value.trim()) {
    toast.error('Please enter a key name')
    return
  }
  // Mock create
  const newKey: ApiKey = {
    id: `key_${Date.now()}`,
    name: newKeyName.value.trim(),
    key: newKeyCustom.value.trim() || `sk-${Math.random().toString(36).slice(2, 18)}`,
    group: newKeyGroup.value,
    status: 'active',
    requests: 0,
    createdAt: new Date().toISOString(),
  }
  keys.value.unshift(newKey)
  showCreateModal.value = false
  newKeyName.value = ''
  newKeyGroup.value = 'default'
  newKeyCustom.value = ''
  toast.success('Key created successfully')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatRequests(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">API KEYS</p>
        <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Your keys</h1>
      </div>
      <UiButton variant="primary" @click="showCreateModal = true">Create key</UiButton>
    </div>

    <!-- Keys Table -->
    <UiCard flat>
      <UiTable>
        <thead>
          <tr class="border-b border-border text-left text-[11px] uppercase tracking-[0.18em] text-muted-fg">
            <th class="px-4 py-3 font-medium">Name</th>
            <th class="px-4 py-3 font-medium">Key</th>
            <th class="px-4 py-3 font-medium">Group</th>
            <th class="px-4 py-3 font-medium">Status</th>
            <th class="px-4 py-3 font-medium">Requests</th>
            <th class="px-4 py-3 font-medium">Created</th>
            <th class="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(key, idx) in keys" :key="key.id" class="border-b border-border last:border-0 row-hover stagger-item" :style="{ animationDelay: `${idx * 60}ms` }">
            <td class="px-4 py-3 text-sm font-medium">{{ key.name }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <code class="font-mono text-sm text-muted-fg">{{ key.key }}</code>
                <UiCopyButton :text="key.key" />
              </div>
            </td>
            <td class="px-4 py-3">
              <UiBadge variant="gray">{{ key.group }}</UiBadge>
            </td>
            <td class="px-4 py-3">
              <UiStatusDot :status="key.status === 'active' ? 'online' : 'disabled'" />
            </td>
            <td class="px-4 py-3 font-mono text-sm">{{ formatRequests(key.requests) }}</td>
            <td class="px-4 py-3 font-mono text-sm text-muted-fg">{{ formatDate(key.createdAt) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <UiButton variant="ghost" size="sm" class="text-destructive" @click="handleDelete(key.id)">
                  Delete
                </UiButton>
              </div>
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
            v-model="newKeyGroup"
            class="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-fg outline-none transition-colors duration-150 focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option v-for="g in groupOptions" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Custom Key (optional)</label>
          <UiInput v-model="newKeyCustom" placeholder="Leave empty to auto-generate" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showCreateModal = false">Cancel</UiButton>
        <UiButton variant="primary" @click="handleCreate">Create</UiButton>
      </template>
    </UiModal>
  </div>
</template>
