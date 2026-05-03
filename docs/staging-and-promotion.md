# Staging, preview, and migration promotion

This document describes how we align **Supabase** projects and **hosting** (Vercel or an agreed alternative) across development, staging, and production. It complements [local-development.md](local-development.md) and [environment-vars.md](environment-vars.md). **Do not** put real API keys, connection strings, or project URLs in git or in these docs—only in each provider’s dashboard.

## Supabase: separate projects

Use **distinct Supabase projects** for each tier, configured entirely in the Supabase Dashboard (and in your local `.env.local`, which is gitignored):

- **Development** — either one **shared** dev project for the team or **per-developer** projects when you need isolation. Same migration files apply; each project gets the same ordered SQL from `supabase/migrations/`.
- **Staging** — a project that mirrors production’s schema and RLS expectations, used for integration checks and preview deployments.
- **Production** — the live customer-facing database.

Naming and ownership of which Supabase project is “staging” vs “production” stay in runbooks or team chat, not in committed files.

## Hosting: production vs preview environment variables

On **Vercel** (or your agreed host), **Production** and **Preview** deployments typically use **separate environment variable sets**.

- **Production** variables should point at the **production** Supabase project (URL and keys with the names documented in [environment-vars.md](environment-vars.md)).
- **Preview** variables should point at a **non-production** Supabase project—commonly the **staging** project—so pull requests and branch builds never hit production data.

Some organizations add a dedicated **Staging** (or **Pre-production**) **environment** in Vercel and attach env vars to that environment for a stable pre-prod URL. That is optional; the minimum bar is **Preview ≠ Production** for database targets when you have a staging project.

Configure all secrets in the **host dashboard** and **Supabase Dashboard** only. `.env.example` stays **placeholder-only** (see [environment-vars.md](environment-vars.md) for names and semantics). **Never commit** real values: **`.env`** and **`.env.local`** (and other local env files matching `.env*.local`) are **gitignored** in this repository—keep secrets out of git entirely.

## Secrets: never in git

- Store secrets only where the platform expects them (Vercel env UI, Supabase project settings, GitHub Actions **secrets** for CI if needed). Variable **names** and **which tier** uses which values belong in [environment-vars.md](environment-vars.md); values belong **only** in provider dashboards.
- **`.env`**, **`.env.local`**, and patterns like **`.env*.local`** are listed in **`.gitignore`** so they are not tracked; treat any accidental commit as a security incident.
- If a secret was ever committed, **rotate** it in the provider and remove it from history per your security process.

## Deploy verification: `GET /api/health`

After promoting a build or changing environment variables, call **`GET /api/health`** on the target deployment (preview or production URL). Implementation: [`src/app/api/health/route.ts`](../src/app/api/health/route.ts) and [`src/lib/health-check.ts`](../src/lib/health-check.ts).

**Response contract**

- **JSON body** (always these three fields):
  - **`status`:** `"healthy"` or `"unhealthy"`.
  - **`message`:** short, **generic** human-readable text (e.g. healthy: database available; unhealthy: connectivity could not be verified). No raw Supabase/provider error strings, secrets, or stack traces in the payload.
  - **`timestamp`:** ISO 8601 string.
- **HTTP:** **`200`** when `status` is `healthy`; **`503`** when `status` is `unhealthy` (including unexpected handler failures, which still return the same generic shape).

Failures are logged **server-side** only; clients see only the generic JSON above. For local use of the same endpoint and contract, see [local-development.md — Optional sanity check (`GET /api/health`)](local-development.md#optional-sanity-check-get-apihealth).

## Backups & recovery (awareness)

Production (and staging) **PostgreSQL** data is protected by your **Supabase** plan and project settings, not by this repo.

- **Backups:** [Database backups](https://supabase.com/docs/guides/platform/backups) — daily backups and dashboard restore flow.
- **Point-in-Time Recovery (PITR):** [Point-in-Time Recovery](https://supabase.com/docs/guides/platform/backups#point-in-time-recovery) — finer-grained restore where enabled (paid add-on / plan).

**Team expectation:** the **production** Supabase project has backups (and PITR if required by org policy) **enabled and understood** by the release owner—the team stays **aware** of who can initiate recovery via the provider. **Restore drills**, detailed runbooks, and full disaster recovery exercises are **explicitly deferred** to **VST-12** (compliance), **later ops/hardening** stories (e.g. **VST-14**), or an equivalent ops epic—not part of this baseline. Do not put project refs, keys, or connection strings in documentation.

## Staging checklist: experience packages (VST-10)

**1. Apply schema to staging**

- Link the Supabase CLI to the **staging** project (`supabase link --project-ref <STAGING_REF>`), then from the repo root run **`supabase db push`** (or **`npm run db:push`**) so all pending migrations apply, including **`20260410120000_vst10_experience_packages.sql`**.

**2. Browser E2E (staging URL + env vars)**

1. Open **`/tours`** — at least one package (e.g. **Cape Winelands**) should list after the seed migration.
2. Open **`/tours/cape-winelands-day`** (or the seeded slug) → choose **date**, **group size**, **add-ons** → continue to **`/book/quote`** → **`/book/details`** → **`/book/payment`** → complete **PayFast sandbox** (if configured) → **confirmation**.

**3. Confirm persistence (Dashboard SQL or `psql`)**

Run against the **staging** database:

```sql
select id,
       payment_reference,
       booking_intent,
       booking_metadata,
       created_at
from public.bookings
where booking_intent = 'experience_package'
order by created_at desc
limit 5;
```

**Expected** for a successful package booking:

- **`booking_intent`** = **`experience_package`**
- **`booking_metadata`** JSON includes at least:
  - **`experience_package_id`** (uuid, matches `public.experience_packages.id`)
  - **`experience_date`** (ISO string)
  - **`group_size`** (integer, matches passenger count)
  - **`selected_addon_ids`** (array, possibly empty)

**4. Ops**

- Sign in as **dispatcher** or **admin** → **`/ops/experiences`** should list recent **`experience_package`** bookings (package id resolved from metadata).

**5. References**

- Product / engineering: **[tours-and-experiences.md](tours-and-experiences.md)** (content model, quote path, **date/timezone** semantics).

## Migration promotion (agreed order)

Adopt an explicit promotion path and a **named owner** (or a short checklist in the release ticket) so schema changes are predictable:

1. **Open a PR** that adds or updates files under **`supabase/migrations/`** (and dependent app changes if any). **Before merge**, reviewers confirm **RLS** is addressed in those SQL files: `ENABLE ROW LEVEL SECURITY` where required, policies for intended access paths, and no tables left unintentionally wide open. (See [Row Level Security (RLS) on promotion](#row-level-security-rls-on-promotion) below.)
2. **Merge** to the **default branch** (`main`) via that PR after review.
3. **Apply** the **same** migration set, in order, to **shared dev** and/or **staging** Supabase projects first (**hosted** projects: e.g. **`supabase link`** + **`supabase db push`**, or Dashboard—per team convention; no local Docker stack—see [local-development.md](local-development.md)).
4. **Apply** to **production** only after staging (or equivalent) verification, with the **release owner** confirming the apply and any rollback notes.

**Forward-only migrations:** treat migrations as **append-only** in normal work—each change adds a new timestamped file under `supabase/migrations/`; do not rewrite history of applied migrations. **Destructive** changes (drops, data wipes, broad rewrites) require an **explicit ops plan** (backup, ordering, downtime, communication) before merge or apply.

## Row Level Security (RLS) on promotion

**RLS is part of the same ordered review as the migration SQL**, not a post-deploy afterthought: verify `ENABLE ROW LEVEL SECURITY`, policy definitions, and related grants in the **PR** before the migration runs on any shared environment. Further hardening and audits may be tracked under **VST-12** or later hardening (e.g. **VST-14**).

## Staging E2E: booking sandbox (VST-6)

Repeatable check on **staging** (non-production DB + PayFast sandbox):

1. **Migrations:** `supabase db push` (or equivalent) so **`bookings`** includes VST-6 columns (`booking_intent`, hourly fields, `payment_timestamp`, etc.) and optional **seed** patterns applied.
2. **Env (Vercel staging / Preview):** `NEXT_PUBLIC_*` Supabase + **`NEXT_PUBLIC_GOOGLE_MAPS_KEY`** (Places) + **`NEXT_PUBLIC_APP_URL`** → staging origin; **server-only** **`GOOGLE_MAPS_SERVER_KEY`**, **`PAYFAST_MERCHANT_ID`**, **`PAYFAST_MERCHANT_KEY`**, **`PAYFAST_PASSPHRASE`**, **`PAYFAST_URL`** (sandbox); **`RESEND_*`** if testing email. No **`NEXT_PUBLIC_PAYFAST_*`** (VST-13).
3. **Flow:** `/book/search` → point-to-point or **hourly chauffeur hire** → `/book/quote` → `/book/details` → `/book/payment` → PayFast sandbox → `/confirmation?id=<booking uuid>`.
4. **Verify DB:** row in **`public.bookings`** with `payment_reference` **`VST-*`**, `booking_intent` set, `total_amount` matches reconciled quote; after webhook, `status`/`payment_status` **paid**, **`trans_id`** populated, **`payment_reference`** unchanged.
5. **FK vocabulary:** seeds expose **`service_routes.id`** and **`service_patterns.id`** (fixed UUIDs in **`20260406121000_*`**); live web bookings may leave **`service_pattern_id`** null until ops links a **corporate pattern**. **`booking_trips` / `trips`** are **not** created in this wizard slice.

### Staging: PayFast failure / cancel and recovery (VST-13)

1. Start a booking and reach PayFast; **cancel** at the gateway → confirm browser returns to **`/book/payment?error=cancelled`** and messaging is visible.
2. Optionally trigger a **failed** payment (sandbox test data per PayFast docs) → confirm ITN leaves **`payment_status = failed`**, **`status = pending`** (or run SQL on **`bookings`** after ITN).
3. **Retry:** start checkout again from the wizard → **new** row and **`VST-*`**; locate the successful row by **`payment_reference`** + phone via **`searchBooking`** when helping a tester.
4. Apply migration **`20260413130000_vst13_corporate_invoicing_hooks.sql`** on staging before relying on invoicing columns; smoke **`/ops/invoicing`** as staff.

## Staging E2E: operations console (VST-7)

After migrations include **`20260407130000_vst7_ops_audit_trips_fulfilment.sql`** ( **`ops_audit_log`**, nullable **`trips.customer_id`**, trip ops columns):

1. **Auth:** Create or use a Supabase user whose **`profiles.role`** is **`dispatcher`** or **`admin`** (and **`status = active`**). Ensure **`NEXT_PUBLIC_*`** Supabase URL + anon key are set on the staging deployment so the browser session uses the staff JWT.
2. **Sign in:** Open **`/ops/login`** on the staging site; sign in with that user. Confirm **`/ops/board`** loads (not **`/ops/unauthorized`**).
3. **Seed data:** At least one paid **`bookings`** row (`status` + **`payment_status`** **`paid`**) without **`booking_trips`**; at least one **`service_runs`** row; fleet **`vehicles`**; **`profiles`** with **`role = chauffeur`**, **`status = active`**.
4. **Assign:** **`/ops/fulfil`** — select booking, run, chauffeur, vehicle → submit. Verify **`booking_trips`**, **`trips`** (**`service_run_id`** set), **`chauffeur_assignments`**, and a row in **`ops_audit_log`** with **`action = assign_booking_to_run`**.
5. **Status & views:** **`/ops/board`** and **`/ops/calendar`** show the new trip; **`/ops/trips`** — change status; confirm **`status_history`** and audit row.
6. **Exceptions:** On **`/ops/trips`**, record a **delay** and perform a **vehicle swap** (second vehicle required); confirm **`ops_audit_log`** entries and consistent **`chauffeur_assignments.vehicle_id`** when an overlapping assignment existed.
7. **RLS:** Run **`supabase/smoke_rls.sql`** on staging; impersonate a **customer** JWT and confirm **`/ops/*`** Server Actions return **Forbidden** (and console pages redirect to **`/ops/unauthorized`**).

## Staging E2E: field tools (VST-8)

Requires migration **`20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql`** and a trip assigned to a chauffeur (e.g. complete **VST-7** assign step above).

1. **Auth:** Use a Supabase user with **`profiles.role = chauffeur`** and **`status = active`** (not the dispatcher account).
2. **Sign in:** **`/field/login`** → confirm **`/field`** lists trips where **`chauffeur_id`** matches that user.
3. **Detail:** Open a trip → **Confirm assignment** (**`assigned` → `en_route`**) → **Mark completed** when appropriate; confirm **`ops_audit_log`** rows with **`actor_role = chauffeur`** and actions **`chauffeur_confirm_assignment`** / **`chauffeur_update_trip_status`**.
4. **Maps:** If the linked booking has addresses/coords (or the trip has **`service_run_id`** with route points), **Open in Google Maps** / **Apple Maps** links resolve.
5. **Contact:** For **`assigned`** or **`en_route`**, masked phone + **Call customer** logs **`chauffeur_contact_intent`** then opens **`tel:`**.
6. **Isolation:** As a **second chauffeur** (or **customer**), confirm you **cannot** open another chauffeur’s **`/field/trips/{uuid}`** (404) and **cannot** mutate via **`fieldChauffeur`** actions (**Forbidden** / no row).

## Staging: Realtime subscriber latency (VST-9)

After migration **`20260409120000_vst9_realtime_notifications.sql`** and app deploy:

1. **Enable Realtime** on the staging project if **`ALTER PUBLICATION`** was not applied (Dashboard → **Database** → **Replication** for **`vehicle_trackings`** / **`trips`**).
2. **Staff:** Sign in to **`/ops/board`** with a dispatcher JWT. In a second session (or SQL), update a visible **`trips`** row or **`vehicle_trackings`** row the staff user can read.
3. **Expectation:** the board **refreshes** (debounced **2 s**) so the UI reflects the change within **≤ 30 seconds** end-to-end under normal staging load (target **≤ 10 s** when Realtime is healthy). If latency exceeds **30 s**, check Supabase Realtime status, RLS filters, and browser network.
4. **Chauffeur:** Sign in to **`/field`**, open an **assigned** trip, allow location; confirm **`vehicle_trackings`** updates in Dashboard or staff view within the same **≤ 30 s** window after a publish (client interval **8 s** + server throttle **5 s** minimum gap).
5. **RLS:** With a chauffeur A JWT, subscribe or query **`vehicle_trackings`** — only rows for A’s assignments; staff JWT sees broader rows. See **[realtime-and-notifications.md](realtime-and-notifications.md)**.

## Related docs

- [Local development](local-development.md) — env setup, migrations folder, CI
- [Environment variables](environment-vars.md) — variable names and semantics
- [Front-end API interaction](front-end-api-interaction.md) — Server Actions + quote reconcile
- [Realtime and notifications](realtime-and-notifications.md) — VST-9 channels and limits
