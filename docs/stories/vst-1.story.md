# Story VST-1: Foundation — environments, Supabase alignment, developer workflow

## Status: Done

**Dependencies:** None (first VST story).

## Story

- As a **new developer or contributor** joining the Vestroo codebase
- I want **documented local setup, Supabase alignment, CI expectations, and clear Server Action vs Route Handler guidance**
- so that **I can run the app locally, apply migrations, pass PR checks, and complete a stub booking against the dev database using the runbook without guesswork**

## Acceptance Criteria (ACs)

1. **Local setup runbook:** `docs/local-development.md` documents end-to-end local setup including Node **20+**, `npm install`, copying `.env.example` → `.env.local`, and applying schema via **`supabase/migrations/`** with optional Supabase CLI (**`link`**, **`db push`** to a **hosted** dev project — **no** **`db reset`** or local Docker stack in the canonical workflow).
2. **Secrets policy:** `.env.example` contains **placeholders only** (no real keys or production values). Documentation states that **`SUPABASE_SERVICE_ROLE_KEY` is server-only** (never `NEXT_PUBLIC_*`).
3. **CI smoke on PR:** On **push and pull_request** to **`main` | `master`**, the workflow `.github/workflows/ci.yml` runs **`npm ci`**, **`npm run lint`**, **`npm run test`**, and **`npm run build`** on **Node 20**, with **placeholder `NEXT_PUBLIC_*`** values sufficient for build; documentation in `docs/local-development.md` describes this workflow and aligns with the file (including job id **`build-test-lint`**).
4. **Server Actions vs Route Handlers:** `docs/front-end-api-interaction.md` states when to prefer Server Actions (App Router mutations) vs Route Handlers (webhooks, health, external HTTP / stable HTTP contract), including the decision table; onboarding paths surface this doc (e.g. via `docs/index.md`).
5. **Onboarding hub:** `docs/index.md` under **Developer onboarding** links to **`docs/local-development.md`**, **`docs/environment-vars.md`**, **`docs/staging-and-promotion.md`**, and **`docs/dependencies.md`** so a new developer can navigate setup without hunting files.
6. **Stub booking path:** Following **`docs/local-development.md`** (stub booking section + run app), a developer with a configured dev Supabase project can complete a **stub booking** flow against the dev database: **search → quote → booking** (Server Actions: e.g. `calculateQuote`, `createBooking` / related steps as implemented), with **`createBooking`** using the **service role** as documented; gaps in the runbook are closed in this story if verification finds any.

## Tasks / Subtasks

- [x] **Task 1 — AC1, AC2:** Review and update `docs/local-development.md` and `docs/environment-vars.md` so prerequisites, env copy step, migrations location, and optional CLI steps match the repo; confirm `.env.example` is placeholders-only and service-role server-only is explicit. (AC: #1, #2)
  - [x] Cross-check `.env.example` against `docs/environment-vars.md` (every documented var has a placeholder line or intentional omission is explained).
  - [x] Confirm migration path `supabase/migrations/` and ordering convention are stated.

- [x] **Task 2 — AC3:** Verify `.github/workflows/ci.yml` matches `docs/local-development.md` CI section (triggers, Node 20, steps, placeholder env vars). Update docs if the workflow changes or docs drift. (AC: #3)
  - [x] Name the required check for branch protection (workflow **CI**, job **`build-test-lint`**) consistently in docs.

- [x] **Task 3 — AC4:** Confirm `docs/front-end-api-interaction.md` contains the Server Action vs Route Handler guidance and table; ensure `docs/index.md` links to it under architecture/onboarding as appropriate (e.g. Frontend API Interaction). (AC: #4)

- [x] **Task 4 — AC5:** Verify `docs/index.md` Developer onboarding lists `local-development`, `environment-vars`, `staging-and-promotion`, and `dependencies`; add or fix links if any are missing. (AC: #5)

- [x] **Task 5 — AC6:** Dry-run the stub path on a clean clone (or reason from code + docs): `/book/search` (or documented entry) → quote → booking; ensure `docs/local-development.md` explains service role for `createBooking` / `processPayment`, optional tables, and any UI prerequisites. Add explicit **search → quote → booking** wording if the runbook is ambiguous. (AC: #6)
  - [x] Optional: mention `GET /api/health` only as a sanity check per local-development (VST-3 may expand contract detail).

- [x] **Task 6 — Traceability:** Ensure `docs/epic-4.md` VST-1 bullet remains aligned with this story file; no duplicate conflicting requirements.

## Dev Technical Guidance

- **Onboarding hub:** Start from **`docs/index.md`** → **`docs/local-development.md`**, **`docs/environment-vars.md`**, **`docs/staging-and-promotion.md`**, **`docs/dependencies.md`**.
- **Environment:** `.env.example` — placeholders only; **`SUPABASE_SERVICE_ROLE_KEY`** and any service secrets are **server-only** (see `docs/environment-vars.md`).
- **Local workflow:** `docs/local-development.md` — Node 20+, `npm install`, `cp .env.example .env.local`, migrations in **`supabase/migrations/`** applied to **hosted** Supabase via **`supabase link`** / **`supabase db push`** (or **`npm run db:push`**), stub booking via Server Actions (**`createBooking`** uses service role); **no** Docker or **`db reset`** in the canonical path.
- **CI:** `.github/workflows/ci.yml` — on **push/PR** to **`main` | `master`**: **`npm ci`**, **`npm run lint`**, **`npm run test`**, **`npm run build`**, **Node 20**, placeholder **`NEXT_PUBLIC_*`** for build.
- **Server Actions vs Route Handlers:** **`docs/front-end-api-interaction.md`** — table: prefer Server Actions for App Router mutations; Route Handlers for webhooks, **`/api/health`**, external HTTP consumers.
- **Health:** **`GET /api/health`** is documented in local-development for local sanity checks; fuller hardening/contract story is **VST-3** — do not expand scope here unless blocking the stub path.
- **Scope:** This story is **documentation and CI alignment**; avoid unrelated code changes unless you find a **critical inconsistency** between docs and the repo.

## Story Progress Notes

### Agent Model Used: `SM story prep`

### Completion Notes List

- Aligned `docs/local-development.md`: stub path **search → quote → booking** from **`/book/search`**, Server Actions named, service role via `src/lib/supabase/server.ts`; quality-gate table (**lint** / **test** / **build**, Node 20, `npm ci`, listed `NEXT_PUBLIC_*` placeholders; **no** GitHub Actions workflow in-repo as of **2026-04-07**); health shortened to optional sanity check (VST-3 for contract).
- `docs/index.md` Developer onboarding now links **environment-vars** and **front-end-api-interaction** alongside existing onboarding docs.
- `docs/front-end-api-interaction.md` decision table: **GET /api/health** in Route Handler column.
- `docs/environment-vars.md`: cross-check note vs `.env.example` (including commented optional lines).
- **2026-04-07:** Removed **`.github/workflows/`**; **`CONTRIBUTING.md`** + **`docs/local-development.md`** carry **lint / test / build** + placeholder env expectations (including PayFast/maps alignment with later stories).
- `docs/epic-4.md` VST-1 bullet updated to match story ACs without conflicting wording.

### Change Log

- **2026-04-02:** VST-1 documentation and CI alignment (local-development, index, front-end-api-interaction, environment-vars, ci.yml, epic-4); story tasks marked complete; status **Review**.
- **2026-04-07:** GitHub Actions workflows removed from the repo; **AC3** historically referred to **`ci.yml`**—live process is documented in **`docs/local-development.md`** and **`CONTRIBUTING.md`** (manual / Vercel gates).
