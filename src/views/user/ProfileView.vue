<script setup lang="ts">
import { ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiStatusDot from '@/components/ui/UiStatusDot.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const twoFaEnabled = ref(false)
const notifEnabled = ref(false)
const notifThreshold = ref('50')

interface Binding {
  platform: string
  bound: boolean
}

const bindings = ref<Binding[]>([
  { platform: 'WeChat', bound: false },
  { platform: 'LinuxDo', bound: false },
  { platform: 'GitHub', bound: true },
])
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">PROFILE</p>
      <h1 class="text-5xl font-display font-normal tracking-tight mt-3">Your profile</h1>
    </div>

    <!-- Profile Sections -->
    <div class="max-w-[560px]">
      <!-- Username -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">Username</p>
        <div class="flex items-center justify-between">
          <p class="text-sm text-fg">{{ auth.user?.username || '—' }}</p>
          <UiButton variant="ghost" size="sm">Edit</UiButton>
        </div>
      </div>

      <!-- Email -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">Email</p>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <p class="text-sm text-fg">{{ auth.user?.email || '—' }}</p>
            <UiBadge variant="green">Verified</UiBadge>
          </div>
          <UiButton variant="ghost" size="sm">Change</UiButton>
        </div>
      </div>

      <!-- Password -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">Password</p>
        <div class="flex items-center justify-between">
          <p class="text-sm text-fg tracking-widest">••••••••••••</p>
          <UiButton variant="ghost" size="sm">Change</UiButton>
        </div>
      </div>

      <!-- 2FA -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">Two-Factor Authentication</p>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UiStatusDot :status="twoFaEnabled ? 'online' : 'disabled'" />
            <p class="text-sm text-fg">{{ twoFaEnabled ? 'Enabled' : 'Disabled' }}</p>
          </div>
          <UiButton variant="secondary" size="sm" @click="twoFaEnabled = !twoFaEnabled">
            {{ twoFaEnabled ? 'Disable' : 'Enable' }}
          </UiButton>
        </div>
      </div>

      <!-- Account Bindings -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">Account Bindings</p>
        <div class="space-y-4">
          <div v-for="binding in bindings" :key="binding.platform" class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <p class="text-sm text-fg">{{ binding.platform }}</p>
              <UiBadge v-if="binding.bound" variant="green">Bound</UiBadge>
              <span v-else class="text-sm text-muted-fg">Not bound</span>
            </div>
            <UiButton v-if="binding.bound" variant="ghost" size="sm">Unbind</UiButton>
            <UiButton v-else variant="secondary" size="sm">Bind</UiButton>
          </div>
        </div>
      </div>

      <!-- Balance Notifications -->
      <div class="py-5">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">Balance Notifications</p>
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-fg">Low balance alert</p>
          <label class="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              v-model="notifEnabled"
              class="peer sr-only"
            />
            <div
              class="h-5 w-9 rounded-full bg-muted transition-colors duration-0.15s peer-checked:bg-primary"
            />
            <div
              class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-card transition-transform duration-0.15s peer-checked:translate-x-4"
            />
          </label>
        </div>
        <div v-if="notifEnabled" class="max-w-xs">
          <p class="text-xs text-muted-fg mb-2">Alert when balance falls below (¥)</p>
          <UiInput v-model="notifThreshold" type="number" placeholder="50" />
        </div>
      </div>
    </div>
  </div>
</template>
