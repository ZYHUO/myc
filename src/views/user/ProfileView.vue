<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { UiButton, UiBadge, UiInput, UiStatusDot, UiModal, UiToggle, UiSkeleton } from '@/components/ui'
import { useToast, useConfirm } from '@/composables'
import { useAuthStore } from '@/stores/auth'
import {
  getProfile, updateProfile, changePassword, startBind,
  type UserProfile, type IdentityBinding,
} from '@/api/user'

const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()
const { t } = useI18n()

const profile = ref<UserProfile | null>(null)
const loading = ref(true)

// Modals
const showUsernameModal = ref(false)
const editUsername = ref('')
const savingUsername = ref(false)

const showPasswordModal = ref(false)
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)

// Notification settings (live, two-way bound to local refs; saved on toggle/change)
const notifEnabled = ref(false)
const notifThreshold = ref('')
const savingNotify = ref(false)

async function loadProfile() {
  loading.value = true
  try {
    profile.value = await getProfile()
    notifEnabled.value = profile.value.balance_notify_enabled
    notifThreshold.value =
      profile.value.balance_notify_threshold !== null
        ? String(profile.value.balance_notify_threshold)
        : ''
  } catch {
    toast.error(t('common.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(loadProfile)

// Bindings rendered as a sorted list — we want email first, then the
// providers the user has linked, then the rest. The backend doesn't
// guarantee ordering so we impose it client-side.
const sortedBindings = computed<IdentityBinding[]>(() => {
  if (!profile.value) return []
  const all = Object.values(profile.value.identities)
  const rank = (b: IdentityBinding) =>
    b.provider === 'email' ? 0 : b.bound ? 1 : 2
  return [...all].sort((a, b) => rank(a) - rank(b))
})

function openUsernameModal() {
  editUsername.value = profile.value?.username || ''
  showUsernameModal.value = true
}

async function saveUsername() {
  const next = editUsername.value.trim()
  if (!next) {
    toast.error(t('profile.toast.usernameRequired'))
    return
  }
  savingUsername.value = true
  try {
    profile.value = await updateProfile({ username: next })
    // Mirror into the auth store so the sidebar updates immediately.
    if (auth.user) auth.user.username = profile.value.username
    showUsernameModal.value = false
    toast.success(t('profile.toast.saved'))
  } catch (e) {
    const data = (e as { response?: { data?: { message?: string } } }).response?.data
    toast.error(data?.message || t('profile.toast.saveFailed'))
  } finally {
    savingUsername.value = false
  }
}

async function savePassword() {
  if (!currentPassword.value) {
    toast.error(t('profile.toast.pwdCurrentRequired'))
    return
  }
  if (newPassword.value.length < 6) {
    toast.error(t('profile.toast.pwdShort'))
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error(t('profile.toast.pwdMismatch'))
    return
  }
  savingPassword.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    showPasswordModal.value = false
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.success(t('profile.toast.pwdOk'))
  } catch (e) {
    const data = (e as { response?: { data?: { message?: string } } }).response?.data
    toast.error(data?.message || t('profile.toast.pwdFail'))
  } finally {
    savingPassword.value = false
  }
}

async function saveNotificationSettings() {
  if (savingNotify.value) return
  savingNotify.value = true
  try {
    const threshold = Number(notifThreshold.value)
    profile.value = await updateProfile({
      balance_notify_enabled: notifEnabled.value,
      balance_notify_threshold: Number.isFinite(threshold) && threshold >= 0 ? threshold : 0,
    })
    toast.success(t('profile.toast.notifyOk'))
  } catch (e) {
    const data = (e as { response?: { data?: { message?: string } } }).response?.data
    toast.error(data?.message || t('profile.toast.notifyFail'))
    // Roll local refs back to server truth.
    if (profile.value) {
      notifEnabled.value = profile.value.balance_notify_enabled
      notifThreshold.value =
        profile.value.balance_notify_threshold !== null
          ? String(profile.value.balance_notify_threshold)
          : ''
    }
  } finally {
    savingNotify.value = false
  }
}

async function handleBind(b: IdentityBinding) {
  if (b.bound) {
    if (!b.can_unbind) {
      toast.warning(t('profile.toast.bindLocked'))
      return
    }
    const ok = await confirm({
      title: t('profile.bindings.unbindTitle', { provider: providerLabel(b.provider) }),
      // sub2api revokes all access tokens after a successful unbind for
      // security, so the user gets signed out as a side effect. Make
      // that explicit in the confirm copy so it doesn't feel like a bug.
      message: t('profile.bindings.unbindMsg'),
      variant: 'danger',
    })
    if (!ok) return
    // DELETE /user/account-bindings/{provider} — single route for every
    // provider (email/github/google/linuxdo/wechat/oidc). The backend
    // refuses to unlink the last remaining sign-in method, so
    // `can_unbind` should already be false in that case.
    try {
      await import('@/api/client').then(({ default: c }) =>
        c.delete(`/user/account-bindings/${encodeURIComponent(b.provider)}`),
      )
      // The token is now invalid server-side. Mark the binding off
      // locally for the brief window before we navigate, then sign out
      // cleanly so the user isn't bounced through a 401 mid-toast.
      if (profile.value?.identities?.[b.provider]) {
        profile.value.identities[b.provider] = {
          ...profile.value.identities[b.provider],
          bound: false,
          bound_count: 0,
          subject_hint: undefined,
          can_unbind: false,
          can_bind: true,
        }
      }
      toast.success(t('profile.toast.unbindOk'))
      await auth.logout()
    } catch (e) {
      const data = (e as { response?: { data?: { message?: string } } }).response?.data
      toast.error(data?.message || t('profile.toast.unbindFail'))
    }
    return
  }
  if (!b.can_bind || !b.bind_start_path) {
    toast.warning(t('profile.toast.bindUnavailable'))
    return
  }
  startBind(b)
}

function providerLabel(p: string): string {
  const key = `profile.bindings.providers.${p}`
  return t(key) !== key ? t(key) : p.charAt(0).toUpperCase() + p.slice(1)
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
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

    <!-- Loading skeleton -->
    <div v-if="loading" class="max-w-[560px] space-y-3">
      <UiSkeleton v-for="i in 5" :key="i" width="100%" height="56px" />
    </div>

    <div v-else-if="profile" class="max-w-[560px]">
      <!-- Username -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('profile.fields.username') }}</p>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-fg truncate">{{ profile.username || '—' }}</p>
          <UiButton variant="ghost" size="sm" @click="openUsernameModal">{{ t('common.actions.edit') }}</UiButton>
        </div>
      </div>

      <!-- Email -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-2">{{ t('profile.fields.email') }}</p>
        <div class="flex items-center gap-2 min-w-0">
          <p class="text-sm text-fg truncate">{{ profile.email || '—' }}</p>
          <UiBadge v-if="profile.identities?.email?.verified_at" variant="green">{{ t('common.status.active') }}</UiBadge>
        </div>
      </div>

      <!-- Balance + role -->
      <div class="py-5 border-b border-border grid grid-cols-2 gap-4">
        <div>
          <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1">{{ t('profile.fields.balance') }}</p>
          <p class="text-sm font-medium tabular-nums">${{ profile.balance.toFixed(2) }}</p>
        </div>
        <div>
          <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-1">{{ t('profile.fields.role') }}</p>
          <p class="text-sm">{{ profile.role }}</p>
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

      <!-- Account bindings (real, from sub2api `identities`) -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">{{ t('profile.sections.identity') }}</p>
        <div class="space-y-4">
          <div v-for="b in sortedBindings" :key="b.provider" class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex items-center gap-2 min-w-0">
                <UiStatusDot :status="b.bound ? 'online' : 'disabled'" />
                <span class="text-sm font-medium">{{ providerLabel(b.provider) }}</span>
              </div>
              <span v-if="b.subject_hint" class="text-xs text-muted-fg truncate">{{ b.subject_hint }}</span>
            </div>
            <UiButton
              :variant="b.bound ? 'ghost' : 'secondary'"
              size="sm"
              :disabled="b.bound ? !b.can_unbind : !b.can_bind"
              @click="handleBind(b)"
            >
              {{ b.bound ? t('profile.bindings.unbind') : t('profile.bindings.bind') }}
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Balance Notifications -->
      <div class="py-5 border-b border-border">
        <p class="text-[10px] uppercase tracking-[0.18em] text-muted-fg font-medium mb-4">{{ t('profile.sections.notifications') }}</p>
        <div class="flex items-center justify-between mb-4 gap-3">
          <p class="text-sm text-fg">{{ t('profile.fields.balanceAlert') }}</p>
          <UiToggle v-model="notifEnabled" @update:model-value="saveNotificationSettings" />
        </div>
        <div v-if="notifEnabled" class="flex items-end gap-2 max-w-xs">
          <div class="flex-1">
            <p class="text-xs text-muted-fg mb-1.5">{{ t('profile.fields.alertThreshold') }}</p>
            <UiInput v-model="notifThreshold" type="number" placeholder="50" :show-password-toggle="false" />
          </div>
          <UiButton size="sm" variant="secondary" :disabled="savingNotify" @click="saveNotificationSettings">
            {{ t('common.actions.save') }}
          </UiButton>
        </div>
      </div>

      <!-- Account dates -->
      <div class="py-5 grid grid-cols-2 gap-4 text-xs text-muted-fg">
        <div>
          <p class="uppercase tracking-[0.12em]">{{ t('profile.fields.memberSince') }}</p>
          <p class="mt-1 font-mono">{{ formatDate(profile.created_at) }}</p>
        </div>
        <div>
          <p class="uppercase tracking-[0.12em]">{{ t('profile.fields.lastUpdated') }}</p>
          <p class="mt-1 font-mono">{{ formatDate(profile.updated_at) }}</p>
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
        <UiButton variant="primary" :disabled="savingUsername" @click="saveUsername">
          {{ savingUsername ? t('common.loading') : t('common.actions.save') }}
        </UiButton>
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
        <UiButton variant="primary" :disabled="savingPassword" @click="savePassword">
          {{ savingPassword ? t('common.loading') : t('profile.actions.updatePassword') }}
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
