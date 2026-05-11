<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { UiCard, UiButton, UiTable, UiStatusDot, UiBadge, UiCopyButton } from '@/components/ui'
import { getKeys, deleteKey } from '@/api/keys'
import type { ApiKey } from '@/api/keys'

const router = useRouter()
const keys = ref<ApiKey[]>([])

onMounted(async () => {
  keys.value = await getKeys()
})

async function handleDelete(id: string) {
  await deleteKey(id)
  keys.value = keys.value.filter((k) => k.id !== id)
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
      <UiButton variant="primary" @click="router.push('/keys')">Create key</UiButton>
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
          <tr v-for="key in keys" :key="key.id" class="border-b border-border last:border-0">
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
                <UiButton variant="ghost" size="sm" @click="router.push(`/keys/${key.id}/edit`)">
                  Edit
                </UiButton>
                <UiButton variant="ghost" size="sm" class="text-destructive" @click="handleDelete(key.id)">
                  Delete
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>
  </div>
</template>
