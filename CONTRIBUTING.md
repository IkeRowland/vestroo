# Contributing to Vestroo

## Branching

Use **short-lived feature branches** from **`main`**. Name branches in a readable way, for example:

- `feature/short-description`
- `fix/issue-or-area`

Trunk-based delivery is encouraged: merge back to `main` frequently; avoid long-lived branches that drift from the default branch.

## Pull requests

- **Quality checks must pass** before merge. Run **`npm ci`** (or **`npm install`** if you are only updating deps), then **`npm run lint`**, **`npm run test`**, and **`npm run build`** locally (Node **20**, real or placeholder **`NEXT_PUBLIC_*`** per **[docs/local-development.md](docs/local-development.md)**). If you use **Vercel** (or another host), ensure preview/production **build** is configured to fail on the same errors. **E2E (Playwright)** stays a **human gate** before production: **`npm run test:e2e`** per **[docs/hardening-and-go-live.md](docs/hardening-and-go-live.md)**. First-time: **`npx playwright install`** (or **`npx playwright install chromium`**). Faster local run: **`npx playwright test --project=chromium`**.
- **GitHub Actions:** PRs that touch **`supabase/migrations/**`** run **[`.github/workflows/rls-policy-lint.yml`](.github/workflows/rls-policy-lint.yml)** (**`RLS_LINT_STRICT=1`**). Locally, run **`npm run lint:rls`** before pushing migration PRs; unset **`RLS_LINT_STRICT`** (or **`0`**) warns only (**exit 0**); match CI with **`RLS_LINT_STRICT=1`**. Reviewed exceptions: **`-- rls-lint-ok: <reason>`** on the line **above** a **`create policy`** (see **[docs/adr/0006-rls-cross-table-helpers.md](docs/adr/0006-rls-cross-table-helpers.md)**).
- **Database / schema changes** must include the relevant files under **`supabase/migrations/`** in the same PR as the application changes that depend on them (or in a dedicated migration PR merged before dependent code). After **`npm run db:push`** (or equivalent), run **`npm run smoke:rls`** when **`DATABASE_URL`** is set, or run **`supabase/smoke_rls.sql`** in the Dashboard SQL editor — see **[docs/local-development.md](docs/local-development.md#rls-smoke-tests)** (RLS / Epic 11 AC4). For **cross-table RLS** (a policy’s **`USING`** / **`WITH CHECK`** that must read another RLS-protected table), follow **[docs/adr/0006-rls-cross-table-helpers.md](docs/adr/0006-rls-cross-table-helpers.md)** (`SECURITY DEFINER STABLE` helpers; avoid inline **`EXISTS`** that recurse — **`42P17`**).
- Opening a PR applies the [pull request template](.github/pull_request_template.md) checklist (migrations, secrets, docs).

## Local setup

Full instructions (Node, env, Supabase, migrations, stub booking, CI expectations) are in **[docs/local-development.md](docs/local-development.md)**. Schema changes apply to **hosted** Supabase projects via the CLI or Dashboard as described there; **Docker** is not part of this repo’s workflow.

## Code layout

See **[docs/repo-conventions.md](docs/repo-conventions.md)** for where Server Actions, features, shared UI, and tests live.

## Operations (ops)

- **Walk-in quote-first (Story 14.7):** Non-trivial intents (`hourly_hire`, `experience_package`, `trip_request`) may land in **`submitted`** on **`/ops/bookings`** so staff can review before payment. Use **Send quote** (Story 14.6) to email the customer. See **[docs/releases/14.7-quote-first-non-trivial-intents.md](docs/releases/14.7-quote-first-non-trivial-intents.md)** and **[docs/environment-vars.md](docs/environment-vars.md)** for the `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS` flag.
