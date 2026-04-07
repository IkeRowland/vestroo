# Operational Guidelines

## Security

* **Authentication:** Customer flows may be guest-first; when auth is required, use **Supabase Auth** with RLS. `middleware.ts` may be extended for session refresh — keep secrets server-only.
* **Input Validation:** Server Actions and webhooks validate input with **Zod** where implemented.
* **Database access:** Prefer RLS for user-scoped data; use `SUPABASE_SERVICE_ROLE_KEY` only in Server Actions / Route Handlers that must bypass RLS, and never expose it to the client.
* **Secrets:** Managed via Vercel (and local `.env.local`). See [environment-vars.md](environment-vars.md).
* **Dependencies:** Lockfile, audits, and manual/scheduled audit expectations are documented in [dependencies.md](dependencies.md).

### HTTP security headers (Next.js)

Baseline headers are set in **`next.config.ts`** via `headers()` (not middleware) so they apply consistently without matcher edge cases.

| Header | Value | Rationale |
| ------ | ----- | --------- |
| `X-Content-Type-Options` | `nosniff` | Reduces MIME-type confusion attacks; browsers stick to declared content types. |
| `X-Frame-Options` | `SAMEORIGIN` | Reduces clickjacking while allowing same-origin embedding if needed later (`DENY` is stricter but can break legitimate same-site frames). |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full URL only for same-origin navigations; cross-origin requests get at most the origin — balances privacy and debugging. |
| `Permissions-Policy` | `geolocation=(self), microphone=(), camera=(), payment=(), usb=()` | Disables powerful features by default; **`geolocation=(self)`** allows the booking/maps flow on this origin only. Tighten further if a feature is removed. |

These headers are chosen to be conservative and compatible with **`next/image`**, static assets, and typical Vercel previews. Revisit if you add iframes, payment widgets, or stricter CSP (`frame-ancestors`) in a later hardening story.

## API patterns

* Prefer **Server Actions** for in-app forms and mutations; use **Route Handlers** for webhooks and external HTTP. See [front-end-api-interaction.md](front-end-api-interaction.md).

## Testing Requirements

* **E2E Testing:** **Playwright** (`npm run test:e2e`) for critical booking paths when configured.
* **Unit Testing:** **Vitest** (`npm run test`) for business logic (e.g. pricing, actions under `src/`).
* **Quality gate:** Before merge, contributors run **`npm run lint`**, **`npm run test`**, and **`npm run build`** (see **[CONTRIBUTING.md](../CONTRIBUTING.md)**). This repo has **no** GitHub Actions workflows; use **Vercel** (or your host) build checks if you want automation.

### Hardening, go-live, incidents, and rollback

For a **single index** covering **E2E vs CI**, **load smoke**, **monitoring**, **go/no-go checklist**, **backup pointers**, and **high-level deploy/rollback** (Vercel rollback, **forward-only** migrations per [staging-and-promotion.md](staging-and-promotion.md)), use **[hardening-and-go-live.md](hardening-and-go-live.md)**. Link it from release checklists and on-call notes; it complements this document’s security and testing baseline.

## Coding Standards

* **Type Safety:** TypeScript strict mode.
* **Framework:** Next.js 15 (App Router) with Server Actions.
* **Component Architecture:** Feature folders and Shadcn/UI primitives under `src/components/ui`.

