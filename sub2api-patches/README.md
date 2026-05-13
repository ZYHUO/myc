# sub2api backend patches

Source-controlled archive of the modifications I made to `Wei-Shaw/sub2api`
while building Amodel. Kept here because the user's commit-signing setup is
scoped to `zyhuo/myc` and can't sign commits in the unrelated sub2api
working tree.

Apply this once you've got your own fork of sub2api.

## What's in this folder

| File | What it is |
|---|---|
| `0001-geetest-and-email-redesign.diff` | Unified diff against `main` covering every change |
| `geetest_service.service.go` | New file — full text of `internal/service/geetest_service.go` |
| `geetest_service.repository.go` | New file — full text of `internal/repository/geetest_service.go` |

The two `.go` files are duplicates of what's inside the patch — they're
broken out so you can read the new code at a glance without parsing the
diff.

## What it does

1. **Verification-code + password-reset emails redesigned** to match the
   Amodel SPA's Swiss-minimal look (cream background, sharp serif display,
   monospace code, single black CTA on the reset email, inline styles
   throughout). Replaces the previous purple-gradient template.

2. **Geetest v4 CAPTCHA support** added as a peer to the existing
   Cloudflare Turnstile integration. Admin can enable either or both;
   auth flows verify whichever token the request carries.
   - New settings: `geetest_enabled`, `geetest_captcha_id`,
     `geetest_captcha_key`
   - New service: `GeetestService` (mirrors `TurnstileService` shape)
   - New verifier: `repository.NewGeetestVerifier()` — POSTs to
     `https://gcaptcha4.geetest.com/validate` with an HMAC-SHA256
     sign_token computed from the captcha_key
   - Wire surface: `geetest_token` JSON field on the register, send-code,
     login, and forgot-password DTOs

## How to apply

```bash
# From your sub2api fork
git checkout -b feat/geetest-and-email-redesign main
git apply path/to/myc/sub2api-patches/0001-geetest-and-email-redesign.diff
go build ./...
go test ./internal/service/... ./internal/handler/... ./internal/server/middleware/...
# All pass on my machine — sub2api's existing test suite covers the
# wiring; the patch doesn't add new tests.
git add -A
git commit -m "feat: Geetest v4 + redesign verification emails"
git push -u origin feat/geetest-and-email-redesign
```

Then open a PR (against your own fork's `main`, since we're not pushing
to `Wei-Shaw/sub2api`).

## Admin setup once the patch is deployed

1. Get a Geetest v4 captcha pair from <https://www.geetest.com/>
   (free tier exists). Note the `captcha_id` and `captcha_key`.
2. In sub2api admin UI → Settings → Security:
   - Set `geetest_enabled = true`
   - Paste `captcha_id` into `geetest_captcha_id`
   - Paste `captcha_key` into `geetest_captcha_key`
   - Save
3. The SPA picks it up from `/settings/public` on the next page load.
   Both Turnstile and Geetest can be on simultaneously — Amodel will
   render Geetest preferentially (see `UiCaptcha.vue`).

## Files the patch touches

```
backend/cmd/jwtgen/main.go                                  (signature update)
backend/cmd/server/wire_gen.go                              (DI wiring)
backend/internal/handler/admin/setting_handler.go           (admin DTO + save)
backend/internal/handler/auth_handler.go                    (DTOs + verify calls)
backend/internal/handler/auth_oauth_pending_flow_test.go    (signature update)
backend/internal/handler/auth_session_revocation_test.go    (signature update)
backend/internal/handler/auth_wechat_oauth_test.go          (signature update)
backend/internal/handler/dto/settings.go                    (public + admin DTOs)
backend/internal/handler/setting_handler.go                 (public projection)
backend/internal/handler/user_handler_test.go               (signature updates)
backend/internal/repository/geetest_service.go              (NEW)
backend/internal/repository/wire.go                         (DI provider)
backend/internal/server/middleware/admin_auth_test.go       (signature update)
backend/internal/server/middleware/jwt_auth_test.go         (signature updates)
backend/internal/service/auth_service.go                    (GeetestService field + methods)
backend/internal/service/auth_service_email_bind_test.go    (signature updates)
backend/internal/service/auth_service_identity_sync_test.go (signature update)
backend/internal/service/domain_constants.go                (3 setting keys)
backend/internal/service/email_service.go                   (redesigned templates)
backend/internal/service/geetest_service.go                 (NEW)
backend/internal/service/setting_service.go                 (load/save/getters/public)
backend/internal/service/settings_view.go                   (struct fields)
backend/internal/service/wire.go                            (DI provider)
```
