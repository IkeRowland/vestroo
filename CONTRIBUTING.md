# Contributing to Vestroo

## Branching

Use **short-lived feature branches** from **`main`**. Name branches in a readable way, for example:

- `feature/short-description`
- `fix/issue-or-area`

Trunk-based delivery is encouraged: merge back to `main` frequently; avoid long-lived branches that drift from the default branch.

## Pull requests

- **Quality checks must pass** before merge. This repo does **not** include GitHub Actions workflows; run **`npm ci`** (or **`npm install`** if you are only updating deps), then **`npm run lint`**, **`npm run test`**, and **`npm run build`** locally (Node **20**, real or placeholder **`NEXT_PUBLIC_*`** per **[docs/local-development.md](docs/local-development.md)**). If you use **Vercel** (or another host), ensure preview/production **build** is configured to fail on the same errors. **E2E (Playwright)** stays a **human gate** before production: **`npm run test:e2e`** per **[docs/hardening-and-go-live.md](docs/hardening-and-go-live.md)**. First-time: **`npx playwright install`** (or **`npx playwright install chromium`**). Faster local run: **`npx playwright test --project=chromium`**.
- **Database / schema changes** must include the relevant files under **`supabase/migrations/`** in the same PR as the application changes that depend on them (or in a dedicated migration PR merged before dependent code).
- Opening a PR applies the [pull request template](.github/pull_request_template.md) checklist (migrations, secrets, docs).

## Local setup

Full instructions (Node, env, Supabase, migrations, stub booking, CI expectations) are in **[docs/local-development.md](docs/local-development.md)**. Schema changes apply to **hosted** Supabase projects via the CLI or Dashboard as described there; **Docker** is not part of this repo’s workflow.

## Code layout

See **[docs/repo-conventions.md](docs/repo-conventions.md)** for where Server Actions, features, shared UI, and tests live.
