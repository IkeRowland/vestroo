# Story VST-6: Booking and quotes

## Status: Done

**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** (schema, RLS, Vestroo domain naming, coordinated app types and actions). **VST-6** **unblocks** richer **VST-7** (operations console) and **VST-8** (field tools); **`docs/epic-4.md`** states **VST-7** **benefits from VST-6** — implement booking/quote foundations before heavy ops UI where possible.

## Story

- As a **traveller or ops-aligned product engineer**
- I want **high-conversion booking flows** for **point-to-point**, **hourly hire**, and **seed paths** for **corporate patterns** and **experience packages**, with **premium-appropriate pricing**, **server-side quote integrity**, **clear booking lifecycle states**, and **notification hooks**
- so that **I can complete a credible end-to-end journey in staging** (correct **trip** / **service pattern** / **run** references per **VST-5** naming) and **downstream ops and field stories** can rely on consistent **Server Actions** and **`public.bookings`** behaviour

## Epic traceability (source)

**From `docs/epic-4.md` — VST-6:** The platform MUST support high-conversion flows for **point-to-point**, **hourly hire**, and **seeds** for **corporate patterns** and **packages**, with pricing appropriate to a **premium operator** (not public-transit fares), via **Server Actions**, **quote engine**, and **booking lifecycle states**; **email/SMS hooks as needed**. **End-to-end happy path MUST work in staging** with correct **trip/pattern** references. Track detail in **`docs/stories/vst-6.story.md`**.

**Terminology alignment (folded from epic Domain vocabulary):**

1. Prefer **booking**, **trip** / **leg**, **service route**, **service pattern**, **run**, **service point**, **chauffeur**, **vehicle**, **corporate pattern** / **contracted service**, **tour** / **experience package** in user-facing booking copy and persisted fields where applicable.
2. Avoid implying **public-transit fares** in pricing presentation, config defaults, or tests; **premium operator** posture MUST be explicit in rules and copy.
3. **Quote** amounts MUST be **authoritative on the server**; client display is illustrative until validated/recalculated server-side.

**Out of scope (for this slice):** Full **VST-7** dispatcher console, **VST-10** tour CMS, or **VST-13** production payment hardening beyond what is needed for the **staging happy path** and documented hooks.

## Acceptance Criteria (ACs)

1. **Point-to-point flow completeness:** The path **search → quote → details → payment → confirmation** MUST work with **Zod** (or equivalent) validation on **Server Action** inputs and **consistent error surfaces** in UI. Existing pages under **`src/app/(app)/book/`** and **`BookingSearchForm`** MUST remain coherent; gaps MUST be closed or documented in **Dev Technical Guidance** with a follow-up ID.

2. **Hourly hire flow:** The product MUST support **hourly / dedicated hire** as a first-class booking intent: **inputs** (e.g. duration, start window, service area constraints as agreed), **quote rules** in **`src/lib/calculations.ts`** (and/or **`src/lib/pricing-data.ts`**), and either a **`public.bookings`** row shape that carries the intent **or** an **extension** (new nullable columns / JSON payload — **document in `docs/data-models.md`**). **UI + Server Action** changes MUST land together; **no** “UI-only hourly” without persisted semantics.

3. **Seeds — corporate patterns and packages:** Provide **documented seeds** (Supabase **SQL seed** / migration stub / minimal admin path) for at least **one corporate pattern** and **one experience package** (or **stub entities** with schema flags), plus **minimal discoverability** in the booking flow **or** an explicit **“coming soon / contact”** path that still **persists** the epic vocabulary in code/comments. The **chosen approach** MUST be written in **`docs/data-models.md`** or **`docs/local-development.md`** (seed run order, env assumptions).

4. **Premium pricing posture:** Pricing MUST **not** read as **public-transit** baseline: use **`PRICING_BASE_PRICE_PER_KM`** (and related env/docs per **`docs/environment-vars.md`**) with **defaults and copy** appropriate to **premium chauffeured** positioning. Extend **`src/lib/__tests__/calculations.test.ts`** and/or **`src/actions/__tests__/calculateQuote.test.ts`** to lock **minimum floors**, **modifiers**, or **documented stub behaviour** so regressions are visible.

5. **Booking lifecycle states:** **`public.bookings`** (and related rows) MUST use **explicit statuses** aligned across **DB** (constraint or enum), **Server Actions** (**`createBooking`**, **`processPayment`**, cancellations), and **UI** (labels, disabled actions). Cover at minimum **pending**, **paid**, **cancelled** (and any existing states — **document mapping** if renaming). **RLS** MUST still hold per **VST-5** after status transitions.

6. **Quote engine consistency:** **`calculateQuote`** MUST **recalculate** from canonical inputs on the server before **create/pay**; **tamper resistance** — client-submitted totals MUST **not** be trusted without server reconciliation. Document the **contract** (fields returned, idempotency expectations) in **`docs/front-end-api-interaction.md`** when behaviour changes.

7. **Email hooks:** **Confirmation on paid** MUST remain reliable (existing **PayFast** webhook → **`processPayment`** path and **`src/services/email.ts`** / **`email-templates.ts`**). Optionally document or implement **pending-booking** email; if **not** implemented, **document** the gap and env toggles in story notes or **`docs/front-end-api-interaction.md`**.

8. **SMS hooks (optional stub):** If **SMS** is **not** implemented, add **env placeholder(s)** (e.g. documented in **`.env.example`** only — no secrets) and a **single TODO** or **no-op service** module so **VST-9** can attach a provider without rewiring booking actions. **Document** “not wired” in **`docs/environment-vars.md`** or story notes.

9. **Staging E2E happy path:** A **repeatable** procedure MUST exist: either **automated** (e.g. Playwright smoke — optional if repo standard not yet set) or **documented manual steps** in **`docs/staging-and-promotion.md`** / **`docs/local-development.md`** that prove **search → quote → book → pay (sandbox)** on **staging**, with **correct foreign keys** to **`service_patterns`**, **`service_runs`**, **`trips`**, **`booking_trips`**, or equivalent columns named in **`docs/data-models.md`** after **VST-5**.

10. **Integration with `public.bookings` and trip linkage:** **`createBooking`** (and **`searchBooking`**) MUST read/write **`public.bookings`** per **`docs/data-models.md`** (**`booking_trips` → `trips`** where applicable). Any **placeholder** `vehicle_id` or **guest customer** fields MUST match **live schema**; drift MUST be fixed or documented with a migration plan.

11. **Tests:** Extend **`src/actions/__tests__/calculateQuote.test.ts`**, booking-related action tests (add **`createBooking`** / **`processPayment`** unit or integration tests if missing and feasible), and **`src/lib/__tests__/calculations.test.ts`** for **new hourly/package/corporate** branches. **`npm run test`** MUST pass.

12. **Terminology in user-facing booking flow:** Grep the **`src/app/(app)/book/`** tree and **`src/features/booking/`** for strings that contradict **`docs/epic-4.md`** **Domain vocabulary**; fix **UF copy** to **booking**, **trip**, **service point**, **chauffeur**, **pattern**, **run** as appropriate (no **“bus stop”** except literal public-zone copy per **VST-5**).

13. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-6** MUST remain **consistent** with this story; conflicts resolved in **epic** or **this file** explicitly.

14. **Documentation updates (optional but recommended):** When behaviour changes, update **`docs/data-models.md`** (bookings, statuses, hourly/package fields) and the **Server Actions** table in **`docs/front-end-api-interaction.md`** so **VST-7+** and integrators have a single source of truth.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Audit **`/book/search` → quote → details → payment → confirmation`**; add/fix **Zod** schemas for each action boundary; align error UX. (AC: #1)

- [x] **Task 2 — AC2:** Design **hourly hire** inputs and **quote** rules; implement **`calculateQuote`** + **`createBooking`** + **`src/features/booking/hooks/useBookingStore.ts`** + pages under **`src/app/(app)/book/`**; extend schema or document JSON column strategy in **`docs/data-models.md`**. (AC: #2)

- [x] **Task 3 — AC3:** Add **seeds** (SQL or migration) for **corporate pattern** + **experience package** stubs; document runbook; wire **minimal UI** or documented **contact/seed path**. (AC: #3)

- [x] **Task 4 — AC4:** Align **pricing** constants/env with **premium** posture; update **tests** for floors/modifiers; review UF copy on quote/summary screens. (AC: #4)

- [x] **Task 5 — AC5:** Map **booking statuses** DB ↔ actions ↔ UI; implement transitions (**pending**, **paid**, **cancelled**, etc.); verify **RLS** on update paths. (AC: #5)

- [x] **Task 6 — AC6:** Enforce **server-side quote recalculation** before persist/pay; reject mismatched client totals; document action contract in **`docs/front-end-api-interaction.md`**. (AC: #6)

- [x] **Task 7 — AC7:** Verify **paid confirmation email** path; add optional **pending** email or **document** deferral. (AC: #7)

- [x] **Task 8 — AC8:** Add **SMS stub** + **env placeholders** in **`.env.example`** and docs; single extension point for future provider. (AC: #8)

- [x] **Task 9 — AC9:** Author **staging E2E** doc steps or automation; assert **service_pattern** / **service_run** / **trip** references match **`docs/data-models.md`**. (AC: #9)

- [x] **Task 10 — AC10:** Reconcile **`createBooking`** / **`searchBooking`** with **`public.bookings`** and **`booking_trips`/`trips`**; fix types in **`src/types/database.types.ts`** if columns change. (AC: #10)

- [x] **Task 11 — AC11:** Implement **tests** for quote/booking/payment paths covering new flows. (AC: #11)

- [x] **Task 12 — AC12:** **Terminology grep** on booking feature; fix user-visible strings per epic vocabulary. (AC: #12)

- [x] **Task 13 — AC13:** Re-read **`docs/epic-4.md` VST-6**; align epic text with delivered behaviour. (AC: #13)

- [x] **Task 14 — AC14:** Update **`docs/data-models.md`** and **`docs/front-end-api-interaction.md`** when actions or schema change. (AC: #14)

## Dev Technical Guidance

- **Prerequisite:** Complete **VST-5** migrations and app coordination first; this story assumes **`service_points`**, **`service_routes`**, **`service_patterns`**, **`service_runs`**, **`chauffeur_*`** naming and **RLS** from **`supabase/migrations/`** are authoritative — see **`docs/data-models.md`**.
- **Server Actions (primary touchpoints):** **`src/actions/calculateQuote.ts`**, **`createBooking.ts`**, **`processPayment.ts`**, **`searchBooking.ts`** — extend for **hourly**, **corporate/package seeds**, and **status** transitions; keep **server-only** secrets via **`src/lib/supabase/server.ts`** patterns established in **VST-1**.
- **Booking UI:** **`src/features/booking/components/BookingSearchForm.tsx`**, **`useBookingStore.ts`**, routes under **`src/app/(app)/book/`** (search, quote, details, payment, confirmation) — today there is **no** **`hourly` / `corporate` / `packages`** surface in a typical grep; this story **requires** either **new UI + actions** or **documented seed-only** paths per **AC3**.
- **Pricing engine:** **`src/lib/calculations.ts`**, **`src/lib/pricing-data.ts`**; env **`PRICING_BASE_PRICE_PER_KM`** (and related) per **`docs/environment-vars.md`** — tune for **premium operator**, not transit-scale defaults.
- **Maps:** **`src/lib/maps`** — used for distance/route inputs into quotes; keep **calculateQuote** inputs consistent with map output types.
- **Email:** **`src/services/email.ts`** (Resend), **`src/services/email-templates.ts`**; **PayFast** webhook flow should continue to trigger **confirmation when paid** — trace **`processPayment`** and webhook handler when changing lifecycle.
- **API documentation:** **`docs/front-end-api-interaction.md`** — maintain the **Server Actions** table as signatures and side effects evolve.
- **Current gap (explicit):** Repo **booking feature** does not yet expose **hourly hire**, **corporate patterns**, or **packages** in code paths — treat as **greenfield extensions** with **schema/docs** alignment, not a small copy tweak.
- **Scope guard:** Do **not** ship full **dispatcher** or **chauffeur** apps here; prepare **data and actions** so **VST-7**/**VST-8** can consume **bookings** and **trips** without another breaking rename.

## Story Progress Notes

### Agent Model Used: `dev` (implementation)

### Completion Notes List

- **Flow:** `/book/search` → quote → details → **payment** → `/confirmation?id=`; PayFast `return_url` aligned; guest confirmation uses **`GET /api/booking-confirmation`** (service role) because RLS blocks anon reads on **`bookings`**.
- **Quote integrity:** `reconcileBookingQuote` + `QUOTE_RECONCILE_TOLERANCE_ZAR`; shared Zod in `booking-schemas.ts`.
- **Hourly:** `calculateHourlyQuote`, `calculateHourlyHirePrice`, columns `hourly_duration_hours`, `hourly_service_area_notes`, `booking_intent`.
- **Seeds:** `supabase/migrations/20260406121000_vst6_seed_corporate_and_experience_patterns.sql` (requires `vehicle_pricings`); intent columns `20260406120000_vst6_booking_intent_and_payment_audit.sql`.
- **Webhook:** Writes PayFast id to **`trans_id`**; preserves **`payment_reference`** for search.
- **SMS:** `src/services/sms-stub.ts` + env placeholders; **pending booking email** not implemented (documented in `docs/front-end-api-interaction.md`).
- **Deferrals:** **`booking_trips` / `trips`** creation remains **VST-7** ops; web stores **`bookings` only**.

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | Initial **Draft**: VST-6 from **`docs/epic-4.md`** VST-6 paragraph; dependencies (**VST-5** stable; **VST-7**/**VST-8** unblocked/benefit); **traveller / ops-aligned product engineer** persona; 14 ACs (P2P+Zod, hourly hire, corporate/package seeds, premium pricing, lifecycle states, quote tamper resistance, email paid/pending, SMS stub, staging E2E, `bookings`/trip linkage, tests, terminology, epic traceability, docs); tasks mapped to ACs; dev guidance with concrete **`src/actions`**, booking UI, pricing, maps, email, PayFast, **`docs/front-end-api-interaction.md`**; explicit note that hourly/corporate/packages are **not** yet in booking grep. |
| 2026-04-06 | **Implemented** VST-6: hourly UI/actions, reconcile, migrations, seeds, confirmation API, cancel route, docs + epic alignment; **Status → Review**. |
