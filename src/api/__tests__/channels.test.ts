import { describe, expect, it } from 'vitest'
import { synthesizeUptime30d } from '../channels'

// Pin "now" to a stable wall-clock so day-bucket math is deterministic across CI machines.
// The function buckets by *local midnight* — happy-dom inherits the host TZ, so we lock the
// clock to a UTC noon to dodge DST edges on both sides of the cutoff.
const NOW = new Date('2026-05-12T12:00:00.000Z').getTime()

interface MonitorLike {
  id: number
  name: string
  availability_7d?: number
  availability_15d?: number
  availability_30d?: number
  timeline?: Array<{ status: string; latency_ms: number | null; checked_at?: string }>
}

function monitor(over: Partial<MonitorLike>): MonitorLike {
  return {
    id: 1,
    name: 'test',
    availability_7d: 100,
    availability_15d: 100,
    availability_30d: 100,
    timeline: [],
    ...over,
  }
}

describe('synthesizeUptime30d', () => {
  it('returns 30 entries regardless of input shape', () => {
    expect(synthesizeUptime30d(monitor({ timeline: [] }), NOW)).toHaveLength(30)
    expect(synthesizeUptime30d(monitor({ timeline: undefined }), NOW)).toHaveLength(30)
  })

  it('all-up everywhere when availability is 100%', () => {
    const out = synthesizeUptime30d(
      monitor({ availability_7d: 100, availability_15d: 100, availability_30d: 100 }),
      NOW,
    )
    expect(out.every((s) => s === 'up')).toBe(true)
  })

  it('produces some non-up buckets when availability is low', () => {
    const out = synthesizeUptime30d(
      monitor({ availability_7d: 60, availability_15d: 60, availability_30d: 60 }),
      NOW,
    )
    const downOrDegraded = out.filter((s) => s !== 'up').length
    // With 60% availability across 30 buckets, the synthesizer should mark a
    // healthy fraction of them as down/degraded. We just check it's not zero
    // and not absurd.
    expect(downOrDegraded).toBeGreaterThan(0)
    expect(downOrDegraded).toBeLessThan(30)
  })

  it('is deterministic for the same channel id within the same hour', () => {
    const m = monitor({ availability_7d: 70, availability_15d: 70, availability_30d: 70 })
    const a = synthesizeUptime30d(m, NOW)
    const b = synthesizeUptime30d(m, NOW + 60_000) // 1 minute later, same hour
    expect(a).toEqual(b)
  })

  it('changes across hours so the texture refreshes', () => {
    const m = monitor({ availability_7d: 60, availability_15d: 60, availability_30d: 60 })
    const a = synthesizeUptime30d(m, NOW)
    const b = synthesizeUptime30d(m, NOW + 3 * 60 * 60_000) // 3 hours later
    expect(a).not.toEqual(b)
  })

  it('real timeline data overrides synthesis for the matching day bucket', () => {
    // Same-day timeline entry (relative to NOW) marked "down" should produce 'down' in the last bucket.
    const today = new Date(NOW)
    today.setHours(8, 0, 0, 0)
    const m = monitor({
      availability_7d: 100,
      availability_15d: 100,
      availability_30d: 100,
      timeline: [
        { status: 'down', latency_ms: null, checked_at: today.toISOString() },
        { status: 'down', latency_ms: null, checked_at: today.toISOString() },
        { status: 'down', latency_ms: null, checked_at: today.toISOString() },
        { status: 'down', latency_ms: null, checked_at: today.toISOString() },
        { status: 'down', latency_ms: null, checked_at: today.toISOString() },
      ],
    })
    const out = synthesizeUptime30d(m, NOW)
    expect(out[29]).toBe('down')
  })

  it('treats "healthy" timeline status as up', () => {
    const today = new Date(NOW)
    today.setHours(8, 0, 0, 0)
    const m = monitor({
      timeline: [
        { status: 'healthy', latency_ms: 100, checked_at: today.toISOString() },
        { status: 'healthy', latency_ms: 100, checked_at: today.toISOString() },
      ],
    })
    const out = synthesizeUptime30d(m, NOW)
    expect(out[29]).toBe('up')
  })

  it('mixed up + degraded in the same bucket leans degraded', () => {
    const today = new Date(NOW)
    today.setHours(8, 0, 0, 0)
    const m = monitor({
      timeline: [
        { status: 'up', latency_ms: 100, checked_at: today.toISOString() },
        { status: 'degraded', latency_ms: 800, checked_at: today.toISOString() },
        { status: 'degraded', latency_ms: 800, checked_at: today.toISOString() },
      ],
    })
    expect(synthesizeUptime30d(m, NOW)[29]).toBe('degraded')
  })

  it('ignores out-of-range timeline points', () => {
    // Point 60 days ago — should not affect the 30-day window at all.
    const ancient = new Date(NOW - 60 * 86_400_000).toISOString()
    const m = monitor({
      timeline: [
        { status: 'down', latency_ms: null, checked_at: ancient },
      ],
    })
    // No real data in any bucket -> all synthesized from 100% avail = all up.
    const out = synthesizeUptime30d(m, NOW)
    expect(out.every((s) => s === 'up')).toBe(true)
  })

  it('tolerates unparseable timestamps', () => {
    const m = monitor({
      timeline: [{ status: 'down', latency_ms: null, checked_at: 'not-a-date' }],
    })
    expect(() => synthesizeUptime30d(m, NOW)).not.toThrow()
  })

  it('different channel ids produce different patterns at low availability', () => {
    const a = synthesizeUptime30d(monitor({ id: 1, availability_7d: 50, availability_15d: 50, availability_30d: 50 }), NOW)
    const b = synthesizeUptime30d(monitor({ id: 2, availability_7d: 50, availability_15d: 50, availability_30d: 50 }), NOW)
    expect(a).not.toEqual(b)
  })
})
