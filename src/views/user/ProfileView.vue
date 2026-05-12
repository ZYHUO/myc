<script setup lang="ts">
import { ref } from 'vue'
import { UiButton, UiBadge, UiInput, UiStatusDot, UiModal, UiToggle } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()

const twoFaEnabled = ref(false)
const notifEnabled = ref(false)
const notifThreshold = ref('50')

// Edit username modal
const showUsernameModal = ref(false)
const editUsername = ref('')

// Change password modal
const showPasswordModal = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

interface Binding {
  platform: string
  bound: boolean
}

const bindings = ref<Binding[]>([
  { platform: 'WeChat', bound: false },
  { platform: 'LinuxDo', bound: false },
  { platform: 'GitHub', bound: true },
])

function openUsernameModal() {
  editUsername.value = auth.user?.username || ''
  showUsernameModal.value = true
}

function saveUsername() {
  if (!editUsername.value.trim()) {
    toast.error('Username cannot be empty')
    return
  }
  if (auth.user) {
    auth.user.username = editUsername.value.trim()
  }
  showUsernameModal.value = false
  toast.success('Username updated successfully')
}

function savePassword() {
  if (!currentPassword.value) {
    toast.error('Please enter your current password')
    return
  }
  if (newPassword.value.length < 8) {
    toast.error('New password must be at least 8 characters')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Passwords do not match')
    return
  }
  showPasswordModal.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  toast.success('Password changed successfully')
}

async function toggle2FA() {
  const action = twoFaEnabled.value ? 'disable' : 'enable'
  const confirmed = await confirm({
    title: `${action === 'enable' ? 'Enable' : 'Disable'} 2FA`,
    message: `Are you sure you want to ${action} two-factor authentication?`,
    variant: action === 'disable' ? 'danger' : 'default',
  })
  if (!confirmed) return
  twoFaEnabled.value = !twoFaEnabled.value
  toast.success(`2FA ${twoFaEnabled.value ? 'enabled' : 'disabled'} successfully`)
}

async function handleBind(binding: Binding) {
  if (binding.bound) {
    const confirmed = await confirm({
      title: `Unbind ${binding.platform}`,
      message: `Are you sure you want to unbind your ${binding.platform} account?`,
      variant: 'danger',
    })
    if (!confirmed) return
    binding.bound = false
    toast.success(`${binding.platform} unbound successfully`)
  } else {
    binding.bound = true
    toast.success(`${binding.platform} bound successfully`)
  }
}
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
          <UiButton variant="ghost" size="sm" @click="openUsernameModal">Edit</UiButton>
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
          <UiButton variant="ghost" size="sm" @click="showPasswordModal = true">Change</UiButton>
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
          <UiButton variant="secondary" size="sm" @click="toggle2FA">
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
            <UiButton v-if="binding.bound" variant="ghost" size="sm" @click="handleBind(binding)">Unbind</UiButton>
            <UiButton v-else variant="secondary" size="sm" @click="handleBind(binding)">Bind</UiButton>
          </div>
        </div>
      </div>

      <!-- Balance Notifications -->
      <div class="py-5">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">Balance Notifications</p>
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-fg">Low balance alert</p>
          <UiToggle v-model="notifEnabled" />
        </div>
        <div v-if="notifEnabled" class="max-w-xs">
          <p class="text-xs text-muted-fg mb-2">Alert when balance falls below (¥)</p>
          <UiInput v-model="notifThreshold" type="number" placeholder="50" />
        </div>
      </div>
    </div>

    <!-- Edit Username Modal -->
    <UiModal v-model="showUsernameModal" title="Edit Username">
      <div>
        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Username</label>
        <UiInput v-model="editUsername" placeholder="Enter new username" />
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showUsernameModal = false">Cancel</UiButton>
        <UiButton variant="primary" @click="saveUsername">Save</UiButton>
      </template>
    </UiModal>

    <!-- Change Password Modal -->
    <UiModal v-model="showPasswordModal" title="Change Password">
      <div class="space-y-4">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Current Password</label>
          <UiInput v-model="currentPassword" type="password" placeholder="Enter current password" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">New Password</label>
          <UiInput v-model="newPassword" type="password" placeholder="Enter new password" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">Confirm New Password</label>
          <UiInput v-model="confirmPassword" type="password" placeholder="Confirm new password" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showPasswordModal = false">Cancel</UiButton>
        <UiButton variant="primary" @click="savePassword">Change Password</UiButton>
      </template>
    </UiModal>
  </div>
</template>
