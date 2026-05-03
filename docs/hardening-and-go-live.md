# Hardening and go-live

Single entry for **release owners** and **on-call**: what to run before production, where to look when things break, and how **staging promotion** fits together. This is **engineering** guidance—not legal sign-off. Secrets live only in provider dashboards; this document names **variables and surfaces**, never values.

**Related:** [Staging, preview, and migration promotion](staging-and-promotion.md) · [Local development](local-development.md) · [Contributing](../CONTRIBUTING.md) · [Operational guidelines](operational-guidelines.md) · [Environment variables](environment-vars.md) · [Integrations and payments (VST-13)](integrations-and-payments.md) · [Compliance and safety (VST-12)](compliance-and-safety.md)

---

## Non-functional requirements (touchpoints)

- **NFR.1.3 (availability):** Target high uptime (e.g. **99.9%** where agreed). Posture: synthetic **`GET /api/health`** (host cron, uptime robot, or CI-adjacent probe), plus provider dashboards for errors/latency (below).
- **NFR.3.1 (security):** **HTTPS/TLS** end-to-end for customer-facing hosts; **no secrets in git** (`.env.example` placeholders only; real values in Vercel / Supabase / GitHub Secrets).
- **NFR.4.1 (TypeScript):** New **E2E helpers** under `tests/e2e/` stay **typed** (no new untyped surfaces without a documented exception in the story or PR).

---

## E2E scope (Playwright)

**Command:** `npm run test:e2e` (alias for `playwright test`).

| Where | What runs | Notes |
| ----- | ---------- | ----- |
| **GitHub Actions (this repo)** | **None** | No workflows under **`.github/workflows/`**; run **lint / test / build** locally or on **Vercel** (see [CONTRIBUTING](../CONTRIBUTING.md)). |
| **Local / pre-release** | Full Playwright suite (multi-browser projects) | Start the app via Playwright’s `webServer` (`npm run dev`) or run `npm run dev` yourself with `reuseExistingServer`. |

**Local assumptions**

- **Node 20+**, dependencies installed (`npm ci` or `npm install`).
- **Maps / quote Server Actions:** Default booking specs that need live Google Places are limited; **`tests/e2e/booking-quote.spec.ts`** uses a **localhost-only** fixture: navigate to **`/book/search?e2e_fixture=quote`** (see `E2eBookingFixtureLoader`). The loader runs only when the browser host is **`localhost`** or **`127.0.0.1`** (typical **`next dev`** / Playwright `webServer`). It does **not** activate on production hostnames.
- **Trip request (Epic 10):** **`tests/e2e/trip-request.spec.ts`** uses **`/book/search?e2e_fixture=trip_request`** (same loader constraints). Full submit needs **Supabase** `bookings` insert; see [`docs/trip-request-hardening-10.6.md`](trip-request-hardening-10.6.md).
- **Supabase:** Stub URLs/keys (see [local-development.md](local-development.md) build placeholders) are enough for **`npm run build`** in isolation; **E2E** against real flows may need a **non-production** project and `.env.local`.

**CI Chromium-only (optional future job):** If you add a dedicated workflow job for E2E, run a single browser to save minutes, for example:

```bash
npx playwright test --project=chromium
```

Local developers keep **multi-browser** projects from `playwright.config.ts` unless they pass the same flag.

**PayFast (VST-13):** Default suite uses **`test.skip`** / **`@heavy`** for full redirect + ITN. See [Payments in E2E](#payments-in-e2e-payfast).

**Ops (`/ops/*`):** Automated Playwright for staff-gated routes is **deferred** (auth is **Supabase session + `profiles.role`** per [`src/lib/ops-auth.ts`](../src/lib/ops-auth.ts); injecting a realistic session in CI would require **test doubles**, **cookies**, and **non-production staff users**). **Ops remains in go-live** via the **manual smoke checklist** below—do not skip ops verification.

---

## Ops manual smoke checklist (pre-release)

Complete in **staging** (or pre-prod) with a **dispatcher** or **admin** test account (created in Supabase Auth + `profiles.role` in line with RLS). Expected: **no** access without staff role; **with** staff role, consoles load.

1. Open **`/ops/login`** (or your configured ops entry), sign in as **staff** → expect redirect into **`/ops`** (or dashboard), **not** `/ops/unauthorized`.
2. Open a **dispatch / board** view → list or calendar loads without a blank error boundary (spot-check **network 200** on data fetches).
3. **Negative:** sign in (or simulate) as a **customer-only** user → expect **`/ops/*`** to redirect to **`/ops/unauthorized`** or login, not expose PII or assignment actions.
4. Optional: trigger a **read-only** Server Action that calls `getOpsStaffForAction()`-gated code → expect **403-style** message when unauthenticated (no stack trace in UI).

**Future automated ops E2E:** Documented alignment with `getStaffSession` / cookie-based Supabase session: store `sb-*` cookies from a scripted login against **staging** Supabase, inject via Playwright `storageState`, and run against **Chromium** only; keep credentials in **GitHub Secrets** and **never** in the repo. Not implemented in this slice.

---

## Payments in E2E (PayFast)

| Mode | Configuration |
| ---- | ---------------- |
| **Sandbox** | `PAYFAST_URL=https://sandbox.payfast.co.za` (or default in client), sandbox merchant ID/key/passphrase in env (see [environment-vars.md](environment-vars.md)). |
| **Production cutover** | Point `PAYFAST_URL` at production PayFast host, **rotate** to **live** merchant credentials in the **host dashboard** only; confirm **ITN** URL is **HTTPS** and reachable from PayFast; re-run **manual** payment smoke. |

**Test strategy in repo**

- **`tests/e2e/booking-payment-payfast.spec.ts`:** **`@heavy`** test skipped unless **`RUN_HEAVY_E2E=1`**. Reason documents sandbox + ITN requirements.
- **Extension:** Use Playwright **`page.route`** to stub `https://sandbox.payfast.co.za/**` or the configured `PAYFAST_URL` origin if you need deterministic CI later without a real redirect.

---

## Load smoke (MVP)

**Purpose:** Short, **bounded** traffic to **`GET /api/health`** to catch obvious misconfiguration or overload—not benchmarking.

**Runnable artifact**

```bash
npm run load-smoke
```

Requires a **running** app (e.g. `npm run dev` or `npm start` on another terminal). Tunables (all optional):

| Env | Default | Max |
| --- | ------- | --- |
| `LOAD_SMOKE_BASE_URL` | `http://127.0.0.1:3000` | — |
| `LOAD_SMOKE_REQUESTS` | `12` | `100` |
| `LOAD_SMOKE_CONCURRENCY` | `1` | `3` |

Implementation: [`scripts/load-smoke.mjs`](../scripts/load-smoke.mjs).

---

## Monitoring (errors and latency)

| Surface | What to watch |
| ------- | -------------- |
| **Vercel** (or agreed host) | Deployment **logs**, **function duration**, **error rate**, **edge/request** failures for the production project. |
| **Supabase** | **Database** health, **Auth** anomalies, **API** errors; project **reports** / dashboard (tier-dependent). |
| **Application** | **`GET /api/health`** — JSON `status`, `message`, `timestamp`; **200** vs **503**. Use as a **synthetic probe** from an external monitor or scheduled job (no secrets in response). |

No additional APM is mandated unless the team opts in with explicit env/docs later.

---

## Runbook index

| Topic | Document |
| ----- | -------- |
| Security baseline, headers, testing expectations | [operational-guidelines.md](operational-guidelines.md) |
| Staging vs production, **forward-only** migrations, RLS review | [staging-and-promotion.md](staging-and-promotion.md) |
| Local env, migrations, stub booking | [local-development.md](local-development.md) |
| PRs, CI job scope, migrations in PRs | [CONTRIBUTING](../CONTRIBUTING.md) |
| Variable names and tiers | [environment-vars.md](environment-vars.md) |
| PayFast / maps | [integrations-and-payments.md](integrations-and-payments.md) |
| Incidents, retention, **restore drill** (engineering) | [compliance-and-safety.md](compliance-and-safety.md) · [VST-12 story](stories/vst-12.story.md) |

**Deploy / rollback (high level)**

- **Vercel:** Use **Instant Rollback** (or redeploy previous **Production** deployment) for bad app releases; see host docs.
- **Database:** Migrations are **forward-only** / append-only per [staging-and-promotion.md](staging-and-promotion.md)—**do not** “roll back” schema by deleting migration files; plan **forward** fixes.
- **Incident index:** Start from this doc + [operational-guidelines.md](operational-guidelines.md); escalate per team process.

---

## Backup verification (pointers only)

- **Supabase:** Use the project dashboard for **backups** / **PITR** (plan-dependent). Confirm **backup window** and **retention** match org expectations—**no** credentials in git.
- **Vercel / host:** Rely on **git** as source of truth for code; **redeploy** from tagged releases. Env vars are **re-entered** from secure storage if rebuilding a project.
- **Restore drill:** Engineering expectation and retention detail are in **[compliance-and-safety.md](compliance-and-safety.md)** and **[VST-12](stories/vst-12.story.md)**—schedule drills there; this story does **not** execute full DR.

---

## Go / no-go checklist (production)

- [ ] **Env vars** complete in **production** host + Supabase; **no** real secrets committed (git clean for `.env*`).
- [ ] **Migrations** applied to **production** in order; RLS policies reviewed on the migration PR per [staging-and-promotion.md](staging-and-promotion.md).
- [ ] **RLS smoke:** Customer cannot read staff-only rows; staff roles behave as expected (spot-check).
- [ ] **PayFast:** **Production** merchant + `PAYFAST_URL` (not sandbox); ITN URL live and **TLS**.
- [ ] **DNS / URLs:** **`NEXT_PUBLIC_APP_URL`** and **`metadataBase`** (Next.js) match the **canonical** public hostname (see [integrations-and-payments.md](integrations-and-payments.md) / marketing docs).
- [ ] **E2E or manual substitute:** `npm run test:e2e` green on **`next dev`**, **or** documented manual booking + **ops checklist** + payment smoke completed for the release candidate.
- [ ] **Synthetic health:** Post-deploy **`GET /api/health`** **200** on production.
- [ ] **Backup awareness:** Supabase backup/PITR settings acknowledged; restore drill scheduled per compliance doc.

---

## Change log

| Date | Notes |
| ---- | ----- |
| 2026-04-07 | **VST-14:** Initial hardening index, E2E scope, ops manual smoke, PayFast, load smoke script, monitoring, go/no-go, NFR + compliance cross-links. |
