# Local development

Single entry point for running Vestroo locally. Staging and production use the same variable **names**; values come from [Vercel](https://vercel.com/docs/projects/environment-variables) and [Supabase](https://supabase.com/dashboard) project settings (never commit secrets).

## Prerequisites

- **Node.js:** 20.x LTS recommended (matches CI; `package.json` engines are not pinned — use 20+ for Next.js 15).
- **npm:** bundled with Node.
- **Supabase project:** create one for development (free tier is fine). Use **hosted** Supabase projects for **dev** and **staging**; this repository does **not** use local Supabase via Docker.
- **Docker:** **Not required** for local development or for applying migrations in the workflow documented here.

## 1. Install dependencies

```bash
npm install
```

## 2. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and replace every placeholder. See [environment-vars.md](environment-vars.md) for semantics.

- **Service role** (`SUPABASE_SERVICE_ROLE_KEY`) is used only on the server (Server Actions, Route Handlers). Never prefix with `NEXT_PUBLIC_` or expose it to the browser.

## 3. Supabase schema (migrations)

SQL migrations live in `supabase/migrations/`. File names are ordered by timestamp prefix; add new migrations with a new timestamp so apply order stays deterministic.

**Branching model (recommended):**

1. Create a feature branch from `main`.
2. Add or edit SQL under `supabase/migrations/`.
3. Open a PR; reviewers check SQL and RLS impact.
4. Apply to the **shared dev** Supabase project after merge (or from your machine against dev), using the Supabase CLI or Dashboard SQL — follow your team’s rule for who runs `db push` / linked projects.

**Hosted Supabase + CLI (canonical):**

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) (optional but recommended for applying migrations from the repo).
2. Run **`supabase login`** once so the CLI can access your Supabase account.
3. From the repo root, run **`supabase link --project-ref <YOUR_DEV_REF>`**. Copy **`<YOUR_DEV_REF>`** from the Supabase Dashboard project URL (`https://supabase.com/dashboard/project/<YOUR_DEV_REF>`).
4. Run **`supabase db push`** to apply **pending** migrations under **`supabase/migrations/`** to the **linked hosted** project. You can also use **`npm run db:push`** (same command) when the CLI is installed and the directory is linked.

Interactive linking is run as **`supabase link`** on the command line; there is no npm script for it because the CLI prompts for project choice when needed.

**Migration apply check (required for schema PRs):** Reviewers confirm that every file under **`supabase/migrations/`** applies **in timestamp order** without error. Practical options:

- **(a)** After merge, apply migrations to **shared dev** or **staging**: ensure **`supabase link`** targets that project, then run **`supabase db push`** (or follow your team’s Dashboard-based apply process).
- **(b)** **From-scratch verify:** Create a **temporary empty** Supabase project, **`supabase link`** to it, run **`supabase db push`**, confirm the full chain applies, then discard or repurpose the project.

Neither option requires Docker, **`supabase start`**, or **`supabase db reset`**.

### Supabase MCP vs hosted CLI

- **`reset_branch` (MCP):** Only applies to **hosted Supabase preview (development) branches** and needs a **`branch_id`**. Use it when your organization uses Supabase branching for isolated preview databases. It is **not** a substitute for linking and pushing migrations to your primary dev/staging project unless you deliberately use a branch for that workflow.
- **Default workflow for this repo:** Link the CLI to a **hosted** project and run **`supabase db push`**. Do **not** document or require Docker, **`supabase start`**, or **`supabase db reset`** as part of Vestroo’s local setup.

### Regenerate TypeScript types (optional)

The app keeps **hand-maintained** enums and row shapes in **`src/types/database.types.ts`** aligned with migrations. For a **full generated `Database` type** from your linked project:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run **`supabase login`**.
2. **`supabase link --project-ref <YOUR_PROJECT_REF>`** (dev or staging).
3. From the repo root:

```bash
npm run db:types
```

This writes **`src/types/supabase.generated.ts`** (gitignored by default — see note below). You can then:

- Import types from that file into server modules, **or**
- Use it as a reference diff when updating **`database.types.ts`**.

**Note:** Generated files can be large and churn on every schema change. Teams often **do not commit** them: add `src/types/supabase.generated.ts` to **`.gitignore`** if you prefer generate-on-demand only. The **`npm run db:types`** script uses **`--linked`**; without a linked project, the command fails with a clear CLI error.

### RLS smoke tests

**Epic 11 / Story 11.1 (AC4):** After migrations are applied to the **hosted** database at the **new migration head**, the regression script **`supabase/smoke_rls.sql`** **must pass** (or the script is updated with PR rationale if behaviour intentionally changes).

**Ways to run it (pick one — Docker not required):**

1. **CLI from this repo (recommended):** Add **`DATABASE_URL`** to **`.env.local`** (Supabase Dashboard → **Project Settings** → **Database** → connection string, prefer **direct** `postgresql://…@db.<ref>.supabase.co:5432/postgres` if the pooler rejects long scripts). Then:

   ```bash
   npm run smoke:rls
   ```

   Exits **non-zero** on failure (same intent as **`psql -v ON_ERROR_STOP=1`**). Uses **`DIRECT_URL`** or **`SUPABASE_DB_URL`** if **`DATABASE_URL`** is unset.

2. **Supabase Dashboard:** **SQL** → **New query** → paste the contents of **`supabase/smoke_rls.sql`** → **Run** (as a role that can read **`pg_policies`** / **`pg_class`**, e.g. the dashboard default).

3. **`psql`:** `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/smoke_rls.sql` (Unix shell) or equivalent on Windows against the same URL.

The script output includes structural **`SELECT`**s; confirm **`relrowsecurity`** is **true** for sampled tables, **`profiles_role_check`** lists the four epic roles, and **`is_staff`** references **`admin`** and **`dispatcher`** only.

**Epic 16 / US-O2:** The script includes a **`DO`** block that probes a fixed list of tables for **SQLSTATE `42P17`** (infinite RLS recursion) on a plain `SELECT 1` — complementing **`npm run lint:rls`** (see **[Contributing — Pull requests](../CONTRIBUTING.md#pull-requests)**).

**Additional manual checks** (not replaced by **`smoke_rls.sql`** alone):

- **Per-role JWT checks:** Create test users with **`profiles.role`** set to **`customer`**, **`chauffeur`**, **`dispatcher`**, and **`admin`**. Using the **anon** client (browser or `supabase-js` with the anon key), verify **deny-by-default** (no policy ⇒ no rows) and that **bookings** / **tickets** allow the owning customer/passenger path, while **dispatcher**/**admin** paths match **`is_staff`** policies. Never put the **service role** key in client code—Server Actions that use it bypass RLS by design.
- **VST-8 (chauffeur):** With a **chauffeur** JWT, confirm **`bookings`** / **`booking_trips`** rows are **readable** only when linked to a **trip** with **`chauffeur_id = auth.uid()`** (policies **`bookings_select_chauffeur_linked`**, **`booking_trips_select_chauffeur`**). Confirm **`ops_audit_log`** **insert** as chauffeur succeeds only for allow-listed **`chauffeur_*`** actions and **`actor_role = chauffeur`** (see **`docs/field-tools.md`**).
- **VST-9 (Realtime):** After **`20260409120000_vst9_realtime_notifications.sql`**, confirm **`pg_policies`** includes **`notifications_chauffeur_customer_insert`**; smoke **`vehicle_trackings`** insert as chauffeur only for own assignment. Subscriber latency checklist: **[staging-and-promotion.md — Realtime subscriber latency](staging-and-promotion.md#staging-realtime-subscriber-latency-vst-9)** (target **≤ 30 s** on staging, **≤ 10 s** when healthy).

**Dashboard URLs and keys:**

- **Project URL** and **anon** / **service_role** keys: Supabase Dashboard → **Project Settings** → **API**.

## 4. Stub booking (empty vs seeded DB)

End-to-end flow: **search → quote → details → payment (PayFast sandbox) → confirmation**.

- **Entry:** open **`/book/search`** (App Router).
- **Server Actions** (see `src/actions/`): **`calculateQuote`** / **`calculateHourlyQuote`**, **`processPayment`** (reconciles quote, inserts row, signs PayFast), **`createBooking`** (optional pending-only path), **`searchBooking`**, **`cancelBooking`**. All server-side Supabase access for these flows goes through **`src/lib/supabase/server.ts`**, which uses the **service role** key for admin-style operations—so writes bypass RLS the same way as in code; never expose that key to the client.
- **Confirmation after PayFast:** the browser loads **`GET /api/booking-confirmation?id=<uuid>`** (service role on the server) because the **anon** key cannot read **`bookings`** for guests under RLS.

### Experience package path (VST-10)

After migration **`20260410120000_vst10_experience_packages.sql`** is applied:

1. Open **`/tours`** → choose **`/tours/cape-winelands-day`** (or another active slug).
2. Set date, group size, optional add-ons → **Continue to quote** → wizard **`/book/quote` → `/book/details` → `/book/payment`**.
3. **PayFast sandbox** (same env vars as point-to-point) → confirmation. **`booking_intent`** on the row is **`experience_package`**; **`booking_metadata`** holds package id, ISO date, group size, add-on ids.

See **[tours-and-experiences.md](tours-and-experiences.md)** and **[staging-and-promotion.md](staging-and-promotion.md)** for promotion notes.

- **Vehicle options in the UI:** `fetchActiveVehicleTypes()` falls back to built-in defaults (`vehicle_types` table is optional). Quote `vehicle_id` values are string ids such as `1`, `2`, `3` — stored in `bookings.vehicle_id` as **text** (see migration `20260402140000_vestroo_bookings_web_columns.sql`).
- **Fleet / ops `vehicles` table:** not required for the web stub path. If you later align quotes with real fleet rows, seed `vehicle_categories` and `vehicles` and adjust the app accordingly.

**VST-6 migration order (booking intent + seeds):** apply **`20260406120000_vst6_booking_intent_and_payment_audit.sql`** before relying on hourly/package columns; apply **`20260406121000_vst6_seed_corporate_and_experience_patterns.sql`** after **`vehicle_pricings`** exists (timestamp order in `supabase/migrations/` is sufficient when using **`supabase db push`**).

Optional one-shot check after migrations (replace URL and service key; use SQL Editor or `psql`):

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'bookings'
order by ordinal_position;
```

## 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Optional sanity check (`GET /api/health`)

After the app is running, call **`GET /api/health`** (e.g. browser or `curl`) to verify the app and database path respond.

**Response contract** (public JSON—no secrets, raw provider errors, or stack traces in the body):

| Field | Meaning |
| ----- | ------- |
| **`status`** | `"healthy"` or `"unhealthy"`. |
| **`message`** | Short, **generic** human-readable text (healthy: DB available; unhealthy: connectivity could not be verified). |
| **`timestamp`** | ISO 8601 string. |

**HTTP:** **`200`** when `status` is **`healthy`**; **`503`** when **`unhealthy`** (including unexpected handler failures—the same three fields, still generic).

Failures are logged **server-side** only. For the same contract after deploys (preview/production), see [staging-and-promotion.md — Deploy verification: `GET /api/health`](staging-and-promotion.md#deploy-verification-get-apihealth). Health checks are optional for the stub booking path.

## Operations console (VST-7, local)

1. Apply migrations through **`20260407130000_vst7_ops_audit_trips_fulfilment.sql`** ( **`ops_audit_log`**, trip columns, nullable **`trips.customer_id`** ).
2. In Supabase Auth, create a test user; set **`public.profiles.role`** to **`dispatcher`** or **`admin`** for that user’s UUID.
3. Run **`npm run dev`**, open **`http://localhost:3000/ops/login`**, sign in.
4. Walk **Fulfil → board/calendar → trips** as in [staging-and-promotion.md — Staging E2E: operations console (VST-7)](staging-and-promotion.md#staging-e2e-operations-console-vst-7) (use dev data instead of staging).

Routes and Supabase client notes: **[ops-console.md](ops-console.md)**.

## Staging and production (no secrets here)

Use **separate Supabase projects** for dev (shared or per developer), **staging**, and **production**; keep **secrets only in dashboards** (Vercel, Supabase, CI secrets)—never in git. Preview deployments should use env vars that target **non-production** data (typically staging).

For **promotion order**, **forward-only migrations**, **RLS review**, and optional **Vercel staging environments**, see **[staging-and-promotion.md](staging-and-promotion.md)**.

## Quality checks before merge (no GitHub Actions in-repo)

This repository does **not** include **`.github/workflows/*.yml`**. Treat the following as the **canonical** gate before opening or merging a PR (see **[CONTRIBUTING.md](../CONTRIBUTING.md)**):

| Step | Command | Notes |
| ---- | ------- | ----- |
| Install | **`npm ci`** | Clean install from **`package-lock.json`** (use **`npm install`** when intentionally changing dependencies). |
| Lint | **`npm run lint`** | |
| Unit tests | **`npm run test`** | Vitest. |
| Production build | **`npm run build`** | Requires build-time env; use real **`.env.local`** or placeholders aligned with **[environment-vars.md](environment-vars.md)** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `GOOGLE_MAPS_SERVER_KEY`, `NEXT_PUBLIC_APP_URL`, PayFast server vars, etc.). |
| RLS smoke (schema PRs) | **`npm run smoke:rls`** | When **`DATABASE_URL`** is in **`.env.local`**, after **`db push`**. Same SQL as **[RLS smoke tests](#rls-smoke-tests)**; no Docker. |

These commands validate the application only (except **`smoke:rls`**, which hits Postgres). They do **not** apply **`supabase/migrations/`** to any database. **Migration apply** stays **manual** (or out-of-band) on **hosted** Supabase per this document and [staging-and-promotion.md](staging-and-promotion.md).

If you use **branch protection**, configure **your host** (e.g. Vercel **Deployment Checks**) or add **your own** CI elsewhere—this repo does not define a GitHub Actions workflow name to require.

### PayFast sandbox: failure and recovery (VST-13)

- Configure **sandbox** PayFast (`PAYFAST_URL`, `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`) per **[integrations-and-payments.md](integrations-and-payments.md)** and **[environment-vars.md](environment-vars.md)**.
- **Happy path:** `/book/search` → … → **Pay securely** → PayFast → return to `/confirmation?id=<uuid>`; ITN updates **`payment_status`** / **`status`** to **paid** and sets **`trans_id`**.
- **Cancel:** On PayFast, cancel or abandon checkout → redirect to `/book/payment?error=cancelled` with on-page recovery copy (no charge). A **`CANCELLED`** ITN may set **`payment_status = failed`**, **`status = pending`**.
- **Failed payment:** Use PayFast sandbox failure patterns from their documentation; **`FAILED`** ITN aligns the row to **failed** / **pending** (see **[data-models.md](data-models.md)**).
- **Retry:** Each new **Pay securely** creates a **new** `bookings` row and **`VST-*`** reference. If the customer completed payment on an earlier attempt, they should use **Manage booking** with that attempt’s **`payment_reference`** + phone. See **[front-end-api-interaction.md](front-end-api-interaction.md)**.

## Scripts reference

| Script            | Purpose                    |
| ----------------- | -------------------------- |
| `npm run dev`     | Next.js dev server         |
| `npm run build`   | Production build           |
| `npm run start`   | Run production build       |
| `npm run lint`    | ESLint                     |
| `npm run test`    | Vitest (unit tests in `src/`) |
| `npm run test:e2e`| Playwright (separate from Vitest) |
| `npm run db:push` | `supabase db push` — applies pending migrations to the **linked hosted** project (requires [Supabase CLI](https://supabase.com/docs/guides/cli) and **`supabase link`**) |
| `npm run smoke:rls` | Runs **`supabase/smoke_rls.sql`** against **`DATABASE_URL`** / **`DIRECT_URL`** (hosted DB; no Docker). See [RLS smoke tests](#rls-smoke-tests). |
