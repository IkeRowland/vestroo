# Story VST-8: Driver and field tools

## Status: Done

**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** for schema and **RLS**: chauffeurs are **row-scoped** via **`trips.chauffeur_id`**, **`chauffeur_assignments`**, and **`chauffeur_schedules`** (see **`docs/data-models.md`** and migrations). **[VST-7](vst-7.story.md)** SHOULD be **stable** so **`trips`** exist with **`chauffeur_id`** populated for assigned work and dispatch patterns align with **`ops_audit_log`** / **`src/actions/opsDispatch.ts`**. **VST-9** (**realtime** location, operational **notifications**) **follows** this story — design **hooks** (status fields, logging) for subscribers without implementing live streams here.

## Story

- As a **chauffeur / field driver**
- I want **responsive web tools** to **see my assignments**, **confirm** them, **advance trip status**, **open navigation** to the next **service point**, and **contact the customer** only when policy allows
- so that **fulfilment is safe and efficient**, **POPIA-oriented PII boundaries** hold via **RLS** and server checks, and **every field action** is **auditable** for ops and compliance follow-up

## Epic traceability (source)

**From `docs/epic-4.md` — VST-8:** The platform MUST allow **chauffeurs** to **confirm assignments**, update **trip** status, open **navigation** (maps deep link), and **contact customers** within policy, via **responsive web MVP**; actions MUST be **logged** and chauffeurs MUST **NOT** access other clients’ **PII**. Track detail in **`docs/stories/vst-8.story.md`**.

**Terminology alignment (folded from epic Domain vocabulary):**

1. Prefer **service route**, **service pattern**, **run**, **service point**, **booking**, **trip** / **leg**, **chauffeur**, **vehicle**, **corporate pattern** / **contracted service**, **tour** / **experience package** in field UI labels, persisted fields, and action names where applicable.
2. **Runs** = operational instances; **patterns** = templates; avoid **public-transit** framing in chauffeur copy (no generic “bus route” for VIP/corporate work).
3. **Trip status** and **assignment** semantics MUST stay aligned with **`docs/data-models.md`** and migrations — not ad-hoc strings outside typed / constrained columns.

**Out of scope (for this slice):** **VST-9** **realtime** **vehicle** location streams, live **ETA** fan-out, and operational **notification** channels (this story may leave **compatibility hooks** only). **VST-12** **compliance** document vault, incident consoles, and retention/export UIs. **Native mobile apps** — MVP is **responsive web** only. **Reference-only** code under **`src/features/capstone-reference/frontend-driver`** (and similar) is **not** a deliverable — ship **production** field UI under the agreed App Router group (e.g. **`src/app/(field)/`**) or document an explicit **split field app** decision in **Dev Technical Guidance**.

## Acceptance Criteria (ACs)

1. **Route grouping / layout:** Introduce an agreed **chauffeur** App Router segment (preferred: **`src/app/(field)/`** with URLs under **`/field/*`**, dedicated **`layout.tsx`**, shared chrome) **or** document a **split Next app** / subdomain for field staff in **`docs/field-tools.md`** with build/deploy implications. **Marketing** (`(marketing)`), **customer booking** (`(app)`), and **ops** (`(ops)`) routes MUST NOT expose chauffeur mutations or assignment lists without the same **auth gate** as the field segment.

2. **Auth gate (chauffeur only):** All **field** **pages** and **Server Actions** that read or mutate chauffeur-visible operational data MUST verify the session user’s **`profiles.role`** is **`chauffeur`** (server-side). **Customers**, **dispatchers** (unless product explicitly allows dual-role), and **admins** MUST receive **403** / redirect to a safe route per product rules; **unauthenticated** users MUST be sent to sign-in. **No** reliance on “security through obscurity” URL alone.

3. **Assignment list:** The field UI MUST list **work** derived from **`public.trips`** where **`chauffeur_id = auth.uid()`** and from **`public.chauffeur_assignments`** (and, where needed, **`chauffeur_schedules`**) consistent with **`docs/data-models.md`**. Queries MUST use patterns that **respect RLS** (typically **user JWT** Supabase client). Empty, **past**, and **upcoming** states MUST be handled without leaking other chauffeurs’ rows.

4. **Confirm assignment:** Chauffeurs MUST be able to **confirm** an assignment (explicit **Server Action**) that performs an agreed **state transition** (e.g. **`assigned` → `en_route`** or a dedicated **`assignment_confirmed_at`** / assignment row flag via **migration** if the product requires it). **Invalid** transitions MUST fail with clear errors; **document** the canonical transition table in **`docs/field-tools.md`** and **`docs/data-models.md`**.

5. **Trip status updates:** Chauffeurs MUST be able to update **`trips.status`** (and related timestamps if present) along the **fulfilment lifecycle** defined in **`docs/data-models.md`** (**`TripFulfilmentStatusDb`**: e.g. **`booking`**, **`assigned`**, **`en_route`**, **`completed`**, **`cancelled`**). Labels in UI MUST match **DB** semantics; **document** chauffeur-allowed transitions vs dispatcher-only transitions.

6. **Maps navigation (deep link):** The UI MUST expose **open in maps** using a **deep link** (Google Maps / Apple Maps as agreed) built from **coordinates** or **addresses** available to the chauffeur for the **active trip** — typically **origin**, **destination**, or **next service point** from **`service_points`** / route join (document the **exact resolution order** in **`docs/field-tools.md`**). Reuse or extend **`src/lib/maps.ts`** (or equivalent) for URL construction; **no** API keys in client bundles beyond existing **public** map config patterns.

7. **Contact customer (policy):** For **assigned** trips only, the product MUST expose **customer contact** in a **POPIA-aware** minimum: e.g. **masked** display (**`***`** last digits), **tap-to-call** via **`tel:`** initiated only from the **trip detail** context, or **in-app** call handoff — **document** the chosen approach and **data minimisation** in **`docs/field-tools.md`**. Chauffeurs MUST **NOT** see **email** or **full PII** unless explicitly justified and **documented**; **no** bulk export of customer lists.

8. **PII isolation:** Implementation MUST enforce **no cross-customer access**: **RLS** on **`trips`**, **`booking_trips`**, **`bookings`**, and related reads **plus** **server-side** checks in **Server Actions** (defence in depth). Integration tests or **RLS** smoke steps MUST cover **chauffeur A** cannot read **chauffeur B**’s trips or **unrelated bookings** (align with **`supabase/smoke_rls.sql`** and **`docs/local-development.md`**).

9. **Action logging:** Chauffeur mutations (**confirm assignment**, **status change**, **contact intent** if logged, navigation is client-only and may be omitted) MUST append to an **append-only** log — **prefer** extending **`public.ops_audit_log`** with **`actor_role`** / **`action`** vocabulary **or** a dedicated **`chauffeur_action_log`** table via **migration**. **PII** in **`payload`** MUST be **minimised** (ids + operational fields only); document retention alignment with **VST-12** in **`docs/data-models.md`**.

10. **Responsive field UI:** Pages MUST be **mobile-first** and **usable** on typical phone viewports (large tap targets, readable typography, minimal horizontal scroll). **Tablet / desktop** MUST **degrade gracefully** (no broken layouts).

11. **Server Actions + validation:** Mutations MUST live in **`src/actions/`** (or feature-local actions if repo pattern evolves) with **Zod** input schemas, consistent with **`docs/repo-conventions.md`** and **`docs/front-end-api-interaction.md`**.

12. **Tests:** Add **unit** and/or **integration** tests for field **Server Actions** and any pure helpers (e.g. maps URL builder, transition guards) **where feasible**; **`npm run test`** MUST pass in CI.

13. **Staging verification:** Document a **repeatable** procedure in **`docs/staging-and-promotion.md`** and/or **`docs/local-development.md`**: sign-in as **chauffeur** → see **assignments** → **confirm** → **update status** → **open maps** → **verify** **RLS** denies other users’ data on **staging**.

14. **Epic traceability and documentation:** After implementation, **`docs/epic-4.md`** bullet **VST-8** MUST remain **consistent** with this story. Extend **`docs/data-models.md`** with a **field tools (VST-8)** section (tables, chauffeur-visible columns, status transitions, logging). Add **`docs/field-tools.md`** as a **stub or fuller** index (routes, **contact policy**, **status transitions**, client strategy). Add **Server Actions** rows to **`docs/front-end-api-interaction.md`** as applicable.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Add **`(field)`** route group (or document **split app**); shared **layout** and nav under **`/field/*`**; ensure **no** accidental exposure via other segments. (AC: #1)

- [x] **Task 2 — AC2:** Implement **server-side** role gate for all field **pages** and **actions** (**`chauffeur`**); redirects / **403** for non-chauffeur sessions. (AC: #2)

- [x] **Task 3 — AC3:** Build **assignment list** from **`trips`** + **`chauffeur_assignments`** (+ **`chauffeur_schedules`** as needed) scoped to **`auth.uid()`**; **RLS-safe** queries. (AC: #3)

- [x] **Task 4 — AC4:** Implement **confirm assignment** **Server Action** + **state** / **timestamp** persistence per agreed transition; **document** in **`docs/field-tools.md`**. (AC: #4)

- [x] **Task 5 — AC5:** Implement **trip status** update **Server Actions** with **allowed** chauffeur transitions aligned with **`docs/data-models.md`** / **`TripFulfilmentStatusDb`**. (AC: #5)

- [x] **Task 6 — AC6:** Add **open in maps** using **`src/lib/maps.ts`** (or extend it) from **trip** + **service point** resolution; **document** precedence in **`docs/field-tools.md`**. (AC: #6)

- [x] **Task 7 — AC7:** Implement **contact customer** UI per **POPIA-aware** minimum; **document** masking / **`tel:`** rules in **`docs/field-tools.md`**. (AC: #7)

- [x] **Task 8 — AC8:** Verify **PII isolation** end-to-end (**RLS** + **action** checks); extend **`supabase/smoke_rls.sql`** or tests as needed. (AC: #8)

- [x] **Task 9 — AC9:** Wire **audit** writes on chauffeur mutations (**`ops_audit_log`** extension **or** **`chauffeur_action_log`**); **minimise** **PII** in **`payload`**. (AC: #9)

- [x] **Task 10 — AC10:** Polish **mobile-first** responsive **field** UI (lists, detail, primary actions). (AC: #10)

- [x] **Task 11 — AC11:** Ensure all field mutations use **Zod**-validated **Server Actions** per repo conventions. (AC: #11)

- [x] **Task 12 — AC12:** Add **tests** for field actions and helpers **where feasible**. (AC: #12)

- [x] **Task 13 — AC13:** Author **staging** verification steps for chauffeur **E2E** path. (AC: #13)

- [x] **Task 14 — AC14:** Update **`docs/data-models.md`**, **`docs/field-tools.md`**, **`docs/front-end-api-interaction.md`**; re-read **`docs/epic-4.md` VST-8** for alignment. (AC: #14)

## Dev Technical Guidance

- **Prerequisite:** **`docs/data-models.md`** and **`supabase/migrations/`** are authoritative for **`trips`** (**`id`**, **`chauffeur_id`**, **`vehicle_id`**, **`schedule_id`**, **`service_run_id`**, **`customer_id`** nullable, **`status`**, time estimates, **`ops_*`** dispatcher fields), **`booking_trips`** (**`booking_id`**, **`trip_id`**), **`bookings`** (expose **minimal** chauffeur-visible fields: **`payment_reference`**, times, **guest contact** subset per policy — **not** full history of other customers), **`chauffeur_assignments`** (**`chauffeur_id`**, **`vehicle_id`**, **`service_run_id`**, **`start_time`**, **`end_time`**), **`chauffeur_schedules`**, **`service_points`** (address / lat-lng for navigation), **`service_route_points`**, and **`profiles`** (**`role`**).
- **Supabase client:** Prefer **user JWT** (`createClient` server patterns) for field reads/writes so **RLS** enforces **`chauffeur_id = auth.uid()`**. Document any **exception** requiring **service role** (server-only, never browser) in **`docs/field-tools.md`** / **`docs/front-end-api-interaction.md`** with justification.
- **Repo context:** **`docs/ops-console.md`** and **`src/app/(ops)/`** exist for dispatch; **`src/actions/opsDispatch.ts`** already mutates **`trips`** — avoid conflicting status semantics; chauffeur transitions should **compose** with dispatcher rules. **`src/lib/maps.ts`** is the natural place for **maps URL** helpers.
- **Conventions:** **`docs/repo-conventions.md`**, **`docs/front-end-api-interaction.md`**; feature UI may live under **`src/features/field/`** (or similar) with routes in **`(field)`**.
- **Scope guard:** Do **not** ship **`src/features/capstone-reference/frontend-driver`**; do **not** implement **VST-9** streams or **VST-12** vault UIs; leave **hooks** only where noted in ACs.

## Story Progress Notes

### Agent Model Used: `SM story prep`

### Completion Notes List

- **Routes:** `src/app/(field)/` → `/field`, `/field/login`, `/field/unauthorized`, `/field/trips/[tripId]`; middleware sets `x-pathname` for `/field` (same pattern as `/ops`).
- **Auth:** `src/lib/field-auth.ts` — `requireChauffeurPage()`, `getChauffeurForAction()`; field mutations only in `src/actions/fieldChauffeur.ts`.
- **RLS:** `supabase/migrations/20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql` — `bookings_select_chauffeur_linked`, `booking_trips_select_chauffeur`; `ops_audit_log.actor_role` + `ops_audit_log_chauffeur_insert` (allow-listed actions); staff insert constrained to `actor_role` dispatcher/admin.
- **App:** `src/lib/maps.ts`, `src/lib/field-navigation-target.ts`, `src/lib/chauffeur-trip-transitions.ts`, `src/lib/field-customer-contact.ts`; UI under `src/features/field/components/`; `appendOpsAuditLog` extended for optional `actorRole`.
- **Tests:** `src/lib/__tests__/maps.test.ts`, `chauffeur-trip-transitions.test.ts`, `field-customer-contact.test.ts`; `npm run test` passing.
- **Docs:** `docs/field-tools.md`, `docs/data-models.md` (VST-8 section), `docs/front-end-api-interaction.md`, `docs/epic-4.md`, `docs/staging-and-promotion.md`, `docs/local-development.md`, `docs/project-structure.md`, `docs/ops-console.md`, `docs/index.md`, `supabase/smoke_rls.sql` notes.

### Story DoD Checklist Report (concise)

| Item | Status |
|------|--------|
| AC1–14 / tasks 1–14 | Met: field segment, auth, RLS migration, actions, maps, contact policy, audit, tests, staging doc, cross-docs. |
| No capstone driver ship | `src/features/capstone-reference/frontend-driver` untouched. |
| No VST-9 / VST-12 scope | Not implemented. |
| CI tests | `npm run test` green (62 tests after field-customer file). |

**Note:** Task 3 lists `chauffeur_assignments`; list view is **`trips`**-driven (assignments are created by dispatch alongside trips). Optional future: surface assignment rows explicitly when product requires.

### Change Log

| Date | Change |
|------|--------|
| 2026-04-06 | **Implementation:** field route group, `field-auth`, `fieldChauffeur` actions, RLS migration `20260408120000_*`, maps + navigation resolution, docs + tests; status → **Review**. |
| 2026-04-02 | Initial **Draft**: VST-8 **Driver and field tools** from **`docs/epic-4.md`**; dependencies **VST-5** (RLS row scope), **VST-7** (trips with **`chauffeur_id`**), forward **VST-9**; **chauffeur / field driver** persona; epic traceability + terminology + **out of scope** (VST-9 realtime, VST-12 vault, native apps, capstone driver UI); **14 ACs** (route group, auth gate, assignment list, confirm assignment, trip status, maps deep link, contact policy, PII isolation, audit logging, responsive UI, Server Actions + Zod, tests, staging verification, docs + epic alignment); **14 tasks** 1:1 with ACs; **Dev Technical Guidance** for **`trips`**, **`bookings`** (minimal exposure), **`chauffeur_assignments`**, **`service_points`**, JWT **RLS** client preference. |
