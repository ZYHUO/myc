/**
 * Hybrid API utilities.
 *
 * `VITE_USE_MOCK=true` (the default) makes every `api/*.ts` return its
 * in-memory fixtures so the UI can run without a backend. Flip the flag to
 * `false` and each call falls through to `client.<method>()` against
 * sub2api's real endpoints. Endpoint shapes are kept aligned with the real
 * backend (snake_case, etc.) so the only thing that changes at the seam is
 * where the data comes from.
 */
export const isMockMode = (): boolean =>
  String(import.meta.env.VITE_USE_MOCK ?? 'true').toLowerCase() !== 'false'

/** Simulate latency so loading states are visible in mock mode. */
export const delay = (ms = 300): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * sub2api wraps every successful response in a `{code, message, data}`
 * envelope. Some endpoints return the payload directly (older routes, or
 * when we hit mock data). `unwrap` accepts either shape and returns just
 * the payload.
 */
export interface ApiResponse<T> {
  code?: number
  message?: string
  data: T
}

export function unwrap<T>(res: { data: unknown }): T {
  const body = res.data
  if (
    body !== null &&
    typeof body === 'object' &&
    'data' in body &&
    ('code' in body || 'message' in body)
  ) {
    return (body as ApiResponse<T>).data
  }
  return body as T
}

/** Narrow access to an axios-shaped error's HTTP status, no import required. */
export function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } } | undefined)?.response?.status
}
