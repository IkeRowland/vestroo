# Epic 17: Ops Console Visual Redesign — SaaS-grade UX/UI for `/ops/*` (Wheelzie-inspired)

## Description

This epic delivers a **comprehensive visual and interaction-density redesign** of the Vestroo operations console (`/ops/*`) to bring it to a modern SaaS-grade standard, taking direct inspiration from the **Wheelzie** car-rental admin reference (see [`design/visual-redesign-references.md`](design/visual-redesign-references.md)). It does **not** change product scope, domain vocabulary, auth, data ownership, or routes that are already governed by [Epic 5](epic-5.md), [Epic 6](epic-6.md), or domain epics 11–16. It **does** materially upgrade the chrome, layout grid, cards, tables, charts, calendar, detail panels, empty states, and motion language so the console *feels* like a coherent operations product.

**Product framing (locked, unchanged):** Vestroo is a **corporate shuttle / chauffeur / VIP / tours** business — **B2B**, **contracted** transport. Wheelzie is a **car-rental** SaaS reference. This epic borrows **interaction patterns** (KPI cards with sparklines + delta, split list/detail views, calendar week view with right detail rail, donut + bar charts, card grids for fleet, segmented detail tabs, pagination affordance, tappable status pills) **not** product naming or domain mapping. Capstone-reference language remains forbidden in user-visible copy (NFR.5.4).

**Stack constraint (locked, unchanged):** Tailwind CSS + Radix primitives + shadcn-style components in repo. **No Ant Design** introduced (ADR 0001). New charting and calendar dependencies require explicit story-level bundle justification (NFR.5.2) — see [`FE.17.7`](#fe177-charts--sparklines) and [`FE.17.9`](#fe179-calendar-week--month-view).

**Supersedes / amends:** This epic **layers on top of** [`FE.5.1`](epic-5.md) (shell IA), [`FE.5.2`](epic-5.md) (token system + parity spec), and [`FE.5.3`](epic-5.md) (CRUD patterns). It does **not** rip out the existing `OpsShellClient`, `OpsSidebar`, `OpsTopBar`, `OpsPageHeader`, `OpsTableShell`, `OpsLoadingRegion`, `OpsEmptyState`, `OpsErrorState` primitives — it **upgrades** them and adds new primitives (`OpsKpiCard`, `OpsSparkline`, `OpsDonut`, `OpsBarChart`, `OpsSplitView`, `OpsDetailRail`, `OpsCalendarWeek`, `OpsStatusPill`, `OpsAvatarCell`, `OpsPagination`, `OpsCardGrid`).

**Living artifacts referenced:**

* [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) — design tokens, type scale, color, spacing, motion (**§1.1a** — Wheelzie surface/selection targets vs `vest.rust`).
* [`design/visual-redesign-references.md`](design/visual-redesign-references.md) — Wheelzie image → Vestroo `/ops/*` route mapping (**gap analysis** — why stories 17.1–17.10 can satisfy ACs but still diverge from PNGs).
* [`design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md) — canonical PNG filenames (`01`–`10`) for side-by-side QA.
* [`ops-design-system-parity.md`](ops-design-system-parity.md) — extended in this epic with §17 sub-sections.

### Visual parity standard (Wheelzie reference)

Implementation is **aligned** with this epic when:

1. **Layout bands** match the corresponding screenshot in [`design/wheelzie-reference/`](design/wheelzie-reference/README.md) for that route (e.g. **Dashboard** = KPI row + chart regions + table/widgets as in **`10-dashboard.png`**; **Bookings** = KPI row + overview chart + filter row + table as in **`06-bookings.png`**), allowing **Vestroo** content and **`vest.rust`** instead of Wheelzie coral.
2. **Selection chrome** uses a **cool / sky tinted** active background for sidebar items (**not** green/mint `hue ~142`), per [`visual-redesign-tokens.md`](design/visual-redesign-tokens.md) §1.1a — icons may use **`--ops-accent`** for the Wheelzie “red icon on blue pill” effect.
3. **Primitives** (KPI cards, sparklines, pills, pagination, charts) follow **density, radius, and shadow** from the tokens doc.

Stories **17.1–17.10** established foundations; **full** parity with **`06` / `10`** may require follow-up composition stories (see [`visual-redesign-references.md`](design/visual-redesign-references.md) — Gap analysis).

## Goals

1. Replace utilitarian flat tiles on `/ops` (dashboard) with **scorecard cards** that include label, large value, **delta vs prior period**, and **inline sparkline** — matching Wheelzie image 10's "Total Revenue / New Bookings / Rented Cars / Available Cars" pattern, expressed in Vestroo terms (Trips Today, Open Quote Requests, Fleet On-Trip, Drivers On Duty, Revenue this Week, etc.).
2. Introduce **chart primitives** (line/area, bar, donut) as lazy-loaded RSC-friendly components so dashboards and analytics surfaces have visual rhythm without bundle bloat.
3. Establish a **split list / detail** layout pattern (left list/table, right detail rail) for `/ops/clients`, `/ops/vehicles`, `/ops/trips`, `/ops/bookings` — matching Wheelzie images 1 (Drivers), 4 (Tracking), and 8 (Unit Details).
4. Introduce a **week-grid calendar** with right-side schedule-detail rail for `/ops/calendar` and `/ops/roster` — matching Wheelzie image 5.
5. Provide a **fleet card grid** alternative view at `/ops/vehicles` (parallel to the existing list view) — matching Wheelzie images 7 & 9.
6. Refresh the **table style** across all `/ops/*` lists: avatar+name pairs, status pills, secondary-action ghost buttons, sticky header on scroll, optional row-click → detail rail — matching Wheelzie image 1, 3, 6.
7. Refresh the **top bar** with global search input (not just a link button to `/ops/search`), notification bell with unread badge, settings icon, and a profile chip — matching Wheelzie image 1's top right.
8. Refresh the **sidebar** with grouped sections, count badges next to nav items where relevant (e.g. "Messages • 5"), and an optional **promo card** at the bottom (replaceable by an empty-state hint or hidden via flag) — matching Wheelzie images 1, 4, 5, 6.
9. Establish a consistent **motion language**: 200ms transitions, subtle `framer-motion` reveal for cards on mount, list/detail rail slide-in (already a dep — no new package).
10. Hold the line on **accessibility** (FE.5.8) and **performance** (NFR.5.2) — every new primitive ships with a11y notes, lazy-load guidance, and a Storybook-style usage example in the parity spec.

## User Stories / Requirements

### FE.17.1: Visual token expansion for ops light theme

The system MUST extend `[data-ops-theme="light"]` and `[data-ops-theme="dark"]` token sets in `src/app/globals.css` and `tailwind.config.ts` to add the following semantic tokens, keeping HSL-without-`hsl()` shadcn convention:

* `--ops-accent` and `--ops-accent-foreground` — primary CTA color. Default to `vest.rust` (#C04C33) for **Vestroo brand parity**, **not** Wheelzie coral.
* `--ops-nav-active` *(recommended)* — **soft blue** background for the **active sidebar row** (Wheelzie selection). **Distinct from** `--ops-surface-active` if the latter must stay for non-nav rows. If omitted, document equivalent (`bg-ops-info/10` **or** new HSL in §1.1a) in `visual-redesign-tokens.md` before shipping **17.21**.
* `--ops-accent-soft` — `accent / 8%` tint for hover states and **table** selected-row backgrounds (not the primary nav treatment).
* `--ops-success`, `--ops-success-foreground` (status pill: On Trip, Completed, Paid).
* `--ops-warning`, `--ops-warning-foreground` (status pill: Pending, Awaiting payment).
* `--ops-danger`, `--ops-danger-foreground` (status pill: Cancelled, Overdue, Sick Leave equivalent — e.g. Off Roster).
* `--ops-info`, `--ops-info-foreground` (status pill: On Duty, Scheduled).
* `--ops-elevation-1`, `--ops-elevation-2` — soft layered shadows for cards (`0 1px 2px rgba(15,23,42,0.04)` and `0 4px 12px rgba(15,23,42,0.06)` ranges; tune in implementation per [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)).
* `--ops-radius-card` (12px) and `--ops-radius-pill` (9999px) — distinct from default `--radius` to keep marketing surfaces unchanged.
* `--ops-chart-1` through `--ops-chart-6` — categorical chart palette derived from the brand (rust, charcoal, slate-500, slate-300, success, warning) so charts read clearly in both themes.

The system MUST register matching Tailwind utility names (`bg-ops-accent`, `text-ops-success`, `rounded-ops-card`, `shadow-ops-1`, etc.) so consumers compose without arbitrary values. The `:root` (marketing/booking) tokens MUST remain unchanged.

**Acceptance:**
* A snapshot test in `src/features/ops/ops-layout-tokens.test.ts` is extended to assert presence of new token names.
* Storybook-style usage example added to [`ops-design-system-parity.md`](ops-design-system-parity.md) § 17.1.

---

### FE.17.2: Top bar refresh — global search input, notifications, settings, profile chip

The system MUST replace the current top-bar "search button that links to `/ops/search`" with an **inline search input** that:

* Shows placeholder copy "Search bookings, clients, vehicles…" (Vestroo terms).
* On focus opens a Radix `Popover` with recent searches and quick-jump suggestions (booking ref, client name, vehicle reg) — backed by **server action** (no client-side index of PII).
* On `Enter` submits to `/ops/search?q=…` (existing route).
* Collapses to an icon-only button on `< sm` breakpoint — sub-`md` opens a sheet.

The top bar MUST also gain:

* A **settings** icon link to `/ops/settings`.
* A refreshed **notifications bell** (`OpsNotificationsBell` exists — re-style with Wheelzie-style red dot badge for unread count, accessible name "X unread notifications").
* A **profile chip** combining avatar (initials fallback if no photo), display name, and role label, opening a Radix `DropdownMenu` (sign-out, profile, settings).

The breadcrumbs row MUST move **below** the top bar onto a secondary thin strip (32px) so the global utilities row stays uncluttered. On mobile the breadcrumb strip MUST collapse to just the current page title with a `<` back chevron when there is a parent crumb.

**Reference:** Wheelzie images 1, 6, 10 — top right cluster.

**Acceptance:**
* `OpsTopBar` snapshot tests updated.
* Keyboard: search focusable via `/` shortcut (consistent with command-bar conventions); profile menu reachable via Tab and operable via arrows.
* No new runtime dep introduced; `DropdownMenu` is added via Radix primitive (`@radix-ui/react-dropdown-menu`) — explicitly approved in [Dependency inventory § 17](ops-design-system-parity.md).

---

### FE.17.3: Sidebar refresh — grouped sections, count badges, optional promo slot

The system MUST refine `OpsSidebar` to:

* Render nav items in **named groups** with a subtle uppercase `text-[11px] tracking-wide text-ops-muted` group label (e.g. "Fulfilment", "Fleet & People", "Finance & Compliance", "Configuration"). Group config lives in `ops-nav-config.ts` and is role-filtered as today.
* Render a **count badge** on items where the consumer provides a `badgeCount` (e.g. Comms unread, Fulfilment new). Badge style: rounded full, `bg-ops-accent text-ops-accent-foreground`, min-w-5, h-5, px-1.5, text-[11px] semibold. Hidden when count is `0` or `null`.
* **Active item (Wheelzie-aligned):** **soft blue / sky pill background** for the whole row (see [`visual-redesign-tokens.md`](design/visual-redesign-tokens.md) §1.1a — **`--ops-nav-active`** or `bg-ops-info/10`–`/12` range), **plus** optional **left rail accent** (`before:bg-ops-accent`) and **`text-ops-accent` on the icon** for the red-on-blue reference look. **Do not** use **green-tint** (`hue ~142`) selection backgrounds for ops nav — that matches the **pre-redesign** mint shell, not Wheelzie. If a single token name is preferred, introduce **`--ops-nav-active`** scoped to sidebar links only.
* Below the nav (above the sign-out row) render an optional **slot** (`<OpsSidebarPromoSlot />`) that defaults to **null** and is surfaced via a feature flag (`ops_sidebar_promo_enabled`) — copy and image are configurable so we never ship a hard-coded marketing card. Wheelzie's "Update Now" panel is the visual reference; Vestroo's variant typically promotes a **release-note link** or a **training video** for ops staff.

**Reference:** Wheelzie images 1, 4, 5, 6 — left column.

**Acceptance:**
* Existing sidebar tests updated; new test asserts group rendering and badge visibility.
* Promo slot defaults to off in production, on in staging behind a feature flag.

---

### FE.17.4: Scorecard cards (`OpsKpiCard`) — value + delta + sparkline

The system MUST introduce a new shared primitive `OpsKpiCard` at `src/features/ops/components/OpsKpiCard.tsx` with the following composition:

* Header row: small icon (lucide), label, optional `…` (Radix DropdownMenu, e.g. "View details").
* Value row: **3xl font-semibold tabular-nums**, with optional unit suffix (e.g. "ZAR", "trips"). Skeleton state when loading.
* Delta row: arrow up/down + percentage + "from last week" / configurable period label. Color: `text-ops-success` (up & good), `text-ops-danger` (down & bad), `text-ops-muted` (neutral). The card consumer specifies polarity (up=good vs up=bad).
* Right column: 56-72px tall **inline sparkline** (`OpsSparkline`, see FE.17.7) showing the same metric trend over the same period.

The card MUST be a `<Link>` when `drillHref` is provided (current `OpsDashboardView` pattern), otherwise a `<div>`.

**Vestroo metrics that adopt this on `/ops` (dashboard):**

| Card label | Source | Drill href | Polarity |
|---|---|---|---|
| Trips Today | `loadOpsDashboardKpis` (existing) | `/ops/trips?date=today` | up=good |
| Open Quote Requests | `loadOpsDashboardKpis` | `/ops/walk-in?stage=new` | up=neutral / banded |
| Fleet On-Trip | `loadOpsDashboardKpis` | `/ops/trips?status=on_trip` | up=good |
| Revenue This Week | new — server action `loadOpsRevenueWeek` | `/ops/reports/revenue` | up=good |
| Drivers On Duty | new — server action `loadOpsDriversOnDuty` | `/ops/roster?today=true` | up=good |
| Awaiting Payment | new — server action `loadOpsAwaitingPayment` | `/ops/invoicing?bucket=awaiting` | up=bad |

New server actions are **read-only**, RLS-respecting, and return correlation IDs on failure (matching `OpsFetchErrorIsland` patterns). They are scope of separate implementation stories under this epic.

**Reference:** Wheelzie images 6 (Bookings: Upcoming/Pending/Cancelled/Completed) and 10 (Dashboard: Total Revenue / New Bookings / Rented Cars / Available Cars).

**Acceptance:**
* `NewBookingsHomeCard` is **kept** as a special-case (it has the "Needs attention" pill) — gets visually aligned to the new card style but retains its bespoke logic.
* Visual diff vs reference reviewed in PR.

---

### FE.17.5: Split list / detail layout (`OpsSplitView` + `OpsDetailRail`)

The system MUST introduce a layout primitive for **list-with-detail** screens. Default split is `min-w-0 flex-1` for the list and a **`360–420px`** right rail for detail (sticky on `xl+`, drawer on `< lg`).

`OpsSplitView` props:
* `list` (ReactNode, required)
* `detail` (ReactNode, required)
* `onCloseDetail` (() => void, optional — drives back-button / Esc behavior on mobile)
* `detailVisible` (boolean — controls drawer state on `< lg`)

`OpsDetailRail` is the inner card chrome for the rail: header with title + close button on mobile, scroll body, optional footer with primary action.

**Routes that adopt this pattern:**

| Route | List | Detail |
|---|---|---|
| `/ops/clients` | clients table (avatar, name, email, phone, points/tier, actions) | client profile (contact card, points, recent bookings, documents) — Wheelzie image 3 cue |
| `/ops/vehicles` (alongside FE.17.6 grid view) | vehicle table | vehicle detail (hero photo, activity chart, features, reminders) — Wheelzie image 8 cue |
| `/ops/trips` | trip list | trip detail (rent info card, vehicle photo, map, comms log) — Wheelzie image 4 cue |
| `/ops/bookings` | booking queue | booking detail (already exists at `/ops/bookings/[id]` — rail variant added for power users) |
| `/ops/roster` | drivers list | driver profile + week calendar — Wheelzie image 1 cue |

The pattern MUST preserve **deep linking**: opening detail must update the URL (`?id=…` or sub-route) so refresh and shared links work.

**Reference:** Wheelzie images 1, 3, 4, 5, 8.

**Acceptance:**
* Tablet width verification per [`ops-console.md`](ops-console.md) checklist (FE.5.7 extension).
* Esc closes drawer on mobile, focus returns to the originating row.

---

### FE.17.6: Fleet card grid view (`OpsCardGrid`) for `/ops/vehicles`

The system MUST add a **grid view toggle** at `/ops/vehicles` (existing list view stays the default for ops density). Toggle state is URL-persistent (`?view=grid|list`). Grid card composition:

* Hero photo (16:9, lazy-loaded `next/image`) — fallback silhouette when no image.
* Class label (e.g. "Sedan", "SUV", "Minibus") + model name + reg number.
* Status pill (`Available`, `On-Trip`, `Maintenance`, `Unavailable`).
* Quick stats row (capacity, transmission, fuel) with lucide icons.
* Primary CTA: "Open" → vehicle detail. Secondary action: "Assign to trip" (opens `AssignBookingPanel` flow if relevant role).

**Reference:** Wheelzie images 7 (3-up grid), 9 (single-row list with image left).

**Acceptance:**
* New primitive `OpsCardGrid` reused in any future `/ops/*` card grid (e.g. experiences).
* Grid does not introduce CLS — fixed aspect-ratio image containers.

---

### FE.17.7: Charts & sparklines (`OpsSparkline`, `OpsBarChart`, `OpsDonutChart`, `OpsAreaChart`)

The system MUST add a small chart primitive set for ops dashboards and reporting surfaces. **Two implementation options**, decided in this epic's first story:

**Option A (preferred):** zero-runtime SVG primitives written in-repo. Pros: no bundle cost, full token control, no SSR shenanigans. Cons: limited interactivity (we accept this for MVP — tooltips deferred to Option B if a story justifies them).

**Option B:** add **Recharts** behind `next/dynamic({ ssr: false })`. Pros: rich tooltips, animations. Cons: ~70KB minified, plus React reconciliation cost. Bundle justification required per NFR.5.2 if adopted.

**Decision (locked default for Epic 17):** **Option A**. A follow-up story may introduce Recharts only behind `/ops/reports/*` heavy analytics surfaces, with bundle budget recorded in the design system doc. Sparklines, donuts, and small bars on `/ops` dashboard are **always** SVG primitives.

`OpsSparkline` (line + filled area) — props: `points: number[]`, `width: number`, `height: number`, `color?: string` (defaults to `--ops-accent`), `ariaLabel: string`. Deterministic path from points; no re-flow on rerender.

`OpsBarChart` — props: `series: { label: string; values: { x: string; up: number; down: number }[] }`, plus optional `legend`. Designed for "Done vs Cancelled" kind of stacked bars in Wheelzie image 6.

`OpsDonutChart` — props: `slices: { label: string; value: number; tone: 'accent'|'success'|'warning'|'danger'|'muted' }[]`, center label slot. Reference: Wheelzie image 10's "Rent Status" donut.

`OpsAreaChart` — props: `points: { x: string; y: number }[]`, ariaLabel. Reference: Wheelzie image 10's "Earnings Summary" line.

All chart primitives MUST:
* Be Server Component–compatible (pure function of props, no `useState` for the rendering path).
* Render an `aria-label` summary equivalent to the data (e.g. "Earnings summary, peaking at R18,450 in April").
* Render an empty state when `points.length === 0` (small text "No data for this period.").
* Use `--ops-chart-1..6` colors via `currentColor` or inline style — **no hard-coded hex** in the component.

**Reference:** Wheelzie image 6 (stacked bar), 10 (donut + area).

**Acceptance:**
* Pure-SVG primitive renders deterministic paths for given input — snapshot-testable.
* Charts pass axe (no color-only semantics; labels carry meaning).

---

### FE.17.8: Status pill primitive (`OpsStatusPill`) and avatar cell (`OpsAvatarCell`)

The system MUST introduce two reusable primitives consumed by tables and cards:

`OpsStatusPill`:
* Props: `tone: 'success'|'warning'|'danger'|'info'|'neutral'`, `dot?: boolean` (default `true`), `children: ReactNode`.
* Visual: rounded-full, `px-2 py-0.5`, `text-[11px] font-medium`, `tone`-derived background+foreground using soft-tint pattern (e.g. `bg-ops-success/10 text-ops-success`).
* Accessibility: status pills carry **redundant** text — they MUST NOT communicate state by color alone.

`OpsAvatarCell`:
* Props: `src?: string`, `name: string`, `secondary?: string` (e.g. email).
* Renders 32px circular avatar (initials fallback derived deterministically), name (semibold), secondary (muted).
* Used in client/driver/vehicle list rows.

**Reference:** Wheelzie images 1, 3, 6 (table rows). Status: "On Duty", "Sick Leave", "Half-Day Leave", "Returned", "Ongoing", "Cancelled", "Completed", "Pending", "Paid".

**Vestroo status mapping (per existing domain):**

| Status (existing) | Tone |
|---|---|
| `on_trip` | info |
| `assigned` | info |
| `awaiting_assignment` | warning |
| `cancelled` | danger |
| `completed` | success |
| `paid` | success |
| `awaiting_payment` | warning |
| `overdue` | danger |
| `on_duty` | info |
| `off_roster` | neutral |

A canonical mapping table MUST live at `src/features/ops/ops-status-pill-tones.ts` so list and detail surfaces never disagree.

**Acceptance:**
* Tone-by-status mapping is one source of truth, unit-tested.

---

### FE.17.9: Calendar (week + month) — `OpsCalendarWeek`, `OpsCalendarMonth`

The system MUST add calendar primitives for `/ops/calendar` and `/ops/roster` matching Wheelzie image 5.

`OpsCalendarWeek`:
* 7-column week grid, hour rows from configurable start (default 06:00) to end (24:00).
* `events: { id; startsAt; endsAt; title; subtitle; tone; href? }[]` — events are positioned and stacked.
* Click event → opens detail rail (`OpsSplitView` integration) or navigates to `event.href`.
* Today column highlighted; current-time line on today only.

`OpsCalendarMonth`:
* 6-row month grid; events shown as colored chips (max 3 visible + "n more" overflow).

**Decision:** these are **in-repo SVG/CSS Grid components**, not `react-big-calendar`. The dependency inventory in [`ops-design-system-parity.md`](ops-design-system-parity.md) records that decision; if product needs drag-to-reschedule or recurring events, a separate story can revisit.

**Routes that adopt:**

* `/ops/calendar` — primary surface; week view default with month/list toggles. Right rail: event detail (vehicle, client, driver, notes).
* `/ops/roster` — week view; events are driver shifts. Right rail: driver profile + shift form.

**Reference:** Wheelzie image 5 (week grid + right "Schedule Detail" panel).

**Acceptance:**
* Calendar passes keyboard navigation: arrows move focus, Enter opens detail, Esc closes.
* No layout shift between week/month/list toggles.

---

### FE.17.10: Pagination primitive (`OpsPagination`) and "Results per page" control

The system MUST extract an `OpsPagination` primitive used by every paginated list (`/ops/clients`, `/ops/vehicles`, `/ops/bookings`, `/ops/trips`, `/ops/invoicing`, etc.).

* Page numbers visible: first, current ± 2, last with `…` truncation.
* Prev / Next buttons with `aria-label`.
* "Results per page" dropdown (10 / 20 / 50) — URL-persistent (`?per=20`).
* Total count text: "Showing 11–20 of 213".
* All page changes update URL — refresh and back/forward must work.

**Reference:** Wheelzie images 1, 9 — bottom right.

---

### FE.17.11: Login surface refresh — `OpsLoginForm`

The system MUST refresh `/ops/login` to match the SaaS aesthetic:

* Centered card on `bg-ops-canvas`, brand mark above, single-column form, primary CTA in `bg-ops-accent`.
* Helpful copy: "Vestroo Operations" subtitle, "Forgot password?" link, "Need an account? Contact your administrator." footer.
* No social SSO buttons (server-first staff auth — no change to security model).
* Page meets WCAG AA contrast and supports password manager autofill.

This is **chrome only** — no change to `requireOpsStaffPage` or session model.

---

### FE.17.12: Page-by-page redesign rollout — surfaces in scope

The implementation MUST roll out new primitives to the following surfaces in this order (so the visual upgrade is incremental and reviewable):

1. **`/ops` (dashboard)** — KPI cards + sparkline + donut + area chart. (FE.17.4, FE.17.7)
2. **`/ops/bookings`** — refreshed table + filters + status pills + pagination. (FE.17.8, FE.17.10). **Reference `06-bookings.png`** also shows **KPI scorecard row + stacked bar chart above the table**; that **upper band** is **required for full Wheelzie parity** and MAY land in the same story as 17.10 **or** a dedicated follow-up (**17.21**) if 17.10 scope stayed table-only.
3. **`/ops/walk-in`** — same table polish + queue stage tabs aligned to new style.
4. **`/ops/trips`** — split view: list + trip detail rail with map placeholder.
5. **`/ops/clients`** — split view per FE.17.5 + avatar cells + checkbox column for bulk actions.
6. **`/ops/vehicles`** — list **and** new card grid view; vehicle detail per FE.17.5.
7. **`/ops/calendar`** — full calendar primitive per FE.17.9.
8. **`/ops/roster`** — week calendar + driver detail rail.
9. **`/ops/invoicing`** — KPI cards (Completed / Awaiting / Overdue) + table.
10. **`/ops/comms`** — refreshed table for templates + activity timeline.
11. **`/ops/compliance`, `/ops/experiences`** — apply new chrome and shared primitives without changing logic.
12. **`/ops/settings`** — refresh form layout, group config into sections.
13. **`/ops/login`** — FE.17.11.
14. **`/ops/reports/*`** (if/when added) — adopt area + bar charts; consider Option B (Recharts) only here.

Each surface is a **separate story** (17.x) so PRs stay small.

---

## Related Non-Functional Requirements

* **NFR.17.1 — Visual consistency:** Every new primitive MUST be documented in [`ops-design-system-parity.md`](ops-design-system-parity.md) § 17 with usage example, props table, and a11y notes before it lands in two or more surfaces.
* **NFR.17.2 — Lean client (NFR.5.2 reaffirmed):** No new client-only library larger than 30 KB minified is added without a recorded bundle budget. Charts default to in-repo SVG (Option A).
* **NFR.17.3 — Server-first rendering:** New pages and primitives default to Server Components. `'use client'` is restricted to interactive primitives (top-bar search popover, calendar event drag, detail rail toggle, sparkline tooltips if any).
* **NFR.17.4 — Theme parity:** Every new primitive MUST work under both `data-ops-theme="light"` and `="dark"` without code branching beyond token references.
* **NFR.17.5 — Accessibility (FE.5.8 reaffirmed):** WCAG 2.1 AA contrast, keyboard ops for all interactive primitives, `aria-label` for icon-only controls, focus trap in dialogs/drawers, focus return on close.
* **NFR.17.6 — RLS / authz unchanged:** No primitive touches authorization. `requireOpsStaffPage` and role-aware nav (FE.5.1) are authoritative.
* **NFR.17.7 — Vocabulary (NFR.5.4 reaffirmed):** All copy uses Vestroo corporate-shuttle vocabulary. No "rental", "rental period", "car number", "rate per day" copy is introduced from Wheelzie.
* **NFR.17.8 — i18n future-proofing:** All visible strings introduced in this epic MUST be wrapped in a single export per surface (`copy.ts`) so a future i18n story can swap them without touching JSX. We do not add `i18next` in this epic.

## Design Goals

* **Overall vision:** Vestroo Ops should feel as polished, scannable, and trustworthy as a category-leading SaaS. The console is where staff spend hours daily — visual rhythm and density matter.
* **Critical feel:** Calm white / off-white canvas (`--ops-canvas`), generous spacing, brand-rust used **sparingly** (primary CTAs, icon on active nav, sparkline accent), **sky-blue active nav surface** (not mint green), navy text, soft elevation, no decorative gradients on empty chrome.
* **Critical interactions:** Card hover lifts (1px shadow change + border), table row hover (`bg-ops-accent-soft`), detail rail slide in 200ms, status pill is unmistakable at a glance.
* **Don't do:** dark hero gradients, neon accents, multiple competing accent colors, dense 9px text, animated heavy charts on first load.

## Suggested child stories (implementation sequence)

1. **17.1 — Token expansion + light theme tune** (FE.17.1) — globals.css + tailwind.config + tests.
2. **17.2 — Top bar refresh** (FE.17.2).
3. **17.3 — Sidebar refresh** (FE.17.3).
4. **17.4 — `OpsKpiCard` + `NewBookingsHomeCard` realignment** (FE.17.4).
5. **17.5 — `OpsSparkline` + `OpsAreaChart` + `OpsDonutChart` + `OpsBarChart`** (FE.17.7).
6. **17.6 — `/ops` dashboard** redesign consuming 17.4 + 17.5 — wires existing `loadOpsDashboardKpis` + new server actions.
7. **17.7 — `OpsStatusPill` + `OpsAvatarCell` + status-tone mapping** (FE.17.8).
8. **17.8 — `OpsPagination`** (FE.17.10).
9. **17.9 — `OpsSplitView` + `OpsDetailRail`** (FE.17.5).
10. **17.10 — `/ops/bookings` redesign** consuming 17.7 + 17.8.
11. **17.11 — `/ops/clients` split view** consuming 17.7 + 17.9.
12. **17.12 — `/ops/vehicles` list + grid + detail** (FE.17.5, FE.17.6) consuming `OpsCardGrid` (new).
13. **17.13 — `/ops/trips` split view + map placeholder**.
14. **17.14 — `OpsCalendarWeek` + `/ops/calendar`** (FE.17.9).
15. **17.15 — `OpsCalendarMonth` + `/ops/roster`** (FE.17.9).
16. **17.16 — `/ops/invoicing` redesign** consuming 17.4 + 17.7.
17. **17.17 — `/ops/comms`, `/ops/compliance`, `/ops/experiences`** chrome polish.
18. **17.18 — `/ops/settings` redesign**.
19. **17.19 — `/ops/login` refresh** (FE.17.11).
20. **17.20 — Documentation finalisation**: extend `ops-design-system-parity.md` § 17, update `ui-ux-specification.md`, add reference matrix.
21. **17.21 — Wheelzie layout & token parity pass** (optional but recommended for reference match): retarget **`--ops-surface-active` / nav** to §1.1a blue selection; add **Bookings** KPI + `OpsBarChart` band per **`06-bookings.png`**; optionally **Dashboard** right-rail / fleet-utilisation widgets per **`10-dashboard.png`**; visual QA checklist vs [`design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md).

Each story carries its own a11y checklist row, axe scan, and tablet verification (FE.5.7).

## Non-Goals

* No change to `requireOpsStaffPage`, role mapping, RLS, or any data model.
* No move from Tailwind+Radix to another stack. ADR 0001 remains authoritative.
* No domain vocabulary change. No "rentals" copy.
* No real-time chart streaming (stays out of scope; existing data freshness bar continues to communicate cache age).
* No new translations / locales.
* No mobile-native ops app (web responsive only).

## Relationship to other epics

| Other epic | Relationship |
|---|---|
| [Epic 5](epic-5.md) | Epic 17 **extends** FE.5.1, FE.5.2, FE.5.3 — does not replace. The locked Tailwind+Radix stack and existing primitives stay. |
| [Epic 6](epic-6.md) | New server actions for KPI metrics live here as data owners. |
| [Epic 7](epic-7.md) | Realtime / presence — used for live counts on KPI cards (optional, lazy). |
| [Epic 11–16](epic-11.md) | Domain epics provide data; Epic 17 only touches presentation. Domain status names map into status pill tones (FE.17.8). |
| [Epic 18](epic-18.md) | Sister epic for `/account/*` — shares the token expansion (FE.17.1) and primitives where reusable. |
| [Epic 19](epic-19.md) | Booking funnel simplification — independent surface (marketing/booking) but shares the brand palette and font scale established in [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md). |

## References

* [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) — full token sheet.
* [`design/visual-redesign-references.md`](design/visual-redesign-references.md) — Wheelzie image → Vestroo route map.
* [`ops-design-system-parity.md`](ops-design-system-parity.md) — **§ 17** (**Epic 17 — Design system parity**): consolidated TOC + subsections **17.1–17.19** with stable anchors (**Story 17.20**).
* [`design/epic-17-story-to-artifacts-matrix.md`](design/epic-17-story-to-artifacts-matrix.md) — Story **17.x** → routes → Wheelzie id → parity **`#parity-17-*`** (**Story 17.20**).
* [`ADR 0001`](adr/0001-ops-field-ui-stack-tailwind-radix.md) — Tailwind + Radix lock.
* [`ui-ux-specification.md`](ui-ux-specification.md#operations-console-ops-visual-language) — **Operations console (`/ops/*`)** visual language (anchor **`operations-console-ops-visual-language`**; **Story 17.20**).
