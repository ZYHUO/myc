import client from './client'
import { delay, isMockMode, unwrap } from './_util'

export interface Channel {
  id: string
  name: string
  models: string[]
  pricing: string
  status: 'online' | 'offline' | 'degraded'
}

export interface ChannelMonitor {
  id: string
  name: string
  availability: number
  latency: number
  /**
   * `healthy`  → upstream is responding correctly (`operational`)
   * `degraded` → responding but slow / partially wrong
   * `down`     → check failed (`failed` / `error`)
   * `unknown`  → no check has run yet, or upstream returned no state
   */
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  /**
   * REAL recent health-check results, oldest first. Variable length (0..N) —
   * we render exactly the points sub2api returned, no synthetic fill. An
   * empty array means no checks have happened yet for this channel.
   */
  uptimeHistory: ('up' | 'down' | 'degraded')[]
  /**
   * Human-readable caption describing what `uptimeHistory` actually covers
   * (e.g. "10 checks · last 6m"). Surfaced under the bars so the user knows
   * the time density of the data they're looking at.
   */
  uptimeSpanLabel: string
}

// ─── Upstream shapes (what sub2api actually returns) ────────────────────────

interface UpstreamAvailableChannel {
  id: number
  name?: string
  provider?: string
  supported_models?: Array<{
    model: string
    billing_mode?: string
    prices?: { input?: number; output?: number; per_request?: number }
  }>
  groups?: Array<{ id: number; name: string; platform?: string }>
}

interface UpstreamTimelinePoint {
  status: string
  latency_ms: number | null
  ping_latency_ms?: number | null
  checked_at?: string
}

interface UpstreamMonitor {
  id: number
  name: string
  provider?: string
  group_name?: string
  primary_model?: string
  primary_status?: string
  /** Real sub2api field; the older `latency_ms` is kept as a fallback. */
  primary_latency_ms?: number | null
  primary_ping_latency_ms?: number | null
  /** Legacy / fork field name. */
  latency_ms?: number | null
  availability_7d?: number | null
  availability_15d?: number | null
  availability_30d?: number | null
  avg_latency_7d_ms?: number | null
  timeline?: UpstreamTimelinePoint[]
  extra_models?: unknown
}

// ─── Mock data ──────────────────────────────────────────────────────────────

const MOCK_CHANNELS: Channel[] = [
  { id: 'ch_001', name: 'OpenAI 官方', models: ['gpt-4o', 'gpt-4o-mini'], pricing: '$0.005/1K tokens', status: 'online' },
  { id: 'ch_002', name: 'Anthropic 官方', models: ['claude-sonnet-4', 'claude-haiku-3.5'], pricing: '$0.003/1K tokens', status: 'online' },
  { id: 'ch_003', name: 'Google AI', models: ['gemini-2.5-pro'], pricing: '$0.004/1K tokens', status: 'online' },
  { id: 'ch_004', name: 'DeepSeek 官方', models: ['deepseek-v3'], pricing: '$0.001/1K tokens', status: 'online' },
  { id: 'ch_005', name: 'Azure OpenAI', models: ['gpt-4o', 'gpt-4o-mini'], pricing: '$0.005/1K tokens', status: 'degraded' },
  { id: 'ch_006', name: 'AWS Bedrock', models: ['claude-sonnet-4', 'claude-haiku-3.5', 'gemini-2.5-pro'], pricing: '$0.004/1K tokens', status: 'online' },
]

function generateMockUptime(): ('up' | 'down' | 'degraded')[] {
  return Array.from({ length: 30 }, () => {
    const r = Math.random()
    if (r > 0.95) return 'down'
    if (r > 0.88) return 'degraded'
    return 'up'
  })
}

const MOCK_MONITORS: ChannelMonitor[] = MOCK_CHANNELS.map((ch) => ({
  id: ch.id,
  name: ch.name,
  availability: ch.status === 'offline' ? 0 : +(95 + Math.random() * 5).toFixed(2),
  latency: Math.floor(Math.random() * 400) + 50,
  status: ch.status === 'online' ? 'healthy' : ch.status === 'degraded' ? 'degraded' : 'down',
  uptimeHistory: generateMockUptime(),
  // Overridden at `getChannelMonitors` time with a translated string; this
  // placeholder just keeps the type strict.
  uptimeSpanLabel: '',
}))

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapChannel(raw: UpstreamAvailableChannel): Channel {
  const models = (raw.supported_models ?? []).map((m) => m.model).filter(Boolean)
  // Pick a representative price tag: the first model with input pricing.
  let pricing = '—'
  for (const m of raw.supported_models ?? []) {
    const p = m.prices?.input
    if (typeof p === 'number' && p > 0) {
      pricing = `$${p.toFixed(4)}/1K tokens`
      break
    }
  }
  return {
    id: String(raw.id),
    name: raw.name || raw.provider || `Channel ${raw.id}`,
    models,
    pricing,
    status: 'online',
  }
}

/**
 * Convert sub2api's `timeline` array into bars suitable for the StatusView.
 * (see `synthesizeUptime30d` below for the deprecated fabrication path.)
 *
 * Returns exactly one bar per real timeline point. We DON'T downsample — at
 * 60 ms/bar a 1-hour timeline with per-minute checks renders 60 thin bars,
 * which a flex container shrinks fluidly. Downsampling caused a worse bug:
 * the "60 checks" caption disagreed with the visible bar count.
 */
function mapTimelineStatus(s: string | undefined): 'up' | 'down' | 'degraded' {
  if (!s) return 'down'
  if (s === 'operational' || s === 'healthy' || s === 'up' || s === 'ok') return 'up'
  if (s === 'degraded') return 'degraded'
  return 'down'
}

export function buildUptimeBars(timeline: UpstreamTimelinePoint[] | undefined): ('up' | 'down' | 'degraded')[] {
  if (!timeline || timeline.length === 0) return []
  return [...timeline]
    .filter((p) => !!p.checked_at)
    .sort((a, b) => (a.checked_at! < b.checked_at! ? -1 : 1))
    .map((p) => mapTimelineStatus(p.status))
}

/**
 * Compose the caption under the uptime strip from real metadata. We
 * intentionally express the time window as a DURATION (`60 分钟`, not
 * `60 分钟前`) — the `timeAgo` strings are for "X minutes ago" timestamps
 * and read awkwardly when paired with the "最近" prefix in the template.
 */
function buildSpanLabel(
  timeline: UpstreamTimelinePoint[] | undefined,
  now: number,
  t: (key: string, payload?: Record<string, unknown>) => string,
): string {
  if (!timeline || timeline.length === 0) return t('status.noChecks')
  const stamps = timeline
    .map((p) => (p.checked_at ? new Date(p.checked_at).getTime() : NaN))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  if (stamps.length === 0) return t('status.noChecks')

  // Span = from the OLDEST point to the LATEST point (not "since first
  // point until now") — that way we describe what the bars actually cover,
  // not how stale the data is.
  const spanMs = stamps[stamps.length - 1] - stamps[0]
  let durationStr: string
  if (spanMs < 60 * 60_000) {
    durationStr = t('common.duration.minutes', { n: Math.max(1, Math.round(spanMs / 60_000)) })
  } else if (spanMs < 24 * 60 * 60_000) {
    durationStr = t('common.duration.hours', { n: Math.max(1, Math.round(spanMs / (60 * 60_000))) })
  } else {
    durationStr = t('common.duration.days', { n: Math.max(1, Math.round(spanMs / (24 * 60 * 60_000))) })
  }
  return t('status.spanLabel', { n: stamps.length, span: durationStr })
}

/**
 * Kept for backwards-compat with vitest table-driven tests in
 * src/api/__tests__/channels.test.ts. New callers should use
 * `buildUptimeBars`. The 30-bucket synthesis behaviour is preserved here
 * verbatim because removing it would break the test fixtures; the
 * production path no longer uses it.
 */
export function synthesizeUptime30d(
  m: UpstreamMonitor,
  now: number = Date.now(),
): ('up' | 'down' | 'degraded')[] {
  const oneDay = 86_400_000
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const cutoff = startOfToday.getTime() - 29 * oneDay

  const buckets = Array.from({ length: 30 }, () => ({ up: 0, down: 0, degraded: 0 }))
  for (const p of m.timeline ?? []) {
    if (!p.checked_at) continue
    const tt = new Date(p.checked_at).getTime()
    if (Number.isNaN(tt) || tt < cutoff) continue
    const idx = Math.floor((tt - cutoff) / oneDay)
    if (idx < 0 || idx >= 30) continue
    const b = buckets[idx]
    if (p.status === 'up' || p.status === 'healthy' || p.status === 'operational') b.up++
    else if (p.status === 'degraded') b.degraded++
    else b.down++
  }

  let seed = ((m.id || 0) * 2654435761 + Math.floor(now / 3_600_000)) >>> 0
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const pick = (availPercent: number): 'up' | 'down' | 'degraded' => {
    const r = rand() * 100
    if (availPercent >= 99) return 'up'
    if (availPercent >= 95) return r < 12 ? 'degraded' : 'up'
    if (availPercent >= 80) return r < 25 ? 'degraded' : r < 33 ? 'down' : 'up'
    return r < 50 ? 'down' : r < 75 ? 'degraded' : 'up'
  }

  const out: Array<'up' | 'down' | 'degraded' | undefined> = new Array(30)
  for (let i = 0; i < 30; i++) {
    const b = buckets[i]
    const total = b.up + b.down + b.degraded
    if (total === 0) continue
    if (b.down * 4 > total) out[i] = 'down'
    else if (b.degraded * 3 > total || b.up === 0) out[i] = 'degraded'
    else out[i] = 'up'
  }

  const fill = (lo: number, hi: number, avail: number | null | undefined) => {
    const a = typeof avail === 'number' ? avail : 100
    for (let i = lo; i < hi; i++) {
      if (out[i]) continue
      out[i] = pick(a)
    }
  }
  fill(0, 15, m.availability_30d ?? m.availability_15d ?? m.availability_7d ?? 100)
  fill(15, 23, m.availability_15d ?? m.availability_7d ?? 100)
  fill(23, 30, m.availability_7d ?? 100)

  return out as ('up' | 'down' | 'degraded')[]
}

// sub2api's channel-monitor status enum (see backend's
// service/channel_monitor_const.go). We saw a real deployment ship the
// value "operational" — the old mapping defaulted that to "down", which
// is how a channel with 100% availability ended up flagged as a failure
// in the StatusView.
function statusFromPrimary(s: string | undefined | null): ChannelMonitor['status'] {
  if (!s) return 'unknown'
  // Canonical sub2api values
  if (s === 'operational') return 'healthy'
  if (s === 'degraded') return 'degraded'
  if (s === 'failed' || s === 'error') return 'down'
  // Legacy / synonyms we tolerate for forks
  if (s === 'healthy' || s === 'up' || s === 'ok') return 'healthy'
  if (s === 'down' || s === 'offline') return 'down'
  return 'unknown'
}

/**
 * Translator callback the view layer passes in. Decoupling lets us call
 * `getChannelMonitors()` from anywhere without `vue-i18n` being imported,
 * and keeps the API layer free of view-layer dependencies.
 */
type TranslateFn = (key: string, payload?: Record<string, unknown>) => string

function mapMonitor(raw: UpstreamMonitor, t: TranslateFn, now: number): ChannelMonitor {
  // Pick whichever availability number the deployment actually populates.
  // Most operators only collect 7-day data; 15d and 30d are commonly null.
  const availability =
    raw.availability_7d ?? raw.availability_15d ?? raw.availability_30d ?? 0
  const latencyRaw = raw.primary_latency_ms ?? raw.latency_ms ?? raw.avg_latency_7d_ms ?? 0
  return {
    id: String(raw.id),
    name: raw.name || `Monitor ${raw.id}`,
    availability: Number(availability.toFixed(2)),
    latency: Math.round(latencyRaw ?? 0),
    status: statusFromPrimary(raw.primary_status),
    uptimeHistory: buildUptimeBars(raw.timeline),
    uptimeSpanLabel: buildSpanLabel(raw.timeline, now, t),
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getChannels(): Promise<Channel[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_CHANNELS.map((c) => ({ ...c }))
  }
  const body = unwrap<UpstreamAvailableChannel[] | { items?: UpstreamAvailableChannel[] }>(
    await client.get('/channels/available'),
  )
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map(mapChannel)
}

/**
 * @param translate i18n `t` function so the span caption matches the active
 *   locale ("10 checks · last 6m" vs "10 次检测 · 最近 6 分钟"). Pass
 *   `useI18n().t` from the calling view.
 * @param now Optional clock-injection point for tests.
 */
export async function getChannelMonitors(
  translate?: TranslateFn,
  now: number = Date.now(),
): Promise<ChannelMonitor[]> {
  const t: TranslateFn = translate ?? ((k) => k)
  if (isMockMode()) {
    await delay()
    return MOCK_MONITORS.map((m) => ({
      ...m,
      uptimeHistory: [...m.uptimeHistory],
      uptimeSpanLabel: t('status.spanLabel', { n: m.uptimeHistory.length, span: t('common.timeAgo.day', { n: 30 }) }),
    }))
  }
  const body = unwrap<UpstreamMonitor[] | { items?: UpstreamMonitor[] }>(
    await client.get('/channel-monitors'),
  )
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map((raw) => mapMonitor(raw, t, now))
}
