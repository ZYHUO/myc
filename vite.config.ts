import { defineConfig, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

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
      // Workbox precaches all built assets and adds two runtime-cache routes
      // so the SPA shell loads instantly on repeat visits and slow nets.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        // Don't intercept the API proxy — those calls need fresh data and the
        // SW would otherwise return a stale (or wrong) response from cache.
        navigateFallbackDenylist: [/^\/api\//],
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

export default defineConfig({
  plugins: [vue(), tailwindcss(), pwaPlugin],
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
