# Story VST-11: Close protection (phased)

## Status: Done

**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** (core **`bookings`** / **`trips`** / **`booking_trips`** relationships, **`profiles`** roles, **`public.is_staff()`**, RLS patterns, **`docs/data-models.md`**). **[VST-6](vst-6.story.md)** MUST be **stable** for **booking lifecycle** and **`booking_intent`** / **`booking_metadata`** (see **`src/types/database.types.ts`** and migrations under **`20260406120000_*`**). **[VST-7](vst-7.story.md)** MUST be **available** for **`/ops/*`** routing, staff-gated Server Actions (**`src/actions/opsDispatch.ts`**), **`public.ops_audit_log`**, and **`docs/ops-console.md`** patterns. **[VST-8](vst-8.story.md)** applies **negatively**: chauffeurs and **`/field/*`** flows MUST **not** gain access to **close protection engagement** coordination data; verify **`src/actions/fieldChauffeur.ts`** and RLS do not leak notes. **[VST-10](vst-10.story.md)** is **optional** precedent for **`booking_metadata`** JSON patterns only—not a blocker. **[VST-12](vst-12.story.md)** **overlaps** for **retention**, **export/delete**, and **long-form compliance UI**; this story MUST **document** PII boundaries and **defer** full compliance dashboards and retention automation to **VST-12**.

## Story

- As a **dispatcher or compliance-aware operations lead** (and **enquiry handlers** aligning clients with ops)
- I want a **high-level close protection engagement** record **linked to bookings and optionally trips**, with **role-restricted coordination notes** and an **enquiry-led public path** (no instant tactical checkout)
- so that **VIP / high-risk movements can be coordinated in-system** without **over-building security tooling**, while **PII is minimised and visibility is limited to cleared staff roles**

## Epic traceability (source)

**From `docs/epic-4.md` — VST-11:** The platform MUST support a high-level **close protection engagement** workflow linked to **bookings**/**trips**, with restricted roles and coordination notes, without over-building tactical security tooling in MVP. Engagements MUST be visible only to cleared roles; PII minimisation MUST be documented. Track detail in **`docs/stories/vst-11.story.md`**.

**Terminology alignment (folded from epic Domain vocabulary):**

1. Prefer **close protection engagement** (not “bodyguard module”, “tactical ops”, or product names implying real-time threat intelligence).
2. **Booking** = customer commitment row; **trip** = fulfilment row. Engagements **reference** these via FKs; they do **not** replace booking lifecycle semantics.
3. **Coordination notes** = internal staff text for handover—**not** a substitute for legal agreements, SOPs, or external security tooling.

**Out of scope (for this slice):** **Tactical** security tooling (route threat analysis, perimeter sensors, weapon/armory tracking, digital twin of protective formations). **Real-time threat feeds** and **open-source intelligence** integrations. **Full close protection team roster** as an **HR / credentials** system (certifications, clearances vault—**VST-12** document/compliance territory). **Customer self-serve** checkout for CP as a **priced web SKU** (remains **enquiry / consultation**-led on the marketing surface unless explicitly replanned). **Chauffeur-facing** CP playbooks in **`/field/*`** beyond normal trip execution (no CP notes in field apps in MVP).

## Acceptance Criteria (ACs)

1. **Engagements design doc:** Add **`docs/close-protection-engagements.md`** describing the **MVP workflow** (who creates engagements, when **`trip_id`** is set, status meanings), **cleared roles** (**`dispatcher`** / **`admin`** minimum; optional future **`close_protection_coordinator`** role **documented as deferred** unless implemented in-schema), **PII minimisation rules** (field allowlist, what MUST NOT be stored in `coordination_notes`), and **handoff to VST-12** (retention, export/delete, incident logging). Cross-link **`docs/data-models.md`** and **`docs/ops-console.md`**.

2. **Schema (migration):** Introduce a dedicated table (name **`public.close_protection_engagements`** unless a shorter name is justified and documented) with at minimum: **`id`** (uuid PK), **`booking_id`** (FK → **`bookings`**, required), **`trip_id`** (FK → **`trips`**, **nullable** until fulfilment exists), **`status`** (constrained text or enum—e.g. `draft` | `active` | `completed` | `cancelled`—exact set documented in migration **`COMMENT ON`** + design doc), **`coordination_notes`** (`text`, **staff-only**), **`created_at`**, **`updated_at`**, **`created_by`** (FK → **`auth.users`** / **`profiles`** per repo convention). **Do not** add columns for **protectee identity beyond what the booking already carries** (no duplicate passport/ID fields in MVP).

3. **RLS:** Enable **RLS** on the new table. **`anon`**, **`authenticated`** customers, and **`chauffeur`** profiles MUST have **no** **`SELECT`/`INSERT`/`UPDATE`/`DELETE`**. **`dispatcher`** and **`admin`** (via **`is_staff()`** or equivalent existing helper) MUST be able to **read and write** engagements consistent with other ops tables. Policies MUST be **named** and **reviewed** in the migration PR per **`docs/staging-and-promotion.md`**.

4. **`booking_intent` / metadata strategy (document + implement):** Choose and document **one** approach in **`docs/close-protection-engagements.md`** and **`docs/data-models.md`**: **(A)** extend **`booking_intent`** with **`close_protection`** (migration alters check constraint + app enums), **or** **(B)** keep existing intents and record **`booking_metadata.close_protection_engagement_id`** or **`close_protection_requested`** flag **without** new intent. The chosen approach MUST be reflected in **`src/types/database.types.ts`** (**`BookingIntentDb`** and/or metadata typing) and any **Zod** paths that validate booking payloads (**`src/actions/booking-schemas.ts`** / **`createBooking.ts`**) **only if** web booking is allowed to reference engagements (default MVP: **ops-created** engagement row **after** booking exists—**no** public write).

5. **Server Actions (staff-only):** Implement **typed** Server Actions (new module e.g. **`src/actions/opsCloseProtection.ts`** **or** disciplined extensions to **`src/actions/opsDispatch.ts`**) for **create**, **update** (status + notes), and **list/get by `booking_id`** (and by **`trip_id`** if useful), using **`src/lib/ops-auth.ts`** (or existing ops session pattern) to **reject** non-staff callers. Inputs/outputs MUST use **Zod**; **no** unchecked **`any`**.

6. **Audit:** Log **material mutations** (at minimum **create** and **update** of engagement **status** or **notes**) to **`public.ops_audit_log`** with **`actor_role`** consistent with existing ops migrations (**`dispatcher`** / **`admin`**), unless the team documents a **deliberate** exception in **`docs/close-protection-engagements.md`** with rationale.

7. **Ops UI (minimal):** Add **`/ops/*`** surface (e.g. **`/ops/close-protection`** or nested under an existing ops booking view) listing **recent engagements** and a **detail** view to edit **status** and **coordination_notes**. **Navigation:** add a **sidebar/header** link consistent with **`src/app/(ops)/`** layout patterns. Include **deep link** from **booking** (and **trip** when present) context—reuse existing ops booking/trip pages if they exist; if not, stub **“Engagement”** panel behind staff auth with clear **TODO** only if AC8 cannot be met without larger refactors (then document **explicit** follow-up story id in the design doc).

8. **Marketing / enquiry alignment:** **`src/content/services.ts`** already teases **close protection** with **“Enquire confidentially”** → **`/contact`**. The design doc MUST state whether **MVP** changes **only** copy/docs **or** adds a **structured** enquiry flag (e.g. contact form metadata)—**no** requirement to expose engagement IDs publicly.

9. **Field isolation:** Confirm **`src/actions/fieldChauffeur.ts`** and any **chauffeur** Supabase queries **do not** select from **`close_protection_engagements`**. Add a **short** subsection in **`docs/field-tools.md`** or the CP design doc: chauffeurs see **trip execution** data only, **not** CP coordination notes.

10. **Tests:** Add **unit** tests for Zod schemas and action **authorisation** branches (staff vs non-staff); add **tests** that mirror repo patterns for **ops** actions (**`src/actions/__tests__/`**). **`npm run test`** MUST pass.

11. **Types:** Extend **`src/types/database.types.ts`** (hand-maintained) with **engagement row shape** and **`status`** union aligned with the migration.

12. **Data model doc:** Update **`docs/data-models.md`** — epic mapping row **Close protection** from “Not present” to the **new table** + **RLS summary** + **`booking_intent` / metadata** decision (see AC4).

13. **Index and API docs:** Link **`docs/close-protection-engagements.md`** from **`docs/index.md`** (Developer onboarding). Update **`docs/front-end-api-interaction.md`** with **Server Action** names and **auth** expectations for CP engagement mutations.

14. **Sitemap / SEO (non-functional):** No requirement to add **public** routes for CP engagements; **`src/app/sitemap.ts`** MUST **not** list **ops** URLs. If **marketing** copy changes, keep **metadata** accurate per existing **`src/lib/marketing-metadata.ts`** patterns **only if** files are touched.

15. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-11** MUST remain **consistent** with this story; resolve conflicts in **epic** or **this file** explicitly.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Author **`docs/close-protection-engagements.md`** (workflow, roles, PII minimisation, VST-12 handoff, links). (AC: #1)

- [x] **Task 2 — AC2:** Add **`supabase/migrations/*_vst11_close_protection_engagements.sql`** with table, constraints, indexes (**`booking_id`**, optional **`trip_id`**), and comments. (AC: #2)

- [x] **Task 3 — AC3:** Implement **RLS policies** for staff-only access; verify chauffeur/customer denial. (AC: #3)

- [x] **Task 4 — AC4:** Implement and document **`booking_intent` / `booking_metadata`** approach; migrate + update **`BookingIntentDb`** / schemas **if** option A or metadata hooks chosen. (AC: #4)

- [x] **Task 5 — AC5:** Implement **Zod** + **Server Actions** for CP engagements (**create/update/list/get**). (AC: #5)

- [x] **Task 6 — AC6:** Wire **`ops_audit_log`** on mutations per **`opsDispatch`** patterns. (AC: #6)

- [x] **Task 7 — AC7:** Ship **minimal `/ops/*` UI** + nav + booking/trip deep link (or documented stub + follow-up). (AC: #7)

- [x] **Task 8 — AC8:** Align **marketing/enquiry** behaviour with design doc (**`services.ts`** / contact **only if** needed). (AC: #8)

- [x] **Task 9 — AC9:** **Field** audit: no CP data in chauffeur paths; doc note in **`docs/field-tools.md`** or CP doc. (AC: #9)

- [x] **Task 10 — AC10:** Add **Vitest** coverage for schemas and **auth** branches. (AC: #10)

- [x] **Task 11 — AC11:** Update **`src/types/database.types.ts`** for engagement types. (AC: #11)

- [x] **Task 12 — AC12:** Update **`docs/data-models.md`**. (AC: #12)

- [x] **Task 13 — AC13:** Update **`docs/index.md`** and **`docs/front-end-api-interaction.md`**. (AC: #13)

- [x] **Task 14 — AC14:** Verify **sitemap** / public routes exclude ops; adjust marketing only if touched. (AC: #14)

- [x] **Task 15 — AC15:** Re-read **`docs/epic-4.md` VST-11**; align epic text with delivered behaviour. (AC: #15)

## Dev Technical Guidance

- **Prerequisites:** Read **`docs/data-models.md`** (**bookings**, **`booking_trips`**, **`trips`**, roles), **`docs/ops-console.md`**, and migrations for **`ops_audit_log`** / **`is_staff`**. CP is listed as **future phase** in data-models until this story lands—update that row in AC12.
- **Booking linkage:** Prefer **`booking_id`** as the **stable** anchor; **`trip_id`** optional when ops creates **`trips`** (**VST-7**). Avoid circular FKs; use **nullable** **`trip_id`** updated when dispatch attaches fulfilment.
- **Server Actions:** Follow **`src/actions/opsDispatch.ts`** for **staff JWT** verification patterns; mirror **error shapes** expected by **`/ops/*`** clients. **Do not** reuse **`createBooking`** service-role patterns for **CP notes**—engagements are **staff** data.
- **Schemas:** Extend **`src/actions/booking-schemas.ts`** **only** if AC4 requires customer-visible metadata; otherwise keep CP mutations **ops-only** Zod in the new module.
- **Auth:** **`src/lib/ops-auth.ts`** (and **`ProfileRole`**) — no new env vars expected unless the repo already documents ops secrets.
- **Field:** **`src/lib/field-auth.ts`** / **`src/actions/fieldChauffeur.ts`** — grep for any generic “load all booking fields” helpers before merge.
- **Marketing:** **`src/content/services.ts`** (**`close-protection`** slug), **`src/app/sitemap.ts`** — keep **public** surface **enquiry-only**.
- **Testing:** **`vitest.config.ts`**; place tests beside **`src/actions/__tests__/ops*.test.ts`** if present.
- **Compliance:** **VST-12** owns **retention schedules**, **data subject** flows, and **incident** UI; this story **documents** what CP stores and **who** can read it.

## Story Progress Notes

### Agent Model Used: Dev Agent (2026-04-07)

### Completion Notes List

- Migration **`20260411120000_vst11_close_protection_engagements.sql`**; actions **`src/actions/opsCloseProtection.ts`**; ops routes **`/ops/close-protection`**, **`/ops/close-protection/[id]`**; **`assignBookingToRun`** sets **`trip_id`** on engagements when dispatch links a trip. **Booking metadata:** approach **B** (optional jsonb keys typed in **`database.types.ts`**; no **`booking_intent`** change). Tests: **`src/actions/__tests__/opsCloseProtection.test.ts`**. **`npm run test`** passing.

### Change Log

| Date | Change |
|------|--------|
| 2026-04-07 | **Implementation:** table + RLS, **`opsCloseProtection`**, ops UI, docs, **`assignBookingToRun`** engagement **`trip_id`** link, Vitest. Status → **Review**. |
| 2026-04-07 | Initial **Draft**: **VST-11 Close protection (phased)** from **`docs/epic-4.md`**; dependencies **VST-5**, **VST-6**, **VST-7**, **VST-8** (negative), optional **VST-10**, **VST-12** overlap noted; **dispatcher / compliance-aware ops + enquiry** persona; epic traceability + terminology + **out of scope** (tactical tooling, threat feeds, armory, HR roster, field CP playbooks); **15 ACs** (design doc, migration+RLS, intent/metadata strategy, Server Actions+Zod, audit, minimal ops UI, marketing alignment, field isolation, tests, types, data-models, index+API docs, sitemap guard, epic); **15 tasks** mapped to ACs; **Dev Technical Guidance** (`opsDispatch`, `ops-auth`, `booking-schemas`, `createBooking`, `fieldChauffeur`, migrations, `data-models`, `ops-console`, marketing). |
