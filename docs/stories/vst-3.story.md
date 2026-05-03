# Story VST-3: Foundation — security baseline, dependency hygiene, operational readiness

## Status: Done

**Dependencies:** No epic-mandated upstream VST blocker. **Related foundation:** [VST-1](vst-1.story.md) (local dev, health as Route Handler), [VST-2](vst-2.story.md) (staging/promotion, `GET /api/health` post-deploy verification) — VST-3 tightens **security disclosure**, **dependency/lockfile hygiene**, **documented health contract**, **baseline HTTP headers**, and **Supabase backups awareness** without duplicating full runbooks.

## Story

- As a **security-conscious maintainer or operator**
- I want **a clear vulnerability reporting path, enforced dependency practices, documented health and header behaviour that avoids leaking internals, and explicit backups expectations**
- so that **the team can respond responsibly to issues, keep supply chain risk visible, operate the app with predictable HTTP safety defaults, and know where recovery responsibility lies before hardening stories**

## Acceptance Criteria (ACs)

1. **Security disclosure (`SECURITY.md`):** Repository root **`SECURITY.md`** exists and states **private reporting** (contact placeholder **`security@vestroo.example`** until replaced), **no undisclosed vulnerabilities via public issues**, **scope** covering **this repository and hosted infrastructure** aligned with how Vestroo deploys the app, and expectations for coordinated disclosure in plain language.
2. **Dependency and lockfile expectations (`docs/dependencies.md`):** The doc states **`package-lock.json` as the source of truth**, **`npm ci`** for reproducible installs in **CI** (and the intended local/dev contrast if applicable), **`npm audit`** as part of hygiene, and that **major dependency upgrades** land as **dedicated PRs** with review—not bundled silently with unrelated features.
3. **Automated dependency signal (`.github/workflows/npm-audit.yml`):** Workflow runs on a **weekly schedule** and supports **`workflow_dispatch`**; it uses **`continue-on-error`** so the pipeline stays informative without blocking merges on audit noise; it uploads or retains an **`audit.json`** (or equivalent named artifact) for inspection.
4. **Operational security narrative and headers:** `docs/operational-guidelines.md` includes a **Security** section that **links to `docs/dependencies.md`** for lockfile/audit expectations; an **HTTP security headers** subsection documents headers applied in **`next.config.ts`** via **`headers()`**, including at minimum: **`X-Content-Type-Options: nosniff`**, **`X-Frame-Options: SAMEORIGIN`**, **`Referrer-Policy: strict-origin-when-cross-origin`**, and **`Permissions-Policy`** allowing **`geolocation=(self)`** (and any other documented directives) so **booking/maps** flows are not broken by overly strict defaults.
5. **Health endpoint behaviour (implementation):** `src/app/api/health/route.ts` **GET** returns JSON derived from **`checkDatabaseHealth()`**, with **HTTP 200** when healthy and **503** when unhealthy; any **catch** path returns a **generic client-facing message** only and **logs detail server-side**. `src/lib/health-check.ts` uses **generic unhealthy messages** in JSON—**errors are logged, not embedded** as raw provider messages, stack traces, or secrets in the response body.
6. **Health contract in runbooks:** `docs/local-development.md` and `docs/staging-and-promotion.md` each document **`GET /api/health`** with JSON fields **`status`**, **`message`**, **`timestamp`**, **200 vs 503**, and the rule that responses stay **generic**—**no secrets, raw provider errors, or stack traces** in production-oriented JSON (consistent with VST-2 deploy verification language).
7. **Supabase backups awareness:** `docs/staging-and-promotion.md` (or a clearly linked subsection) documents **Supabase backup / PITR** expectations with **links to provider documentation**, states **team awareness** of recovery responsibility, and explicitly defers **restore drills** to **VST-12** (compliance) **or** a later **ops/hardening** story—without implying drills are complete in this foundation slice.
8. **Discoverability of security reporting:** `docs/index.md` surfaces **`SECURITY.md`** in a **prominent** place (e.g. **Developer onboarding**, **Security / operations**, or equivalent hub section)—the index already references **operational guidelines** and **`docs/dependencies.md`** but MUST NOT leave **`SECURITY.md`** only discoverable by browsing the repository root.
9. **Epic traceability:** `docs/epic-4.md` **VST-3** bullet remains consistent with this story (disclosure, dependencies/lockfile ops expectations, documented **`/api/health`** contract, baseline headers, backups awareness); no conflicting duplicate requirements between epic and this file.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Review or author root **`SECURITY.md`**: private channel, **`security@vestroo.example`** placeholder, no public filing for undisclosed issues, scope repo + hosted infra; align wording with team policy. (AC: #1)

- [x] **Task 2 — AC2:** Verify **`docs/dependencies.md`** covers lockfile truth, **`npm ci`** in CI, **`npm audit`**, major upgrades via dedicated PRs; update if drift from **`package-lock.json`** / **`.github/workflows/ci.yml`** practice. (AC: #2)

- [x] **Task 3 — AC3:** Verify **`.github/workflows/npm-audit.yml`**: weekly + **`workflow_dispatch`**, **`continue-on-error`**, **`audit.json`** (or agreed artifact name); adjust schedule or artifact steps if missing. (AC: #3)

- [x] **Task 4 — AC4:** Align **`docs/operational-guidelines.md`** Security section with **`docs/dependencies.md`**; confirm **HTTP security headers** table matches **`next.config.ts`** `headers()` (nosniff, SAMEORIGIN, referrer policy, Permissions-Policy including **`geolocation=(self)`** for maps/booking). (AC: #4)

- [x] **Task 5 — AC5:** Read **`src/app/api/health/route.ts`** and **`src/lib/health-check.ts`**; confirm 200/503, generic JSON bodies, server-side logging on errors; fix any leak of secrets, raw traces, or provider dumps in responses. (AC: #5)

- [x] **Task 6 — AC6:** Update **`docs/local-development.md`** and **`docs/staging-and-promotion.md`** so **`GET /api/health`** contract (fields, status codes, generic body rule) matches implementation and VST-2 wording; fix broken anchors or cross-links. (AC: #6)

- [x] **Task 7 — AC7:** Extend **`docs/staging-and-promotion.md`** (or linked section) with **Supabase backups / PITR** links, team expectation, and explicit **out-of-scope restore drills** pointer to **VST-12** / hardening. (AC: #7)

- [x] **Task 8 — AC8:** Add **`SECURITY.md`** to **`docs/index.md`** in a prominent onboarding or security/ops section alongside existing operational and dependencies links. (AC: #8)

- [x] **Task 9 — AC9:** Re-read **`docs/epic-4.md` VST-3** after edits; adjust epic bullet or this story only if traceability or wording conflicts appear. (AC: #9)

## Dev Technical Guidance

- **Disclosure:** Start at repository root **`SECURITY.md`** — replace the example email when a real security inbox exists; keep **private reporting** as the default for undisclosed issues.
- **Dependencies:** **`docs/dependencies.md`** — lockfile + **`npm ci`**, audit posture, major-upgrade PR discipline; operational narrative in **`docs/operational-guidelines.md`** should **link here** rather than duplicating long policy.
- **Automated audit signal:** **`.github/workflows/npm-audit.yml`** — weekly signal + manual **`workflow_dispatch`**; **`continue-on-error`** and **`audit.json`** artifact for triage without blocking unrelated work.
- **HTTP headers:** Implement or verify in **`next.config.ts`** `headers()`; document the same set in **`docs/operational-guidelines.md`** so operators know what is enforced and why **geolocation** remains available for product flows.
- **Health:** **`src/app/api/health/route.ts`** + **`src/lib/health-check.ts`** — treat JSON as **public**; log internals, return **stable generic** `message` values on failure paths.
- **Runbooks:** **`docs/local-development.md`**, **`docs/staging-and-promotion.md`** — health contract for developers and release verification; stay aligned with **VST-2** post-deploy checks.
- **Backups:** **`docs/staging-and-promotion.md`** — provider links and “who owns recovery awareness”; **restore drills** belong to **VST-12** / hardening, not this baseline story.
- **Hub:** **`docs/index.md`** — ensure **`SECURITY.md`** is one click from the doc index, not only visible at repo root.
- **Related foundation:** **`docs/stories/vst-1.story.md`**, **`docs/stories/vst-2.story.md`** — avoid contradicting health and env guidance; prefer cross-links over repetition.
- **Scope:** **Security baseline and documentation alignment** plus **minimal code fixes** if responses or headers leak internals or break maps; defer penetration testing, full DR exercises, and compliance UI to later VSTs.

## Story Progress Notes

### Agent Model Used: `SM story prep` / dev implementation (2026-04-06)

### Completion Notes List

- **AC1:** Added **Coordinated disclosure** subsection to **`SECURITY.md`**; private reporting, placeholder email, public-issue prohibition, repo + hosted infra scope retained.
- **AC2:** Confirmed **`package-lock.json`** / **`npm ci`** in CI (`ci.yml`); added **local `npm install` vs `npm ci`** paragraph to **`docs/dependencies.md`**.
- **AC3:** Verified **`npm-audit.yml`**: weekly cron, **`workflow_dispatch`**, **`continue-on-error`**, **`audit.json`** uploaded (artifact name **`npm-audit-json`**).
- **AC4:** Renamed operational doc section to **`## Security`**; **HTTP security headers** table already matched **`next.config.ts`**; **`dependencies.md`** link retained.
- **AC5:** No code changes—**`route.ts`** and **`health-check.ts`** already return generic JSON and log server-side.
- **AC6:** **`local-development.md`** documents full health **JSON contract**, **200/503**, generic-body rule, anchor link to **`staging-and-promotion.md`** deploy verification; staging links to local anchor.
- **AC7:** Backups section strengthened with **team recovery awareness** and explicit deferral to **VST-12** / **later ops/hardening** (e.g. **VST-14**).
- **AC8:** **`docs/index.md`** — first **Developer onboarding** bullet + **Architecture** link to **`SECURITY.md`**; **Operational Guidelines** bullet notes Security + **dependencies** link.
- **AC9:** **`docs/epic-4.md` VST-3** expanded to mirror story themes without contradicting this file.
- **RLS footnote:** **`staging-and-promotion.md`** RLS section now references **VST-12** / later hardening (not VST-3).

### Story DoD Checklist Report

| Item | Status |
|------|--------|
| AC1–AC9 | Met (see completion notes). |
| Tests / lint | **`npm ci`**, **`npm run lint`** (exit 0; existing ESLint warnings in unrelated files), **`npm run test -- --run`** — **44 tests passed**. |
| New dependencies | None. |

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | Initial **Draft**: VST-3 ACs, tasks, and dev guidance from epic-4 and repo facts (SECURITY.md, dependencies, npm-audit workflow, operational headers, health route/helper, runbooks, backups awareness, index discoverability, epic traceability). |
| 2026-04-06 | **Implementation:** SECURITY coordinated disclosure; dependencies local vs CI installs; `## Security` heading in operational-guidelines; local-development health contract + cross-links; staging backups/RLS wording; index SECURITY links; epic-4 VST-3 expansion; tasks completed; **Status → Review**. |
| 2026-04-07 | **`.github/workflows/npm-audit.yml`** removed; **`docs/dependencies.md`** documents **manual / your-pipeline** **`npm audit`** instead; **AC3** historically referred to that workflow file. |
