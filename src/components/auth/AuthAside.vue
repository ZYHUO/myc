<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores/settings'

/**
 * Marketing side panel that sits next to the auth form on lg+ screens.
 * Visible role: makes the auth pages feel less like a bare form and more
 * like the rest of the product. Functional role: zero — anything the
 * user must read to sign up belongs in the form column, never here.
 *
 * Content sources, in order of fallback:
 *   1. `settings.site_subtitle`   — admin-customised tagline if set
 *   2. i18n `auth.aside.*`        — locale-aware default copy
 *
 * Hidden under `lg` so the form gets the full viewport on phones.
 */

const { t, tm } = useI18n()
const settingsStore = useSettingsStore()

const tagline = computed(() => settingsStore.settings.site_subtitle || t('auth.aside.tagline'))

const bullets = computed<string[]>(() => {
  const raw = tm('auth.aside.bullets') as unknown
  return Array.isArray(raw) ? (raw as string[]) : []
})
</script>

<template>
  <aside class="relative hidden lg:flex flex-col justify-between bg-card border-l border-border overflow-hidden">
    <!-- Decorative grid + soft gradient. Pointer-events-none so it never
         steals clicks from the (currently nonexistent) overlay content. -->
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:32px_32px]" />
      <div class="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div class="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
    </div>

    <div class="relative px-10 xl:px-14 pt-14">
      <p class="text-[11px] uppercase tracking-[0.22em] text-muted-fg font-medium">{{ t('auth.aside.eyebrow') }}</p>
      <h2 class="mt-4 font-display font-normal tracking-tight text-3xl xl:text-4xl leading-tight max-w-md">
        {{ tagline }}
      </h2>

      <!-- Code snippet — the actual product value in 8 lines. Same key
           reads on every locale, since code isn't translatable. -->
      <div class="mt-10 rounded-xl border border-border bg-bg/70 backdrop-blur-sm overflow-hidden shadow-sm">
        <div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-card/50">
          <span class="h-2.5 w-2.5 rounded-full bg-red/70" />
          <span class="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span class="h-2.5 w-2.5 rounded-full bg-green/70" />
          <span class="ml-3 font-mono text-[11px] text-muted-fg">request.sh</span>
        </div>
        <pre class="px-4 py-4 text-[12.5px] leading-relaxed font-mono text-fg/90 overflow-x-auto"><span class="text-muted-fg">$</span> curl https://amodel.example/v1/chat/completions \
  -H <span class="text-primary">"Authorization: Bearer </span>$AMODEL_KEY<span class="text-primary">"</span> \
  -d '{
    <span class="text-primary">"model"</span>: <span class="text-green">"claude-sonnet-4"</span>,
    <span class="text-primary">"messages"</span>: [{<span class="text-primary">"role"</span>: <span class="text-green">"user"</span>, <span class="text-primary">"content"</span>: <span class="text-green">"hi"</span>}]
  }'</pre>
      </div>
    </div>

    <div class="relative px-10 xl:px-14 pb-14 mt-10">
      <ul class="space-y-3.5">
        <li v-for="b in bullets" :key="b" class="flex items-start gap-3 text-sm text-muted-fg leading-relaxed">
          <svg class="mt-1 h-3.5 w-3.5 shrink-0 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{{ b }}</span>
        </li>
      </ul>
    </div>
  </aside>
</template>
