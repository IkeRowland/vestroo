# Capstone manager → Vestroo ops & field mapping

**Purpose:** Trace capstone **`frontend-manager`** screens, navigation, and REST-shaped constants to Vestroo **`/ops/*`** and **`/field/*`** routes, Supabase data, and backlog IDs—without treating reference **JWT-in-browser**, **axios-to-Nest**, or **Firebase** as product defaults (**NFR.5.3**).

**Scope:** **Manager reference only** (`docs/capstone-reference/frontend-manager`): dashboard shell, **`(dashboard)`** feature routes, manager **home** (`src/app/page.tsx`), and **bookings** API/router constants. **Out of scope:** **FE.5.6** (driver app modality), **FE.5.4** admin-only matrices (category CRUD, `/money`, `/cal`, admin `/router`, Firebase uploads)—see the admin artifact below for one-line depth.

**Cross-link (admin, do not duplicate rows):** **[Capstone admin → ops mapping](capstone-admin-to-ops-mapping.md)** — fleet **category**, **pricing**, **media**, and **admin map authoring** parity live there; this doc references it where manager **`/vehicles`** overlaps.

**Sources (under `docs/capstone-reference/frontend-manager`):**

- Shell: [`src/app/(dashboard)/layout.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/layout.tsx) — **`Menu`**, **`NavBar`**
- Role-filtered nav: [`src/components/Menu.tsx`](capstone-reference/frontend-manager/src/components/Menu.tsx)
- Manager home: [`src/app/page.tsx`](capstone-reference/frontend-manager/src/app/page.tsx)
- Dashboard pages: [`src/app/(dashboard)/`](capstone-reference/frontend-manager/src/app/%28dashboard%29/) (`drivers`, `customers`, `vehicles`, `routes`, `schedule`, `schedules`, `rating`, `profile`, `admin`)
- Bookings constants: [`src/constants/api.ts`](capstone-reference/frontend-manager/src/constants/api.ts) (`BASE_PATHS.BOOKINGS`, `API_ENDPOINT.BOOKINGS`), [`src/constants/routers.ts`](capstone-reference/frontend-manager/src/constants/routers.ts) (`ROUTERS.MANAGE.BOOKINGS.BASE` → `/manage/bookings`)

**Related Vestroo runbooks:** [Ops console](ops-console.md), [Field tools](field-tools.md) (**VST-8**), [Realtime and notifications](realtime-and-notifications.md) (**VST-9**) for widget/realtime gaps only.

**Last updated:** 2026-04-07

---

## Status definitions

[^implemented]: **implemented** — Staff or field UI exists on **`/ops/*`** or authenticated **`/field/*`**, with a clear server data path (Supabase, Server Action).

[^partial]: **partial** — Some data or UI exists (list-only, shell chrome, or operational substitute) **without** full manager-dashboard parity.

[^notstarted]: **not started** — No intentional surface for this manager metaphor in ops/field MVP.

[^notapplicable]: **not applicable** — No planned equivalent in corporate shuttle MVP; often **Epic 9**-gated (fixed-line / bus-timetable demo patterns).

---

## Primary mapping table

| Reference screen / capstone route | Capstone implementation pointer | Vestroo target | Status | Vestroo-preferred term / naming (NFR.5.4) | Supabase / platform (high level) | Story / epic traceability |
| --------------------------------- | -------------------------------- | -------------- | ------ | ------------------------------------------- | ----------------------------------- | ------------------------- |
| `/` — manager home (UserCard, AttendanceChart) | [`src/app/page.tsx`](capstone-reference/frontend-manager/src/app/page.tsx) | **`/ops`** → **`/ops/board`** (default redirect); also **`/ops/calendar`**, **`/ops/fulfil`** for operational “at a glance”; **no** reference-style KPI cards / attendance chart widgets yet | partial [^partial] | **Operations home** / **trip board** — corporate shuttle ops, not generic “manager dashboard” demo copy | `trips`, `bookings` as surfaced on board/calendar; Realtime bridge on board where enabled; RLS via staff session | **VST-7**; **5.1**, **5.5**; **VST-9** (realtime widgets) |
| `/drivers` — driver list | [`src/app/(dashboard)/drivers/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/drivers/page.tsx) | **`/ops/roster`** (chauffeur list + schedules); execution context on **`/field`** | partial [^partial] | **Chauffeurs** (field operators), not generic “drivers” of a transit network | `profiles` (`role = chauffeur`), `chauffeur_schedules`, `chauffeur_assignments`; staff RLS | **VST-7**, **VST-8**; **FE.5.11**; **BE.6.7** ([Epic 6](epic-6.md)) |
| `/drivers/[id]` — driver detail | [`src/app/(dashboard)/drivers/[id]/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/drivers/[id]/page.tsx) | **No** `/ops/drivers/[id]`; roster is **list-centric**; chauffeur **self-service** on **`/field`** | partial [^partial] | **Chauffeur profile / assignment detail** — defer dedicated manager drill-down until IA needs it | Same tables as roster row; no dedicated detail route | **VST-7**, **VST-8**; **5.5** |
| `/customers` | [`src/app/(dashboard)/customers/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/customers/page.tsx) | **No** **`/ops/customers`**; traveller/account visibility via **`/ops/search`** (bookings) and related fulfil flows | not started [^notstarted] | **Travellers** / **corporate clients** (B2B)—not undifferentiated “customers” | `bookings`, `profiles` as joined from booking flows; RLS staff paths | **FE.5.11**; **VST-6**; **BE.6.7**; **5.5** |
| `/vehicles` — manager fleet view | [`src/app/(dashboard)/vehicles/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/vehicles/page.tsx) | **`/ops/vehicles`**; **category / pricing / media depth:** see [admin mapping](capstone-admin-to-ops-mapping.md) (single cross-ref, no row duplication) | partial [^partial] | **Fleet** / **vehicles** with **vehicle categories** | `vehicles`, `vehicle_categories`, `vehicle_pricings`, `trips` | **VST-7**; **5.4** (admin artifact); **5.3** |
| `/routes` — road / line routes | [`src/app/(dashboard)/routes/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/routes/page.tsx) | **No** staffed **`/ops/routes`** map/list for authoring; align conceptually with **service routes** / geometry (see admin **`/router`** row) | not started [^notstarted] | **Service routes**, **corridors**, **zones** — corporate shuttle, **not** fixed public-transit “lines” ([NFR.5.4](epic-5.md#related-non-functional-requirements)) | Geo/service-route tables per [data models](data-models.md) when introduced; **Epic 9** for bus-line demo parity | [Epic 9](epic-9.md); **FE.5.10**; **5.4**, **5.5** |
| `/schedule` — driver/shift schedule | [`src/app/(dashboard)/schedule/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/schedule/page.tsx) | **`/ops/roster`** + **`/ops/calendar`**; chauffeur **day-of** work on **`/field`**, **`/field/trips/[tripId]`** | partial [^partial] | **Chauffeur schedules** / **shifts** vs **trips** | `chauffeur_schedules`, `trips`, `bookings`; calendar/board as operational views | **VST-7**, **VST-8**; **5.5** |
| `/schedules` — recurring bus / line timetables | [`src/app/(dashboard)/schedules/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/schedules/page.tsx) | **No** structured timetable product in shuttle MVP | not applicable [^notapplicable] | **Epic 9** optional **patterned shuttle** / capacity runs — **not** default capstone **Bus\*** IA | N/A for MVP; future schema gated by product | [Epic 9](epic-9.md); **FE.5.5**, **FE.5.10** |
| `/rating` — feedback (service type filters) | [`src/app/(dashboard)/rating/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/rating/page.tsx) | **No** **`/ops/rating`** or feedback dashboard | not started [^notstarted] | **Trip / service feedback** by **service type** (hourly, destination, etc.) — VST vocabulary | Ratings/feedback tables if/when added; RLS TBD | **VST-7**; **5.5**; possible **Epic 7** / **VST-9** hooks |
| `/profile` | [`src/app/(dashboard)/profile/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/profile/page.tsx) | Ops: **shell chrome** (**`OpsTopBar`** — email/role); **no** **`/ops/profile`**; field: **`requireChauffeurPage`** session (no standalone profile route in tree) | partial [^partial] | **Staff session** / **chauffeur session** — not a full settings page | `profiles` + auth user | **VST-7**, **VST-8**; **5.1** |
| `/admin` — rich dashboard (UserCard, CountChart, AttendanceChart, FinanceChart, EventCalendar, announcements) | [`src/app/(dashboard)/admin/page.tsx`](capstone-reference/frontend-manager/src/app/%28dashboard%29/admin/page.tsx) | **Distributed** ops substitutes: **`/ops/board`**, **`/ops/calendar`**, **`/ops/invoicing`**, **`/ops/compliance`** — **no** single page with all reference charts/calendar/finance widgets | partial [^partial] | **Ops analytics** — defer dense **Recharts**-style manager dashboard until product prioritises | Tables per widget domain (`trips`, invoicing hooks, compliance docs); no consolidated “admin home” | **VST-7**, **VST-12**, **VST-13**; **5.5** |
| **Bookings** — REST list shape (`/bookings`, `/manage/bookings`) | [`src/constants/api.ts`](capstone-reference/frontend-manager/src/constants/api.ts) (`BASE_PATHS.BOOKINGS`, `API_ENDPOINT.BOOKINGS`), [`src/constants/routers.ts`](capstone-reference/frontend-manager/src/constants/routers.ts) (`ROUTERS.MANAGE.BOOKINGS.BASE`) | **No** single **`/ops/bookings`** route; visibility via **`/ops/search`**, **`/ops/fulfil`**, **`/ops/trips`**; audit/reporting via **`ops_audit_log`** / compliance patterns where applicable | partial [^partial] | **Bookings** and **trips** lifecycle — staff search and fulfilment, not Nest **`GET /bookings`** parity | `bookings`, `booking_trips`, `trips`, `ops_audit_log`; Server Actions + RLS | **VST-6**, **VST-7**; **BE.6.7**; **5.5** |

---

## Dispatcher vs admin / menu visibility (NFR.5.5)

**Reference (`Menu.tsx`):** Items use a `visible: string[]` list with capstone roles **`admin`** and **`manager`** (e.g. home, drivers, customers, schedule, rating are **`admin`**-only in the vendored file; **`/schedules`** allows **`admin`** and **`manager`**). The capstone **`NavBar`** labels the user as “Manager” in UI copy—**not** the same as Vestroo’s role enum.

**Vestroo ops:** Staff roles are **`dispatcher`** and **`admin`** ([`ProfileRole`](../src/types/database.types.ts)); both pass **`requireOpsStaffPage`**. Navigation is defined in [`src/features/ops/ops-nav-config.ts`](../src/features/ops/ops-nav-config.ts): today **no** `visibleRoles` override on items, so **dispatchers and admins see the same sidebar entries**.

**Server enforcement:** Dangerous or policy-sensitive actions MUST still check role on the server. Example: **`getOpsAdminForAction()`** in [`src/lib/ops-auth.ts`](../src/lib/ops-auth.ts) restricts certain compliance/DSR Server Actions to **`admin`** only (used from [`src/actions/opsCompliance.ts`](../src/actions/opsCompliance.ts))—dispatchers receive **Forbidden** even if they can open **`/ops/compliance`**.

**Intent (NFR.5.5):** Hiding a nav item is **not** authorization. **Do not** imply that matching capstone **`admin`/`manager`** menu visibility in the client is sufficient for Vestroo; **always** align UI hints with **server gates**.

---

## Internationalization (reference vs Vestroo)

The capstone manager app is wired for **i18next**-style locale switching (Vietnamese labels in **`Menu.tsx`** / **`NavBar`** are indicative). **Vestroo `src/`** does **not** currently use **i18next** for **`/ops`** or **`/field`**—internal tools are effectively **English-only MVP** for copy and `aria` strings.

**Future guardrails:** If locale switching is required, treat it as a **product decision** (Epic 5+): centralise strings, avoid forking RLS or Server Action contracts per locale, and keep **server-authoritative** error messages safe for logs (English diagnostic + optional localised user text).

---

## Integration posture

Capstone **frontend-manager** uses **`AuthContext`**, **axios** to **NestJS**, and **JWT-in-browser** patterns — **reference-only** for Vestroo (**NFR.5.3**). Vestroo merges manager-style IA into **`/ops/*`** and **`/field/*`** using **Supabase sessions**, **server gates**, and **Server Actions** instead of REST client singletons. Full **comparison tables**, **anti-patterns**, and **UI dependency inventory** live in **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**). **Nest ↔ Supabase module ownership** is **[Epic 6](epic-6.md)** (**BE.6.1** / **FE.5.10**).

---

## Backlog / prioritisation / proposed routes or widgets

Highest-signal gaps versus capstone **manager** expectations:

1. **Customers / clients** — Dedicated **`/ops/customers`** (or account-centric view) vs booking search only.
2. **Ratings / feedback** — **`/ops/rating`** (or embedded widgets) with **service-type** filters matching reference mental model.
3. **Manager analytics home** — Consolidated KPI strip (**UserCard**-style counts, attendance/utilisation charts, finance snapshot) vs today’s **distributed** board/calendar/invoicing.
4. **Chauffeur drill-down** — **`/ops/roster/[id]`** or similar for parity with **`/drivers/[id]`**.
5. **Recurring timetable** — Only if product approves **Epic 9** patterned-shuttle scope; otherwise remain **not applicable**.

---

## Verification

Cross-checked **2026-04-07** against:

- **`src/app/(ops)/ops/`** — `page.tsx` (redirect to **`/ops/board`**), **`board`**, **`calendar`**, **`fulfil`**, **`trips`**, **`search`**, **`vehicles`**, **`roster`**, **`invoicing`**, **`compliance`**, **`experiences`**, **`close-protection`**, **`close-protection/[id]`**
- **`src/app/(field)/field/`** — **`page.tsx`**, **`login`**, **`unauthorized`**, **`trips/[tripId]`**
- **`src/features/ops/ops-nav-config.ts`** — no per-item `visibleRoles`; **`dispatcher`** + **`admin`** share nav

**Confirmed absent** as dedicated routes (manager mapping claims): **`/ops/customers`**, **`/ops/drivers`**, **`/ops/rating`**, **`/ops/bookings`**, **`/ops/routes`**, **`/ops/profile`**.

---

## Deviation notes (AC12)

| Topic | Expectation | Repo reality | Handling |
| ----- | ------------ | ------------- | -------- |
| **`Menu.tsx` roles** | Story cites `admin` \| `manager` per item | Vendored **`Menu.tsx`** is mostly **`admin`**-only; **`/schedules`** allows **`admin`**, **`manager`** | Documented literally from file |
| **Manager vs dispatcher** | Capstone splits manager/admin | Vestroo merges **dispatcher** + **admin** in nav; **admin-only** actions via **`getOpsAdminForAction`** | Subsection above |
| **Bookings** | Single REST list | Fragmented ops surfaces (**search / fulfil / trips**) | Dedicated table row (**AC5**) |
