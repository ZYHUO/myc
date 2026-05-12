/**
 * Stale-cache mitigation, two layers deep.
 *
 * Layer 1 — server-side: `vite.config.ts` configures the service worker to
 * use `NetworkFirst` for navigation (HTML) requests with a 3 s timeout. So a
 * fresh deploy is picked up on the next page load even if the previous SW
 * had no `skipWaiting` (the case that bit us before).
 *
 * Layer 2 — runtime watchdog (this file): every page load AND every 60 s,
 * fetch `/version.json` (a tiny file emitted at build time) bypassing all
 * caches. Compare it with `__APP_VERSION__` baked into THIS bundle. If the
 * server has a newer build, unregister all SWs, wipe Cache Storage, and
 * reload. Users never need to know what a service worker is.
 *
 * The runtime watchdog also catches the catastrophic case where the running
 * tab is so old it doesn't know about the new SW lifecycle at all — by
 * comparing a content hash directly we sidestep the SW entirely.
 */

const VERSION_URL = '/version.json'
const POLL_INTERVAL_MS = 60_000

let alreadyReloading = false

interface VersionPayload {
  version?: string
  builtAt?: string
}

async function fetchServerVersion(): Promise<string | null> {
  try {
    // `cache: 'no-store'` bypasses the HTTP cache. We also pass
    // a cache-buster querystring as belt-and-braces against intermediaries
    // that ignore Cache-Control on small JSON.
    const res = await fetch(`${VERSION_URL}?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' },
    })
    if (!res.ok) return null
    const body = (await res.json()) as VersionPayload
    return body?.version ?? null
  } catch {
    return null
  }
}

async function purgeAndReload(reason: string): Promise<void> {
  if (alreadyReloading) return
  alreadyReloading = true
  // eslint-disable-next-line no-console
  console.info('[update]', reason, '— clearing caches and reloading.')

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
    }
  } catch { /* ignore */ }

  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
    }
  } catch { /* ignore */ }

  // Querystring busts any intermediary HTTP cache; `replace` keeps the
  // browser back button sane.
  const url = new URL(window.location.href)
  url.searchParams.set('_v', Date.now().toString(36))
  window.location.replace(url.toString())
}

/** Returns true when the running bundle is older than what's on the server. */
export async function checkForUpdate(): Promise<boolean> {
  const serverVersion = await fetchServerVersion()
  if (!serverVersion) return false
  if (serverVersion === __APP_VERSION__) return false
  await purgeAndReload(`Version mismatch (running ${__APP_VERSION__}, server ${serverVersion})`)
  return true
}

/**
 * Loading a hashed JS/CSS chunk that no longer exists on the server (typical
 * symptom of a stale HTML pointing at deleted assets) yields an `error` event
 * on the failed `<script>` / `<link>`. When that happens, the user is
 * unrecoverably stuck on broken UI — purge + reload is the only fix.
 */
function installChunkErrorHandler(): void {
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      let src: string | null = null
      if (target instanceof HTMLScriptElement) src = target.src
      else if (target instanceof HTMLLinkElement) src = target.href
      if (!src) return
      // Only react to our own asset chunks; ignore third-party errors.
      if (!src.includes('/assets/')) return
      void purgeAndReload(`Chunk failed to load: ${src}`)
    },
    true, // capture — `error` doesn't bubble for resource loads
  )

  // Vue Router emits this for dynamic-import failures too.
  window.addEventListener('unhandledrejection', (event) => {
    const message = String(event.reason?.message ?? event.reason ?? '')
    if (
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('error loading dynamically imported module') ||
      message.includes('Importing a module script failed')
    ) {
      void purgeAndReload(`Dynamic import failed: ${message}`)
    }
  })
}

/**
 * Auto-reload when the Service Worker controller changes — but only if it's
 * an actual update, not the initial install.
 *
 * `controllerchange` fires in two situations:
 *   1. First time a SW takes control of a page that loaded without one
 *      (i.e. the very first visit, before any SW existed). In this case
 *      the page works fine; reloading would just bounce the user pointlessly
 *      — and breaks Playwright tests that load the SPA fresh.
 *   2. A new SW activates with `clientsClaim`, replacing the previous SW.
 *      The page's currently-loaded JS may reference assets the new SW
 *      doesn't precache. THIS is when we want to reload.
 *
 * We distinguish the two by remembering whether a controller existed at
 * boot. If yes, every subsequent change is an update; if no, we ignore
 * the first change (the initial install) and listen for updates after.
 */
function installControllerChangeReload(): void {
  if (!('serviceWorker' in navigator)) return
  let isFirstChange = !navigator.serviceWorker.controller
  const RELOAD_FLAG = 'amodel.sw.reloaded'

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isFirstChange) {
      isFirstChange = false
      return
    }
    // Guard against reload loops.
    if (sessionStorage.getItem(RELOAD_FLAG)) return
    sessionStorage.setItem(RELOAD_FLAG, '1')
    // eslint-disable-next-line no-console
    console.info('[update] Service Worker updated — reloading for fresh assets.')
    window.location.reload()
  })
  // Clear the guard once the page has loaded so the next legit SW change
  // can trigger another reload.
  window.addEventListener('load', () => {
    setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 5_000)
  })
}

/**
 * Wire up the watchdog. Call once from main.ts after mount. Safe to call in
 * dev — it just no-ops if `version.json` 404s (which it does in dev because
 * we don't serve it from the dev server).
 */
export function installUpdateWatchdog(): void {
  if (typeof window === 'undefined') return

  // Emergency single-click recovery. Support can hand out the URL
  // `https://amodel.example.com/?force-refresh=1` to anyone stuck on a
  // broken bundle; visiting that URL triggers a full cache + SW purge.
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('force-refresh')) {
      void purgeAndReload('?force-refresh in URL')
      return
    }
  } catch { /* ignore malformed URL */ }

  installChunkErrorHandler()
  installControllerChangeReload()
  installServiceWorkerUpdatePoll()

  // First check shortly after boot, then on a steady cadence.
  setTimeout(() => { void checkForUpdate() }, 5_000)
  setInterval(() => { void checkForUpdate() }, POLL_INTERVAL_MS)

  // Also recheck whenever the tab becomes visible after being hidden — many
  // users leave Amodel parked in a background tab for hours.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkForUpdate()
  })
}

/**
 * Browsers check `/sw.js` for updates on navigation, but they respect HTTP
 * caching headers — so a misconfigured CDN can pin a stale SW for hours.
 * We periodically call `registration.update()`, which bypasses the SW's own
 * cache and forces a fresh fetch of `/sw.js`. If a newer SW is on the
 * server, it installs, skipWaitings, activates, and (thanks to
 * clientsClaim) takes over the tab — at which point our `controllerchange`
 * listener triggers the reload.
 */
function installServiceWorkerUpdatePoll(): void {
  if (!('serviceWorker' in navigator)) return
  const POKE_INTERVAL_MS = 5 * 60_000 // every 5 minutes

  const poke = () => {
    void navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.update())
      .catch(() => { /* offline / transient */ })
  }

  // First poke after the tab settles, then on a steady cadence.
  setTimeout(poke, 10_000)
  setInterval(poke, POKE_INTERVAL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') poke()
  })
}
