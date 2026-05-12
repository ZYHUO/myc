import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

// Build version: prefer git short SHA so two builds of the same source
// produce the same hash. Fallback to a base36 timestamp for environments
// without git (e.g. tarball deploys). CI may inject BUILD_VERSION explicitly.
function resolveBuildVersion(): string {
  if (process.env.BUILD_VERSION) return process.env.BUILD_VERSION
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return Date.now().toString(36)
  }
}
const BUILD_VERSION = resolveBuildVersion()
const BUILT_AT = new Date().toISOString()

// Storybook's CLI sets STORYBOOK=true on its own builds. We skip the PWA
// plugin in that case because Storybook ships a ~3 MB internal runtime that
// blows past Workbox's default 2 MB precache cap — and we don't want a
// service worker in the component docs anyway.
const isStorybook = process.env.STORYBOOK === 'true'

const pwaPlugin: PluginOption | false = isStorybook
  ? false
  : VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // Manifest powers "Install Amodel" on mobile + desktop. Icons reuse
      // the cream-and-terracotta SVG favicon — fine for monochrome contexts
      // and small enough to inline.
      manifest: {
        name: 'Amodel',
        short_name: 'Amodel',
        description: 'One API key for Claude, GPT, Gemini and friends.',
        theme_color: '#C15F3C',
        background_color: '#FAF9F5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      // Workbox precaches all built assets and adds runtime-cache routes so
      // the SPA shell loads instantly on repeat visits AND fresh deploys
      // are picked up on the next reload.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // Don't precache version.json (always-network) or recover.html (the
        // standalone reset page; we want every request for it to reach the
        // server so a future update can replace it).
        globIgnores: ['**/version.json', '**/recover.html'],
        navigateFallback: '/index.html',
        // Don't intercept these — the API needs fresh data, version.json
        // powers the runtime watchdog, and recover.html must reach the
        // server even when the SW is otherwise broken.
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/version\.json$/,
          /^\/recover\.html$/,
        ],
        // CRITICAL for shipping fixes: without these, a new SW only activates
        // after EVERY tab closes — users can stare at a stale UI through
        // refreshes for days. With skipWaiting the new SW takes over on the
        // next page load; clientsClaim makes it own all open tabs immediately.
        // cleanupOutdatedCaches sweeps Workbox precache buckets from older
        // versions so storage doesn't slowly bloat.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Navigation requests (HTML) — NetworkFirst with a tight 3 s
            // timeout. This is the layer that stops users seeing a
            // never-updating UI. If the network responds, fresh HTML wins;
            // if it times out / 4xx / offline, the cached shell takes
            // over so the app still loads.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // version.json must always come from the network; never cache.
            // Used by the runtime watchdog to detect a stale-bundle state
            // and force a clean reload.
            urlPattern: ({ url }) => url.pathname === '/version.json',
            handler: 'NetworkOnly',
          },
          {
            // recover.html is the standalone reset page. Never cache it —
            // it must always reach the server so a user who's stuck can
            // visit /recover.html and have it tear down whatever's broken.
            urlPattern: ({ url }) => url.pathname === '/recover.html',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*\.(woff2|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-fonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // sub2api responses can come from any host (proxy in dev, same
            // origin in prod). NetworkFirst keeps freshness but lets us
            // still respond when the user is offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sub2api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Don't register the SW during `pnpm dev` so hot-reload isn't
        // intercepted by a stale precache.
        enabled: false,
      },
    })

/**
 * Emits dist/version.json containing the current build hash. The runtime
 * watchdog fetches this (bypassing all caches) every minute to detect
 * stale-bundle situations and trigger a clean reload — without ever asking
 * the user to clear caches manually.
 */
function emitVersionJson(): PluginOption {
  return {
    name: 'amodel:emit-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: BUILD_VERSION, builtAt: BUILT_AT }, null, 2),
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), pwaPlugin, !isStorybook && emitVersionJson()],
  // Inject the build version + build timestamp into the SPA bundle so the
  // runtime watchdog can compare itself against /version.json.
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
    __APP_BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
    proxy: {
      '/api/v1': {
        target: 'https://sub2api.gomami.wiki',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Lift the warning threshold a touch — our largest chunk after vendor
    // splitting is still well under 500 KB raw.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual vendor split. Without this, Vite groups all node_modules
        // into one giant chunk that happens to share a hash with whatever
        // lazy view loaded first (e.g. UiConfirm). Splitting deliberately
        // gives the browser smaller, more cacheable chunks and stops the
        // "why is UiConfirm 200 KB?" mystery.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](vue|@vue|vue-router|pinia)[\\/]/.test(id)) return 'vue-core'
          if (/[\\/]node_modules[\\/]vue-i18n[\\/]/.test(id)) return 'vue-i18n'
          if (/[\\/]node_modules[\\/]@intlify[\\/]/.test(id)) return 'vue-i18n'
          if (/[\\/]node_modules[\\/]axios[\\/]/.test(id)) return 'axios'
          if (/[\\/]node_modules[\\/]@vueuse[\\/]/.test(id)) return 'vueuse'
          // everything else into a generic vendor bucket so the app's lazy
          // chunks aren't polluted with unrelated dependencies.
          return 'vendor'
        },
      },
    },
  },
})
