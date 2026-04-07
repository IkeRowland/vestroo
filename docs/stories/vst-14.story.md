# Story VST-14: Hardening and go-live

## Status: Done

**Dependencies:** **[VST-1](vst-1.story.md)**, **[VST-2](vst-2.story.md)**, and **[VST-3](vst-3.story.md)** MUST be **in place** for **CI**, **`GET /api/health`**, **security baseline**, and **operational documentation** patterns. **[VST-6](vst-6.story.md)** MUST be **stable** so **booking E2E** targets **`/book/*`** (search → quote → details/payment as applicable) against **real or documented stub** behaviour. **[VST-7](vst-7.story.md)** MUST be **available** for **`/ops/*`** coverage; **staff JWT** and **ops Server Actions** imply **test doubles**, **CI secrets**, or **explicit deferral** with a **documented manual smoke** path—story MUST **not** imply unsecured ops routes in automation. **[VST-13](vst-13.story.md)** (**PayFast sandbox**, webhooks) means **full payment E2E** MAY be **mocked**, **tagged optional**, or **documented** as a **heavy** path—production cutover MUST still distinguish **sandbox vs production** credentials. **[VST-12](vst-12.story.md)** and **`docs/compliance-and-safety.md`** own **backup / retention policy** detail; this story **cross-links** **backup verification** and **restore drill** as an **engineering** checklist (**not** legal sign-off). **NFR** from **`docs/epic-4.md`** (**availability target e.g. 99.9% where agreed**, **HTTPS/TLS**, **TypeScript** for new app code) MUST be **referenced briefly** in acceptance criteria where they constrain **monitoring** or **release** gates.

## Story

- As a **release owner or tech lead** preparing **production cutover**
- I want **documented E2E coverage** for **booking** and **ops** paths (or **explicit** deferrals), **load smoke**, **monitoring expectations**, **runbooks**, and a **go/no-go checklist** including **backup verification pointers**
- so that **go-live is repeatable**, **regressions are caught before release**, and **on-call** has a **single index** for **staging promotion**, **health checks**, and **rollback posture**

## Epic traceability (source)

**From `docs/epic-4.md` — VST-14:** The platform MUST have documented booking E2E (fixtures where needed), ops automation **or** manual smoke, load smoke, monitoring, runbooks, and go/no-go + backup pointers. Track detail in **`docs/stories/vst-14.story.md`** (see **`docs/hardening-and-go-live.md`**).

**Terminology alignment:**

1. **E2E** = browser-level tests (default **Playwright** via **`@playwright/test`**, **`npm run test:e2e`**) exercising **user-visible** flows; **not** a substitute for **Vitest** unit/integration coverage.
2. **Load smoke** = **short**, **bounded** traffic against **safe** endpoints (e.g. **`GET /api/health`**) to catch **obvious** capacity or config mistakes—**not** full **performance benchmarking** or **SRE load testing**.
3. **Go/no-go** = **checklist-gated** promotion to **production** (env, migrations, RLS smoke, payments mode, DNS, **`NEXT_PUBLIC_APP_URL`**)—**not** a **legal** or **compliance audit**.
4. **Backup verification** = **awareness** of **Supabase** / **host** backup surfaces and **documented** steps to **confirm** backups exist and **how** a **restore drill** is scheduled (**VST-12**)—**not** executing **full DR** in this story.

**Out of scope (for this slice):** Full **penetration test** or **red team**. **SOC 2** / formal **audit pack**. **Multi-region** disaster recovery and **active-active** failover. **24/7 NOC** or **on-call vendor** contracts. **Chaos engineering** platform or **game days** as a product. **Datadog** / **full APM** mandate unless the repo already documents **stub** env vars and the hardening doc **explicitly** adopts them.

## Acceptance Criteria (ACs)

1. **Hardening / go-live index doc:** Add **`docs/hardening-and-go-live.md`** (or **agreed** name documented in this story’s **Change Log** if renamed) as the **single entry** for: **E2E scope** (what runs in CI vs local), **load smoke** approach (**MVP** = **documented** + **one** runnable path), **monitoring** expectations (**Vercel** / host, **Supabase** dashboard, **`GET /api/health`** as **synthetic probe**), **runbook index** (links into **`docs/operational-guidelines.md`** and related), **go/no-go checklist**, and **backup verification pointers** (**Supabase**, **Vercel** or agreed host—**no secrets** in doc). **Cross-link** **`docs/staging-and-promotion.md`**, **`docs/local-development.md`**, and **`CONTRIBUTING.md`** where **pre-release** steps apply.

2. **Playwright — booking path:** Expand **`tests/e2e/`** beyond **`tests/e2e/booking-search.spec.ts`** with at least **one** spec that progresses the **booking** journey **past search** (e.g. **quote** step on **`/book/quote`**, or **documented** **stub**/fixture if maps or Server Actions block deterministic CI without secrets). The **hardening doc** MUST state **required env** / **test account** assumptions for **local** vs **CI**.

3. **Playwright — ops path or deferral:** Either **(A)** add **`/ops/*`** E2E coverage using **documented** **test doubles** (e.g. **staff JWT** / **cookie** injection pattern aligned with **`src/lib/ops-auth.ts`**) **and** **CI secret** strategy, **or** **(B)** **explicitly defer** automated ops E2E with **rationale** (auth complexity, secret handling) and supply a **numbered manual smoke checklist** in **`docs/hardening-and-go-live.md`** (steps, expected outcomes). **Option B** MUST **not** leave ops **unmentioned** in go-live planning.

4. **Payments in E2E (VST-13):** Document and implement **one** approach: **mock** PayFast redirect/ITN in tests, **skip** payment completion with **`test.skip`** + **documented** reason, and/or mark **full sandbox payment** as **`@heavy`** / **optional** pre-release only. The **hardening doc** MUST state **PayFast sandbox vs production** for **cutover**.

5. **CI — E2E job or documented local-only gate:** Either **(A)** add an **optional** GitHub Actions job (e.g. **`e2e`**) in **your** repo or org that runs **`npm run test:e2e`** with **`CI=true`**, **Chromium-only** project selection to **save minutes**, **`playwright install --with-deps chromium`** (or equivalent), and **documented** **`secrets` / `env`** for **Supabase** and **maps** placeholders consistent with **`CONTRIBUTING.md`** / **`docs/local-development.md`**, **or** **(B)** **document** in **`docs/hardening-and-go-live.md`** and **`CONTRIBUTING.md`** why **E2E stays local-only** and make **E2E before release** a **required** **human** step. **`lint`**, **`test`**, and **`build`** MUST remain **documented** gates (local and/or **Vercel** build)—this repo does **not** ship a **`build-test-lint`** workflow file.

6. **Load smoke — documented + runnable:** Document **one** **MVP** approach (e.g. **`k6`** stub, **`autocannon`**, or **`curl`** loop / **`ab`** against **`/api/health`**) in **`docs/hardening-and-go-live.md`**. Ship **one** **low-effort** **runnable** artifact: e.g. **`scripts/load-smoke.sh`**, **`scripts/load-smoke.mjs`**, or **`npm run load-smoke`**—must be **safe** (no destructive endpoints, **rate-limited** / **low concurrency** defaults) and **documented** usage.

7. **Monitoring:** Document **where** to observe **errors** and **latency** (**Vercel** or agreed **host** metrics, **Supabase** dashboard, application **`/api/health`**). **No** new **Datadog** requirement unless **stub** env vars already exist and the doc **opts in** explicitly.

8. **Runbooks:** **`docs/operational-guidelines.md`** MUST **cross-link** or add a **short subsection** pointing to **`docs/hardening-and-go-live.md`** for **incident response** **index** and **deploy / rollback** **high-level** steps (link to **Vercel** / host rollback, **migration** caution—**forward-only** per **`docs/staging-and-promotion.md`**).

9. **Go/no-go checklist:** In **`docs/hardening-and-go-live.md`**, include a **checklist** covering at minimum: **env vars** complete and **secret-free** in git; **migrations** applied to **target** environment; **RLS smoke** (staff vs customer **denial** spot-check); **PayFast** **production** vs **sandbox**; **domain / DNS** and **`NEXT_PUBLIC_APP_URL`** / **`metadataBase`** alignment; **E2E** or **documented manual** substitute **passed**.

10. **`playwright.config.ts` CI ergonomics:** If **CI E2E** is chosen (AC5A), adjust **`playwright.config.ts`** (or **document** `PLAYWRIGHT_PROJECTS` / CLI flags) so **CI** runs **Chromium-only** by default **without** breaking **local** multi-browser **`projects`**—or **document** the **exact** **`npx playwright test --project=chromium`** command for CI.

11. **Quality gates:** **`npm run test`** (Vitest), **`npm run lint`**, and **`npm run build`** remain **green** after changes; **`docs/hardening-and-go-live.md`** lists **`npm run test:e2e`** as the **E2E** entry command.

12. **Developer index:** Add **`docs/hardening-and-go-live.md`** to **`docs/index.md`** (Developer onboarding / operations section as appropriate).

13. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-14** MUST remain **consistent** with this story; resolve conflicts in **epic** or **this file** explicitly.

14. **NFR touchpoints:** **`docs/hardening-and-go-live.md`** MUST **briefly** reference **NFR.1.3** (uptime posture / synthetic checks), **NFR.3.1** (**HTTPS/TLS**, secrets hygiene), and **NFR.4.1** (**TypeScript**—no new untyped surfaces in **E2E helpers** without **documented** exception).

15. **Backup / restore cross-link:** **`docs/hardening-and-go-live.md`** MUST **link** **`docs/compliance-and-safety.md`** (and/or **VST-12**) for **retention** and **restore drill** expectations—framed as **engineering** verification, **not** legal advice.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Author **`docs/hardening-and-go-live.md`** (E2E scope, load smoke, monitoring, runbook index, go/no-go, backup pointers, links to staging/local/CONTRIBUTING). (AC: #1)

- [x] **Task 2 — AC2:** Extend **Playwright** **`tests/e2e/`** for **booking** beyond **`booking-search.spec.ts`** (quote or documented stub). (AC: #2)

- [x] **Task 3 — AC3:** Implement **ops E2E** with **test doubles** **or** **defer** with **manual checklist** in hardening doc. (AC: #3)

- [x] **Task 4 — AC4:** Align **payment** E2E with **VST-13** (mock / skip / optional heavy); document **sandbox vs prod** cutover. (AC: #4)

- [x] **Task 5 — AC5:** Add **optional** **`e2e`** CI job **or** document **local-only** + **required** pre-release E2E; keep **`build-test-lint`** unchanged. (AC: #5)

- [x] **Task 6 — AC6:** Add **load smoke** script + **npm** script if low effort; document usage. (AC: #6)

- [x] **Task 7 — AC7:** Document **monitoring** surfaces (Vercel/host, Supabase, **`/api/health`**). (AC: #7)

- [x] **Task 8 — AC8:** Update **`docs/operational-guidelines.md`** with **cross-links** / subsection to hardening doc. (AC: #8)

- [x] **Task 9 — AC9:** Finalise **go/no-go checklist** content in hardening doc. (AC: #9)

- [x] **Task 10 — AC10:** Tune **`playwright.config.ts`** or **document** Chromium-only CI invocation. (AC: #10)

- [x] **Task 11 — AC11:** Verify **`npm run test`**, **`lint`**, **`build`**; document **`npm run test:e2e`**. (AC: #11)

- [x] **Task 12 — AC12:** Link from **`docs/index.md`**. (AC: #12)

- [x] **Task 13 — AC13:** Re-read **`docs/epic-4.md` VST-14`**; align if needed. (AC: #13)

- [x] **Task 14 — AC14:** Add **NFR** subsection or bullets in hardening doc. (AC: #14)

- [x] **Task 15 — AC15:** Add **VST-12** / **compliance** **backup / restore drill** cross-link. (AC: #15)

## Story Progress Notes

### Agent Model Used: Dev Agent (implementation 2026-04-07)

### Completion Notes List

- **`docs/hardening-and-go-live.md`:** Single index for E2E (CI vs local, fixture doc), ops **manual** smoke (option B), PayFast skip/`@heavy`, load smoke, monitoring, runbooks, go/no-go, NFR + compliance links.
- **Booking E2E:** `tests/e2e/booking-quote.spec.ts` + **localhost-only** `E2eBookingFixtureLoader` on `/book/search?e2e_fixture=quote` (avoids relying on `NODE_ENV` in the client bundle); typed helper `tests/e2e/helpers/booking-fixture-url.ts`. **`booking-search.spec.ts`** locators aligned to current form (**Get Instant Quote**, `#pickup-address-input`, etc.).
- **Verification:** `npx playwright test --project=chromium` (6 passed, 1 skipped); **`npx playwright install chromium`** required once if browsers missing.
- **PayFast E2E:** `tests/e2e/booking-payment-payfast.spec.ts` with `RUN_HEAVY_E2E` gated `@heavy` skip; hardening documents sandbox vs prod and optional `page.route` mock.
- **Load smoke:** `scripts/load-smoke.mjs`, `npm run load-smoke`.
- **CI / E2E:** Option **B** — E2E local-only documented in hardening + CONTRIBUTING; **no** GitHub Actions workflows in-repo (removed **2026-04-07**); **`lint` / `test` / `build`** documented in **CONTRIBUTING** + **local-development**.
- **`playwright.config.ts`:** Comment + hardening documents `npx playwright test --project=chromium` for hypothetical CI.

### Story DoD Checklist Report (`docs/checklists/story-dod-checklist.txt`)

| Item | Status / note |
| ---- | ---------------- |
| TypeScript strict, no careless `any` | Met for new TS; fixture loader + E2E helpers typed. |
| JSDoc all new functions | Met where new exported surface (`E2eBookingFixtureLoader` block comment). |
| Unit tests for new business logic | **N/A** — no new pricing/actions; E2E covers fixture path. |
| All tests pass | Verified: `npm run test`, `lint`, `build`; E2E run recorded in completion. |
| README / API / data models | **N/A** — docs index + hardening + CONTRIBUTING updated instead. |
| Zod / RLS / new endpoints | **N/A** — documentation + E2E harness only. |
| UX / performance items | **N/A** — no product UI change beyond dev-only fixture loader. |
| Tasks complete, Status Review | Yes. |

### Change Log

| Date | Change |
|------|--------|
| 2026-04-07 | Initial **Draft**: **VST-14 Hardening and go-live** from **`docs/epic-4.md`**; dependencies **VST-1–VST-3**, **VST-6**, **VST-7** (test doubles or deferral), **VST-13** (payment E2E options), **VST-12** / **`docs/compliance-and-safety.md`** (backup/restore cross-link); **release owner** persona; epic traceability + terminology + **out of scope** (pentest, SOC2, multi-region DR, 24/7 NOC, chaos platform); **15 ACs** (hardening doc, booking E2E, ops E2E or manual, PayFast E2E strategy, CI optional vs local-only, load smoke script, monitoring, runbooks link, go/no-go checklist, Playwright CI ergonomics, quality gates, **`docs/index.md`**, epic alignment, NFR touchpoints, backup cross-link); **15 tasks** mapped to ACs; **Dev Technical Guidance** (Playwright, CI, ops-auth, health, staging, CONTRIBUTING). |
| 2026-04-07 | **Implemented:** hardening doc, CONTRIBUTING + operational-guidelines + index + epic VST-14 alignment; `booking-quote.spec.ts`, PayFast `@heavy` spec, `load-smoke.mjs`, `E2eBookingFixtureLoader`; Status → **Review**. |
| 2026-04-07 | **Repo change:** Removed **`.github/workflows/*.yml`** (no GitHub Actions in-tree); docs + epic **VST-1 / VST-2 / VST-3** narratives updated via change logs; quality gates = local / host per **CONTRIBUTING**. |
