# Story VST-7: Operations console

## Status: Done

**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** (schema, RLS, roles: **`customer`**, **`chauffeur`**, **`dispatcher`**, **`admin`** per **`docs/data-models.md`**; **`public.is_staff(uid)`** for **admin** + **dispatcher**). **[VST-6](vst-6.story.md)** MUST be **stable** for **`public.bookings`**, payment lifecycle, and the **bookings → trips** handoff expectation (web may persist **`bookings`** only; **VST-7** attaches **`booking_trips`** / **`trips`** and **run** context). **VST-8** (chauffeur field tools) and **VST-9** (realtime) **follow** this story and **consume** assignments and **trip** status — do not block VST-7 on them, but **design** mutations and status fields so they can subscribe without another breaking rename.

## Story

- As a **dispatcher / operations coordinator**
- I want **role-gated internal tooling** that shows **vehicle** availability, a **chauffeur** roster, **run** assignment for paid (or ops-accepted) **bookings**, visibility into **trip** status transitions, and **exception** handling (delays, **vehicle** swap) with **calendar** and **board** views
- so that **fulfilment is coordinated in one place**, **RLS** and audit expectations hold, and **downstream field and realtime stories** can rely on consistent **Server Actions** and **`public.*`** shapes

## Epic traceability (source)

**From `docs/epic-4.md` — VST-7:** The platform MUST give dispatchers **vehicle** availability, **chauffeur** roster, **run** assignment, and handling of **exceptions** (delays, vehicle swap) via **role-gated internal routes** (or a **split ops app**), with **calendar/board** views. A dispatcher MUST assign a **run** and see **trip** status transitions. Track detail in **`docs/stories/vst-7.story.md`**.

**Terminology alignment (folded from epic Domain vocabulary):**

1. Prefer **service route**, **service pattern**, **run**, **service point**, **booking**, **trip** / **leg**, **chauffeur**, **vehicle**, **corporate pattern** / **contracted service**, **tour** / **experience package** in ops UI labels, persisted fields, and action names where applicable.
2. **Runs** = operational instances; **patterns** = templates; avoid **public-transit** framing in dispatcher copy (no generic “bus route” for VIP/corporate work).
3. **Trip status** and **assignment** semantics MUST stay aligned with **`docs/data-models.md`** and migrations — not ad-hoc strings outside typed/ constrained columns.

**Out of scope (for this slice):** Full **VST-9** **realtime** map, live **vehicle location** streams, and operational notification fan-out (those stories consume this data). Full **VST-12** **compliance** document vault, incident UI, and retention/export consoles. **VST-11** tactical **close protection** engagement workflow and restricted coordination beyond normal **trip** / **run** assignment. **Reference-only** code under **`src/features/capstone-reference/`** is **not** a deliverable — ship **production** ops UI under the agreed App Router group (e.g. **`src/app/(ops)/`**) or document an explicit **split ops app** decision in **Dev Technical Guidance**.

## Acceptance Criteria (ACs)

1. **Route grouping / layout:** Introduce an agreed **internal** App Router segment (preferred: **`src/app/(ops)/`** with a dedicated **`layout.tsx`** and shared chrome) **or** document a **split ops Next app** / subdomain approach in **`docs/ops-console.md`** (stub) with build/deploy implications. **Marketing** (`(marketing)`) and **customer booking** (`(app)`) routes MUST NOT expose dispatcher chrome or mutations without the same **auth gate** as the ops segment.

2. **Auth gate (dispatcher / admin only):** All **`(ops)`** (or equivalent) **pages** and **Server Actions** that read or mutate operational data MUST verify the session user’s **`profiles.role`** is **`dispatcher`** or **`admin`** (or equivalent **`public.is_staff`**-backed check server-side). **Customers** and **chauffeurs** MUST receive **403** / redirect to a safe route; **unauthenticated** users MUST be sent to sign-in or marketing as per product rules. **No** reliance on “security through obscurity” URL alone.

3. **Vehicle availability view:** The console MUST include a **vehicle** list or board column fed from **`public.vehicles`** (and related catalogue tables per **`docs/data-models.md`**, e.g. **`vehicle_categories`**, **`vehicle_pricings`** where needed for labels). **Utilization** MUST reflect **assigned** / **in-use** state derived from **`trips`**, **`chauffeur_assignments`**, and/or **`chauffeur_schedules`** (exact join rules documented in **Dev Technical Guidance**). Conflicting double-booking of the same **vehicle** for overlapping windows MUST be **prevented or surfaced** (validation + clear UI error).

4. **Chauffeur roster:** The console MUST show **chauffeur** staff from **`public.profiles`** where **`role = 'chauffeur'`** (and **`status`** as appropriate), combined with **`public.chauffeur_schedules`** for **shift / roster** context (**`work_date`**, hours, **`vehicle_id`** linkage where present). Read paths MUST respect **RLS** for **staff** JWT clients **or** document **when** a **server-only service role** read is required and why (see AC10).

5. **Run assignment:** Dispatchers MUST be able to link **paid** (or ops-approved) **`bookings`** to operational **`service_runs`** and persist **`chauffeur_assignments`** (and/or **`trips.service_run_id`**, **`trips.chauffeur_id`**, **`trips.vehicle_id`**, **`trips.schedule_id` → `chauffeur_schedules`**) per **`docs/data-models.md`**. **`booking_trips`** MUST be created/updated to connect **`bookings`** ↔ **`trips`** where the schema expects junction rows. **Mutations** MUST use **Server Actions** in **`src/actions/`** (or **`src/features/*/actions`** if the repo adopts that pattern) per **`docs/repo-conventions.md`**.

6. **Trip status transitions (visibility):** After assignment, the console MUST display **trip** lifecycle states from **`public.trips`** (and any **`status_history`** / related columns defined in migrations) and reflect updates made by dispatcher actions (and, where applicable, placeholders for **VST-8** chauffeur updates). Status labels MUST align with **DB** constraints/enums — **document** the mapping in **`docs/data-models.md`** (ops section) if new values are introduced.

7. **Exceptions — delay and vehicle swap:** Dispatchers MUST be able to record a **delay** (e.g. **note** + **timestamp** / **expected revised time** — persisted on **`trips`**, **`bookings`**, or a dedicated **`ops_exceptions`** / **`trip_events`** table via **migration** if missing) and perform a **vehicle swap** (update **`trips.vehicle_id`** and/or **`chauffeur_assignments.vehicle_id`** consistently). **Audit** (AC8) MUST capture these actions.

8. **Calendar and board views:** The product MUST ship **both** a **calendar-oriented** view (e.g. day/week agenda by **run** or **trip** window) **and** a **board** view (e.g. columns by **run**, **status**, or **vehicle**). If the **MVP** ships only a **subset**, the **chosen subset** and the **deferred** view MUST be **explicitly documented** in **`docs/ops-console.md`** with a follow-up story reference — **not** left implicit.

9. **Audit / logging (minimal):** Dispatcher mutations (assignment, status change, delay, **vehicle** swap) MUST append to an **append-only** or **insert-only** log (**new table** e.g. **`dispatcher_action_log`** / **`ops_audit_log`** with **`actor_id`**, **`action`**, **`entity`**, **`payload`**, **`created_at`**) **or** extend an existing audited pattern **defined in migrations**. **PII** in log payloads MUST be **minimised** (ids + non-sensitive labels); document retention expectations in **`docs/data-models.md`**.

10. **RLS and Supabase client discipline:** Implementation MUST **respect RLS** when using the **user JWT** Supabase client for **staff** reads/writes allowed by policy. Where RLS **blocks** legitimate **cross-customer** ops reads, **document** the **service role** path (**server-only**, never exposed to the browser) in **`docs/front-end-api-interaction.md`** and/or **`docs/ops-console.md`**, consistent with **`docs/data-models.md`** and **`supabase/smoke_rls.sql`** verification.

11. **Responsive internal UI:** Ops pages MUST be **usable on tablet and desktop** widths and **degrade gracefully** on smaller viewports (no broken layouts; **touch-friendly** targets where applicable). **Mobile-first** is **customer**-booking priority per epic; **internal** tooling still MUST avoid **desktop-only** hard failures.

12. **Staging verification:** A **repeatable** procedure MUST exist (documented in **`docs/staging-and-promotion.md`** and/or **`docs/local-development.md`**) to verify **sign-in as dispatcher** → **assign run** → **create/update `trips`** → **see status** → **record exception** on **staging**, with **RLS** smoke aligned to **`docs/local-development.md`**.

13. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-7** MUST remain **consistent** with this story; conflicts resolved in **epic** or **this file** explicitly.

14. **Documentation:** Add or extend an **operations / ops console** section in **`docs/data-models.md`** (tables: **`vehicles`**, **`profiles`**, **`chauffeur_schedules`**, **`chauffeur_assignments`**, **`service_runs`**, **`service_patterns`**, **`trips`**, **`booking_trips`**, **`bookings`**, audit log). Update **`docs/front-end-api-interaction.md`** with **Server Actions** used by the console **and/or** add **`docs/ops-console.md`** as a **stub** index (routes, roles, client strategy).

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Add **`(ops)`** route group (or document **split app**); shared **layout** and navigation; ensure **no** accidental exposure via **(marketing)** / **(app)**. (AC: #1)

- [x] **Task 2 — AC2:** Implement **server-side** role gate for all ops **pages** and **actions** (**`dispatcher`** / **`admin`** / **`is_staff`**); redirects / **403** for others. (AC: #2)

- [x] **Task 3 — AC3:** Build **vehicle availability** UI + queries over **`vehicles`** + assignment/**trip** joins; **conflict** detection for overlapping **vehicle** use. (AC: #3)

- [x] **Task 4 — AC4:** Build **chauffeur roster** from **`profiles`** + **`chauffeur_schedules`**; align **RLS** vs **service role** reads per AC10. (AC: #4)

- [x] **Task 5 — AC5:** Implement **run assignment** **Server Actions**: **`bookings`** ↔ **`booking_trips`** ↔ **`trips`**, **`service_runs`**, **`chauffeur_assignments`**, **`chauffeur_schedules`** as per **`docs/data-models.md`**. (AC: #5)

- [x] **Task 6 — AC6:** Surface **`trips`** status and transitions in ops UI; sync labels with **DB**; document mapping in **`docs/data-models.md`**. (AC: #6)

- [x] **Task 7 — AC7:** Implement **delay** recording and **vehicle swap** flows with **consistent** FK updates; **migration** if new columns/tables required. (AC: #7)

- [x] **Task 8 — AC8:** Ship **calendar** + **board** views **or** document **MVP subset** + deferral in **`docs/ops-console.md`**. (AC: #8)

- [x] **Task 9 — AC9:** Add **minimal audit** table or append-only log + write on dispatcher mutations; **PII** minimisation note in **`docs/data-models.md`**. (AC: #9)

- [x] **Task 10 — AC10:** Document and implement **Supabase client** choice (**user JWT** vs **service role**) for each ops read/write path; verify against **RLS** policies and **`supabase/smoke_rls.sql`**. (AC: #10)

- [x] **Task 11 — AC11:** **Responsive** ops layout (tablet/desktop primary; no broken narrow viewports). (AC: #11)

- [x] **Task 12 — AC12:** Author **staging** verification steps for dispatcher **E2E** ops path. (AC: #12)

- [x] **Task 13 — AC13:** Re-read **`docs/epic-4.md` VST-7**; align epic text with delivered behaviour. (AC: #13)

- [x] **Task 14 — AC14:** Update **`docs/data-models.md`**, **`docs/front-end-api-interaction.md`**, and **`docs/ops-console.md`** (stub or full) per AC14. (AC: #14)

## Dev Technical Guidance

- **Prerequisite:** **`docs/data-models.md`** and **`supabase/migrations/`** are authoritative for **`vehicles`**, **`vehicle_categories`**, **`vehicle_pricings`**, **`profiles`** (**`role`**, **`status`**), **`chauffeur_schedules`** (**`chauffeur_id`**, **`work_date`**, **`vehicle_id`**, **`trips.schedule_id`**), **`chauffeur_assignments`** (**chauffeur**, **vehicle**, **`service_run_id`**, time window), **`service_patterns`** → **`service_runs`**, **`bookings`**, **`booking_trips`**, **`trips`** (**`customer_id`**, **`chauffeur_id`**, **`vehicle_id`**, **`service_run_id`** as applicable), and **`public.is_staff(uid)`** (**admin** + **dispatcher** only).
- **Repo facts:** There is **no** shipped **`src/app/(ops)/`** or dispatcher UI in **main** App Router yet; **`src/features/capstone-reference/`** is **non-shipped** reference — **do not** treat as product deliverable.
- **Conventions:** Prefer **Server Actions** for mutations; place feature UI under **`src/features/*`** and actions under **`src/actions/`** per **`docs/repo-conventions.md`**; follow patterns in **`docs/front-end-api-interaction.md`**.
- **VST-6 handoff:** Guest **`bookings`** may lack **`customer_id`**; **`booking_trips`/`trips`** creation is **ops-owned** — assignment flows MUST handle **guest** rows and **PII** on **`bookings`** (`customer_name`, `customer_email`, `customer_phone`) without leaking across chauffeurs (field story **VST-8** will tighten chauffeur-visible fields).
- **Testing:** Add **unit/integration** tests for assignment and exception **Server Actions** where feasible; **`npm run test`** MUST pass. RLS verification: **`docs/local-development.md`** + **`supabase/smoke_rls.sql`** after migrations.
- **Scope guard:** Do **not** implement **VST-9** realtime channels, **VST-12** compliance screens, or **VST-11** close-protection tactics; keep hooks (status fields, audit) **compatible** with later subscriptions.

## Story Progress Notes

### Agent Model Used: `Composer` (dev subagent)

### Completion Notes List

- **`(ops)` route group:** `src/app/(ops)/` with URLs under **`/ops/*`** (`ops/layout.tsx` chrome + nav; `middleware.ts` sets **`x-pathname`** for login/unauthorized bypass). Marketing and booking apps do not import ops actions.
- **Auth:** `requireOpsStaffPage()` (layouts) vs `getOpsStaffForAction()` (Server Actions). Unauthenticated → **`/ops/login`**; wrong role → **`/ops/unauthorized`**. Supabase email/password via **`OpsLoginForm`** + **`createClientClient`**.
- **Schema:** Migration **`20260407130000_vst7_ops_audit_trips_fulfilment.sql`** — **`ops_audit_log`**, **`trips.customer_id`** nullable, **`trips.service_run_id`**, **`ops_delay_note`**, **`ops_revised_time_end_estimate`**.
- **Actions:** `src/actions/opsDispatch.ts` — **`assignBookingToRun`**, **`updateTripStatusAction`**, **`recordTripDelayAction`**, **`swapTripVehicleAction`** (vehicle overlap via **`src/lib/ops-time-windows.ts`**). **`isBookingDispatchable`** in **`src/lib/ops-booking.ts`** (tested).
- **Views:** **Board** (`/ops/board`) and **calendar** (`/ops/calendar`) both shipped; documented in **`docs/ops-console.md`** (no deferral).
- **Audit table:** **`public.ops_audit_log`**.
- **Tests:** `src/lib/__tests__/ops-time-windows.test.ts`, `src/lib/__tests__/ops-booking.test.ts`. **`npm run test`** and **`npm run build`** pass.
- **Docs:** **`docs/ops-console.md`**, **`docs/data-models.md`** (ops section), **`docs/front-end-api-interaction.md`**, **`docs/staging-and-promotion.md`**, **`docs/local-development.md`**, **`docs/epic-4.md`** VST-7 bullet, **`supabase/smoke_rls.sql`** includes **`ops_audit_log`**.

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | Initial **Draft**: VST-7 **Operations console** from **`docs/epic-4.md`**; dependencies **VST-5** + **VST-6**; **dispatcher / operations coordinator** persona; epic traceability + terminology + **out of scope** (**VST-9** realtime map, **VST-12** compliance UI, **VST-11** tactical CP, capstone reference not deliverable); **14 ACs** (route group, auth gate, **vehicle** availability, **chauffeur** roster, **run** assignment, **trip** status, exceptions, calendar+board/MVP doc, audit, **RLS**/client discipline, responsive UI, staging verification, epic traceability, docs); **14 tasks** 1:1 with ACs; **Dev Technical Guidance** with concrete **`public.*`** tables and repo facts. |
| 2026-04-06 | **Implementation**: **`/ops/*`** console, **`opsDispatch`** actions, migration **`ops_audit_log`** + trip columns, docs (**`ops-console.md`**, data-models ops section, staging/local steps); **Status → Review**. |
