export interface UsageLog {
  id: string
  time: string
  model: string
  keyName: string
  promptTokens: number
  completionTokens: number
  cost: number
  duration: number
  status: 'success' | 'error' | 'timeout'
}

export interface UsageStats {
  totalRequests: number
  totalTokens: number
  totalCost: number
  avgDuration: number
}

const MODELS = [
  'claude-sonnet-4',
  'gpt-4o',
  'gemini-2.5-pro',
  'deepseek-v3',
  'gpt-4o-mini',
  'claude-haiku-3.5',
]

const KEY_NAMES = ['生产环境-主密钥', '测试环境', 'Claude 专用', 'GPT-4o 测试']

const MOCK_LOGS: UsageLog[] = Array.from({ length: 50 }, (_, i) => {
  const model = MODELS[i % MODELS.length]
  const promptTokens = Math.floor(Math.random() * 4000) + 200
  const completionTokens = Math.floor(Math.random() * 3000) + 100
  const costMap: Record<string, number> = {
    'claude-sonnet-4': 0.003,
    'gpt-4o': 0.005,
    'gemini-2.5-pro': 0.004,
    'deepseek-v3': 0.001,
    'gpt-4o-mini': 0.0003,
    'claude-haiku-3.5': 0.0005,
  }
  const cost = +((promptTokens + completionTokens) * (costMap[model] || 0.002) / 1000).toFixed(4)
  const statuses: UsageLog['status'][] = ['success', 'success', 'success', 'success', 'error', 'success']
  return {
    id: `log_${String(i + 1).padStart(4, '0')}`,
    time: new Date(Date.now() - i * 120000).toISOString(),
    model,
    keyName: KEY_NAMES[i % KEY_NAMES.length],
    promptTokens,
    completionTokens,
    cost,
    duration: Math.floor(Math.random() * 3000) + 200,
    status: statuses[i % statuses.length],
  }
})

const MOCK_STATS: UsageStats = {
  totalRequests: 128456,
  totalTokens: 48520340,
  totalCost: 356.72,
  avgDuration: 1240,
}

export async function getUsageLogs(params?: {
  page?: number
  pageSize?: number
  model?: string
  dateFrom?: string
  dateTo?: string
}): Promise<{ data: UsageLog[]; total: number }> {
  await delay()
  let logs = [...MOCK_LOGS]
  if (params?.model) {
    logs = logs.filter((l) => l.model === params.model)
  }
  if (params?.dateFrom) {
    logs = logs.filter((l) => new Date(l.time) >= new Date(params.dateFrom!))
  }
  if (params?.dateTo) {
    const to = new Date(params.dateTo!)
    to.setHours(23, 59, 59, 999)
    logs = logs.filter((l) => new Date(l.time) <= to)
  }
  const total = logs.length
  const page = params?.page || 1
  const size = params?.pageSize || 20
  const start = (page - 1) * size
  return { data: logs.slice(start, start + size), total }
}

export async function getUsageStats(): Promise<UsageStats> {
  await delay()
  return { ...MOCK_STATS }
}

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}
