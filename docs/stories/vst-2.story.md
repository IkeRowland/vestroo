# Story VST-2: Foundation — staging parity, promotion, and repo conventions

## Status: Done

**Dependencies:** No epic-mandated upstream VST blocker. **Related foundation:** [VST-1](vst-1.story.md) (local dev runbook) — VST-2 extends **promotion**, **host/Supabase parity**, and **contributor conventions** beyond local setup.

## Story

- As a **release engineer or contributor** shipping schema and application changes across environments
- I want **documented staging/preview vs production behaviour, an agreed migration promotion path, Git/PR conventions, and a clear repo layout for actions, features, components, and tests**
- so that **preview and staging never target production data by mistake, migrations promote predictably with RLS reviewed, PRs stay consistent with team rules, and new code lands in the right folders**

## Acceptance Criteria (ACs)

1. **Staging / preview vs production:** `docs/staging-and-promotion.md` documents **separate Supabase projects** (development, staging, production), **host (e.g. Vercel) Production vs Preview** environment variable sets, the rule that **Preview points at a non-production** Supabase project (not production DB), optional dedicated staging host environment, and that **secrets are configured only in provider dashboards** — not committed (`.env.example` remains placeholder-only; `.env` / `.env.local` gitignored), with cross-reference to `docs/environment-vars.md` where appropriate.
2. **Deploy verification:** The same doc describes **post-deploy verification** via **`GET /api/health`** (JSON fields `status`, `message`, `timestamp`; **200** healthy / **503** unhealthy; **generic** bodies — no secrets, raw provider errors, or stack traces in JSON).
3. **Migration promotion order and expectations:** `docs/staging-and-promotion.md` states **merge migrations to default branch via PR** with review; **apply** the same migration set to **dev and/or staging before production**; **forward-only / append-only** migrations under `supabase/migrations/` in normal work; **destructive** changes require an **explicit ops plan**; **RLS** (`ENABLE ROW LEVEL SECURITY`, policies) is **part of migration review**, not an afterthought.
4. **Git / PR conventions:** `CONTRIBUTING.md` documents **short-lived feature branches from `main`**, **CI must pass** before merge with reference to **`.github/workflows/ci.yml`**, **schema changes** accompanied by relevant **`supabase/migrations/`** files in the **same PR** or a **prior merged migration PR**, and that PRs use **`.github/pull_request_template.md`**.
5. **PR template alignment:** `.github/pull_request_template.md` includes checklist items for **migrations**, **secrets** (no real keys / committed `.env`), and **docs** updates when behaviour or setup changes; wording **does not conflict** with `CONTRIBUTING.md` or `docs/staging-and-promotion.md` on promotion and secrets.
6. **Repo layout:** `docs/repo-conventions.md` documents placement of **Server Actions** in **`src/actions/`** (with colocated **`src/actions/__tests__/`**), **feature modules** under **`src/features/*`**, shared UI in **`src/components/`**, shared logic in **`src/lib/`** (and **`__tests__`** colocation), **App Router** under **`src/app/`**, **Vitest** colocated **`__tests__`**, and **Playwright** under **`tests/e2e/`**, with **Related docs** pointing at `project-structure.md` and `local-development.md` as applicable.
7. **Index discoverability:** `docs/index.md` **Developer onboarding** links to **`CONTRIBUTING.md`** (repository root) so Git/PR rules are discoverable alongside **`docs/staging-and-promotion.md`**; **`docs/repo-conventions.md`** is reachable from the index (**Developer onboarding** and/or **Core Architecture** as appropriate) without hunting the tree.
8. **Epic traceability:** `docs/epic-4.md` **VST-2** bullet remains consistent with this story (staging/preview vs production, promotion, CONTRIBUTING/migrations-in-PRs, repo layout); no duplicate conflicting requirements between epic and this file.

## Tasks / Subtasks

- [x] **Task 1 — AC1, AC2:** Review `docs/staging-and-promotion.md` against the repo and epic: Supabase tier split, Vercel Production vs Preview env mapping, Preview ≠ production DB, secrets policy; confirm **`GET /api/health`** verification section matches implementation and `docs/local-development.md` health wording where cross-linked. (AC: #1, #2)
  - [x] Fix doc drift only if verification finds **critical inconsistency** with `src/app/api/health/` behaviour or env practice. *(Aligned health section with `route.ts` / `health-check.ts`; fixed broken health anchor by linking to `local-development.md` + section title; explicit `.env` / `.env.local` gitignore and `environment-vars.md` cross-refs.)*

- [x] **Task 2 — AC3:** Confirm migration promotion steps (PR merge → apply dev/staging → production), forward-only expectation, destructive-change ops plan, and **RLS in review** are explicit and ordered as team expectation. (AC: #3)

- [x] **Task 3 — AC4:** Verify `CONTRIBUTING.md` matches `.github/workflows/ci.yml` and migration-in-PR rules; update if branching or CI naming drifts. (AC: #4)

- [x] **Task 4 — AC5:** Cross-check `.github/pull_request_template.md` with `CONTRIBUTING.md` and `docs/staging-and-promotion.md`; align checklist wording if templates and promotion doc disagree. (AC: #5)

- [x] **Task 5 — AC6:** Verify `docs/repo-conventions.md` against actual folders (`src/actions/`, `src/features/`, `src/components/`, `src/lib/`, `src/app/`, `tests/e2e/`); update paths or Related docs links if the tree or scripts changed. (AC: #6)
  - [x] **Rewrote** `docs/project-structure.md` to match the live repo (App Router, `src/actions/`, `features/`, `content/`, `services/`, `supabase/migrations/`, `.github/workflows/`, `tests/e2e/`, root configs)—no Payload/CMS tree; cross-links to `docs/repo-conventions.md` and `docs/local-development.md`.

- [x] **Task 6 — AC7:** Update `docs/index.md` **Developer onboarding** to include **`CONTRIBUTING.md`**; ensure **`staging-and-promotion.md`** and **`repo-conventions.md`** are linked from onboarding or clearly cross-linked so all three are **one hop** from the hub. (AC: #7)

- [x] **Task 7 — AC8:** After edits, re-read `docs/epic-4.md` VST-2; adjust epic bullet or this story only if **traceability** or wording conflicts appear. (AC: #8)

## Dev Technical Guidance

- **Promotion and environments:** Start with **`docs/staging-and-promotion.md`** — Supabase project separation, Vercel (or agreed host) Production vs Preview vars, secrets never in git, **`GET /api/health`** after deploy, migration promotion order, forward-only migrations, RLS review.
- **Contributor workflow:** **`CONTRIBUTING.md`** — branches from **`main`**, CI via **`.github/workflows/ci.yml`**, **`supabase/migrations/`** with schema-dependent PRs, PR template **`.github/pull_request_template.md`**.
- **Layout:** **`docs/repo-conventions.md`** — Server Actions, features, components, lib, app routes, Vitest **`__tests__`**, Playwright **`tests/e2e/`**; broader map in **`docs/project-structure.md`** if needed.
- **Onboarding hub:** **`docs/index.md`** — link **CONTRIBUTING**, **staging-and-promotion**, **repo-conventions** for discoverability (VST-1 already stresses local runbook; VST-2 completes the “how we ship” picture).
- **Related foundation:** **`docs/stories/vst-1.story.md`** — local dev, migrations folder, CI smoke; VST-2 should not duplicate VST-1 runbook detail except short cross-references.
- **Scope:** **Documentation and convention alignment** only; do not implement product features or change schema in this story unless a **critical inconsistency** between docs and repo forces a minimal fix.

## Story Progress Notes

### Agent Model Used: `SM story prep` → Dev implementation (documentation alignment)

### Completion Notes List

- **AC1–AC2:** `docs/staging-and-promotion.md` — Supabase/Vercel split reinforced; secrets/gitignore/`.env.example` explicit; `environment-vars.md` cross-refs; deploy verification documents `status` / `message` / `timestamp`, 200/503, generic bodies; pointers to `src/app/api/health/route.ts` and `src/lib/health-check.ts`; local runbook link without broken fragment anchor.
- **AC3:** Migration promotion renumbered (PR + RLS review → merge → apply dev/staging → prod); forward-only/destructive/RLS tightened.
- **AC4:** `CONTRIBUTING.md` names workflow **CI** and job **build-test-lint** matching `ci.yml`.
- **AC5:** `.github/pull_request_template.md` — migrations, RLS when schema changes, secrets, preview/staging non-prod awareness, docs; links to CONTRIBUTING and staging doc.
- **AC6:** `docs/repo-conventions.md` verified against tree; **`docs/project-structure.md` rewritten** (AC6 Related docs + Task 5): Next.js `src/app/`, `src/actions/`, `src/features/`, `src/components/`, `src/lib/`, `src/services/`, `src/content/`, `supabase/migrations/`, `.github/workflows/`, `tests/e2e/`, root configs—links to `repo-conventions.md` and `local-development.md`.
- **AC7:** `docs/index.md` — Developer onboarding links **`CONTRIBUTING.md`** and **`repo-conventions.md`**; Core Architecture **Project structure** bullet points to **repository conventions** for placement (plus standalone conventions line).
- **AC8:** `docs/epic-4.md` VST-2 bullet expanded to mirror story ACs without contradicting this file.
- **Verification:** `npm run lint` (exit 0; existing warnings in app code) and `npm run test -- --run` (44 tests passed).

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | VST-2 documentation and template alignment: staging/promotion, health verification, CONTRIBUTING/CI naming, PR template, repo conventions, index onboarding, epic VST-2 traceability; story tasks marked complete. |
| 2026-04-06 | VST-2 close-out: **`docs/project-structure.md`** replaced outdated Payload layout with current Next.js + Supabase tree; **`docs/index.md`** Core Architecture project-structure bullet ties to **repo-conventions** for “where to put code”; story Status → **Review**, completion notes and Task 5 subtask updated; lint/test verified. |
| 2026-04-07 | **`.github/workflows/`** removed; **AC4** historically referenced **`ci.yml`**—**`CONTRIBUTING.md`** now defines **lint / test / build** without an in-repo Actions workflow; **`.github/pull_request_template.md`** retained. |
