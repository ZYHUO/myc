import { defineStore } from 'pinia'
import { ref } from 'vue'
import client from '@/api/client'
import { isMockMode, unwrap } from '@/api/_util'

/**
 * Public site settings returned by `GET /api/v1/settings/public`. This is an
 * anonymous endpoint that tells the SPA which optional features are enabled
 * (registration, captcha, payment, OAuth providers, etc.) so the UI can hide
 * fields the backend will reject anyway.
 *
 * Only the fields the SPA actually consumes are typed below — sub2api returns
 * ~50 fields and most are admin/operations metadata we don't need here.
 */
export interface PublicSettings {
  // Branding (we override site name to "Amodel" in the UI; site_subtitle/logo
  // can still come from the backend so admins can theme their instance).
  site_name: string
  site_logo: string
  site_subtitle: string

  // Auth feature flags
  registration_enabled: boolean
  email_verify_enabled: boolean
  password_reset_enabled: boolean
  totp_enabled: boolean
  registration_email_suffix_whitelist: string[]

  // Anti-abuse
  turnstile_enabled: boolean
  turnstile_site_key: string

  // Registration extras
  promo_code_enabled: boolean
  invitation_code_enabled: boolean
  affiliate_enabled: boolean

  // OAuth providers
  github_oauth_enabled: boolean
  google_oauth_enabled: boolean
  linuxdo_oauth_enabled: boolean
  wechat_oauth_enabled: boolean
  oidc_oauth_enabled: boolean
  oidc_oauth_provider_name: string

  // Other
  payment_enabled: boolean
  available_channels_enabled: boolean
  channel_monitor_enabled: boolean
  doc_url: string
  contact_info: string
  home_content: string
  version: string
  /**
   * Optional admin override for the AI gateway base URL shown in the
   * "Use this key" modal. When empty (the default) the SPA falls back
   * to `${window.location.origin}/v1`.
   */
  api_base_url: string

  // Terms of service. The upstream payload uses `{id, title, content_md}`
  // (markdown text, NOT a URL). Older / forked deployments may return
  // `{name, url}` instead — typed as optional to tolerate either.
  login_agreement_enabled: boolean
  login_agreement_mode: string
  login_agreement_documents: LoginAgreementDocument[]
}

export interface LoginAgreementDocument {
  id?: string
  title?: string
  content_md?: string
  // Legacy / fork compatibility — not present on a stock sub2api.
  name?: string
  url?: string
  required?: boolean
}

const DEFAULT_SETTINGS: PublicSettings = {
  site_name: 'Amodel',
  site_logo: '',
  site_subtitle: '',
  registration_enabled: true,
  email_verify_enabled: false,
  password_reset_enabled: false,
  totp_enabled: false,
  registration_email_suffix_whitelist: [],
  turnstile_enabled: false,
  turnstile_site_key: '',
  promo_code_enabled: false,
  invitation_code_enabled: false,
  affiliate_enabled: false,
  github_oauth_enabled: false,
  google_oauth_enabled: false,
  linuxdo_oauth_enabled: false,
  wechat_oauth_enabled: false,
  oidc_oauth_enabled: false,
  oidc_oauth_provider_name: 'OIDC',
  payment_enabled: false,
  available_channels_enabled: false,
  channel_monitor_enabled: true,
  doc_url: '',
  contact_info: '',
  home_content: '',
  version: '',
  api_base_url: '',
  login_agreement_enabled: false,
  login_agreement_mode: 'modal',
  login_agreement_documents: [],
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<PublicSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)
  let inflight: Promise<PublicSettings> | null = null

  async function load(force = false): Promise<PublicSettings> {
    if (loaded.value && !force) return settings.value
    if (inflight) return inflight

    inflight = (async () => {
      if (isMockMode()) {
        // Mock keeps registration on so the dev flow renders the full form
        settings.value = { ...DEFAULT_SETTINGS, registration_enabled: true, promo_code_enabled: true }
        loaded.value = true
        return settings.value
      }
      try {
        const raw = unwrap<Partial<PublicSettings>>(await client.get('/settings/public'))
        settings.value = { ...DEFAULT_SETTINGS, ...raw }
      } catch {
        // Fall back to defaults; views handle disabled-feature flags themselves.
        settings.value = { ...DEFAULT_SETTINGS }
      } finally {
        loaded.value = true
      }
      return settings.value
    })()

    try {
      return await inflight
    } finally {
      inflight = null
    }
  }

  return { settings, loaded, load }
})
