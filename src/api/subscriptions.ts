import client from './client'
import { delay, isMockMode, unwrap, httpStatus } from './_util'

export interface Subscription {
  id: string
  group_id: number
  group_name: string
  subscription_type: string
  platform: string
  status: 'active' | 'expired' | 'suspended'
  starts_at: string
  expires_at: string
  // Usage
  daily_usage_usd: number
  weekly_usage_usd: number
  monthly_usage_usd: number
  // Limits
  daily_limit_usd: number
  weekly_limit_usd: number
  monthly_limit_usd: number
  // Features
  allow_image_generation: boolean
  rpm_limit: number
  /**
   * Per-window progress as computed server-side. Populated when the
   * caller hits `/subscriptions/progress`; absent on the bare list
   * endpoint. The view layer can fall back to dividing usage by limit
   * when undefined, but `resets_in_seconds` and `expires_in_days` are
   * authoritative.
   */
  progress?: SubscriptionProgress
}

export interface UsageWindowProgress {
  limit_usd: number
  used_usd: number
  remaining_usd: number
  /** 0-100. */
  percentage: number
  resets_at: string
  /** Seconds until the window rolls over. */
  resets_in_seconds: number
}

export interface SubscriptionProgress {
  expires_in_days: number
  daily?: UsageWindowProgress
  weekly?: UsageWindowProgress
  monthly?: UsageWindowProgress
}

const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: '1', group_id: 7, group_name: 'pro20x', subscription_type: 'subscription',
    platform: 'openai', status: 'active',
    starts_at: '2026-05-07T00:00:00Z', expires_at: '2026-06-06T00:00:00Z',
    daily_usage_usd: 7.78, weekly_usage_usd: 61.95, monthly_usage_usd: 61.95,
    daily_limit_usd: 0, weekly_limit_usd: 420, monthly_limit_usd: 1680,
    allow_image_generation: true, rpm_limit: 0,
  },
  {
    id: '2', group_id: 6, group_name: 'mimo', subscription_type: 'subscription',
    platform: 'anthropic', status: 'active',
    starts_at: '2026-04-29T00:00:00Z', expires_at: '2026-05-29T00:00:00Z',
    daily_usage_usd: 0, weekly_usage_usd: 0.19, monthly_usage_usd: 0.19,
    daily_limit_usd: 200, weekly_limit_usd: 1400, monthly_limit_usd: 2000,
    allow_image_generation: false, rpm_limit: 0,
  },
]

/** Subset of sub2api's `dto.Group` that the view actually reads. */
interface UpstreamSubscriptionGroup {
  id?: number
  name?: string
  platform?: string
  subscription_type?: string
  daily_limit_usd?: number | null
  weekly_limit_usd?: number | null
  monthly_limit_usd?: number | null
  allow_image_generation?: boolean
  rpm_limit?: number
}

/** Subset of sub2api's `dto.UserSubscription`. */
interface UpstreamSubscription {
  id: number | string
  group_id?: number
  status?: Subscription['status']
  starts_at?: string
  expires_at?: string
  daily_usage_usd?: number
  weekly_usage_usd?: number
  monthly_usage_usd?: number
  group?: UpstreamSubscriptionGroup | null
}

function mapSub(raw: UpstreamSubscription): Subscription {
  const g = raw.group ?? {}
  return {
    id: String(raw.id),
    group_id: raw.group_id ?? g.id ?? 0,
    group_name: g.name ?? 'Unknown',
    subscription_type: g.subscription_type ?? 'subscription',
    platform: g.platform ?? 'openai',
    status: raw.status ?? 'active',
    starts_at: raw.starts_at ?? '',
    expires_at: raw.expires_at ?? '',
    daily_usage_usd: raw.daily_usage_usd ?? 0,
    weekly_usage_usd: raw.weekly_usage_usd ?? 0,
    monthly_usage_usd: raw.monthly_usage_usd ?? 0,
    daily_limit_usd: g.daily_limit_usd ?? 0,
    weekly_limit_usd: g.weekly_limit_usd ?? 0,
    monthly_limit_usd: g.monthly_limit_usd ?? 0,
    allow_image_generation: g.allow_image_generation ?? false,
    rpm_limit: g.rpm_limit ?? 0,
  }
}

/**
 * Accept whichever shape a sub2api fork ships: a bare array (canonical
 * `[]UserSubscription`), a paginated envelope (`{items: [...]}`), or a
 * single object (some forks of `/active` return one record instead of a
 * list). Always normalise to an array so the caller doesn't have to.
 */
function normaliseList(body: unknown): UpstreamSubscription[] {
  if (Array.isArray(body)) return body as UpstreamSubscription[]
  if (body && typeof body === 'object') {
    const obj = body as { items?: unknown }
    if (Array.isArray(obj.items)) return obj.items as UpstreamSubscription[]
    // Treat a non-empty single object as one-element list. Empty objects
    // (e.g. `{}` for "no active subscription") return [] cleanly.
    if ('id' in body) return [body as UpstreamSubscription]
  }
  return []
}

interface UpstreamProgress {
  expires_in_days?: number
  daily?: UsageWindowProgress | null
  weekly?: UsageWindowProgress | null
  monthly?: UsageWindowProgress | null
}

interface UpstreamProgressEntry {
  subscription: UpstreamSubscription
  progress: UpstreamProgress | null
}

function mapProgress(raw: UpstreamProgress | null | undefined): SubscriptionProgress | undefined {
  if (!raw) return undefined
  const out: SubscriptionProgress = { expires_in_days: raw.expires_in_days ?? 0 }
  if (raw.daily) out.daily = raw.daily
  if (raw.weekly) out.weekly = raw.weekly
  if (raw.monthly) out.monthly = raw.monthly
  return out
}

/**
 * Public entrypoint. Hits `/subscriptions` for the full list (active +
 * expired + suspended) and `/subscriptions/progress` in parallel for
 * the server-computed `resets_in_seconds` per window — info the SPA
 * cannot reconstruct from `daily_usage_usd` alone. Progress data is
 * merged into the matching rows by id; if `/progress` fails or 404s,
 * the list still renders without reset captions.
 *
 * Fallback chain on the list call:
 *   /subscriptions → /subscriptions/active → []
 *
 * `/active` is the second hop because some forks compile out the
 * broader endpoint; both 404 means the deployment lacks the module and
 * we return an empty list rather than surfacing an error toast.
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_SUBSCRIPTIONS.map(s => ({ ...s }))
  }

  // List call. Determines what rows we show (and includes non-active
  // statuses, which `/progress` would silently drop).
  const listPromise = (async (): Promise<Subscription[]> => {
    for (const path of ['/subscriptions', '/subscriptions/active']) {
      try {
        const body = unwrap<unknown>(await client.get(path))
        return normaliseList(body).map(mapSub)
      } catch (err) {
        if (httpStatus(err) !== 404) throw err
      }
    }
    if (import.meta.env.DEV) {
      console.warn('[subscriptions] no list endpoint responded — deployment lacks the module')
    }
    return []
  })()

  // Progress enrichment. Best-effort: any failure (404, 5xx, network)
  // simply yields no reset captions — never blocks the list render.
  const progressPromise = (async (): Promise<Map<string, SubscriptionProgress>> => {
    const out = new Map<string, SubscriptionProgress>()
    try {
      const body = unwrap<UpstreamProgressEntry[] | { items?: UpstreamProgressEntry[] }>(
        await client.get('/subscriptions/progress'),
      )
      const items = Array.isArray(body) ? body : body?.items ?? []
      for (const e of items) {
        if (!e?.subscription) continue
        const p = mapProgress(e.progress)
        if (p) out.set(String(e.subscription.id), p)
      }
    } catch {
      // Swallow: enrichment is optional.
    }
    return out
  })()

  const [list, progressByID] = await Promise.all([listPromise, progressPromise])
  if (progressByID.size === 0) return list
  return list.map((s) => {
    const p = progressByID.get(s.id)
    return p ? { ...s, progress: p } : s
  })
}
