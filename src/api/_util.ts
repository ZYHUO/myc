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
