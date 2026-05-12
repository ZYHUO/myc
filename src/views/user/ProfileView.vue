<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiButton, UiBadge, UiInput, UiStatusDot, UiModal, UiToggle } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { t } = useI18n()

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
    toast.error(t('profile.toast.pwdMismatch'))
    return
  }
  if (auth.user) {
    auth.user.username = editUsername.value.trim()
  }
  showUsernameModal.value = false
  toast.success(t('common.actions.save'))
}

function savePassword() {
  if (!currentPassword.value || newPassword.value.length < 6) {
    toast.error(t('profile.toast.pwdShort'))
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error(t('profile.toast.pwdMismatch'))
    return
  }
  showPasswordModal.value = false
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  toast.success(t('profile.toast.pwdOk'))
}

async function toggle2FA() {
  const confirmed = await confirm({
    title: '2FA',
    message: t('common.confirmDeleteMsg'),
    variant: twoFaEnabled.value ? 'danger' : 'default',
  })
  if (!confirmed) return
  twoFaEnabled.value = !twoFaEnabled.value
  toast.success(t('profile.toast.notifyOk'))
}

async function handleBind(binding: Binding) {
  if (binding.bound) {
    const confirmed = await confirm({
      title: binding.platform,
      message: t('common.confirmDeleteMsg'),
      variant: 'danger',
    })
    if (!confirmed) return
    binding.bound = false
  } else {
    binding.bound = true
  }
  toast.success(t('common.actions.save'))
}
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div>
      <p class="text-[11px] uppercase tracking-[0.2em] text-muted-fg font-medium">{{ t('profile.eyebrow') }}</p>
      <h1 class="text-4xl sm:text-5xl font-display font-normal tracking-tight mt-3">{{ t('profile.title') }}</h1>
      <p class="text-base text-muted-fg leading-relaxed mt-3 max-w-xl">{{ t('profile.subtitle') }}</p>
    </div>

    <!-- Profile Sections -->
    <div class="max-w-[560px]">
      <!-- Username -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('profile.fields.username') }}</p>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-fg truncate">{{ auth.user?.username || '—' }}</p>
          <UiButton variant="ghost" size="sm" @click="openUsernameModal">{{ t('common.actions.edit') }}</UiButton>
        </div>
      </div>

      <!-- Email -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('profile.fields.email') }}</p>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0">
            <p class="text-sm text-fg truncate">{{ auth.user?.email || '—' }}</p>
            <UiBadge variant="green">{{ t('common.status.active') }}</UiBadge>
          </div>
        </div>
      </div>

      <!-- Password -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('common.password') }}</p>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-fg tracking-widest">••••••••••••</p>
          <UiButton variant="ghost" size="sm" @click="showPasswordModal = true">{{ t('common.actions.edit') }}</UiButton>
        </div>
      </div>

      <!-- 2FA -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('profile.sections.security') }}</p>
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <UiStatusDot :status="twoFaEnabled ? 'online' : 'disabled'" />
            <p class="text-sm text-fg">{{ twoFaEnabled ? t('common.status.active') : t('common.status.inactive') }}</p>
          </div>
          <UiButton variant="secondary" size="sm" @click="toggle2FA">
            {{ twoFaEnabled ? t('common.actions.delete') : t('common.actions.create') }}
          </UiButton>
        </div>
      </div>

      <!-- Account Bindings -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">{{ t('profile.sections.identity') }}</p>
        <div class="space-y-4">
          <div v-for="binding in bindings" :key="binding.platform" class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <p class="text-sm text-fg">{{ binding.platform }}</p>
              <UiBadge v-if="binding.bound" variant="green">{{ t('common.status.active') }}</UiBadge>
              <span v-else class="text-sm text-muted-fg">{{ t('common.status.inactive') }}</span>
            </div>
            <UiButton :variant="binding.bound ? 'ghost' : 'secondary'" size="sm" @click="handleBind(binding)">
              {{ binding.bound ? t('common.actions.delete') : t('common.actions.create') }}
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Balance Notifications -->
      <div class="py-5">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">{{ t('profile.sections.notifications') }}</p>
        <div class="flex items-center justify-between mb-4 gap-3">
          <p class="text-sm text-fg">{{ t('profile.fields.balanceAlert') }}</p>
          <UiToggle v-model="notifEnabled" />
        </div>
        <div v-if="notifEnabled" class="max-w-xs">
          <p class="text-xs text-muted-fg mb-2">{{ t('profile.fields.alertThreshold') }}</p>
          <UiInput v-model="notifThreshold" type="number" placeholder="50" />
        </div>
      </div>
    </div>

    <!-- Edit Username Modal -->
    <UiModal v-model="showUsernameModal" :title="t('profile.fields.username')">
      <div>
        <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('profile.fields.username') }}</label>
        <UiInput v-model="editUsername" />
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showUsernameModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" @click="saveUsername">{{ t('common.actions.save') }}</UiButton>
      </template>
    </UiModal>

    <!-- Change Password Modal -->
    <UiModal v-model="showPasswordModal" :title="t('profile.actions.updatePassword')">
      <div class="space-y-4">
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('profile.fields.currentPassword') }}</label>
          <UiInput v-model="currentPassword" type="password" autocomplete="current-password" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('profile.fields.newPassword') }}</label>
          <UiInput v-model="newPassword" type="password" autocomplete="new-password" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1.5 block">{{ t('profile.fields.confirmPassword') }}</label>
          <UiInput v-model="confirmPassword" type="password" autocomplete="new-password" />
        </div>
      </div>
      <template #footer>
        <UiButton variant="secondary" @click="showPasswordModal = false">{{ t('common.cancel') }}</UiButton>
        <UiButton variant="primary" @click="savePassword">{{ t('profile.actions.updatePassword') }}</UiButton>
      </template>
    </UiModal>
  </div>
</template>
