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
  uptimeHistory: ('up' | 'down' | 'degraded')[]
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
 * Build a 30-element uptime history (oldest first, today last) from sub2api's
 * sparse timeline plus the availability_*_d aggregates. Days where we have
 * real bucket data win; days without data are seeded from the matching
 * availability window, deterministically per channel + hour so refreshing the
 * page doesn't flicker the colors.
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
    const t = new Date(p.checked_at).getTime()
    if (Number.isNaN(t) || t < cutoff) continue
    const idx = Math.floor((t - cutoff) / oneDay)
    if (idx < 0 || idx >= 30) continue
    const b = buckets[idx]
    if (p.status === 'up' || p.status === 'healthy') b.up++
    else if (p.status === 'degraded') b.degraded++
    else b.down++
  }

  // Deterministic seed: channel id × Knuth multiplier, bucketed per hour so
  // identical reloads stay stable but the synthesized texture refreshes daily.
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

  const fill = (lo: number, hi: number, avail: number | undefined) => {
    const a = typeof avail === 'number' ? avail : 100
    for (let i = lo; i < hi; i++) {
      if (out[i]) continue
      out[i] = pick(a)
    }
  }
  // Index 0 is 30 days ago, index 29 is today.
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

function mapMonitor(raw: UpstreamMonitor): ChannelMonitor {
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
    uptimeHistory: synthesizeUptime30d(raw),
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

export async function getChannelMonitors(): Promise<ChannelMonitor[]> {
  if (isMockMode()) {
    await delay()
    return MOCK_MONITORS.map((m) => ({ ...m, uptimeHistory: [...m.uptimeHistory] }))
  }
  const body = unwrap<UpstreamMonitor[] | { items?: UpstreamMonitor[] }>(
    await client.get('/channel-monitors'),
  )
  const items = Array.isArray(body) ? body : body?.items ?? []
  return items.map(mapMonitor)
}
