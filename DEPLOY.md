# Deploying Amodel

The SPA needs sub2api as its backend. There are two supported topologies — pick
one. The choice is mostly about how much infra you want to run.

---

## A. Single binary (recommended)

sub2api can serve the built SPA + the management API + the AI gateway from
one Go process. Everything is on one origin so there's no CORS, no rewrite
config, no chance of `/v1/messages` falling into the SPA's 404 page.

1. Drop this repo's `dist/` into sub2api's `frontend/dist` location.
2. Rebuild sub2api with the embed tag:
   ```bash
   cd /path/to/sub2api/backend
   go build -tags embed -o sub2api ./cmd/server
   ```
3. Run the resulting binary. It exposes:
   - `/` → SPA (this project's built assets)
   - `/api/v1/*` → management API
   - `/v1/*` → AI gateway (`/v1/messages`, `/v1/chat/completions`, etc.)
   - `/v1/webhook/*` → payment provider callbacks

This is what sub2api's own Dockerfile does. The two `Dockerfile.*` files in
the sub2api repo build exactly this layout. You don't need any of the
hosting configs in B below.

---

## B. Split deployment (static host + remote backend)

If you want to host the SPA on Cloudflare Pages / Netlify / Vercel / S3 +
CloudFront and point it at a sub2api running elsewhere, you MUST configure
URL rewrites — otherwise the static host will return `index.html` for
`/v1/messages` and your SDK gets HTML instead of JSON.

### Setup

1. Set the env var `BACKEND_URL` to your sub2api's public URL at build time:

   ```bash
   BACKEND_URL=https://api.your-domain.com pnpm build
   ```

   This is also how Cloudflare Pages / Netlify / Vercel let you configure
   build env from their dashboard.

2. The build emits two hosting-config files into `dist/`:

   - `dist/_redirects` — used by **Cloudflare Pages** and **Netlify**.
   - `dist/vercel.json` — used by **Vercel**.

   Both forward `/api/v1/*` and `/v1/*` to `${BACKEND_URL}` with HTTP 200
   (transparent proxy, no client-visible redirect), and keep the SPA
   catch-all last so client-side routing still works.

3. Deploy `dist/` to your host. That's it.

### Verifying

After deploy, with `BACKEND_URL=https://api.example.com`:

```bash
# Should return JSON from sub2api, NOT the SPA's HTML:
curl -s https://your-frontend.example.com/api/v1/settings/public | head -c 80

# Should return a JSON error (key missing) or a real model response —
# again, NOT HTML:
curl -s https://your-frontend.example.com/v1/models \
  -H "Authorization: Bearer YOUR_KEY"
```

If you get HTML back, the rewrite isn't applied. Check that `BACKEND_URL`
was set during the build (`dist/_redirects` should contain real URLs, not
the placeholder comments).

### nginx / Caddy / your own reverse proxy

If you're not using one of those static hosts, run a reverse proxy that
forwards `/v1/*` and `/api/v1/*` to sub2api and falls back to the SPA's
`index.html` for everything else.

Minimal nginx:

```nginx
server {
  listen 443 ssl;
  server_name your-domain.com;
  root /var/www/amodel/dist;
  index index.html;

  location /v1/      { proxy_pass https://api.example.com; }
  location /api/v1/  { proxy_pass https://api.example.com; }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Caddy:

```
your-domain.com {
  root * /var/www/amodel/dist
  reverse_proxy /v1/*     https://api.example.com
  reverse_proxy /api/v1/* https://api.example.com
  try_files {path} /index.html
  file_server
}
```

---

## Why my SDK returned HTML

The SPA's router uses `:pathMatch(.*)*` for the not-found route. Any URL
the static host doesn't recognise falls through to `index.html`, so even
the `/v1/messages` endpoint returns the SPA shell. The SDK tries to parse
HTML as JSON and fails. Configuring the rewrites in B (or running the
single-binary setup in A) is the only way to fix this — it's a hosting
issue, not a frontend bug.

---

## Quick reference

| Env var              | When                | Default                       |
| -------------------- | ------------------- | ----------------------------- |
| `BACKEND_URL`        | Topology B build    | empty (rewrites disabled)     |
| `VITE_USE_MOCK`      | Local dev w/o backend | `true` in `.env`            |
| `VITE_API_BASE_URL`  | Override axios base | empty (uses `/api/v1`)        |
| `BUILD_VERSION`      | Override git SHA    | derived from `git rev-parse`  |
