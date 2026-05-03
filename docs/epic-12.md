# Epic 12 — Booking visibility, unified ops queue, corporate account foundation (VST-14)

## Description

This epic addresses **operational blind spots** where staff work is **trip-centric** or **queue-tab–centric**, leaving **bookings without linked trips** or certain **`booking_intent`** values **hard to discover**. It introduces the **VST-14** schema foundation for **corporate / account clients** (orgs, membership, quotes, dispatch guardrails) while delivering a **unified bookings surface** in ops so fulfilment, dispatch, and triage share one **canonical list** with **filters**, **realtime**, and **clear navigation** from the ops home.

The epic also lands two **latent-bug reliability fixes** surfaced during architecture review — a **`UNIQUE(booking_id)`** on **`booking_trips`** (closes a TOCTOU race in **`assignBookingToRun`**) and a **`CHECK`** on **`bookings.status`** (replaces free-text with an explicit state machine) — so Epics **13** and **14** are not built on quiet data-integrity gaps.

It builds on **[`docs/epic-11.md`](epic-11.md)** (**E1** stable RLS, **E2** ops runtime patterns), **[`docs/epic-1.md`](epic-1.md)** (core booking model), and **[`docs/epic-10.md`](epic-10.md)** (public funnel patterns where booking metadata overlaps). It **prepares** data for **[`docs/epic-13.md`](epic-13.md)**–**[`docs/epic-15.md`](epic-15.md)** but does **not** ship full account invoicing, walk-in PayFast completion, or customer portal scope.

## 1. Epic summary & goals

**Epic 12** makes **all staff-relevant bookings discoverable** in ops (not only those visible via **`trips`** or a single fulfil tab), and lands **VST-14** tables, enums, **RLS**, and **typed** access patterns so later epics can implement **account dispatch**, **quote-first walk-in**, and **benchmark** features without another foundational migration.

### Root cause summary (product + data)

- **Trip-centric ops pages** (`/ops/trips`, `/ops/board`) query **`trips`** (directly or effectively); **bookings without trips** are **invisible** there, even when they need staff action. The current `/ops/board` empty-state copy explicitly documents this: *"the board lists trip rows from Supabase, not booking headers; a booking alone does not appear until a trip exists"*.
- **`booking_intent = trip_request`** bookings historically appeared on **Trip requests** but were excluded from **`?queue=paid`** until **`docs/fulfil-queue-buckets.md`** was aligned so **paid + `ready_to_assign` + unlinked** trip requests join the **Assignment (paid)** tab for dispatch.
- **Live production evidence:** at time of review, **3 bookings** exist in the database with **`status='pending'`**, **`booking_intent='trip_request'`** — each invisible on **`/ops/trips`** and **`/ops/board`**, discoverable only on the default **`/ops/fulfil`** tab. RLS and staff resolution are **not** the bug; navigation is.
- **Schema gaps blocking Epics 13–14:** no concept of a corporate account, no quote lifecycle entity, **`bookings.status`** is unchecked text, **`booking_trips.booking_id`** has no unique constraint.

### Business goals

- **Single queue mental model:** Staff can open **one bookings view** and **chip/tab** into the right slice (new, paid, pending, trip request, account vs walk-in, etc.) without losing bookings “between” pages.
- **Corporate readiness:** **Organisations**, **membership**, and **bookings** linked to accounts support **PO guardrails**, **account snapshots**, and **versioned quotes** before payment-heavy flows land in Epic 13–14.
- **Trustworthy gating:** **`can_dispatch_account_booking()`** (and related checks) return **explicit reason codes** so UI and audits stay aligned with policy.
- **No silent data-integrity regressions:** reliability fixes land **inside** the foundational migration so later epics inherit a sound base.

### Technical goals

- **Schema:** `customer_accounts`, `customer_account_members`, `bookings.client_type` (`walk_in` | `account_client`), `bookings.customer_account_id`, `bookings.account_snapshot`, optional `bookings.current_quote_id`, **`booking_quotes`** (append-only versions, **`expires_at`** — app defaults **72h walk-in** / **14d account**), **`can_dispatch_account_booking()`** `SECURITY DEFINER` with **reason codes** including **`po_required_and_missing`**, **MVP 1:1** enforced by **`UNIQUE (booking_id)`** on **`booking_trips`**, **`bookings.status`** `CHECK` including transitional **`pending`** until a later epic fully normalises app usage.
- **RLS:** Member **`INSERT`** gates and staff paths **compose** with Epic **E1**; **`supabase/smoke_rls.sql`** extended for new surfaces (append-only **`booking_quotes`** has no DELETE policy by design).
- **Types:** Generated / hand-maintained types updated after migration so app code does not drift.
- **Ops UI (this epic):** Ops home **“New Bookings”** entry, **`/ops/bookings`** with **filter chips**, **realtime** on bookings list where consistent with **E2**; **identify client** action and **PO** form validation hooks as specified in themes below — **not** full Epic 13 dispatch or Epic 14 PayFast UI unless explicitly pulled forward.

### Canonical technical design

**Migration file:** `supabase/migrations/20260419120000_vst14_account_clients_and_quotes.sql` (see architecture review — delivered as reviewable artefact; applied under Story **12.1**). **Design invariants:**

- **`booking_quotes`** is **versioned immutable history**, not a mutable pointer. Re-send creates a new version and marks the prior **`superseded`**; `accepted_at`, `rejected_at`, `sent_at`, `expires_at`, `rendered_html`, and `idempotency_key` are carried per version. A `v_booking_current_quote` view returns the newest non-superseded quote per booking for read ergonomics. **No DELETE policy** on `booking_quotes` — audit integrity.
- **`can_dispatch_account_booking(p_booking_id)`** guards post-paid dispatch with **five** reason codes: `account_{status}`, `contract_not_yet_active`, `contract_expired`, `po_required_and_missing`, `credit_limit_exceeded`, `overdue_invoices`. Returns `(true, 'ok')` only when all gates pass. Called from `isBookingDispatchable()` (Epic 13); unused in Epic 12 but the schema contract is frozen here.
- **Bookings state machine** (values in `bookings_status_check`): `pending` (transitional) → `submitted` → `triaged` → branching:
  - **Account path:** `triaged` → `assigned` → `in_progress` → `completed`
  - **Walk-in path:** `triaged` → `quote_sent` → `awaiting_payment` → `paid` → `assigned` → `in_progress` → `completed`
  - **Terminal:** `cancelled`, `expired` reachable from any non-terminal state.
- **`bookings_account_linkage_check`** hard-asserts `client_type='walk_in'` ↔ `customer_account_id IS NULL`, `client_type='account_client'` ↔ `customer_account_id IS NOT NULL`. Prevents orphaned or inconsistent rows.
- **`account_snapshot`** denormalises `name`, `credit_terms_days`, `default_billing_entity_ref`, `po_required_at_snapshot` at booking time, because account terms change and dispute handling 12+ months later requires the **as-booked** values.

### Product decisions locked (PM + Architect)

| Id | Decision |
|----|----------|
| **Q1** | **Multi-leg deferred:** **`UNIQUE(booking_id)`** on **`booking_trips`** for MVP **1:1** booking–trip. Round-trips modelled as two linked bookings; widen to `UNIQUE(booking_id, sort_order)` only when a real multi-leg tour customer lands. |
| **Q2** | **Quote expiry:** **72h** default for `client_type='walk_in'`, **14 days** default for `client_type='account_client'`. Stored in `booking_quotes.expires_at`; overridable per-quote at send time. Daily job transitions `sent → expired` when `now() > expires_at` (job is Epic 13/14 scope; column and semantics locked here). |
| **Q3** | **Riders cannot self-book** in MVP; **admin + booker** roles only for account booking creation paths surfaced in this programme. `rider` role exists for passenger manifest / future rider apps (Epic 15). |
| **Q4** | **Purchase order:** **Form-required** on the booking form when the resolved account has `default_po_required=true`; server-side guardrail returns `po_required_and_missing` if bypassed. **No DB-level `CHECK`** — two-layer enforcement (form + guardrail) keeps guest entrypoints usable while closing the dispatch gap. |
| **Q5** | **Retro-link walk-in → account** only when **`payment_status != 'paid'`** — once paid, the booking's `client_type` is immutable. Rationale: protects finance reconciliation, receipts, and AR reporting. |
| **Q6** | **Domain match** for account association: **suggest + explicit confirm** — **never** silent auto-link on domain alone. Prompt copy: *"Looks like you might be booking for **{Account}**. Is this a business booking on their account?"* Default-deny if dismissed. Choice recorded in `booking_metadata.client_type_source`. |
| **Q7** | **`booking_intent='trip_request'`** remains a valid intent value. It represents **what** the customer wants (inquiry vs commitment), not **where** they are in the process — that is `bookings.status`'s job. The unified `/ops/bookings` queue includes `trip_request` intents by default with **no** pre-applied intent filter. |

## 2. Non-goals / out of scope (brief)

- **Full account dispatch without prepayment** (logic beyond schema + guardrails) — **[`docs/epic-13.md`](epic-13.md)**.
- **Walk-in quote-first checkout, PayFast handoff, paid → ready-to-assign** productisation — **[`docs/epic-14.md`](epic-14.md)**.
- **Customer account portal, rider share tracking, comms matrix, dispatch intelligence** — **[`docs/epic-15.md`](epic-15.md)** (may split sub-epics there).
- **Replacing PayFast** or new payment processors beyond hooks implied by quotes / status.
- **Multi-leg** **`booking_trips`** per booking before an explicit future epic removes the MVP unique constraint.
- **Removing `pending` from `bookings_status_check`** — retained as transitional value; normalisation to `submitted` is follow-up cleanup in Epic 13's first story or a parallel small story.
- **`booking_quotes` writes** — the table is created, indexed, and RLS'd here; no story in Epic 12 inserts a row. First writer is Epic 13 (account path) / Epic 14 (walk-in path).
- **Daily `sent → expired` transition job** — schema supports it; job itself is Epic 13/14.
- **Rider role self-service** — `rider` exists but is not granted booking-submit capability in Epic 12; revisit only when a paying customer requires it.

## 3. Phased delivery plan

**Ordering principle:** **Land VST-14 migration + types + RLS smoke** before expanding ops UI that queries new joins; **unify `/ops/bookings`** before deep feature work in 13–14.

| Phase | Focus | Includes (story roll-up) | Parallelism |
|--------|--------|---------------------------|-------------|
| **1 — VST-14 foundation** | Migration, types, `smoke_rls` | **12.1** migration + types + reliability fixes + smoke RLS extensions | Blocker — must complete before Phase 2+ |
| **2 — Ops discovery** | Home card + unified list | **12.2** “New Bookings” home card; **12.3** `/ops/bookings` + filter chips | 12.2 and 12.3 parallelisable after 12.1 |
| **3 — Freshness** | Realtime / refresh | **12.4** bookings subscription or documented refresh, aligned with **E2** | Depends on 12.3 |
| **4 — Client model in UI** | Inference + actions | **12.5** `client_type` inference rules (**Q6**); **12.6** identify-client ops action (**Q5**) | Both depend on 12.3 |
| **5 — PO + membership hardening** | Forms + RLS | **12.7** PO form validation (**Q4**); **12.8** RLS member `INSERT` gate (**Q3**) | 12.7 parallel after 12.1; 12.8 depends on 12.5 |
| **6 — Quality** | Automated + smoke | **12.9** E2E + smoke extensions for new routes and policies | Runs last; covers 12.2–12.8 |

**Sizing estimate:** ~23 story points across 9 stories. Single-developer throughput ≈ 2 sprints; 2-developer parallel throughput ≈ 1.5 sprints. At the upper edge of a single-epic scope but manageable because the long tail (12.5–12.9) is UI + test work on a stable schema.

## 4. Themes with user stories & acceptance criteria

### Theme A — VST-14 schema & types (foundation)

**US-A1 — As a maintainer**, I need **VST-14 migration** applied with **`booking_quotes.expires_at`**, **`can_dispatch_account_booking()`** including **PO check** block, **MVP unique** on **`booking_trips(booking_id)`**, and **`CHECK`** constraints on **`bookings.status`** and **`bookings.payment_status`**, so that **downstream epics share one source of truth**.

- **AC:** Migration file (`supabase/migrations/20260419120000_vst14_account_clients_and_quotes.sql` or successor renamed in PR) matches the architecture-review DDL; **`expires_at`** present on **`booking_quotes`**.
- **AC:** **`can_dispatch_account_booking()`** returns structured **reason codes** (`account_{status}`, `contract_not_yet_active`, `contract_expired`, `po_required_and_missing`, `credit_limit_exceeded`, `overdue_invoices`) and enforces **PO** rules per **Q4**.
- **AC:** **`booking_trips.booking_id`** carries **`UNIQUE`**; an attempt to insert two rows with the same `booking_id` on a staging branch **fails** at the DB level (not application-layer).
- **AC:** **`bookings_status_check`** includes transitional **`pending`**; existing `pending` rows backfilled to `submitted`; attempting to insert an unlisted status string **fails**.
- **AC:** **`bookings_account_linkage_check`** rejects `client_type='walk_in' AND customer_account_id IS NOT NULL`, and rejects `client_type='account_client' AND customer_account_id IS NULL`.
- **AC:** Types regenerated (`npm run db:types` or equivalent); `next build` passes; no new type errors in `src/actions/` or `src/app/(ops)/`.

**US-A2 — As ops security**, I need **`smoke_rls`** extended for **new tables/policies**, so that **VST-14 does not regress E1**.

- **AC:** Smoke documents **roles/tables** added for VST-14: `customer_accounts`, `customer_account_members`, `booking_quotes`.
- **AC:** Assertions cover: staff full access on all three; member SELECT on own-account row; member SELECT on own-account members; booking-owner SELECT on own quotes; non-staff non-member returns zero rows.
- **AC:** Assertion that `booking_quotes` has **no** DELETE policy (attempting DELETE as staff or non-staff both fail).
- **AC:** CI/local smoke passes at migration head; result documented in `supabase/smoke_rls.sql` comment header.

### Theme B — Unified ops bookings queue

**US-B1 — As fulfilment staff**, I need **`/ops/bookings`** with **filter chips** aligned to **status**, **intent**, **payment status**, and **client type**, so that **I do not miss bookings outside `/ops/trips` or `/ops/board`**.

- **AC:** List is driven from **`bookings`** (and joins as needed), not only **`trips`**.
- **AC:** Default view applies **no pre-set filters** — every booking row is visible regardless of `status`, `booking_intent`, or `payment_status`. This directly fixes the current "trip_request invisible on pending/paid tabs" navigation bug.
- **AC:** Chip set: **Status** (multi-select against `bookings_status_check` values), **Payment** (multi-select against `bookings_payment_status_check` values), **Intent** (multi-select against existing `bookings_booking_intent_check` values), **Client type** (`walk_in` | `account_client` | both).
- **AC:** Chips match **documented predicates**; empty states explain **why** (e.g. "No bookings with status `paid` and intent `trip_request` in the current window") per Epic **E2** empty-state pattern.
- **AC:** Row renders at minimum: `payment_reference`, `customer_name`, `customer_email`, `pickup_datetime`, `status` badge, `payment_status` badge, `client_type` badge, `booking_intent` badge, `total_amount`, and either a vehicle preview or a "not yet assigned" marker.
- **AC:** Row deep-links to a booking detail view (if exists) or a placeholder for Epic 13/14 to wire.

**US-B2 — As ops staff**, I need a **“New Bookings”** (or equivalent) **card** on the ops home, so that **I can navigate to triage quickly**.

- **AC:** Deep-links to **`/ops/bookings`** with sensible default filters (no pre-applied restrictive filters — the point is discoverability).
- **AC:** Card shows a live count of bookings in states `submitted`, `triaged`, `quote_sent`, `awaiting_payment` (the "needs attention" set), refreshed on each navigation.
- **AC:** When count is zero, card shows a neutral empty state; when count > 0, card is visually distinct (badge / colour) to draw attention.

### Theme C — Realtime & E2 alignment

**US-C1 — As ops staff**, I need **fresh booking rows** on the unified list, so that **I trust what I see**.

- **AC:** Realtime subscription on `public.bookings` (INSERT, UPDATE) filtered to the ops session; new rows appear without manual refresh within **3 seconds** of DB insert.
- **AC:** If realtime is unavailable / disabled, fallback to explicit refresh button and a visible data-freshness indicator per **[`docs/ops-data-freshness.md`](ops-data-freshness.md)** — no silent staleness.
- **AC:** Subscription teardown on route change / unmount; no memory leaks in Playwright or manual testing.
- **AC:** Realtime messages are authenticated (ops session); non-staff subscribers receive nothing per existing RLS propagation.

### Theme D — Client typing & identify-client

**US-D1 — As ops staff**, I need **`client_type`** inferred consistently at the booking form, so that **walk-in vs account** filters are reliable and bookers who belong to an account do not accidentally book as walk-ins.

- **AC (Q6 suggest-and-confirm):** When a booker enters an email whose domain matches an `authorized_email_domains` entry on an **active** `customer_accounts` row, the form shows a confirmation prompt: *"Looks like you might be booking for **{Account}**. Is this a business booking on their account?"* with choices `[Yes, use {Account} account]` / `[No, personal booking]`.
- **AC:** If the domain matches **more than one** active account, show a select list of account names instead of two buttons.
- **AC:** Dismissing the prompt (click-outside / Esc) defaults to `client_type='walk_in'` — **never** silently tags as `account_client`.
- **AC:** The booker's choice is recorded in `booking_metadata.client_type_source` as one of: `'user_confirmed_domain_match'`, `'user_declined_domain_match'`, `'no_match'`, `'ops_manual'` (for later identify-client action).
- **AC:** Inference rules documented inline in `docs/data-models.md` or an epic-12 addendum; matches DB defaults after migration.

**US-D2 — As ops staff**, I need an **"Identify client"** action on each booking row, so that **misclassified rows can be corrected** — **Q5**.

- **AC (Q5 retro-link bounds):** When the booking's `payment_status` is not `paid`, the action opens a picker allowing: link to existing `customer_accounts` row, create a new account inline (staff-only, re-uses the Epic 12 RLS `_staff_insert` policy), or revert `account_client → walk_in`.
- **AC:** When the booking's `payment_status='paid'`, the action is **disabled** with tooltip: *"Paid walk-ins can't be retro-linked. Reason: finance reconciliation."* — the same constraint applies to unlinking a paid `account_client`.
- **AC:** On successful link: `client_type → 'account_client'`, `customer_account_id` set, `account_snapshot` captured from the **current** account state at link time.
- **AC:** On successful unlink: `client_type → 'walk_in'`, `customer_account_id` cleared, `account_snapshot` cleared.
- **AC:** Every link / unlink writes an `ops_audit_log` row with `action='identify_client'`, `payload={prior_client_type, new_customer_account_id?, prior_customer_account_id?}`.
- **AC:** `bookings_account_linkage_check` constraint is respected — the UI never attempts an illegal combination.

### Theme E — PO validation & member INSERT RLS

**US-E1 — As finance**, I need **PO capture** when required by the booking account, so that **dispatch cannot proceed with `po_required_and_missing`** — **Q4**.

- **AC:** When a booking's resolved `customer_account_id` has `default_po_required=true`, the booking form's PO field is **required** (client-side validation blocks submit).
- **AC:** Form error copy explains *why*: *"{Account} requires a purchase order reference for every booking."*
- **AC:** If the form is bypassed (API / direct action), `can_dispatch_account_booking()` returns `(false, 'po_required_and_missing')` and the ops dispatch UI renders a clear block message with the reason code.
- **AC:** A PO field on a walk-in booking remains optional; the constraint applies only when an account is linked.

**US-E2 — As security**, I need **RLS** to gate **`customer_account_members` INSERT** and **account-linked booking INSERT**, so that **only authorised roles** create membership or book on behalf of an account.

- **AC:** `customer_account_members_staff_insert` already enforces staff-only creation in Epic 12's initial RLS; this story adds an RLS layer to `bookings_insert` such that when `customer_account_id IS NOT NULL`, the inserting user must either be staff **or** be a member with `role IN ('admin','booker')` for that account (Q3).
- **AC:** Attempting to insert a booking with `client_type='account_client'` as a `role='rider'` member on the target account **fails** at the RLS layer.
- **AC:** Policy tests in **`smoke_rls`** or agreed SQL test harness cover: staff insert OK, admin-member insert OK, booker-member insert OK, rider-member insert blocked, non-member insert blocked.

### Theme F — Story catalogue (reference for SM)

The full breakdown SM will draft from. Story points are estimates; re-size at drafting time.

| ID | Title | Theme | Pts | Depends |
|----|-------|-------|-----|---------|
| **12.1** | Apply VST-14 migration + amendments, regenerate types, extend smoke RLS | A | **2** | — (blocker for all below) |
| **12.2** | "New Bookings" home card with live count | B | **1** | 12.1 |
| **12.3** | Unified `/ops/bookings` page with status / payment / intent / client-type chips | B | **5** | 12.1 |
| **12.4** | Realtime bookings subscription with refresh fallback | C | **2** | 12.3 |
| **12.5** | Client-type inference — suggest-and-confirm domain match on booking form (**Q6**) | D | **3** | 12.3 |
| **12.6** | "Identify client" ops action with unpaid-only retro-link (**Q5**) | D | **3** | 12.3 |
| **12.7** | PO-required form validation for account bookings (**Q4**) | E | **2** | 12.1 |
| **12.8** | Bookings INSERT RLS gate — account-member roles (**Q3**) | E | **2** | 12.5 |
| **12.9** | E2E (Playwright) + smoke coverage for all Theme B–E paths | Quality | **3** | 12.2–12.8 |

## 5. Cross-cutting dependencies matrix

| Item | Depends on | Blocks or strongly influences |
|------|------------|------------------------------|
| **VST-14 migration** | **[`docs/epic-11.md`](epic-11.md) E1** (stable `bookings` / `booking_trips` RLS); **[`docs/epic-1.md`](epic-1.md)** booking baseline | Epic **13**, **14**, **15** |
| **Unified `/ops/bookings`** | **E2** error/refresh patterns; **E1** | Staff efficiency; intent visibility with **E5** search (can cross-link) |
| **`booking_quotes` / `expires_at`** | Migration | Epic **13** invoicing / quote acceptance; Epic **14** walk-in expiry |
| **`can_dispatch_account_booking()`** | Migration; PO rules | Epic **13** dispatch without prepayment |
| **Member RLS** | E1 compose model | Corporate onboarding flows |
| **Reliability fixes (`booking_trips` unique, `bookings.status` CHECK)** | Migration | Removes latent races / typos that would silently re-break fulfilment in Epic 13/14 |
| **Ops navigation** | Current fulfil/trips/board routes | Reduces duplicate queue logic |

**Upstream docs:** **[`docs/epic-11.md`](epic-11.md)** (**E1**, **E2** especially), **[`docs/epic-1.md`](epic-1.md)**, **[`docs/epic-10.md`](epic-10.md)**.

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Existing application code writes `status='pending'` after the CHECK constraint lands | **Medium** | Story 12.1 backfills existing rows to `submitted` **and** retains `pending` in the CHECK as transitional. Epic 13 owns the cleanup story that removes `pending` once all writers migrate. |
| Realtime subscription scale on `/ops/bookings` | **Low** | Only ops staff subscribe; expected < 10 concurrent. Revisit at Epic **15** when customer portals come online. |
| Email domain match on shared inboxes (e.g. `info@acme.co.za`) triggers false positives | **Low** | Q6 decision (suggest + explicit confirm) already handles this — user must explicitly accept. `client_type_source` field preserves the user's choice for audit. |
| Sprint spillover with a single-dev team | **Medium** | PO may descope Story 12.8 to Epic 13 if needed — member-role gate only matters once Epic 13 starts writing account bookings at scale. |
| `booking_trips.booking_id` unique constraint breaks a latent multi-leg code path | **Low** | Current code only inserts `sort_order=0`; no live multi-leg paths exist. If one is discovered during Story 12.1 apply, narrow the constraint to `(booking_id, sort_order)` in the same migration (one-line change). |
| `booking_quotes` never written during Epic 12 → masked bugs surface in Epic 13/14 | **Medium** | Story 12.9's smoke suite exercises an **INSERT** of a quote row (via a test-only path) to confirm RLS, constraints, and the view behave correctly even though no production writer exists yet. |
| PO-required form validation bypassed by API clients | **Low** | Two-layer design (form + guardrail) ensures server-side `po_required_and_missing` always fires. Smoke test 12.9 covers the API-bypass case explicitly. |

## 7. Definition of Done for Epic 12

- **Schema:** VST-14 tables, constraints (**`UNIQUE(booking_id)`** on **`booking_trips`**), **`booking_quotes.expires_at`**, **`bookings.status`** and **`bookings.payment_status`** `CHECK` constraints, **`bookings_account_linkage_check`**, **`can_dispatch_account_booking()`** with **PO** block and **reason codes** — all **migrated** and **documented** in this epic.
- **Regression:** **`supabase/smoke_rls.sql`** updated and **passing** for new RLS; includes assertions for append-only `booking_quotes` (no DELETE) and member-role INSERT gating.
- **Reliability fixes verified:** duplicate `booking_trips(booking_id)` INSERT fails at the DB; unknown `bookings.status` value INSERT fails at the DB; legacy `pending` rows migrated to `submitted`.
- **Ops UX:** **`/ops/bookings`** live with **chips**; ops home **entry** to new work; **realtime/refresh** documented; **trip_request** / **no-trip** bookings **discoverable** vs **fulfil** / **`/ops/trips`** / **`/ops/board`** only. Zero-invisible-booking property demonstrated by a Playwright test that submits from the public form and asserts visibility within 3 seconds.
- **Product locks:** **Q1–Q7** reflected in ACs or explicit story notes; **no** silent domain link; retro-link respects payment-paid boundary; riders cannot submit account bookings.
- **Types:** Regenerated Supabase types committed; `next build` clean; no red squiggles in ops action files referencing new tables.
- **Quality:** Critical paths **E2E** or **smoke** extended per team norms; no known **sev-1** gaps for "invisible booking" class. Story 12.9's test set runs green in CI.

## 8. References to likely code areas (paths only)

- **Ops shell & pages:** `src/app/(ops)/ops/` — especially **`fulfil/page.tsx`**, **`trips/`**, **`board/page.tsx`**, **`page.tsx`** (home), **new** `bookings/` route as implemented
- **Ops dispatch / mutations:** `src/actions/opsDispatch.ts` (and related **`src/actions/ops*.ts`**)
- **Public booking form & validation:** `src/actions/createBooking.ts`, `src/actions/booking-schemas.ts`
- **Ops nav:** `src/features/ops/ops-nav-config.ts`
- **Ops components:** `src/features/ops/components/` — new `BookingsQueueView`, `IdentifyClientDialog`, `BookingFilterChips` (names tentative)
- **RLS & smoke:** `supabase/migrations/`, `supabase/smoke_rls.sql`
- **Types:** `src/types/supabase.generated.ts` (regenerated), `src/types/database.types.ts`
- **Tests:** `tests/` (Playwright E2E for submit → visibility; identify-client round-trip; PO-required block)

**Relationship between surfaces:** **`/ops/fulfil`** remains the **fulfilment-segmented** experience from Epic **E3**; **`/ops/trips`** and **`/ops/board`** remain **trip/board** views; Epic **12** adds **`/ops/bookings`** as the **booking-first** triage layer so **bookings without trips** and **intent-specific** rows are not **orphaned** from navigation.

## Relationship to other epics

- **[`docs/epic-11.md`](epic-11.md):** **E1** RLS and **E2** ops quality are **prerequisites**; fulfil/search themes remain relevant for **labelling** and **error** consistency.
- **[`docs/epic-13.md`](epic-13.md):** Consumes **VST-14** for **account fulfilment** and dispatch when account healthy. First writer of `booking_quotes` rows. Inherits `can_dispatch_account_booking()` as the authoritative gate.
- **[`docs/epic-14.md`](epic-14.md):** Consumes **quotes** and **walk-in** columns for **quote-first** + PayFast. Shares `booking_quotes` lifecycle and the `/ops/bookings` queue model.
- **[`docs/epic-15.md`](epic-15.md):** Benchmark / portal track on top of **12–14**. Reuses `customer_accounts` and `customer_account_members` for the portal's RLS contract.
