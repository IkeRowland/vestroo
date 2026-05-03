# Operations console (VST-7)

Production dispatcher tooling lives under the App Router route group **`src/app/(ops)/`** with URLs prefixed **`/ops/*`**. Reference-only code under **`src/features/capstone-reference/`** is not part of this product surface.

## Shell (dashboard IA — FE.5.1 / Story 5.1)

Authenticated **`/ops/*`** pages (except public **`/ops/login`** and **`/ops/unauthorized`**) use a **dashboard shell** implemented in **`src/app/(ops)/ops/layout.tsx`** with feature UI in **`src/features/ops/components/`**:

- **Layout gate:** The layout still calls **`requireOpsStaffPage()`** before rendering any shell chrome (same redirect contract to **`/ops/login`** / **`/ops/unauthorized`**).
- **Sidebar (`<nav>`):** Domain-grouped links (**Fulfilment**, **Fleet & People**, **Finance & Compliance**, **Configuration** — Story **17.3**). On **desktop**, the sidebar is **collapsible** (expanded labels vs icon rail). On **small viewports**, it is a **drawer** opened from the top bar menu control. Nav config and labels live in **`src/features/ops/ops-nav-config.ts`**.
- **Top bar (`<header>`):** **Breadcrumbs** derived from the current path (with **`usePathname`**), a **staff booking search** affordance (links to **`/ops/search`**), a **notifications** placeholder (“Soon”), **role** / **email** when available from the session, and **`OpsSignOutButton`**.
- **Main (`<main id="ops-main">`):** Page content. A **skip link** targets **`#ops-main`**.
- **Role-based nav:** Items may declare **`visibleRoles`** in the nav config. Today all listed routes are staff-wide; **dispatcher** vs **admin** differences for **DSR export / anonymise** remain **server-gated** on **`/ops/compliance`** via **`getOpsAdminForAction()`** — dispatchers still see **Compliance** in the shell but cannot run admin-only actions (NFR.5.5).

## Design system (FE.5.2 / Story 5.2)

- **ADR:** **[ADR 0001 — Ops / field UI stack](adr/0001-ops-field-ui-stack-tailwind-radix.md)** — Tailwind + Radix + in-repo shadcn-style components; **no Ant Design** for **`/ops/*`** or **authenticated `/field/*`** unless a future ADR revises this.
- **Parity spec:** **[ops-design-system-parity.md](ops-design-system-parity.md)** — expected patterns (tables, forms, feedback, density, widgets, calendars) vs **`docs/capstone-reference/`** *behaviour* only; dependency inventory; **NFR.5.1** / **NFR.5.2** guidance.
- **Tokens:** **`[data-ops-theme="dark"]`** on the authenticated ops layout root in **`src/app/(ops)/ops/layout.tsx`** sets **CSS variables** in **`src/app/globals.css`** (`--ops-sidebar-width` **14rem**, collapsed **4.5rem**, semantic surface/border/text). **`tailwind.config.ts`** maps **`ops-*`** colours, **`w-ops-sidebar`**, and **`text-ops-page-title`** / table typography utilities.
- **Shared primitives** (compose with **`src/components/ui/*`**): **`src/features/ops/components/`** — **`OpsPageHeader`**, **`OpsFilterRow`**, **`OpsTableShell`**, **`OpsActionGroup`**, re-exported from **`ops-primitives.ts`**. **`/ops/vehicles`** was the first FE.5.2 layout consumer; additional routes use the same barrel where noted below.
- **FE.5.3 / Story 5.3 — data regions & confirms:** **`OpsEmptyState`**, **`OpsErrorState`**, **`OpsLoadingRegion`** (also from **`ops-primitives.ts`**); stable empty/retry copy in **`src/features/ops/ops-list-state-copy.ts`**. **Destructive / high-impact confirms:** **`src/components/ui/alert-dialog.tsx`** (Radix **AlertDialog**). Refactored exemplar routes: **`/ops/fulfil`**, **`/ops/compliance`**, **`/ops/trips`** (plus **`/ops/vehicles`** error path uses **`OpsErrorState`**). Details: **[ops-design-system-parity.md](ops-design-system-parity.md)** § FE.5.3.

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
| `/ops/bookings` | **Epic 12** unified **bookings** list; **Epic 14 (14.8 / Q18):** **“Ready to assign”** filter chip — **`bookings.status = 'ready_to_assign'`** (live count next to the label) — same predicate as [`/ops/fulfil?queue=paid`](fulfil-queue-buckets.md#paid-assignment-queue) (see that doc for the full `paid` bucket). **Walk-in** booking **detail** (`client_type = 'walk_in'`) includes **“Send quote”** so staff can run **`sendWalkInQuote`** and email the customer `/q/...` links (**14.6** / **14.8**). |

**Trip ratings / feedback:** There is **no** **`/ops/rating`** or **`/ops/ratings`** route in this inventory, and **`OPS_NAV_GROUPS`** in **`src/features/ops/ops-nav-config.ts`** includes **no** ratings item (**grep** 2026-04-11). **`public.ratings`** exists in Postgres with RLS, but **staff grids** or analytics parity with capstone **manager** rating views remain **product / Epic 6** backlog **TBD** — **[capstone-backend-module-matrix.md — RT.7.6](capstone-backend-module-matrix.md#rt-7-6)** (**[Story 7.6](stories/7.6.story.md)**).

## FE.5.11 — route & capability gaps (Story 5.11)

**Authoritative status table:** **[`docs/capstone-backend-module-matrix.md`](capstone-backend-module-matrix.md)** § **FE.5.11 / BE.6.7 — staff ops data owners** — six capability rows with **status**, **routes**, **Supabase / actions**, **owner**, and **capstone** cross-links. This subsection is a **narrative gap list** only (**AC2**).

| Epic FE.5.11 area | Current `/ops/*` coverage | Known gaps |
| ----------------- | ------------------------- | ---------- |
| **Staff users & roles** | Shell shows **email** + **role**; **Compliance** admin actions | No **`/ops/users`** — staff invite, role assignment, deactivate **via Supabase Dashboard / manual** until a dedicated story (**BE.6.5** / **BE.6.7**). |
| **Corporate clients** | Bookings discoverable via **`/ops/search`** | No **`/ops/clients`** — B2B **account** CRUD deferred (**Epic 6** schema + UI). |
| **Vehicles & categories** | **`/ops/vehicles`** list + catalogue context | **Category** authoring UI absent; **no** **`/ops/vehicles/[id]`**; **Supabase Storage** fleet **media** upload not staffed (**FE.5.4**). |
| **Service routes & service areas** | Quote/distance via booking pipeline | No **map / corridor / zone** authoring — **corporate shuttle** geo config deferred (**not** capstone public-line IA; **Epic 9** only if **SH.9.1**). |
| **Bookings** | **Search**, **fulfil**, **trips**, **board**, **calendar** | Staff **create** / **edit** / **cancel** booking as first-class **`/ops/*`** flows (vs traveller **CORE.6.4** actions in **[core-traveller-flow-parity.md](core-traveller-flow-parity.md)**), deeper **filters**, dedicated **booking detail** route — backlog vs **Epic 1** / **VST-6**; matrix row **5** + **Story 6.7** (**BE.6.7**). |
| **Trip feedback / ratings** | **None** — no staffed ratings route | **`public.ratings`** + RLS exist; **no** **`/ops/rating`** surface, **no** nav entry — manager-style grids / exports **TBD** (**product** / **Epic 6**); **Realtime** on **`ratings`** **not** claimed — **[RT.7.6](capstone-backend-module-matrix.md#rt-7-6)**. |
| **Related workflows** | Sidebar **Fulfilment**, **Fleet & People**, **Finance & Compliance**, **Configuration** | **Nav audit (FE.5.11):** All listed **VST** surfaces in the matrix row have **sidebar** or **top-bar search** entry; **dispatcher** vs **admin** (**Compliance** DSR) remains **server-gated** per **Roles and auth** above. |

**Navigation config:** **`src/features/ops/ops-nav-config.ts`** — **`OPS_NAV_GROUPS`** aligned with this IA; **Story 17.3** refreshed **group titles** and optional **badges** / **promo slot** (see **`docs/ops-design-system-parity.md`** § **17.3**).

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

## FE.5.7 / Story 5.7 — Tablet & narrow-viewport verification (manual)

**Scope:** Authenticated **`/ops/*`** only. **Tailwind:** default = **&lt; 768px** (phone); **`md:`** = **768px**; **`lg:`** = **1024px** — see **`tailwind.config.ts`**. **Pass** means you do **not** need **document-level** horizontal scroll to reach **primary** shell controls (drawer/menu, breadcrumbs, staff search, sign out) or **primary** page actions (page headers, main form submit, **`OpsActionGroup`** primaries). **Inner** horizontal scroll inside **`overflow-x-auto`** regions (board columns, calendar days, **`OpsTableShell`**) is expected and **not** a failure.

| Width (CSS px) | Role | Check |
| ---------------- | ---- | ----- |
| **390** | Phone | Open drawer (**menu**), reach **Search** (icon or compact link), **Sign out**; open **Trip** cancel **`AlertDialog`** and **Compliance** anonymise **`AlertDialog`** — footer actions visible, dialog scrolls if copy is long. |
| **768** | Tablet (`md`) | Sidebar **expanded** or **collapsed** rail; top bar fits without off-screen primaries; **`#ops-main`** scrolls vertically only at shell level. |
| **820** | Common tablet | Same as 768; spot-check **`/ops/board`** and **`/ops/calendar`** — pan columns **inside** the board/calendar strip only. |
| **1024** | Small laptop (`lg`) | Breadcrumbs + search + account cluster reachable; tables use horizontal scroll **inside** **`OpsTableShell`** only. |

**Layout anchors:** **`OpsShellClient`**, **`OpsSidebar`** (`#ops-sidebar-nav` scrolls), **`OpsTopBar`**, **`#ops-main`**.

**Radix `AlertDialog`:** **`TripOpsForms`** (trip cancel confirm), **`ComplianceDsrPanel`** (anonymise confirm) — **`src/components/ui/alert-dialog.tsx`** uses viewport-safe **`max-h`** + **`overflow-y-auto`**; re-check after copy changes.

**Sheet / Dialog on `/ops/*`:** None at Story **5.7** implementation time (only **`AlertDialog`** above). If a Sheet/Dialog is added later, apply the same pass/fail rule at **390** and **768**.

**Page-specific exceptions:** **`/ops/board`** and **`/ops/calendar`** — horizontal scroll is **deliberate** within the labeled **`role="region"`** column strip; shell chrome must stay fixed-width safe.

## Accessibility baseline (FE.5.8 / Story 5.8)

**Story:** [`docs/stories/5.8.story.md`](stories/5.8.story.md)

**Landmarks:** One **`header`** (**`OpsTopBar`**), primary **`nav`** (**`OpsSidebar`**, `aria-label="Operations sections"`), breadcrumb **`nav`** (`aria-label="Breadcrumb"`), and **`main id="ops-main"`** (**`OpsShellClient`**) with **`tabIndex={-1}`** for skip-link focus.

**Skip link:** First focusable control in **`src/app/(ops)/ops/layout.tsx`** — **Skip to main content** → **`#ops-main`** (visually hidden until focused).

**Focus:** Shell controls use **`focus-visible:outline-none`** + **`ring-2 ring-ops`** with **`ring-offset-ops-canvas`** (not browser default alone on dark chrome).

**Keyboard — mobile drawer:** When the sidebar is open below **`md`**, focus is **trapped** inside **`#ops-sidebar-panel`**, **Escape** closes the drawer and restores focus to the control that opened it; the dim overlay is **non-focusable** (pointer close only).

**Contrast (WCAG 2.x AA intent):** Token source **`[data-ops-theme='dark']`** in **`src/app/globals.css`**.

| Token / use | Variable / class | Notes |
|-------------|------------------|--------|
| Primary text | `--ops-foreground` / `text-ops-foreground` | ~98% on ~4% canvas — primary body copy |
| Muted / secondary | `--ops-muted` / `text-ops-muted` | Tuned to **~72%** lightness on **`ops-surface`** for normal text (~4.5:1 target) |
| Borders | `--ops-border` / `border-ops-border` | **~22%** lightness for non-text UI boundaries vs canvas/surface |
| Focus ring | `--ops-ring` / `ring-ops` | **Hue ~213°, high lightness** for visible focus on dark surfaces |
| Primary buttons | Route-specific (e.g. emerald on ops pages) | Spot-check per page when adding new primaries |

**Known exceptions (documented):** Breadcrumb **`/`** separators use **`text-ops-muted/60`** — decorative, **`aria-hidden`**; not relied on for meaning. Notifications stub (**`role="status"`**) is non-interactive placeholder copy — **“Soon”** / **`aria-label="Notifications coming soon"`**; replace with real control when shipping.

**Automated checks (Option B):** **`eslint-plugin-jsx-a11y`** recommended rules applied as **`warn`** to **`src/app/(ops)`**, **`src/features/ops`** (plugin already loaded via **`eslint-config-next`**). Run **`pnpm lint`**.

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
- [capstone-backend-module-matrix.md](capstone-backend-module-matrix.md) — **FE.5.11 / BE.6.7** staff ops capability checklist + **FE.5.10** Nest module matrix; roster / calendar / dispatch ↔ **`chauffeur_schedules`** traceability — **[RT.7.5](capstone-backend-module-matrix.md#rt-7-5)** (**Story 7.5**).
