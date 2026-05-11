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
  status: 'healthy' | 'degraded' | 'down'
  uptimeHistory: ('up' | 'down' | 'degraded')[]
}

const MOCK_CHANNELS: Channel[] = [
  {
    id: 'ch_001',
    name: 'OpenAI 官方',
    models: ['gpt-4o', 'gpt-4o-mini'],
    pricing: '¥0.035/1K tokens',
    status: 'online',
  },
  {
    id: 'ch_002',
    name: 'Anthropic 官方',
    models: ['claude-sonnet-4', 'claude-haiku-3.5'],
    pricing: '¥0.025/1K tokens',
    status: 'online',
  },
  {
    id: 'ch_003',
    name: 'Google AI',
    models: ['gemini-2.5-pro'],
    pricing: '¥0.028/1K tokens',
    status: 'online',
  },
  {
    id: 'ch_004',
    name: 'DeepSeek 官方',
    models: ['deepseek-v3'],
    pricing: '¥0.008/1K tokens',
    status: 'online',
  },
  {
    id: 'ch_005',
    name: 'Azure OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini'],
    pricing: '¥0.040/1K tokens',
    status: 'degraded',
  },
  {
    id: 'ch_006',
    name: 'AWS Bedrock',
    models: ['claude-sonnet-4', 'claude-haiku-3.5', 'gemini-2.5-pro'],
    pricing: '¥0.038/1K tokens',
    status: 'online',
  },
]

function generateUptimeHistory(): ('up' | 'down' | 'degraded')[] {
  return Array.from({ length: 30 }, () => {
    const rand = Math.random()
    if (rand > 0.95) return 'down'
    if (rand > 0.88) return 'degraded'
    return 'up'
  })
}

const MOCK_MONITORS: ChannelMonitor[] = MOCK_CHANNELS.map((ch) => ({
  id: ch.id,
  name: ch.name,
  availability: ch.status === 'offline' ? 0 : +(95 + Math.random() * 5).toFixed(2),
  latency: Math.floor(Math.random() * 400) + 50,
  status: ch.status === 'online' ? 'healthy' : ch.status === 'degraded' ? 'degraded' : 'down',
  uptimeHistory: generateUptimeHistory(),
}))

export async function getChannels(): Promise<Channel[]> {
  await delay()
  return MOCK_CHANNELS.map((c) => ({ ...c }))
}

export async function getChannelMonitors(): Promise<ChannelMonitor[]> {
  await delay()
  return MOCK_MONITORS.map((m) => ({ ...m, uptimeHistory: [...m.uptimeHistory] }))
}

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}
