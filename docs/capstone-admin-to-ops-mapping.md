# Capstone admin → Vestroo ops mapping

**Purpose:** Give product and engineering a single traceability table from the vendored **capstone admin** app (`frontend-admin`) to Vestroo **`/ops/*`** routes, Supabase capabilities, and story/epic IDs—so feature drift, security posture (no reference JWT/Firebase defaults), and backlog priorities stay visible.

**Scope:** **Admin reference only** (`docs/capstone-reference/frontend-admin`). Capstone **manager** and **driver** surfaces are **out of scope** here (see **FE.5.5** / **FE.5.6** in [Epic 5](epic-5.md)).

**Sources (under `docs/capstone-reference/frontend-admin`):**

- Navigation: [`src/app/_components/common/Sidebar.tsx`](capstone-reference/frontend-admin/src/app/_components/common/Sidebar.tsx)
- User management home: [`src/app/page.tsx`](capstone-reference/frontend-admin/src/app/page.tsx)
- Feature pages: [`src/app/(page)/`](capstone-reference/frontend-admin/src/app/%28page%29/) (e.g. `category`, `vehicles`, `profile`, `router`, `money`, `cal`, `trip`, auth)
- Reference storage: [`src/app/utils/firebase/firebase.ts`](capstone-reference/frontend-admin/src/app/utils/firebase/firebase.ts) (Firebase Storage uploads — **not** a Vestroo pattern)

**Related Vestroo runbooks:** [Ops console](ops-console.md) (`requireOpsStaffPage`, staff roles, Supabase client usage).

**Last updated:** 2026-04-07

---

## Status definitions

[^implemented]: **implemented** — Staff-facing UI exists under authenticated **`/ops/*`** (or listed public ops route) **and** a clear server data path (Supabase query, Server Action, or equivalent) supports the workflow.

[^partial]: **partial** — Data model or fragmented UI exists (e.g. read-only fields, traveller/staff booking flows, or shell-only affordances) **without** full parity to the reference admin screen.

[^notstarted]: **not started** — No intentional staffed surface in **`/ops/*`** for this capability (may still exist in schema or non-ops flows).

---

## Primary mapping table

| Reference screen / capstone route | Capstone implementation pointer | Vestroo target | Status | Vestroo-preferred term / naming (NFR.5.4) | Supabase / platform (high level) | Story / epic traceability |
| --------------------------------- | -------------------------------- | -------------- | ------ | ------------------------------------------- | ----------------------------------- | ------------------------- |
| `/` — user management (admin home) | [`src/app/page.tsx`](capstone-reference/frontend-admin/src/app/page.tsx) | No dedicated route (`/ops/users` **does not exist**); staff identities via Supabase Auth + `profiles` only elsewhere | not started [^notstarted] | **Staff / chauffeur profiles** and roles — not “admin user grid” demo IA; corporate shuttle ops vocabulary per [Epic 4](epic-4.md) | `auth.users` (Supabase Auth); `profiles` with role; RLS restricts reads/writes to permitted roles — **no** staffed CRUD surface for all users | **VST-7**; **FE.5.11**; [Epic 6](epic-6.md) **BE.6.5**, **BE.6.7**; Epic 5 stories **5.1–5.4** |
| `/category` — vehicle categories list | [`src/app/(page)/category/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/category/page.tsx) | No `/ops/category`; category labels surfaced read-only on **`/ops/vehicles`** | partial [^partial] | **Vehicle category** (fleet class), not generic “category” without fleet context | `vehicle_categories`; staff read via ops fleet views; **no** dedicated category authoring UI | **VST-5**; **FE.5.11**; **BE.6.7**; [data models](data-models.md); **5.2–5.3** (patterns) |
| `/category/[id]` — category detail/edit | [`src/app/(page)/category/[id]/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/category/[id]/page.tsx) | Same as list — **no** dedicated ops detail route | partial [^partial] | Same as row above | Same as row above | Same as row above |
| `/vehicles` — fleet list | [`src/app/(page)/vehicles/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/vehicles/page.tsx) | **`/ops/vehicles`** | implemented [^implemented] | **Vehicles** / **fleet**; categories as display metadata | `vehicles`, `vehicle_categories`, `vehicle_pricings` (read for labels/utilisation copy), `trips` (utilisation); RLS: staff roles via existing ops policies | **VST-7**; **FE.5.11**; **BE.6.7**; **5.1**, **5.3** |
| `/vehicles/[id]` — vehicle detail | [`src/app/(page)/vehicles/[id]/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/vehicles/[id]/page.tsx) | **No** `/ops/vehicles/[id]` in App Router (list-only ops surface) | partial [^partial] | **Vehicle record** / fleet detail — defer dedicated detail until IA needs it | Same tables as list row; mutations if any remain server-side only | **FE.5.11**; **BE.6.7**; **5.3** |
| `/profile` — staff profile | [`src/app/(page)/profile/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/profile/page.tsx) | No `/ops/profile`; **OpsTopBar** shows **email** + **role** in shell chrome | partial [^partial] | **Staff session** display — not a standalone profile settings page | `profiles` joined to session; no dedicated profile editor route | **VST-7**; **5.1** (shell) |
| `/router` — corridors, zones, service points (reference: Leaflet route/area editing) | [`src/app/(page)/router/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/router/page.tsx) | No `/ops/router`; map/geo authoring **not** in [`ops-nav-config.ts`](../src/features/ops/ops-nav-config.ts) | not started [^notstarted] | **Corridors**, **zones**, **approved pickup/drop-off** / **service points** — corporate shuttle geometry, **not** fixed public-transit “lines” IA ([NFR.5.4](epic-5.md#related-non-functional-requirements)) | Geo/pricing-related tables per [data models](data-models.md) / future migrations; **Storage** N/A here; RLS TBD when UI exists | [Epic 4](epic-4.md) vocabulary; **FE.5.11**; **BE.6.7**; [Epic 9](epic-9.md) for deferred transit-demo modules |
| `/money` — cash flow / pricing config | [`src/app/(page)/money/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/money/page.tsx) | No `/ops/money`; pricing rows visible in fleet context only | partial [^partial] | **Pricing configuration** for shuttle services — align with booking/quote domain | `vehicle_pricings` (and related pricing entities per schema); no dedicated money dashboard; RLS staff-only where exposed | **VST-6**, **VST-13**; **CORE.6.4** / **BE.6.7** ([Epic 6](epic-6.md)); **5.4** (this mapping) |
| `/cal` — price calculator | [`src/app/(page)/cal/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/cal/page.tsx) | No `/ops/cal`; quote path via booking **`calculateQuote`** Server Action (`src/actions/calculateQuote.ts`) | partial [^partial] | **Quote / price estimate** (traveller or staff-assisted booking), not a standalone admin calculator | Server Action + quote engine + Maps distance inputs; **not** an ops-staff calculator page | **VST-6**; **5.4** |
| `/trip` — trip management | [`src/app/(page)/trip/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/trip/page.tsx) | **`/ops/trips`**, plus **`/ops/board`**, **`/ops/calendar`**, **`/ops/fulfil`** (trip assignment) | implemented [^implemented] | **Trips** and **bookings** lifecycle — corporate shuttle operations | `trips`, `bookings`, `booking_trips`, `vehicles`, `profiles` as used by those pages; RLS for staff roles | **VST-7**; **BE.6.7**; **5.3** |
| Media — vehicle images (Firebase in reference) | [`src/app/utils/firebase/firebase.ts`](capstone-reference/frontend-admin/src/app/utils/firebase/firebase.ts) (e.g. `uploadImage` → `vehicles/…` in Firebase Storage) | **Intended:** Supabase Storage buckets for fleet media; **ops UX gap:** no staffed upload flow aligned to reference | not started [^notstarted] | **Fleet imagery** in Supabase Storage — **do not** port Firebase client SDK for Vestroo ops | Supabase Storage (bucket design TBD); vehicle rows may omit rich media in UI; RLS bucket policies when implemented | **NFR.5.3**; **FE.5.4**; **FE.5.11**; **BE.6.7** |
| `/login`, `/forgot-password` — auth & recovery | [`src/app/(page)/login/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/login/page.tsx), [`src/app/(page)/forgot-password/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/forgot-password/page.tsx) | **`/ops/login`**, **`/ops/unauthorized`** (`src/app/(public-ops)/`); **password recovery** via Supabase Auth (no separate **`/ops/forgot-password`** route required for parity of expectations); gated routes use **`requireOpsStaffPage`** | implemented [^implemented] | **Supabase Auth** session (http-only cookie model via SSR client) — **no JWT in `localStorage`** for staff console (**NFR.5.3**) | Supabase Auth; server-first gate in `@/lib/ops-auth`; recovery via Supabase/password flows — not reference token storage | **VST-7**; **BE.6.5**; [Capstone stack integration](capstone-reference-stack-integration.md) (**FE.5.9**); **5.1**; [ops-console.md](ops-console.md) |
| `/busstop` (reference Sidebar) | [`src/app/(page)/busstop/page.tsx`](capstone-reference/frontend-admin/src/app/%28page%29/busstop/page.tsx) | **Deferred / N/A** for default Vestroo ops — no staffed bus-stop network IA | not started [^notstarted] | **Epic 9** posture: capstone **Bus\*** demo modules are **not** Vestroo’s default product; any future **corporate shuttle** stop model needs explicit **SH.9.1**-style gate | N/A for default shuttle MVP; if ever built, map to **service points** / client runs — not public transit stops | [Epic 9](epic-9.md); **FE.5.10** |

---

## Integration posture

The capstone **frontend-admin** app assumes **NestJS REST**, **axios**, **JWTs in browser storage**, and **Firebase** for uploads — all **reference-only** for Vestroo (**NFR.5.3**). Vestroo **`/ops/*`** uses **Supabase**, **`requireOpsStaffPage`**, **Server Actions**, and (when built) **Supabase Storage** instead. **Headline contrasts, file pointers, UI dependency intent, and explicit anti-patterns** are maintained in the canonical appendix **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**). **Nest module-by-module** traceability belongs in **[Epic 6](epic-6.md)** (**BE.6.1** / **FE.5.10**), not in this mapping table.

---

## Backlog / prioritisation

The table above marks several areas as **partial** or **not started**. For roadmap ordering, treat these as the highest-signal gaps versus capstone admin parity:

1. **Pricing** — `vehicle_pricings` / money-style config without a dedicated **`/ops/money`** (or equivalent) staffed experience.
2. **Vehicle categories** — Read-only context on **`/ops/vehicles`** without list/detail CRUD like reference **`/category`**.
3. **Map / geo authoring** — Reference **`/router`** (corridors, zones, service points) has **no** ops counterpart; depends on product rules for corporate shuttle geometry vs [Epic 9](epic-9.md) deferred transit modules.
4. **Calculator-class tools** — **`calculateQuote`** exists for the booking pipeline, but there is **no** standalone ops calculator (**`/cal`** parity).

---

## Verification

Cross-checked **April 2026** against the App Router tree: authenticated ops routes present under **`src/app/(ops)/ops/`** — **`/ops`** (layout + redirect to **`/ops/board`**), **`/ops/board`**, **`/ops/calendar`**, **`/ops/fulfil`**, **`/ops/trips`**, **`/ops/search`**, **`/ops/vehicles`**, **`/ops/roster`**, **`/ops/invoicing`**, **`/ops/compliance`**, **`/ops/experiences`**. **Confirmed absent** as dedicated routes: **`/ops/users`**, **`/ops/category`**, **`/ops/profile`**, **`/ops/router`**, **`/ops/money`**, **`/ops/cal`**. Public ops: **`src/app/(public-ops)/`** → **`/ops/login`**, **`/ops/unauthorized`**. Navigation intent: [`src/features/ops/ops-nav-config.ts`](../src/features/ops/ops-nav-config.ts). Quote path: [`src/actions/calculateQuote.ts`](../src/actions/calculateQuote.ts). Ops **Vehicles** page reads **`vehicle_categories`**, **`vehicle_pricings`**, **`vehicles`**, **`trips`**.