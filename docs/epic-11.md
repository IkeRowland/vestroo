# Epic 11 — Operations platform, fulfilment, and catalogue (Next.js + Supabase)

## Description

This epic consolidates prior planning tracks (**E1, E2, E3, E4, E5, E6, E7**, and **T1–T3**) into one umbrella programme: **stable RLS and staff data access**, **ops console quality**, **fulfilment segmentation**, **staff booking discovery** (with **`booking_intent` visibility**), **dashboard insights**, **fleet and public vehicle catalogue**, **Driver terminology**, and **tour / experience packages** (public funnel + ops CRUD).

It builds on booking and ops foundations described in [`docs/epic-1.md`](epic-1.md) and public funnel work in [`docs/epic-10.md`](epic-10.md) where relevant; it does not duplicate FE.10 trip-request requirements except where **T1** explicitly reuses those UI patterns.

## 1. Epic summary & goals

**Epic 11** delivers a **coherent staff (ops) experience** and **customer booking flows** on top of a **single, non-recursive Row Level Security (RLS) model** for `bookings`, `booking_trips`, and related tables—so ops pages (including Experiences) behave predictably and **`supabase/smoke_rls.sql`** stays green as a regression gate.

### Business goals

- **Trustworthy data access:** Staff see only what policies allow; no infinite recursion or “works in SQL editor but fails in app” behaviour.
- **Operational throughput:** Fulfilment queues are **segmented and actionable** (paid vs pending vs trip_request), with clear optional paths for payment and acceptance.
- **Resilient ops UI:** Consistent **error and loading** behaviour, **realtime or explicit refresh** where it matters, and **structured server-side logging** for server actions.
- **Find and act on bookings:** Replace ad-hoc staff search with a **searchable table** (columns, filters, row actions) and **visible `booking_intent`** everywhere staff need it (aligned with search and lists).
- **Insight:** A **dashboard** with KPIs and drill-downs (successor to the current “Board” concept).
- **Fleet and discovery:** **Fleet CRUD**, **driver assignment**, and a **public “Choose your ride”** experience backed by a **real vehicle catalogue** (not placeholders).
- **Product language:** **Chauffeur → Driver** terminology rolled through UI copy (parallel track, low coupling to schema work).
- **Tours & experiences:** **Tour booking funnel** (package slide pattern, shuttle contact details, `experience_package` intent wiring) and **ops-managed `experience_packages`** at `/ops/experiences`.

### Technical goals

- One **security model** for ops routes and server actions; policies **compose** without circular `USING`/`WITH CHECK` dependencies.
- **Automated RLS smoke** remains a merge-quality check.
- **Observable** ops flows: errors surfaced in UI; logs correlate to user/session context where safe.

## 2. Non-goals / out of scope (brief)

- **Greenfield auth provider** or SSO beyond what Supabase + existing app patterns already support.
- **Full payment gateway feature expansion** beyond what is needed for optional payment/acceptance paths already in scope (e.g. new processors, invoicing productization—unless already tracked elsewhere).
- **Mobile-native apps**; web-first (responsive as today).
- **Complete i18n** beyond terminology track (E6); no commitment to multi-locale launch in this epic unless already planned.
- **Data warehouse / BI tooling**; dashboard is **in-app** KPIs and drill-downs, not external analytics platform build-out.

## 3. Phased delivery plan

**Ordering principle:** **Stabilize RLS and server access patterns before** building data-heavy ops UI that multiplies queries and joins. **Harden ops shell** before scaling surface area (search, dashboard, fleet). **Terminology (E6)** can run **in parallel** once touchpoints are identified, but should not block security phases.

| Phase | Focus | Includes (tags) |
|--------|--------|-------------------|
| **1 — Security foundation** | Fix `bookings` / `booking_trips` RLS recursion; unify staff/ops policies incl. Experiences; extend/update **`smoke_rls`** | E1 |
| **2 — Ops runtime quality** | `OpsErrorState`, realtime/refresh strategy, structured logging on server actions ([`docs/ops-data-freshness.md`](ops-data-freshness.md)) | E2 |
| **3 — Fulfilment** | Queues: tabs/filters (paid / pending / trip_request); optional payment & acceptance paths | E3 |
| **4 — Staff discovery** | Booking search table (replaces staff form): columns, filters, actions; **`booking_intent` column** in search and staff lists | E5, T3 |
| **5 — Insight** | Dashboard (ex-Board): KPIs, drill-downs | E4 |
| **6 — Fleet & public catalogue** | Fleet CRUD, driver assignment, public “Choose your ride” from real data | E7 |
| **7 — Tours & experience admin** | Tour funnel (package slide, shuttle contact, intent); ops CRUD for `experience_packages` | T1, T2 |
| **Parallel** | **Chauffeur → Driver** copy sweep | E6 |

### Notes

- **E1 before E3–E7:** Fulfil, search, dashboard, and fleet all **read/write** across the same tables; recursion bugs **mask** real defects and waste frontend iteration.
- **E2 early after E1:** Reduces blind spots while building E3–E5.
- **T3 bundled with E5** (same release train): one searchable grid contract for intent visibility.
- **T2** may follow **E1** (policies for `experience_packages` / related reads) and can align with **T1** for end-to-end tour purchase + ops management.

## 4. Themes with user stories & acceptance criteria

### Theme A — RLS & unified ops security (E1)

**US-A1 — As ops staff**, I need **consistent read access** to bookings and trip links so that **ops pages (including Experiences) load without policy errors**.

- **AC:** No **infinite recursion** errors from PostgreSQL when selecting `bookings` / `booking_trips` (and related joins used by ops).
- **AC:** Staff role(s) used by the app have **explicit, composable policies**; no ad-hoc bypass in client code as the “fix”.
- **AC:** **`supabase/smoke_rls.sql`** passes against the migrated schema (or updated script reflects intentional policy names/behaviour).

**US-A2 — As a maintainer**, I need **`smoke_rls` regression coverage** so that **RLS changes are caught in CI or local checks**.

- **AC:** Smoke script documents **which roles** are exercised and **which tables** are critical paths for ops.
- **AC:** Failure output is **actionable** (which policy/table/role).

### Theme B — Ops console hardening (E2)

**US-B1 — As ops staff**, I need **clear error UI** when server actions or subscriptions fail.

- **AC:** Shared **`OpsErrorState`** (or equivalent) used on ops surfaces; recovery path (retry, refresh, or navigate) defined.
- **AC:** User-facing copy does not leak raw stack traces or secrets.

**US-B2 — As ops staff**, I need **fresh data** when bookings/trips change.

- **AC:** Documented approach: **realtime** where subscribed, or **explicit refresh** control, or **revalidate** pattern—consistent per page.
- **AC:** No silent stale state without user feedback on long-lived sessions.

**US-B3 — As an engineer**, I need **structured logs** from server actions for ops flows.

- **AC:** Logs include **correlation** (request/action name, safe ids), **level**, and **outcome**; PII minimization policy respected.

### Theme C — Fulfilment queues (E3)

**US-C1 — As fulfilment staff**, I need **tabs or filters** for **paid**, **pending**, and **trip_request** work so I can **prioritize**.

- **AC:** Definitions of each bucket are **documented** and match query predicates (no overlapping ambiguity).
- **AC:** Empty states explain **why** a tab is empty.

**US-C2 — As fulfilment staff**, I need **optional paths** to **record payment** or **acceptance** where the business allows.

- **AC:** Actions appear only when **state + role** permit; otherwise disabled with reason or hidden per UX pattern.
- **AC:** Mutations **persist** and **reflect** in the list without full reload if that is the standard elsewhere (or documented exception).

### Theme D — Staff booking search & intent visibility (E5 + T3)

**US-D1 — As ops staff**, I need a **searchable booking table** instead of a **staff form-only** flow.

- **AC:** Search covers **minimum** fields (e.g. reference, contact, date range—exact set per product).
- **AC:** **Sort** and **pagination** (or cursor) behaviour defined for large datasets.

**US-D2 — As ops staff**, I need **columns, filters, and row actions** aligned with daily tasks.

- **AC:** Column set agreed (status, intent, dates, route summary, etc.).
- **AC:** Row actions route to **existing** detail/modify flows or new flows as specified.

**US-D3 — As ops staff**, I need to see **`booking_intent`** in **search results** and **staff lists**.

- **AC:** Intent displayed consistently with **booking/search** and **fulfil** views (same labels).
- **AC:** Intent sourced from **canonical** field(s) in DB or derived rules—documented.

### Theme E — Dashboard / KPIs (E4)

**US-E1 — As ops leadership**, I need a **dashboard** with **KPIs** for operational health.

- **AC:** KPIs list is **finite** for v1; definitions (numerator/denominator, timezone) documented.
- **AC:** Loading and error states consistent with Theme B.

**US-E2 — As ops staff**, I need **drill-downs** from KPIs to **lists or detail**.

- **AC:** Each drill-down lands on a **filtered** view or explains **no data**.

### Theme F — Fleet, drivers, public catalogue (E7)

**US-F1 — As ops staff**, I need **Fleet CRUD** for vehicles used in booking/assignment.

- **AC:** Create/edit/archive rules **match** business rules; validation messages clear.
- **AC:** RLS permits only **authorized** roles to mutate fleet tables.

**US-F2 — As ops staff**, I need to **assign drivers** to trips/bookings per existing domain rules.

- **AC:** Assignment updates **visible** on trip/booking views used by ops.
- **AC:** Conflicts (e.g. double-booking) handled or surfaced.

**US-F3 — As a customer**, I need **“Choose your ride”** to show options from the **real catalogue**.

- **AC:** No static demo inventory unless explicitly labeled as fixture in non-prod only.
- **AC:** Selection flows through to **quote/checkout** per existing booking pipeline constraints.

### Theme G — Terminology: Chauffeur → Driver (E6)

**US-G1 — As a product owner**, I want **user-visible “Chauffeur” copy** replaced with **“Driver”** (where applicable).

- **AC:** Grep/audit list of **touchpoints** (ops, booking, emails if in repo) completed or ticketed as exceptions.
- **AC:** No regression to **API** or **DB column names** unless a separate migration epic exists (default: **UI-only** rename).

### Theme H — Tour booking funnel (T1)

**US-H1 — As a customer booking a tour**, I need a **package selection slide** comparable to **`TripRequestVehicleSlide`**.

- **AC:** UX parity: **progress**, **validation**, **back/next** behaviour consistent with trip-request patterns.
- **AC:** Selected package **binds** to checkout metadata for `experience_package` intent.

**US-H2 — As a shuttle customer**, I need **contact details** via **`ContactDetailsForm`** (or successor) **after** the established flow order.

- **AC:** Validation and error display match existing booking forms.
- **AC:** Data lands in **`bookings` / metadata** per `experience_package` contract.

**US-H3 — As product**, I need **`experience_package` intent** end-to-end in search/booking where applicable.

- **AC:** Intent appears in **payment** and **processing** paths consistently with `booking-schemas` / `processPayment` expectations.

### Theme I — Ops experience packages CRUD (T2)

**US-I1 — As ops staff**, I need **CRUD for `experience_packages`** at **`/ops/experiences`**.

- **AC:** List, create, edit, deactivate/archive as per schema.
- **AC:** Changes **visible** on public tour flows within cache/revalidate expectations.

## 5. Cross-cutting dependencies matrix

| Item | Depends on | Blocks or strongly influences |
|------|------------|------------------------------|
| **E1 RLS** | — | E3, E4, E5, E7, T2 (data access); T1 (payment/metadata reads) |
| **E2 Ops hardening** | E1 (stable errors vs policy noise) | E3–E5 (faster iteration) |
| **E3 Fulfil** | E1, E2 | Customer-facing SLAs on fulfilment |
| **E5 + T3 Search/lists** | E1, E2 | Staff efficiency; intent consistency with T1 |
| **E4 Dashboard** | E1, E2; metrics definitions | Reporting trust |
| **E7 Fleet/public** | E1; vehicle/trip model | T1 ride/package presentation |
| **E6 Terminology** | Copy audit | — (parallel) |
| **T1 Tour funnel** | T2 or seed data; E1; booking actions | Revenue on tours |
| **T2 Ops experiences CRUD** | E1 | T1 content readiness |

## 6. Definition of Done for Epic 11

- **Security:** `bookings` / `booking_trips` (and ops-critical related tables for this epic) have **no recursive RLS failures**; **Experiences** paths covered by the **same ops security model** story as other ops modules.
- **Regression:** **`supabase/smoke_rls.sql`** updated and **passing** for the policies this epic touches.
- **Ops UX:** Core ops routes use shared **error/loading** patterns; **realtime/refresh** behaviour is **documented** per surface; server actions emit **structured logs** suitable for debugging without PII dumps.
- **Fulfilment:** Paid / pending / trip_request **views work**, with **clear** actions and permission gating.
- **Search:** Staff **searchable table** ships; **`booking_intent`** visible in **search and staff lists** (T3).
- **Dashboard:** KPIs and **drill-downs** functional with documented definitions.
- **Fleet:** CRUD + **driver assignment** + public **catalogue-driven** ride choice.
- **Terminology:** **Chauffeur → Driver** sweep complete per scope (or explicit exceptions listed).
- **Tours:** Package slide + shuttle contact + **`experience_package` intent** wired; **`/ops/experiences`** CRUD live.
- **Quality:** Critical paths **manually verified** or **automated** per project norms; no known **sev-1** defects open for this scope.

## 7. References to likely code areas (paths only)

- **RLS & smoke:** `supabase/migrations/`, `supabase/smoke_rls.sql`, policies touching `bookings`, `booking_trips`, `trips`, experience-related tables
- **Ops app shell & pages:** `src/app/(ops)/ops/`
- **Ops features:** `src/features/ops/components/` (e.g. `OpsErrorState.tsx`, `OpsBoardRealtimeBridge.tsx`, `ops-primitives`), `src/features/ops/ops-nav-config.ts`
- **Ops server actions:** `src/actions/opsDispatch.ts`, `src/actions/opsCloseProtection.ts`, other `src/actions/ops*.ts`
- **Fulfil:** `src/app/(ops)/ops/fulfil/page.tsx`
- **Staff search:** `src/app/(ops)/ops/search/page.tsx`
- **Dashboard / Board:** `src/app/(ops)/ops/board/page.tsx`, `src/app/(ops)/ops/page.tsx`
- **Experiences (ops):** `src/app/(ops)/ops/experiences/page.tsx`
- **Fleet / vehicles:** `src/app/(ops)/ops/vehicles/page.tsx`, vehicle-related actions/libs as present
- **Booking funnel (app):** `src/app/(app)/book/search/page.tsx`, `src/app/(app)/book/trip-request/page.tsx`, `src/app/(app)/book/quote/page.tsx`, `src/app/(app)/book/payment/page.tsx`, `src/app/(app)/book/details/page.tsx`
- **Booking features:** `src/features/booking/components/`, `src/features/booking/components/trip-request/TripRequestVehicleSlide`, `src/features/booking/components/ExperiencePackageBookPanel.tsx`
- **Payment & intent:** `src/actions/processPayment.ts`, `src/actions/booking-schemas.ts`, `src/actions/calculateExperienceQuote.ts`
- **Experience package data:** `src/lib/experience-package-data.ts`
- **Realtime / notifications (if reused):** `src/features/ops/components/OpsBoardRealtimeBridge.tsx`, migrations referencing realtime (`supabase/migrations/*realtime*`)

## Relationship to other epics

- **[`docs/epic-1.md`](epic-1.md):** Core booking model, shuttle flows, and baseline ops assumptions.
- **[`docs/epic-10.md`](epic-10.md):** Public trip-request funnel (slide patterns **T1** may reuse for tours).
- **Epic 11** is the **umbrella** for ops reliability, fulfilment UX, fleet, tours admin, and staff booking discovery; implementation may still be split into multiple stories under `docs/stories/` (e.g. `11.1.story.md`, …) as the team prefers.
