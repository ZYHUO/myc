export interface ApiKey {
  id: string
  name: string
  key: string
  group: string
  status: 'active' | 'disabled'
  requests: number
  createdAt: string
}

const MOCK_KEYS: ApiKey[] = [
  {
    id: 'key_001',
    name: '生产环境-主密钥',
    key: 'sk-prod-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    group: 'default',
    status: 'active',
    requests: 128456,
    createdAt: '2025-11-02T08:30:00Z',
  },
  {
    id: 'key_002',
    name: '测试环境',
    key: 'sk-test-x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4',
    group: 'testing',
    status: 'active',
    requests: 34210,
    createdAt: '2025-12-15T14:20:00Z',
  },
  {
    id: 'key_003',
    name: '备用密钥',
    key: 'sk-backup-h4g3f2e1d0c9b8a7z6y5x4w3v2u1t0s9',
    group: 'default',
    status: 'disabled',
    requests: 5230,
    createdAt: '2026-01-08T10:00:00Z',
  },
  {
    id: 'key_004',
    name: 'Claude 专用',
    key: 'sk-claude-m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6',
    group: 'claude',
    status: 'active',
    requests: 67890,
    createdAt: '2026-02-20T16:45:00Z',
  },
  {
    id: 'key_005',
    name: 'GPT-4o 测试',
    key: 'sk-gpt4o-c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2',
    group: 'testing',
    status: 'active',
    requests: 8920,
    createdAt: '2026-03-10T09:15:00Z',
  },
]

export async function getKeys(): Promise<ApiKey[]> {
  await delay()
  return [...MOCK_KEYS]
}

export async function createKey(data: Partial<ApiKey>): Promise<ApiKey> {
  await delay()
  const newKey: ApiKey = {
    id: `key_${Date.now()}`,
    name: data.name || '新密钥',
    key: `sk-new-${Math.random().toString(36).slice(2)}`,
    group: data.group || 'default',
    status: 'active',
    requests: 0,
    createdAt: new Date().toISOString(),
  }
  MOCK_KEYS.push(newKey)
  return newKey
}

export async function updateKey(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
  await delay()
  const idx = MOCK_KEYS.findIndex((k) => k.id === id)
  if (idx === -1) throw new Error('Key not found')
  Object.assign(MOCK_KEYS[idx], data)
  return { ...MOCK_KEYS[idx] }
}

export async function deleteKey(id: string): Promise<void> {
  await delay()
  const idx = MOCK_KEYS.findIndex((k) => k.id === id)
  if (idx !== -1) MOCK_KEYS.splice(idx, 1)
}

function delay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}
