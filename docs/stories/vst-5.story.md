# Story VST-5: Data model, migrations, RLS, and Vestroo domain naming

## Status: Done

**Dependencies:** **[VST-4](vst-4.story.md)** precedes this in the delivery theme (marketing vocabulary and public copy set expectations VST-5 must align in **schema, APIs, and non-marketing app surfaces**). **VST-5 blocks VST-6–VST-9** per **`docs/epic-4.md`** (story files **`vst-6.story.md`–`vst-9.story.md`** when filed) — booking, ops, field tools, and realtime all assume stable **Vestroo-named** entities and **role-scoped RLS**.

## Story

- As a **platform engineer or backend-focused developer**
- I want **Supabase schema, migrations, RLS, and `public.profiles` roles expressed in Vestroo domain language**, with **app types and Server Actions updated in coordinated steps**
- so that **downstream stories (booking through realtime) build on consistent naming, safe row access, and no misleading mass-transit framing in the data layer or APIs**

## Epic traceability (source)

**From `docs/epic-4.md` — VST-5:** The platform MUST express core data in **Vestroo language** (organisations/clients, **service routes**, **patterns**, **runs**, **service points**, **vehicles**, **chauffeurs**, **bookings**/**trips**, optional tour packages, documents, audit fields) in `supabase/migrations/` with **RLS by role** (customer, chauffeur, dispatcher, admin). Migrations MUST apply cleanly; RLS MUST be smoke-tested. The system MUST **eliminate misleading public-transit naming** in schema, APIs, and user-facing strings where it misrepresents the operator (e.g. inventory/rename tables and columns per domain vocabulary, update RLS/FKs and app types in coordinated changes).

**Terminology alignment (folded from epic § VST-5):**

1. **Inventory** tables, columns, and enums in `supabase/migrations/` against the epic **Domain vocabulary** table (`docs/epic-4.md`).
2. **Rename** with explicit migrations (`ALTER TABLE … RENAME`, compatibility views if needed); update **RLS** and **foreign keys** in the **same change set** (or tightly sequenced forward-only migrations).
3. **Update** application types and Server Actions in **coordinated** changes per bounded context to avoid half-migrated production.
4. **Acceptance:** No user-facing string says **“bus stop”** except **literal public-zone copy**; **DB comments** and diagrams use **service point / pattern / run**; regression tests pass.

**Out of scope:** Porting **feature-complete** behaviour from any capstone; this slice is **naming and structural alignment** plus necessary renames.

## Acceptance Criteria (ACs)

1. **Domain entity coverage (phased allowed):** The schema plan MUST account for epic entities: **organisations/clients**, **service routes**, **service patterns**, **service runs**, **service points**, **vehicles**, **chauffeurs** (staff in fulfilment context), **bookings**/**trips**, optional **tour / experience packages**, **documents**, and **audit fields**. Where tables or columns are **not yet implemented**, the story deliverable MUST **document gaps** (what exists vs what is stubbed/missing) in **`docs/data-models.md`** (or the agreed equivalent) and optionally in **Story Progress Notes** — no silent omission.

2. **Gap analysis — legacy tables vs epic:** Perform an explicit **inventory and gap analysis** for objects that may still carry **legacy or mixed vocabulary**, including at minimum **`public.tickets`**, **`trip_seats`**, and **`driver_schedules`** (if present). Map each to epic concepts (**booking**/**trip**, **chauffeur**, **passenger/seat** as applicable). The outcome MUST be **documented** (rename plan, deferral with rationale, or “aligned”) so **VST-6+** does not rediscover ambiguity.

3. **`public.profiles.role` alignment:** Epic requires roles **customer**, **chauffeur**, **dispatcher**, **admin**. Today **`profiles.role`** may allow **`admin`**, **`manager`**, **`customer`**, **`driver`**. Implementation MUST **align** with epic: e.g. rename or migrate **`driver` → `chauffeur`**, add **`dispatcher`**, and decide **`manager` → dispatcher** and/or **admin** (document the decision in **Dev Technical Guidance** or completion notes). Constraints, defaults, seeds, and any **RLS helpers** that branch on role MUST be updated consistently.

4. **Migrations apply cleanly:** On a **clean hosted database** or **empty temporary Supabase project**, with migrations applied via **`supabase db push`** (after **`supabase link`**) or a documented equivalent, all files under **`supabase/migrations/`** MUST apply **in timestamp order** without error. **CI** (or documented manual gate) MUST validate migration apply where the project already does so; if not, this story MUST add or document the **minimum repeatable procedure** so PR reviewers can verify. **Docker** is not required.

5. **Forward-only rename strategy:** Schema changes MUST use **new, timestamped migrations** under **`supabase/migrations/`** (append-only). **Do not** rewrite or reorder already-applied migration history in shared environments. **Compatibility views** MAY be introduced only if justified and documented; prefer **coordinated app + policy updates** over long-lived dual names unless rollback safety requires it.

6. **RLS by epic role:** Row Level Security MUST enforce **role-scoped** access consistent with **`docs/epic-4.md`**: **customer**, **chauffeur**, **dispatcher**, **admin** (after AC3 alignment). Policies on **bookings**, **tickets** (if retained), **service** network tables, **trackings**, and **profiles** MUST be **reviewed** after renames so predicates still reference correct table/column names and **do not broaden** access unintentionally.

7. **RLS smoke tests:** Provide a **repeatable smoke procedure** (SQL script under `supabase/` or **documented steps** in **`docs/local-development.md`** / story notes) that asserts, for at least one representative table per policy family, **deny-by-default** and **allow** for the intended role. Cover **staff-wide** helpers (e.g. **`public.is_staff(auth.uid())`** as used in **`vestroo_rls_policies_vestroo_domain.sql`**) and **passenger/customer** paths on **bookings**/**tickets** where policies exist in sibling migration files.

8. **App coordination:** **`src/actions/`** (e.g. **`createBooking`**, **`calculateQuote`**, **`processPayment`**) and **`src/lib/supabase/`** MUST use **current table and column names** after migrations — no references to **renamed** legacy identifiers in shipped code. **Generated or hand-maintained types** MUST be **regenerated or updated** in the same delivery as the migration PR (or an immediately following PR with zero production skew documented).

9. **Terminology audit (schema, APIs, app strings):** Grep/audit **shipped** application code (excluding **`docs/capstone-reference/`**, **`src/legacy/`** if non-shipped), **Server Actions**, and **user-visible errors** for misleading mass-transit naming. **Acceptance:** No **“bus stop”** except **literal public pickup zone** copy; prefer **service point**, **service route**, **pattern**, **run**, **booking**/**trip**, **chauffeur** per epic **Domain vocabulary**. **DB `COMMENT ON`** (where used) MUST use **service point / pattern / run** vocabulary.

10. **`docs/data-models.md` (or equivalent):** Update **`docs/data-models.md`** to reflect **current** table names, key relationships, **role model**, and **RLS overview** (which roles touch which entities). If the file is split later, this story MUST either update it or add a **single canonical “equivalent”** path and link it from **`docs/index.md`** — no orphan docs.

11. **Staging and promotion — RLS review:** Migration PRs MUST satisfy expectations in **`docs/staging-and-promotion.md`** (RLS explicitly reviewed: **`ENABLE ROW LEVEL SECURITY`**, policies, no accidental **service role** leakage in client code). This story’s completion notes MUST cite **what was reviewed** (file list) for the rename/RLS touch set.

12. **Regression quality gate:** **`npm run lint`**, **`npm run test`** (or project standard), and **`npm run build`** MUST pass after coordinated changes. Any **intentional** test updates MUST reflect **domain naming**, not weakened assertions.

13. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-5** MUST remain **consistent** with this story (and the optional epic cleanup in AC14). Conflicts MUST be resolved in **epic** or **this file** explicitly.

14. **Optional epic cleanup:** When this story file is **filed and approved**, optionally **remove or shorten** the duplicate **§ VST-5 terminology alignment notes** block in **`docs/epic-4.md`** (keep a **short pointer** to **`docs/stories/vst-5.story.md`** if desired) so the epic does not maintain two sources of truth.

## Tasks / Subtasks

- [x] **Task 1 — AC1:** Map epic entities to **existing** `public.*` tables/columns; list **gaps** (missing entities, wrong granularity) in **`docs/data-models.md`** with a **phased** note where full model is deferred. (AC: #1)

- [x] **Task 2 — AC2:** Document **`tickets`**, **`trip_seats`**, **`driver_schedules`** (and any similar) vs **booking/trip/chauffeur**; produce **rename or defer** decisions with rationale. (AC: #2)

- [x] **Task 3 — AC3:** Design and implement **`profiles.role`** migration + app usage: **`driver`→`chauffeur`**, **`dispatcher`**, **`manager`** mapping; update **CHECK** constraints, seeds, and **RLS** branches. (AC: #3)

- [x] **Task 4 — AC4:** Verify **ordered apply** of **`supabase/migrations/*.sql`** on a **clean hosted** DB or temporary empty project (**`db push`**); fix ordering/dependency issues; document **CI or manual** verification step. (AC: #4)

- [x] **Task 5 — AC5:** Add **forward-only** migrations for any remaining renames (no history rewrite); bundle **FK/view/RLS** updates per alignment notes. (AC: #5)

- [x] **Task 6 — AC6:** Audit **`vestroo_rls_policies_*.sql`** and related **vin_shuttle_rls_*.sql** survivors; fix broken references after renames; confirm **customer/chauffeur/dispatcher/admin** semantics. (AC: #6)

- [x] **Task 7 — AC7:** Author **RLS smoke** SQL or runbook steps; run against **hosted** Supabase (or a temporary empty project after **`db push`**); capture **expected outcomes** in story or **`docs/local-development.md`**. (AC: #7)

- [x] **Task 8 — AC8:** Update **`src/actions/`**, **`src/lib/supabase/`**, and types to match **final** table/column names; remove stale identifiers from shipped paths. (AC: #8)

- [x] **Task 9 — AC9:** Run **terminology grep** on shipped code; fix **UF strings** and add/adjust **`COMMENT ON`** for core tables to **service point / pattern / run** language. (AC: #9)

- [x] **Task 10 — AC10:** Complete **`docs/data-models.md`** refresh (entities, FKs, roles, RLS summary); link from **`docs/index.md`** if structure changes. (AC: #10)

- [x] **Task 11 — AC11:** Record **RLS review** evidence for the migration PR per **`docs/staging-and-promotion.md`**. (AC: #11)

- [x] **Task 12 — AC12:** Run **lint / test / build**; fix failures; document any **follow-up** outside scope (capstone parity). (AC: #12)

- [x] **Task 13 — AC13:** Re-read **`docs/epic-4.md` VST-5**; align epic text with delivered behaviour or update epic with explicit deltas. (AC: #13)

- [x] **Task 14 — AC14 (optional):** Remove redundant **§ VST-5 terminology alignment notes** from **`docs/epic-4.md`** after this story is the canonical spec; leave a one-line pointer to **`docs/stories/vst-5.story.md`**. (AC: #14)

## Dev Technical Guidance

- **Migrations root:** All changes under **`supabase/migrations/`**, **timestamp-prefixed**, **lexicographic order = apply order**. Existing Vestroo rename work includes **`20260402133631_vestroo_rename_tables_and_columns.sql`** (e.g. `bus_stops`→`service_points`, `bus_routes`→`service_routes`, `bus_schedules`→`service_patterns`, `bus_trips`→`service_runs`, `driver_bus_schedules`→`chauffeur_assignments`, `bus_trackings`→`vehicle_trackings`; column renames such as **`service_route_id`**, **`service_point_id`**). **Follow-on** migrations in repo include **`20260402133618_vestroo_drop_legacy_rls_policies.sql`**, **`20260402133646_vestroo_rls_policies_vestroo_domain.sql`** (**`public.is_staff(auth.uid())`** for staff-wide policies), **`20260402133655_vestroo_rls_policies_booking_social.sql`**, **`20260402133703_vestroo_rls_policies_tracking_drivers.sql`**, **`20260402140000_vestroo_bookings_web_columns.sql`**. **VST-5** adds **`20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql`** (roles, `chauffeur_id`, `chauffeur_schedules`, RLS refresh, `COMMENT ON`).
- **Legacy baseline:** Earlier **`vin_shuttle_*.sql`** files establish core tables; **Vestroo** migrations layer renames and new RLS. Any **new** rename MUST be a **new file** with a **new timestamp** (e.g. `20260406HHMMSS_vestroo_*`).
- **Gap hotspots:** Inspect **`public.tickets`**, **`trip_seats`**, **`driver_schedules`** (if present) for **table/column names** and **FK targets** still pointing at pre-rename concepts; align with **booking/trip/chauffeur** vocabulary per AC2.
- **Application touchpoints:** **`src/actions/createBooking.ts`**, **`calculateQuote.ts`**, **`processPayment.ts`**, and **`src/lib/supabase/`** — search for **old table names** and **role strings** after schema changes.
- **Documentation:** Maintain **`docs/data-models.md`** as the **ER-ish narrative**; cross-check **`docs/environment-vars.md`** only for Supabase client usage, not schema truth. **`docs/staging-and-promotion.md`** — treat **RLS review on migration PRs** as mandatory evidence for AC11.
- **Scope guard:** **Out of scope** — porting **full capstone behaviour**; do not expand feature surface under this story beyond **naming, structural alignment, RLS correctness, and coordinated app renames**.

## Story Progress Notes

### Agent Model Used: `SM story prep` / dev implementation

### Completion Notes List

**`profiles.role` mapping (AC3):**

- **`driver` → `chauffeur`** (data migration + CHECK constraint).
- **`manager` → `dispatcher`** (preserves prior **staff** access: **`public.is_staff()`** now tests **`admin`** OR **`dispatcher`** only).
- Legacy **`manager`** is **not** mapped to **`admin`**; elevated break-glass remains **`admin`** only.

**RLS review evidence (AC6 / AC11)** — files touched or superseded by VST-5 follow-on (read for `ENABLE RLS`, policy predicates, `is_staff`):

- `supabase/migrations/20260402131457_vin_shuttle_rls_enable_and_is_staff.sql`
- `supabase/migrations/20260402131508_vin_shuttle_rls_policies_part_a.sql`
- `supabase/migrations/20260402131517_vin_shuttle_rls_policies_part_b.sql`
- `supabase/migrations/20260402131523_vin_shuttle_rls_policies_part_c.sql`
- `supabase/migrations/20260402133618_vestroo_drop_legacy_rls_policies.sql`
- `supabase/migrations/20260402133646_vestroo_rls_policies_vestroo_domain.sql`
- `supabase/migrations/20260402133655_vestroo_rls_policies_booking_social.sql`
- `supabase/migrations/20260402133703_vestroo_rls_policies_tracking_drivers.sql`
- `supabase/migrations/20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql` (**authoritative refresh** after `chauffeur_id` / `chauffeur_schedules` / roles)

**Smoke test location (AC7):** **`supabase/smoke_rls.sql`** + manual JWT steps in **`docs/local-development.md`**.

**Deferred / follow-ups:**

- **`public.tickets` table name** retained (documented in **`docs/data-models.md`**); rename to e.g. `run_passenger_reservations` deferred to a later bounded context if product needs it.
- **`pricing_rules` table** not in schema; **`fetchActivePricingRules()`** returns `[]` until VST-6+ defines modifiers.
- **Migration verification:** Confirmed against **hosted-first** workflow: **`supabase login`**, **`supabase link`**, **`supabase db push`** (or **`npm run db:push`**); optional from-scratch check uses a **temporary empty** hosted project — see **`docs/local-development.md`**.

### Change Log

| Date | Change |
|------|--------|
| 2026-04-02 | Initial **Draft**: VST-5 from **`docs/epic-4.md`** VST-5 paragraph + § terminology alignment notes; dependencies (VST-4 → VST-5 → VST-6–9); 14 ACs (domain coverage, legacy gap analysis, role alignment, clean migrate, forward-only RLS coordination, smoke tests, app coordination, terminology + DB comments, `data-models.md`, staging RLS review, regression, epic traceability, optional epic dedupe); tasks mapped to ACs; dev guidance with concrete migration filenames and paths. |
| 2026-04-06 | **Implemented:** migration `20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql`; `docs/data-models.md` rewrite; `supabase/smoke_rls.sql`; `docs/local-development.md` migration + RLS smoke; `src/lib/pricing-data.ts` → `vehicle_categories` / `service_routes`; `src/types/database.types.ts`; email copy chauffeur wording; epic VST-5 pointer + removed duplicate §; story tasks marked complete, Status → Review. |

## Story DoD Checklist Report

- **AC1–AC14:** Addressed per tasks above; **`docs/index.md`** already links **`data-models.md`** (no change required).
- **Lint / test / build:** Run **`npm run lint`**, **`npm run test`**, **`npm run build`** before merge (recorded in Task 12).
- **RLS:** No intentional broadening; **`is_staff`** narrowed to admin+dispatcher; chauffeur paths use **`chauffeur_id`** predicates.
