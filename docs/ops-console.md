# Operations console (VST-7)

Production dispatcher tooling lives under the App Router route group **`src/app/(ops)/`** with URLs prefixed **`/ops/*`**. Reference-only code under **`src/features/capstone-reference/`** is not part of this product surface.

## Shell (dashboard IA — FE.5.1 / Story 5.1)

Authenticated **`/ops/*`** pages (except public **`/ops/login`** and **`/ops/unauthorized`**) use a **dashboard shell** implemented in **`src/app/(ops)/ops/layout.tsx`** with feature UI in **`src/features/ops/components/`**:

- **Layout gate:** The layout still calls **`requireOpsStaffPage()`** before rendering any shell chrome (same redirect contract to **`/ops/login`** / **`/ops/unauthorized`**).
- **Sidebar (`<nav>`):** Domain-grouped links (fulfilment, fleet, people, finance & compliance, engagements). On **desktop**, the sidebar is **collapsible** (expanded labels vs icon rail). On **small viewports**, it is a **drawer** opened from the top bar menu control. Nav config and labels live in **`src/features/ops/ops-nav-config.ts`**.
- **Top bar (`<header>`):** **Breadcrumbs** derived from the current path (with **`usePathname`**), a **staff booking search** affordance (links to **`/ops/search`**), a **notifications** placeholder (“Soon”), **role** / **email** when available from the session, and **`OpsSignOutButton`**.
- **Main (`<main id="ops-main">`):** Page content. A **skip link** targets **`#ops-main`**.
- **Role-based nav:** Items may declare **`visibleRoles`** in the nav config. Today all listed routes are staff-wide; **dispatcher** vs **admin** differences for **DSR export / anonymise** remain **server-gated** on **`/ops/compliance`** via **`getOpsAdminForAction()`** — dispatchers still see **Compliance** in the shell but cannot run admin-only actions (NFR.5.5).

## Routes

| Path | Purpose |
|------|---------|
| `/ops` | Redirects to `/ops/board`. |
| `/ops/login` | Supabase Auth email/password for staff (public within ops shell). |
| `/ops/unauthorized` | Shown when authenticated but `profiles.role` is not dispatcher/admin. |
| `/ops/board` | Kanban-style columns by **`trips.status`**. |
| `/ops/calendar` | Day columns keyed from **`trips.time_start_estimate`** (UTC date). |
| `/ops/fulfil` | Paid bookings without **`booking_trips`**; form assigns run + chauffeur + vehicle. |
| `/ops/trips` | Trip detail, status transitions, delay capture, vehicle swap. |
| `/ops/vehicles` | Fleet list + active trip counts + overlap sanity notes. |
| `/ops/roster` | **`profiles`** (`role = chauffeur`) + upcoming **`chauffeur_schedules`**. |
| `/ops/close-protection` | List/filter close protection **engagements**; create from **`bookingId`** query; link to **[close-protection-engagements.md](close-protection-engagements.md)**. |
| `/ops/close-protection/[id]` | Edit **`status`**, **`coordination_notes`**, optional **`trip_id`** (must match **`booking_trips`**). |
| `/ops/compliance` | **VST-12:** recent **`compliance_incidents`**, compliance documents nearing expiry (default **30**-day horizon, includes overdue), **admin-only** DSR export / anonymise panel (`exportDataSubjectAction`, `anonymiseDataSubjectAction`). |
| `/ops/invoicing` | **VST-13:** staff form to set **`invoice_requested`**, **`purchase_order_ref`**, **`billing_entity_ref`** on a booking (`updateBookingInvoicingHooksAction`); MVP — no PDF. |

## Roles and auth

- **Allowed:** `profiles.role` ∈ **`dispatcher`**, **`admin`** (matches **`public.is_staff(uid)`**).
- **Layout gate:** `src/app/(ops)/ops/layout.tsx` calls **`requireOpsStaffPage()`** for all `/ops/*` except **`/ops/login`** and **`/ops/unauthorized`**. **`middleware.ts`** continues to set **`x-pathname`** for **`/ops`** and **`/field`** where consumers rely on it.
- **Server Actions:** `src/actions/opsDispatch.ts` and **`src/actions/opsCompliance.ts`** use **`getOpsStaffForAction()`** for dispatcher/admin — returns **`Forbidden`** / **`Not authenticated`** instead of redirecting. **DSR** actions use **`getOpsAdminForAction()`** (**`admin`** only).
- **Marketing (`(marketing)`) and booking (`(app)`):** No ops Server Actions or dispatcher chrome are imported there; mutations stay in **`opsDispatch`**, **`opsCloseProtection`**, and ops pages only.
- **Chauffeurs:** Use the separate field app **`/field/*`** (**`src/app/(field)/`**, **`src/lib/field-auth.ts`**, **`src/actions/fieldChauffeur.ts`**) — see **[field-tools.md](field-tools.md)**.

## Supabase client strategy (JWT vs service role)

| Path | Client | RLS |
|------|--------|-----|
| Ops Server Components + `opsDispatch` mutations | **`createUserServerClient()`** (anon key + user session cookies) | Enforced; staff policies (`is_staff`) allow cross-customer reads/writes on fleet, bookings, trips, assignments, audit insert. |
| PayFast webhook, booking confirmation API, customer booking Server Actions | **`createServerClient()`** service role | Bypasses RLS by design — **server-only**, never exposed to the browser. |

The ops console intentionally uses the **staff JWT** path so **`auth.uid()`** matches the dispatcher for **`ops_audit_log`** insert policy (`actor_id = auth.uid()`). If a future read is blocked by RLS while still legitimate, document a **narrow service-role read** here and keep it server-only.

## Calendar vs board (AC8)

**Both** views are implemented in this slice:

- **Board:** `/ops/board` — columns `booking`, `assigned`, `en_route`, `completed`, `cancelled` (unknown statuses fall back to **booking**).
- **Calendar:** `/ops/calendar` — trips grouped by **`toISOString().slice(0, 10)`** on **`time_start_estimate`**.

No deferral for these two; richer agendas (week grid, run-centric timelines) can follow a future story.

## Live board (VST-9)

- **`/ops/board`** mounts **`OpsBoardRealtimeBridge`**: Supabase **`postgres_changes`** on **`trips`** and **`vehicle_trackings`** using the **staff JWT** browser client (`createClientClient`), with a **2 s** debounce before **`router.refresh()`**.
- **ETA strip:** loads recent active **`vehicle_trackings`** rows and shows **`estimated_arrival`** (staff-tier precision).
- **Polling fallback:** if Realtime is disabled or blocked, use a periodic **`router.refresh()`** (e.g. **30 s** interval) from a small client effect — trade-off: higher load and slower freshness; document the interval in the release ticket when used.

## Vehicle utilisation and double-booking

- **Fleet labels:** `vehicles` + `vehicle_categories` (+ optional `vehicle_pricings` count on the vehicles page as catalogue context).
- **In-use signal:** trips where **`status`** is not **`cancelled`** or **`completed`**, counted per **`vehicle_id`**.
- **Overlap rule:** two intervals \([a_\text{start}, a_\text{end})\) and \([b_\text{start}, b_\text{end})\) conflict iff \(a_\text{start} < b_\text{end}\) and \(a_\text{end} > b_\text{start}\) (implemented in **`src/lib/ops-time-windows.ts`**). Assign and swap actions use the same helper as the UI copy on **`/ops/vehicles`**.
- **`chauffeur_assignments` / `chauffeur_schedules`:** assignments are created on dispatch aligned to the selected **`service_runs`** window; schedules are **found or created** per chauffeur + vehicle + **`service_runs.service_date`**.

## Audit

- **Table:** **`public.ops_audit_log`** (see **`docs/data-models.md`**).
- **Actions logged:** assign booking to run, trip status change, delay, vehicle swap, close protection engagement create/update (VST-11), compliance incident / document creates (VST-12), **`dsr_export`** / **`dsr_anonymise`** (admin, VST-12).

## Related

- [data-models.md](data-models.md) — ops tables and trip status mapping.
- [front-end-api-interaction.md](front-end-api-interaction.md) — Server Actions table.
- [local-development.md](local-development.md) — dispatcher smoke steps.
- [staging-and-promotion.md](staging-and-promotion.md) — staging verification.
- [realtime-and-notifications.md](realtime-and-notifications.md) — Realtime channels, RLS verification, rate limits.
- [compliance-and-safety.md](compliance-and-safety.md) — incidents, documents, retention, DSR boundaries.
