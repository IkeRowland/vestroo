# Story VST-10: Tours and experiences

## Status: Done

**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** (schema, RLS, **`bookings.booking_intent`** including **`experience_package`**, **`bookings.booking_metadata`** per **`docs/data-models.md`**; **`BookingIntentDb`** and related types in **`src/types/database.types.ts`**). **[VST-6](vst-6.story.md)** MUST be **stable** for **quote** and **`createBooking`** paths (Server Actions, lifecycle, staging **search → quote → payment → confirmation**). **[VST-4](vst-4.story.md)** is **optional** for **marketing listing** and SEO surfaces; reuse **`src/app/(marketing)/`** patterns where they **exist** (e.g. **`services/`** may exist — verify at implementation time). **VST-11** (retired numbered slot) is **explicitly out of scope** for this story.

## Story

- As a **traveller or corporate travel buyer**
- I want to **discover curated tour and experience packages**, see a clear **itinerary**, choose **dates**, **group size**, and **add-ons**, and **complete a booking** tied to that package
- so that **leisure and corporate leisure** demand is captured with the same **trust, pricing clarity, and fulfilment hooks** as point-to-point and hourly flows

## Epic traceability (source)

**From `docs/epic-4.md` — VST-10:** The platform MUST support publishing **tour/experience packages**, **itineraries**, and **booking attachments** (dates, group size, add-ons) from an **agreed content source** (markdown, DB, or headless), tied to **bookings**. **At least one package** MUST be **bookable end-to-end**. Track detail in **`docs/stories/vst-10.story.md`**.

**Terminology alignment (folded from epic Domain vocabulary):**

1. Prefer **tour**, **experience package**, **itinerary**, and **booking** in UI labels, persisted fields, and action names; align with **service route** / **service pattern** / **run** only where ops fulfilment reuses those concepts.
2. **Experience package** = marketed, bookable packaged offering; **itinerary** = ordered description of stops, durations, and highlights (structured, not only prose).
3. **Booking** = customer commitment row; **booking attachments** for packages live in **`booking_metadata`** (and/or normalised child tables) and MUST stay consistent with **`docs/data-models.md`**.

**Out of scope (for this slice):** **VST-11** retired engagement workflow and any related tactical coordination UI. **Reference-only** material under **`docs/capstone-reference/`** and **`src/features/capstone-reference/`** is **not** a deliverable. **Building a full headless CMS** (e.g. dedicated third-party editorial stack) is **out of scope unless** the team **explicitly selects** it in **`docs/tours-and-experiences.md`** — default expectation is **Postgres-backed catalogue** and/or **git-versioned markdown** under **`src/content/`** with a documented **trade-off** (editorial workflow, preview, non-dev updates, migration cost).

## Acceptance Criteria (ACs)

1. **Content source decision:** Add **`docs/tours-and-experiences.md`** documenting the **chosen** content strategy (**DB table(s)**, **markdown + frontmatter** under **`src/content/`**, or **headless** if explicitly chosen), including **rationale**, **update workflow**, and **how** packages link to **bookings** and **quotes**. The doc MUST cross-link **`docs/data-models.md`**.

2. **Package catalog:** Implement **one** authoritative catalogue: either **`public.experience_packages`** (or **`tour_packages`** if naming is justified and mapped in docs) **or** **file-based** markdown files with **YAML frontmatter** (id, title, slug, base price hints, active flag). The **chosen** shape MUST be listed in **`docs/tours-and-experiences.md`** and reflected in **`docs/data-models.md`** (tables/columns or content file contract).

3. **Itinerary model:** Each package MUST have an **itinerary** represented as **structured JSON** (column on the package row or companion JSON file next to markdown) **or** a **related table** (e.g. **`experience_package_itinerary_steps`**); the schema MUST support **ordered steps** (title, optional time window, location label/service point reference as text or FK stub).

4. **Public discovery:** Travellers MUST reach packages via **marketing routes** under **`src/app/(marketing)/`** (e.g. listing + detail under **`/services`**, **`/tours`**, or agreed path) **and/or** an **entry point** from the **booking** journey **`(app)`** (e.g. “Experiences” step). **ISR/static** behaviour MUST follow existing **`docs/repo-conventions.md`** / marketing patterns.

5. **Booking flow integration:** **`createBooking`** (and related store/UI) MUST support **`booking_intent = 'experience_package'`** with **`booking_metadata`** carrying at minimum **`experience_package_id`** (or slug resolved server-side), **chosen date** (ISO), **group size**, and **selected add-ons** (ids or structured list). Validation MUST reject incomplete package bookings.

6. **Quote / pricing:** Package selection MUST flow through **server-side pricing**: extend **`src/actions/calculateQuote.ts`** **or** add a dedicated action (e.g. **`calculateExperienceQuote`**) that returns a **reconciled** total consistent with **`docs/data-models.md`** / pricing helpers; document the **contract** in **`docs/front-end-api-interaction.md`**.

7. **Server Actions + Zod:** All new mutations and quote inputs MUST use **Zod** schemas (shared with **`src/actions/booking-schemas.ts`** or a sibling module) and **typed** outputs; **no** unchecked **`any`** for package payloads.

8. **RLS:** If packages live in **Postgres**, **`anon`/`authenticated`** MUST **read** **active** packages via **RLS** (public catalogue); **writes** remain **staff/service role** only. If packages are **file-based**, document **no RLS** on content and **server-only** parsing — still **validate** booking rows reference **known** package ids.

9. **Seed + end-to-end path:** Provide **at least one** **seed** or **fixture** package (align with existing stub narrative in **`docs/data-models.md`** / **`20260406121000_*`** seeds where sensible) and document a **repeatable staging path**: **discover package → quote → create booking (`experience_package`) → payment stub or sandbox** per **`docs/staging-and-promotion.md`** or **`docs/local-development.md`**.

10. **Add-ons:** **Add-ons** MUST be modelled as a **structured list** inside **`booking_metadata`** **or** a **junction table** (e.g. **`booking_experience_addons`**) with migration + types; the chosen approach MUST appear in **`docs/data-models.md`**.

11. **Ops visibility (optional stub):** If low effort, add an **`/ops/*`** **read-only** or **filter** view listing **recent `bookings`** with **`booking_intent = 'experience_package'`** (package id / label); if deferred, state **deferral** and story id in **`docs/tours-and-experiences.md`** — **not** left implicit.

12. **Tests:** Add **unit** tests for **quote** logic and **metadata** validation, and **integration** or **action-level** tests where the repo pattern allows; **`npm run test`** MUST pass.

13. **Documentation:** Update **`docs/data-models.md`** (package/itinerary/metadata/add-ons), **`docs/front-end-api-interaction.md`** (actions, inputs), and link **`docs/tours-and-experiences.md`** from **`docs/index.md`** (Developer onboarding or product index as appropriate).

14. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-10** MUST remain **consistent** with this story; resolve conflicts in **epic** or **this file** explicitly.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Author **`docs/tours-and-experiences.md`** with **content source** decision, workflow, and links to **`docs/data-models.md`**. (AC: #1)

- [x] **Task 2 — AC2:** Implement **package catalogue** (**`experience_packages`/`tour_packages`** **or** **`src/content/`** markdown+frontmatter) and document the contract. (AC: #2)

- [x] **Task 3 — AC3:** Implement **itinerary** model (JSON column, sidecar file, or related table) with **ordered steps**. (AC: #3)

- [x] **Task 4 — AC4:** Ship **public discovery** routes under **`(marketing)`** and/or **`(app)`** booking entry per AC4. (AC: #4)

- [x] **Task 5 — AC5:** Wire **`booking_intent = experience_package`** and **`booking_metadata`** through UI + **`createBooking`**. (AC: #5)

- [x] **Task 6 — AC6:** Extend or add **Server Action** for **package quotes**; align with **`calculateQuote`** patterns. (AC: #6)

- [x] **Task 7 — AC7:** Add **Zod** schemas and **typed** Server Actions for package flows. (AC: #7)

- [x] **Task 8 — AC8:** Apply **RLS** for DB-backed catalogue **or** document file-based security model. (AC: #8)

- [x] **Task 9 — AC9:** Add **seed/fixture** + document **E2E staging** path for one package. (AC: #9)

- [x] **Task 10 — AC10:** Implement **add-ons** in **metadata** or **junction table** + migration. (AC: #10)

- [x] **Task 11 — AC11:** Add **`/ops/*`** **stub** for package-linked **bookings** **or** explicit deferral note. (AC: #11)

- [x] **Task 12 — AC12:** Add **tests** for quote + validation paths. (AC: #12)

- [x] **Task 13 — AC13:** Update **`docs/data-models.md`**, **`docs/front-end-api-interaction.md`**, **`docs/index.md`**. (AC: #13)

- [x] **Task 14 — AC14:** Re-read **`docs/epic-4.md` VST-10**; align epic text with delivered behaviour. (AC: #14)

## Dev Technical Guidance

- **Prerequisite:** **`docs/data-models.md`** and **`supabase/migrations/`** for **`bookings.booking_intent`**, **`booking_metadata`**, and existing **experience stub** seeds (**`service_patterns`** / **`service_routes`** in **`20260406121000_vst6_seed_corporate_and_experience_patterns.sql`**); extend rather than fork booking lifecycle semantics.
- **Quote / booking:** Start from **`src/actions/calculateQuote.ts`**, **`src/actions/createBooking.ts`**, and **`src/features/booking/`** (store, wizard, forms); reuse **`src/actions/booking-schemas.ts`** where possible.
- **Content pattern:** If using markdown, mirror established **`src/content/`** patterns (if present) for **frontmatter** and **build-time** or **server** loading; otherwise prefer **`public.experience_packages`** for queryable catalogue and **RLS**.
- **Marketing:** **`src/app/(marketing)/services/`** (and siblings) **may exist** — integrate listing/detail there or add **`/tours`** under **`(marketing)`** per **`docs/tours-and-experiences.md`**.
- **Conventions:** Server Actions, **`docs/repo-conventions.md`**, and **`docs/front-end-api-interaction.md`** for client boundaries; **no** service role keys in the browser.
- **Testing:** Follow **`vitest`** layout under **`src/actions/__tests__/`** and **`src/lib/__tests__/`** as in **VST-6** / **VST-7**.

## Story Progress Notes

### Agent Model Used: `SM story prep` / `dev` implementation (2026-04-07)

### Completion Notes List

- **DB:** Migration **`20260410120000_vst10_experience_packages.sql`** — table **`public.experience_packages`**, RLS (anon/authenticated **SELECT** active; staff **all**), seed package **`e0000001-0000-4000-8000-000000000001`** slug **`cape-winelands-day`**.
- **Pricing:** **`src/lib/experience-package-quote.ts`** (`computeExperiencePackageQuote`, `parseAddonCatalog`); **`reconcileBookingQuote`** dedicated **`experience_package`** branch (no Maps); **`src/actions/calculateExperienceQuote.ts`**.
- **Zod:** **`experiencePackageBookingMetadataSchema`** + **`webBookingPayloadSchema`** refinements (no destination required for experience; metadata + date alignment + `group_size` vs `passengers`).
- **Booking:** **`createBooking`** / **`processPayment`** — DB stub origin/destination from package; persisted **`booking_metadata`**; PayFast item name for experiences.
- **UI:** **`/tours`**, **`/tours/[slug]`**, **`ExperiencePackageBookPanel`**; store fields **`experiencePackageId`**, **`experienceAddonIds`**; quote/details/payment guards; **`BookingSearchForm`** link to tours; services **`tours`** CTAs → **`/tours`**.
- **Ops:** **`/ops/experiences`** + nav link.
- **Docs:** **`docs/tours-and-experiences.md`**, updates to **`data-models.md`**, **`front-end-api-interaction.md`**, **`index.md`**, **`local-development.md`**, **`staging-and-promotion.md`**, **`epic-4.md`** VST-10 bullet.
- **Types:** **`ExperiencePackageRowDb`** in **`src/types/database.types.ts`**.
- **Tests:** **`experience-package-quote.test.ts`**, **`booking-schemas-experience.test.ts`**, **`calculateExperienceQuote.test.ts`** (mocked data layer); **`npm run test`** green.
- **Staging / follow-ups (post-review):** Expanded **[staging-and-promotion.md](../staging-and-promotion.md)** VST-10 checklist (SQL to assert **`booking_metadata`** keys). **`npm run db:types`** + **`src/types/supabase.generated.ts`** (gitignored) documented in **[local-development.md](../local-development.md)**. **Date/timezone** semantics documented in **[tours-and-experiences.md](../tours-and-experiences.md)**. **`/tours`** routes **`force-dynamic`** to avoid build-time Supabase dependency.

### Story DoD Checklist Report (abbrev.)

- **Code quality / security:** TypeScript, Zod on actions + web payload; RLS on new table; service role server-only (unchanged pattern). Some checklist items (JSDoc on every function, no `!`) relaxed per repo norms; `!` removed from create/process paths.
- **Tests:** Unit tests for package math + metadata validation; full suite passes.
- **Docs / integration:** Data model and API interaction docs updated; no new npm dependencies.

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | Initial **Draft**: VST-10 **Tours and experiences** from **`docs/epic-4.md`**; dependencies **VST-5**, **VST-6**, optional **VST-4**; **VST-11** out of scope; **traveller / corporate travel buyer** persona; epic traceability + terminology + **out of scope** (CP, capstone reference, full headless CMS unless chosen); **14 ACs** (content doc, catalogue, itinerary, discovery, booking metadata, quote, Zod, RLS, seed+E2E, add-ons, ops stub optional, tests, docs, epic); **14 tasks** 1:1 with ACs; **Dev Technical Guidance** (`calculateQuote`, `createBooking`, booking feature, `src/content/`, data-models). |
| 2026-04-07 | **Implemented:** Postgres catalogue, migration+seed, quote+reconcile, wizard + marketing **`/tours`**, ops list, tests, docs; **Status → Review**. |
| 2026-04-07 | **Hardening:** Staging SQL checklist, **`calculateExperienceQuote`** Vitest mocks, **`db:types`** script + gitignore, UTC date semantics in **`tours-and-experiences.md`**, **`/tours`** **`force-dynamic`**. |
