# Ops / field design system — parity spec (FE.5.2)

This document maps **expected interaction patterns** for Vestroo **`/ops/*`** and **authenticated `/field/*`** to **capstone reference behaviour** only. Reference code lives under **`docs/capstone-reference/frontend-admin`** and **`docs/capstone-reference/frontend-manager`** — cite as **examples**, not as sources of **auth, transport, or VST domain naming**.

**Locked stack:** Tailwind + Radix (+ shadcn-style components in-repo). **No Ant Design** — see **[ADR 0001: Ops / field UI stack](adr/0001-ops-field-ui-stack-tailwind-radix.md)**.

**Tablet / responsive verification (FE.5.7):** Manual checklists at agreed widths live in **[ops-console.md](ops-console.md)** (`/ops/*`) and **[field-tools.md](field-tools.md)** (`/field/*`); use them when changing shell, **`OpsTableShell`**, or **`AlertDialog`** flows.

---

## Token scope (`data-ops-theme`)

Ops semantic tokens are defined on **`[data-ops-theme="dark"]`** in **`src/app/globals.css`** and exposed via **`tailwind.config.ts`** (`ops-*` colours, `w-ops-sidebar`, typography utilities). This **does not** replace global **`:root`** shadcn variables used by marketing/booking. **Story 17.2:** shell chrome (**`OpsTopBar`**, **`OpsBreadcrumbStrip`**) composes those tokens for search, settings, notifications, and profile — see **§ FE.17.2** below. **Story 17.21:** active sidebar row uses **`--ops-nav-active`** (Tailwind **`bg-ops-nav-active`**) — soft blue selection per **`visual-redesign-tokens.md` §1.1a**, not the green-tint **`--ops-surface-active`**.

**Authenticated `/field/*`** may reuse the same variables by applying **`data-ops-theme="dark"`** on a layout wrapper when product wants alignment; until then, field may stay on slate utilities but **must not** introduce Ant.

**Typography (dense UI):**

| Use | Tailwind (ops) | Approx. |
|-----|----------------|---------|
| Page title | `text-ops-page-title` | 1.5rem / semibold |
| Table header | `text-ops-table-header` | 0.75rem / semibold uppercase optional in consuming page |
| Table / list body | `text-ops-table-body` | 0.875rem |
| Meta / helper | `text-ops-dense` or `text-ops-muted` colour | 0.75rem |

**Sidebar width (Story 5.1 parity):** expanded **14rem**, collapsed **4.5rem** — CSS vars **`--ops-sidebar-width`**, **`--ops-sidebar-collapsed-width`**; Tailwind **`w-ops-sidebar`**, **`w-ops-sidebar-collapsed`**.

---

## Data tables

**Reference behaviour (interaction):** sortable columns, filters, pagination, row actions, responsive horizontal scroll, loading skeletons or spinners, empty and error states (see admin/manager list screens under reference `src/app`).

**Vestroo posture:**

- **Now:** Use **`OpsTableShell`** for scroll container, border, optional **`<caption className="sr-only">`**, and consistent text utilities. Implement **`<thead>` / `<tbody>`** in the page or feature component.
- **Later:** Sorting/filtering/pagination may use **TanStack Table** or server-driven patterns in a dedicated story — **not required** here (NFR.5.2).
- **Loading / empty / error:** Prefer **Server Components** with conditional UI; client-heavy tables should use **`next/dynamic`** when introduced. **FE.5.3** standardises these flows — see **§ FE.5.3 / Story 5.3** below.

---

## FE.5.3 / Story 5.3 — CRUD and data-heavy patterns (implemented)

**State machine (data regions):**

| State | Implementation | Notes |
|-------|----------------|--------|
| **Loading** | **`OpsLoadingRegion`** (`aria-busy="true"`, `aria-live="polite"`) | Use for **client** fetches; **RSC** pages typically stream or show content after await. |
| **Empty** | **`OpsEmptyState`** (title, description, optional action) | Copy helpers in **`src/features/ops/ops-list-state-copy.ts`** (**NFR.5.4**). |
| **Error** | **`OpsErrorState`** (uses **`Alert`** + **`opsDataRetryHint()`**) | Optional **`onRetry`** (e.g. **`router.refresh`**). |
| **Success / content** | Existing tables/lists + **`OpsTableShell`** | Every **tabular** view passes a meaningful **`caption`** (**sr-only**). |

**Destructive confirmation:** **`src/components/ui/alert-dialog.tsx`** (Radix **AlertDialog**). Used for **irreversible or high-impact** actions — e.g. **trip → cancelled** (**`TripOpsForms`**), **DSR anonymise** (**`ComplianceDsrPanel`** — dialog after phrase **`ANONYMISE`**). Focus return follows Radix defaults.

**Forms:** Client panels use **`react-hook-form`** + **`Form` / `FormField` / `FormLabel` / `FormControl` / `FormMessage`** where applicable (**`AssignBookingPanel`**). Submit buttons use **`isSubmitting`** / **`disabled`** + pending label. **Async errors** surface with **`Alert`** at top of form or inline (**`TripOpsForms`**, **`ComplianceDsrPanel`** export path).

**Feedback (FE.5.3 rule):** **`package.json`** still has **no `sonner`**. **Toast parity** remains a **future explicit story** with bundle note — do **not** assume Sonner for ops. **Default:** **`Alert`** + inline copy for success/failure on refactored client flows.

**Table sort:** **Deferred** — column headers on refactored tables are **plain `<th>`** (not buttons) to avoid **false affordance**. When sort ships: use **`aria-sort`**, **`Enter`/`Space`** on header controls, document in this file.

**List semantics:** Primary **non-table** lists use **`<ul role="list">`** and **`<li role="listitem">`** where it aids consistency (**`/ops/compliance`** incidents, **`/ops/trips`** trip cards).

**Reference (interaction only):** Capstone **`docs/capstone-reference/frontend-admin`** / **`frontend-manager`** — modal confirm rhythm, dense tables — **not** product copy (**NFR.5.4**).

---

## Forms

**Reference behaviour:** labelled controls, inline validation, disabled submit while pending, success/error feedback after async submit.

**Vestroo posture:** Reuse **`src/components/ui/*`** (`Form`, `Input`, `Label`, `Button`, `Select`, etc.). Ops pages should **not** duplicate raw Tailwind form layouts where these exist. **Server Actions** + **`useFormState`** / **`useActionState`** patterns stay authoritative for mutations.

---

## Feedback (modal, sheet, toast, inline)

**Reference behaviour:** Manager reference uses **Sonner** for toasts; admin/manager use modals and drawers for confirmations and detail.

**Vestroo posture:**

- **Decision (current):** Prefer **`Alert`** and **inline** error/success on ops pages where MVP suffices; **no Sonner** in `package.json` today — **defer** Sonner until a story explicitly adds it with **bundle justification** (NFR.5.2).
- **Modal / sheet:** When needed, add **Radix Dialog** or **Sheet** (and thin wrappers under **`src/components/ui/*`**) in a small follow-up — **not mandatory** in FE.5.2 implementation beyond documentation.
- **Toast parity:** When product requires Sonner-like UX, record adoption in a new ADR or appendix and add **`sonner`** deliberately. **Story 5.3** reaffirms: **no Sonner** unless product approves a dedicated dependency story (**FE.5.3** uses **`Alert` + inline**).

---

## Density and spacing

**Reference behaviour:** Compact tables, tight vertical rhythm, dashboard widgets with consistent padding.

**Vestroo posture:** Use **`OpsFilterRow`** for horizontal control strips; **`OpsPageHeader`** for title + actions; prefer **`gap-2` / `gap-3`**, **`min-h-11`** touch targets (already in shell). **FE.5.3** will align list/edit density further.

---

## Dashboard widgets (KPI cards, charts)

**Reference behaviour:** Reference manager/admin use **Recharts**, **DevExtreme**, stat cards, chart legends, empty states.

**Vestroo posture:** **Defer** Recharts/DevExtreme until an analytics story lands. When added, **lazy-load** chart modules with **`next/dynamic`**, use a **fixed-height container** and **consistent empty-state** copy (VST vocabulary). **No** chart library is required for FE.5.2.

---

## Scheduling / calendar surfaces

**Reference behaviour:** **react-big-calendar**, **react-calendar**, **EventCalendar**-style month/week views and event chips.

**Vestroo posture:** **`/ops/calendar`** remains the product calendar route; future enhancements may adopt a **single** calendar library after bundle review. This story **does not** add new calendar dependencies.

---

## Global route loading (nextjs-toploader)

**Product decision:** **Defer** **`nextjs-toploader`** (or equivalent) by default. **Rationale:** Adds client JS and global behaviour; App Router navigation is already fast for many flows. **Revisit** when product wants explicit “in-flight” chrome for slow networks; document adoption in this file and measure bundle impact (**NFR.5.2**).

---

## NFR.5.1 — Deduplication

**Ops list/table and form layouts SHOULD use** **`OpsPageHeader`**, **`OpsFilterRow`**, **`OpsTableShell`**, **`OpsActionGroup`**, and shared **`src/components/ui/*`** rather than one-off Tailwind blocks. **FE.5.3** will tighten CRUD specifics. Exceptions need a **short comment** or doc note.

---

## NFR.5.2 — Lean client / RSC / purge

- Prefer **Server Components** for ops and field pages; reserve **`'use client'`** for interactivity (shell, maps, tables with client sorting, etc.).
- **Lazy-load** maps, large client-only tables, and charts when introduced (`next/dynamic` with `ssr: false` where appropriate).
- **Avoid** duplicate UI kits (no Ant; do not add a second component library for the same atom).
- **`tailwind.config.ts`** **`content`** already includes **`./src/features/**/*`** — new primitives under **`src/features/ops/**`** are **purged** correctly in production.

---

## Dependency inventory (runtime vs epic mentions)

| Package / area | In repo today? | Note |
|----------------|----------------|------|
| **Tailwind CSS** | Yes | Primary styling. |
| **@radix-ui/react-label** | Yes | Used by shared UI. |
| **@radix-ui/react-slot** | Yes | Button / composition. |
| **@radix-ui/react-alert-dialog** | Yes | Destructive / irreversible confirms (**`src/components/ui/alert-dialog.tsx`**, Story 5.3). |
| **@radix-ui/react-dropdown-menu** | Yes | Ops profile chip menu (**Story 17.2** / **`OpsProfileMenu`**). |
| **@radix-ui/react-popover** | Yes | Ops top-bar search suggestions (**Story 17.2** / **`OpsTopBarSearch`**). |
| **@radix-ui/react-dialog** | Yes | Ops mobile search **Sheet** shell (**Story 17.2** / **`src/components/ui/sheet.tsx`**). |
| **Ant Design** | No | **Forbidden** for ops/field internal per ADR 0001. |
| **Sonner** | No | Defer; inline/alert first. |
| **Recharts** | No | Defer; lazy-load when analytics ships. **Story 17.5 (FE.17.7):** **Option A** in-repo SVG is the default for `/ops` dashboards. **Option B** (Recharts behind `next/dynamic`, `ssr: false`) remains available only for a future heavy **`/ops/reports/*`** story with an explicit **~70KB+** bundle note (**NFR.17.2**). |
| **DevExtreme** | No | Not planned; reference-only. |
| **nextjs-toploader** | No | Defer; product line above. |
| **react-big-calendar / react-calendar** | No | Defer; calendar story. |

**Recommendation:** Add **Radix** packages **incrementally** when a primitive needs them; add **Sonner** or **Recharts** only with explicit story + bundle note.

**Epic 17 / Story 17.2 bundle note (NFR.17.2):** **`@radix-ui/react-dropdown-menu`**, **`@radix-ui/react-popover`**, and **`@radix-ui/react-dialog`** landed together for the ops top bar (profile menu, search popover, mobile sheet). Each wraps a small **`src/components/ui/*`** primitive; tree-shaking keeps unused Radix entry points out of unrelated routes. Prefer **no further Radix** additions in hot paths until a story justifies bundle impact.

---

## Manual verification (Story 5.2)

- Open **`/ops/vehicles`** (first consumer): **contrast** of header/table vs shell, **focus visible** on interactive controls, **sidebar widths** unchanged vs Story 5.1 (**14rem** / **4.5rem** collapsed on `md+`).
- Spot-check **`/ops/board`** shell chrome still matches ops token backgrounds/borders.

## Manual verification (Story 5.3)

- **`/ops/fulfil`:** Fetch errors show **`OpsErrorState`**; assignment form uses **`Alert`** + **`Form`**; empty queue uses **`OpsEmptyState`**.
- **`/ops/compliance`:** Incidents list **`role="list"`**; document tables use **`OpsTableShell`** + **caption**; admin DSR anonymise shows **AlertDialog** before apply.
- **`/ops/trips`:** Empty state copy; setting status to **cancelled** opens **AlertDialog**; delay/swap forms use **`Input`/`Label`/`Button`** + **`Alert`** feedback.

---

<span id="epic-17-parity"></span>

## Epic 17 — Design system parity (§ 17)

**Scope:** Subsections **§ 17.1–§ 17.19** document **Story 17.1–17.19** outcomes (**NFR.17.1**): primitives, **`/ops/*`** surfaces, usage patterns, props or token tables, and accessibility expectations (**NFR.17.5**). They are the **canonical** onboarding path for Epic 17 ops UI — cite story IDs in PRs.

**Token vocabulary** (HSL components, `--ops-*` vars): **[`docs/design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)** — link instead of duplicating full sheets here (**NFR.17.4**).

**Wheelzie → Vestroo route mapping** (reference screenshots, **not** product copy): **[`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md)** — PNG index **[`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md)**.

**Story → routes → parity anchor traceability:** **[`docs/design/epic-17-story-to-artifacts-matrix.md`](design/epic-17-story-to-artifacts-matrix.md)** (single canonical matrix; **NFR.17.7**: Wheelzie names are **reference-only**, Vestroo shuttle vocabulary is authoritative in UI).

### § 17 Table of contents (stable anchors)

Jump links use **`id`s** embedded before each subsection heading (works in GitHub, VS Code, and most Markdown viewers).

| Story | Summary | Anchor |
|-------|---------|--------|
| **17.1** | Ops visual tokens | [`#parity-17-1`](#parity-17-1) |
| **17.2** | Top bar + breadcrumb strip | [`#parity-17-2`](#parity-17-2) |
| **17.3** | Sidebar (groups, badges, promo) | [`#parity-17-3`](#parity-17-3) |
| **17.4** | `OpsKpiCard` + `NewBookingsHomeCard` | [`#parity-17-4`](#parity-17-4) |
| **17.5** | Chart primitives (`OpsSparkline`, charts) | [`#parity-17-5`](#parity-17-5) |
| **17.6** | Dashboard `/ops` | [`#parity-17-6`](#parity-17-6) |
| **17.7** | `OpsStatusPill`, `OpsAvatarCell` | [`#parity-17-7`](#parity-17-7) |
| **17.8** | `OpsPagination` | [`#parity-17-8`](#parity-17-8) |
| **17.9** | `OpsSplitView`, `OpsDetailRail` | [`#parity-17-9`](#parity-17-9) |
| **17.10** | `/ops/bookings` queue | [`#parity-17-10`](#parity-17-10) |
| **17.11** | `/ops/clients` | [`#parity-17-11`](#parity-17-11) |
| **17.12** | `/ops/vehicles` | [`#parity-17-12`](#parity-17-12) |
| **17.13** | `/ops/trips` | [`#parity-17-13`](#parity-17-13) |
| **17.14** | `OpsCalendarWeek`, `/ops/calendar` | [`#parity-17-14`](#parity-17-14) |
| **17.15** | `OpsCalendarMonth`, `/ops/roster` | [`#parity-17-15`](#parity-17-15) |
| **17.16** | `/ops/invoicing` | [`#parity-17-16`](#parity-17-16) |
| **17.17** | Comms, compliance, close-protection, experiences | [`#parity-17-17`](#parity-17-17) |
| **17.18** | `/ops/settings` | [`#parity-17-18`](#parity-17-18) |
| **17.19** | `/ops/login` | [`#parity-17-19`](#parity-17-19) |

**Composition note:** Use **`OpsPageHeader`** + **`OpsTableShell`** + **`OpsFilterRow`** as the default page skeleton unless a story explicitly documents an exception (**NFR.5.1**).

---

<span id="parity-17-1"></span>

## FE.17.1 / Story 17.1 — Ops visual tokens (accent, status, elevation, chart)

**Source:** [`docs/design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) §1.2–1.3, §1.5, §3.3. **CSS:** `[data-ops-theme='light']` / `[data-ops-theme='dark']` in **`src/app/globals.css`**. **Tailwind:** `theme.extend.colors.ops` (accent, status, `chart.1`…`6`), `borderRadius.ops-card` / `ops-pill`, `boxShadow.ops-1` / `ops-2`. Marketing **`:root`** tokens are **not** used for these — they stay on the global booking/marketing palette.

**When to use**

- **`bg-ops-accent` / `text-ops-accent-foreground`** — primary CTA fills and text/icons on that fill (vest.rust in light; brighter rust in dark).
- **`bg-ops-accent-soft`** — row hover, selected strip, soft card tint (contains alpha in the CSS variable; prefer over ad-hoc `bg-ops-accent/5` where the spec calls for the 8% / 12% tint).
- **`bg-ops-success/10` `text-ops-success`** (and analogous **warning** / **danger** / **info**) — status chips and list markers; `/10` relies on `<alpha-value>` in Tailwind (see design doc §7).
- **`shadow-ops-1` / `shadow-ops-2`** — resting / hover card elevation; avoid **`shadow-ops-2`** on full tables (hover flicker).
- **`rounded-ops-card` / `rounded-ops-pill`** — KPI cards / rails vs pills and badges.
- **`text-ops-chart-*`** or **`bg-ops-chart-*`** — categorical series and legends once charting ships (**FE.17.7**); until then useful for static sparkline mocks.

**Storybook-style snippet** (wrap in a node that has **`data-ops-theme="light"`** or **`dark`** — e.g. ops shell root):

```tsx
<div className="flex flex-wrap gap-3 p-4">
  <div
    className="rounded-ops-card border border-ops-border bg-ops-surface p-4 shadow-ops-1"
    data-testid="kpi-card-mock"
  >
    <p className="text-sm text-ops-muted">Trips (sample)</p>
    <p
      className="mt-1 text-2xl font-semibold tabular-nums"
      style={{ color: 'hsl(var(--ops-chart-1))' }}
    >
      128
    </p>
  </div>
  <div className="rounded-ops-card bg-ops-accent-soft px-3 py-2 text-ops-foreground">
    Row hover / selection surface (<code>bg-ops-accent-soft</code>)
  </div>
  <span className="inline-flex items-center rounded-ops-pill bg-ops-success/10 px-2 py-0.5 text-sm font-medium text-ops-success">
    Completed
  </span>
</div>
```

**NFR.17.4:** Toggle **`data-ops-theme`** on the same markup; accent and status utilities should remain legible without JSX theme branching beyond the data attribute on an ancestor.

---

<span id="parity-17-2"></span>

## FE.17.2 / Story 17.2 — Top bar + breadcrumb strip

**Layout:** **`OpsShellClient`** renders **`OpsTopBar`** (utilities row, **`h-14`**) then **`OpsBreadcrumbStrip`** (**`h-8` / 32px**) then **`main`**. Breadcrumbs no longer live inside the top bar.

**Search**

- **Desktop (`md+`):** Inline **`type="search"`** input with placeholder **`Search bookings, clients, vehicles…`** (exact ellipsis **`…`** from copy **`opsTopBarCopy`** in **`src/features/ops/copy/ops-top-bar-copy.ts`**). **Focus** opens a **non-modal** Radix **`Popover`** with **Recent searches** (httpOnly cookie **`ops_top_bar_search_recent`**, JSON string array, max 5 queries — no client-side PII index) and **Quick jump** rows from **`getOpsTopBarSearchSuggestionsAction`** (server-only Supabase reads for recent bookings / vehicles). **Enter** calls **`recordOpsTopBarSearchQueryAction`** then navigates to **`/ops/search?q={encoded}`**.
- **Mobile (`< md`):** Search control is **icon-only**; tap opens a **right `Sheet`** (**`@radix-ui/react-dialog`**) with the same input, a **Search** submit button, and the suggestion lists.
- **Keyboard:** **`/`** focuses desktop search or opens the mobile sheet when the event target is not an **`INPUT`**, **`TEXTAREA`**, or **`contenteditable`** and not inside **`[role="dialog"]`**.

**Settings:** Header **gear** link targets **`/ops/settings`** (hub page lists deeper settings routes). **Profile `DropdownMenu`** also includes **Settings** (same href) for discoverability.

**Notifications:** **`OpsNotificationsBell`** uses a **small red dot** when unread count **`> 0`**; the trigger **`aria-label`** follows **`{count} unread notifications`** (interpolated via **`opsUnreadNotificationsAria`**).

**Profile chip:** **`OpsProfileMenu`** — avatar (**`profiles.avatar_url`** when set, else initials from **`displayName`** / email), **display line**, **role** (`getRoleDisplayLabel`); **Radix `DropdownMenu`** with **Profile** → **`/ops`**, **Settings** → **`/ops/settings`**, **Sign out** (Supabase client sign-out + redirect). **Tab** reaches the trigger; arrow keys operate per Radix defaults inside the menu.

**Breadcrumb strip (mobile):** Shows **current page title** (last crumb label) and a **`<` (back)** control when a **parent** crumb exists (`router.push` to **`crumbs[crumbs.length - 2].href`**).

**A11y / testing:** Component tests in **`src/features/ops/components/OpsTopBar.test.tsx`** use **`@testing-library/react`** with **`/** @vitest-environment happy-dom */`** (see Vitest pragma). **`OpsNotificationsBell`** is mocked in those tests to avoid live Supabase in jsdom.

---

<span id="parity-17-3"></span>

## FE.17.3 / Story 17.3 — Sidebar (groups, badges, active rail, promo)

**Config:** **`src/features/ops/ops-nav-config.ts`** — **`OPS_NAV_GROUPS`**, **`filterOpsNavGroups`**, **`OpsNavItem.badgeCount?`** (optional static default). **Group titles (post–17.3):** **Fulfilment**, **Fleet & People**, **Finance & Compliance**, **Configuration** (Epic taxonomy + **FE.5.1** / **16.22** item order preserved inside **Fulfilment**).

**Group labels:** **`text-[11px] font-semibold uppercase tracking-wide text-ops-muted`** on section headers (legacy **“Legacy”** pill uses **`opsSidebarCopy.legacyPill`**).

**Count badges:** Optional per-item count from **`item.badgeCount`** or shell prop **`navBadgeCounts[href]`** on **`OpsSidebar`**. Render only when the resolved integer is **`> 0`**. Styling: **`rounded-full bg-ops-accent text-ops-accent-foreground min-w-5 h-5 px-1.5 text-[11px] font-semibold`**. **`NFR.17.6`:** callers must not pass totals the user could not derive from the linked surface.

**Collapsed rail (`md+`, `collapsed`):** Numeric badges get **`md:hidden`** (icon-only rail stays uncluttered; expand to see counts).

**Active row:** **`bg-ops-surface-active`** plus **`before:`** left accent rail (**`before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-ops-accent`**).

**Promo:** **`OpsSidebarPromoSlot`** below the scrollable nav, inside **`#ops-sidebar-nav`** footer stack. **Flag:** **`isOpsSidebarPromoEnabled()`** in **`src/lib/ops-sidebar-promo-env.ts`** reads **`NEXT_PUBLIC_OPS_SIDEBAR_PROMO_ENABLED`** (truthy **`1`/`true`/`yes`/`on`**, same trim/lowercase pattern as dispatch board nav). **Content:** optional **`NEXT_PUBLIC_OPS_SIDEBAR_PROMO_JSON`** `{ title, body?, href?, imageUrl? }` — no hard-coded marketing card. **`href`** must be a same-app path (`/…`). **`imageUrl`:** paths **`/`** use **`next/image`**; same-origin absolutes use **`<img>`**. **Default:** flag **off** → **no** promo (no reserved empty height).

**Copy:** **`src/features/ops/copy/ops-sidebar-copy.ts`** (**NFR.17.8**).

**Tests:** **`ops-nav-config.test.ts`** (taxonomy + **`badgeCount`** preservation); **`OpsSidebar.test.tsx`** (RTL + **`happy-dom`** pragma).

---

<span id="parity-17-4"></span>

## FE.17.4 / Story 17.4 — `OpsKpiCard` scorecards + `NewBookingsHomeCard` alignment

**Sources:** [`docs/epic-17.md`](epic-17.md) **FE.17.4**, Wheelzie refs **6** / **10** via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md), [`docs/stories/17.4.story.md`](stories/17.4.story.md).

### `OpsKpiCard` (`src/features/ops/components/OpsKpiCard.tsx`)

| Prop | Type | Notes |
|------|------|--------|
| `label` | `string` | Primary metric title (from KPI defs or copy). |
| `icon` | `LucideIcon` | Small header icon (**16px**, muted). |
| `value` | `number \| string` | Main numeric/stat line; **`tabular-nums`**, **`text-3xl font-semibold`**. |
| `valueSuffix` | `string?` | Optional unit (**ZAR**, **trips**) — rendered muted, slightly smaller. |
| `shortDefinition` | `string?` | Helper line (`text-xs`, clamped). |
| `loading` | `boolean?` | Value row skeleton; root sets **`aria-busy`**. |
| `drillHref` | `string?` | When set, a **full-bleed `Link`** sits at **`z-0`** with **`focus-visible` ring**; card body uses **`pointer-events-none`** except the overflow menu. |
| `deltaPercent` | `number \| null` | **null** in MVP until WoW loader exists — delta row shows **em dash** + period label, **muted** arrow (`Minus`). |
| `periodLabel` | `string?` | Defaults to **`opsKpiCardCopy.defaultPeriodLabel`** (**from last week**). |
| `deltaPolarity` | **`OpsKpiDeltaPolarity`** | **`upGood`** \| **`upBad`** \| **`neutral`** — maps movement vs baseline to **`text-ops-success`** / **`text-ops-danger`** / **`text-ops-muted`** (`src/lib/ops-dashboard-kpis.ts` **`opsDashboardKpiDeltaPolarity`**). **`0%`** and **`null`** use muted. |
| `sparkline` | `ReactNode?` | Optional right column (**reserved ~56–72px** tall). If omitted, a neutral placeholder block keeps layout stable (**FE.17.5** / **`OpsSparkline`**). |
| `data-testid` | `string?` | Dashboard passes **`ops-kpi-{id}`**. |

**Overflow menu:** **`OpsKpiCardOverflowMenu`** (`'use client'`) — Radix **`DropdownMenu`**, **`…`** trigger, **View details** → same **`drillHref`** as the card (**NFR.17.3** small client island).

**Copy:** **`src/features/ops/copy/ops-kpi-card-copy.ts`** (**NFR.17.8**) — menu label, default period, aria for placeholder sparkline and card link.

### `NewBookingsHomeCard`

Same **rounded-ops-card**, **shadow-ops-1**, **56–72px** spark placeholder band, and delta placeholder row as **`OpsKpiCard`**. **Needs attention** pill and walk-in / bookings URLs are **unchanged** (story 16.20).

### Tests

**`OpsKpiCard.test.tsx`** — Link vs no link, polarity classes, loading skeleton. Preserve any **`NewBookingsHomeCard`** coverage when added elsewhere.

---

<span id="parity-17-5"></span>

## FE.17.7 chart primitives / Story 17.5 — `OpsSparkline`, `OpsAreaChart`, `OpsDonutChart`, `OpsBarChart`

**Sources:** [`docs/epic-17.md`](epic-17.md) **FE.17.7**, Wheelzie **6** (stacked bars) / **10** (donut + area) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md), [`docs/stories/17.5.story.md`](stories/17.5.story.md).

**Implementation:** **Option A only** — pure SVG under **`src/features/ops/components/`**, **no Recharts** in this story. **`tone → --ops-chart-N`** mapping is **`OPS_CHART_TONE_INDEX`** in **`ops-chart-tones.ts`**. Number→path strings use **`formatSvgNumber`** (**3** decimal places) in **`ops-chart-utils.ts`** for snapshot stability. **Empty state** copy: **`opsChartsCopy.noDataForPeriod`** in **`ops-charts-copy.ts`**.

| Component | File | Key props / behaviour |
|-----------|------|-------------------------|
| **`OpsSparkline`** | `OpsSparkline.tsx` | `points`, `width`, `height`, `ariaLabel`, optional `color` (else **`text-ops-accent`** + `currentColor`). Line + filled area. Empty if **`points.length === 0`**. |
| **`OpsAreaChart`** | `OpsAreaChart.tsx` | `points: { x, y }[]`, `width`, `height`, `ariaLabel`. Filled area + stroke. Category semantics should appear in **`ariaLabel`** (or page copy), not hidden colour alone. |
| **`OpsBarChart`** | `OpsBarChart.tsx` | `series: { label, values: { x, up, down }[] }`, `width`, `height`, optional `legend`, optional `segmentLabels`, optional `ariaLabel` (auto-built from data). Stacked **up** (success / chart-5) + **down** (danger / chart-2). **Clamps** negative components to **0**; **all-zero** stacks → empty state. |
| **`OpsDonutChart`** | `OpsDonutChart.tsx` | `slices: { label, value, tone }[]`, optional `width`/`height`, **`children`** centre slot (**`aria-hidden`** visual), **`ariaLabel`**, **`sr-only`** value list. Single full slice uses **two** half-ring paths (SVG full **360°** arc workaround). |

**Accessibility:** Each root **`svg`** uses **`role="img"`** and a meaningful **`aria-label`** (consumer or auto summary). **Bar** legend text + **`aria-label`**; **donut** **`sr-only`** list. **axe:** rely on text, not colour alone (**NFR.17.5**).

**Tests:** **`OpsCharts.test.tsx`**, **`ops-chart-tones.test.ts`** — snapshots / **`jest-axe`**.

**Dashboard wiring:** Passing **`OpsSparkline`** into **`OpsKpiCard`** on **`/ops`** is **story 17.6** (default); **17.5** ships primitives only.

---

<span id="parity-17-6"></span>

## FE.17.12 / Story 17.6 — Dashboard (`/ops`) scorecards + charts

**Sources:** [`docs/stories/17.6.story.md`](stories/17.6.story.md), Wheelzie image **10** via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md) § Mapping **`/ops/*`** (~36–39).

### MVP choice

| Choice | What shipped |
|--------|----------------|
| **MVP B** (default in story reconciliation) | KPI tiles remain **`loadOpsDashboardKpis`** only (read-only, unchanged authz). **`OpsSparkline`** uses a **deterministic preview curve** anchored to each KPI’s current value (`ops-dashboard-demo-series.ts`). **`OpsAreaChart`** (**Revenue this week**) uses an illustrative seven-day demo series. **`OpsDonutChart`** (**Trip status mix**) uses **live dashboard counts** for **On trip** (`trips_en_route`), **Scheduled** (`trips_booking`), **Completed** (`trips_completed_7d_utc`), and **0** for **Cancelled** until a cancelled-trip aggregate exists. **`OpsBarChart`** is **not** on the home dashboard — defer to **`/ops/reports/*`** or a later story if needed. |

### Layout (Wheelzie reference — image 10)

- **`OpsPageHeader`:** title only on the dashboard (no long subtitle) for a clean hero like the reference; behaviour otherwise unchanged.
- **`OpsDataFreshnessBar`:** same contract; styled as a light inset bar (read-only row).
- **Panel:** scorecards + analytics sit in a **rounded, bordered content panel** on the canvas (grouped “app” area like Wheelzie’s main dashboard card stack).
- **Overview:** micro-label **`Overview`** (uppercase, tracked); scorecard grid **`sm:grid-cols-2`**, **`lg:grid-cols-4`** (four-across strip on large screens, Wheelzie top row). Elevated tiles: solid **`bg-ops-surface`**, soft shadow, crisp border (**`NewBookingsHomeCard`** default chrome + **`OpsKpiCard`** `className`); attention state on new bookings still uses primary tint.
- **Analytics:** section label **`Analytics`**; **revenue area chart** is **full width** first (larger **~880×220** SVG, accent stroke); **trip status donut** below with a **visible percentage legend** (coloured swatches) beside the ring on **`lg+`**, reference-style.
- **Motion:** chart shells use **`transition-colors duration-200`** (**CSS only**).

### Copy (NFR.17.8)

- Page + chart titles + preview badges + sparkline aria phrases: **`src/features/ops/copy/ops-dashboard-copy.ts`**.
- KPI tile strings remain **`ops-kpi-card-copy.ts`**; chart empty helper strings remain **`ops-charts-copy.ts`**.

### Accessibility

- Section headings are visible **`h2` / `h3`**; chart **`svg`** roots keep **`role="img"`** + **`aria-label`** from **`ops-dashboard-copy`** / primitives.
- **`OpsSparkline`** **`aria-label`** states preview semantics (**not** historical DB series).

### Tests

- **`src/features/ops/components/OpsDashboardView.test.tsx`** — mocked **`loadOpsDashboardKpis`**; **`OpsDataFreshnessBar`** / **`OpsFetchErrorIsland`** mocked to avoid **`useRouter`** in unit tests; **jest-axe** on the composed tree.

---

<span id="parity-17-7"></span>

## FE.17.8 / Story 17.7 — Status pill (`OpsStatusPill`) & avatar cell (`OpsAvatarCell`)

**Sources:** [`docs/epic-17.md`](epic-17.md) **FE.17.8** (~213–247); [`docs/stories/17.7.story.md`](stories/17.7.story.md); Wheelzie **1**, **3**, **6** row patterns via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### `OpsStatusPill` (`src/features/ops/components/OpsStatusPill.tsx`)

| Prop | Type | Notes |
|------|------|--------|
| **`tone`** | **`success` \| `warning` \| `danger` \| `info` \| `neutral`** | Maps from **`getOpsStatusPillTone`** or explicit when not domain-driven. |
| **`dot`** | **`boolean`**, default **`true`** | Decorative **`aria-hidden`** marker using **`bg-current`**; **does not** replace **`children`** (**NFR.17.5**). Use **`dot={false}`** when the table column is tight and label clarity alone suffices — still require visible **`children`**. |
| **`children`** | **`ReactNode`** | **Required** — empty pills are invalid; loading rows use skeletons, not blank pills. |

**Visual:** **`rounded-full`**, **`px-2 py-0.5`**, **`text-[11px] font-medium`**, soft tint via **`bg-ops-* /10`** + matching **`text-ops-*`** (**NFR.17.4**, no raw hex).

### `OpsAvatarCell` (`src/features/ops/components/OpsAvatarCell.tsx`)

| Prop | Type | Notes |
|------|------|--------|
| **`src`** | **`string` \| `null` \| optional | When non-empty, **`next/image`** (**32×32**, **`sizes="32px"`**) — **`remotePatterns`** already allow Supabase Storage. **`alt=""`**; adjacent **`name`** supplies the accessible label. |
| **`name`** | **`string`** | Primary line, **`text-sm font-semibold`**. |
| **`secondary`** | **`string` \| `null` \| optional | Secondary line, **`text-xs text-ops-muted`** (e.g. email). |

**Initials:** **`opsAvatarInitialsFromName`** in **`src/features/ops/lib/ops-avatar-initials.ts`** — trim → split on whitespace → first+last word initials if ≥2 words, else first two letters of single word; max 2 chars, uppercase. Covered by unit tests.

**RSC:** Default **Server Components** — no **`'use client'`** on these files.

### `ops-status-pill-tones.ts` (`src/features/ops/ops-status-pill-tones.ts`)

**Canonical mapping** (epic table):

| Status | Tone |
|--------|------|
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

**Extra key (audit):** **`en_route`** (`TripFulfilmentStatusDb`) → **`info`** (same ops cue as **`on_trip`**).

**Unknown:** Any string not in the map → **`neutral`**. **`development`** only: **`console.warn`** with the raw string to surface typos; **production** silent (**Reconciliation**).

**Normalization:** **`normalizeOpsStatusKey`** — trim, lowercase, spaces → underscores (so **`Awaiting Payment`** matches **`awaiting_payment`**).

### Copy (NFR.17.8)

No **`ops-status-pill-copy.ts`** — visible strings come from row parents (**`children`**).

### Tests

- **`ops-status-pill-tones.test.ts`** — epic rows + **`en_route`** + unknown + normalization.
- **`OpsStatusPill.test.tsx`**, **`OpsAvatarCell.test.tsx`** — RTL / behaviour.
- **`ops-avatar-initials.test.ts`** — golden initials vectors.

---

<span id="parity-17-8"></span>

## FE.17.10 / Story 17.8 — Pagination (`OpsPagination`)

**Sources:** [`docs/epic-17.md`](epic-17.md) **FE.17.10** (~279–289); [`docs/stories/17.8.story.md`](stories/17.8.story.md); Wheelzie **1**, **9** (bottom-right pagination) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### URL parameters

| Param | Values | Canonical |
|-------|--------|-----------|
| **`page`** | Positive integer, **1-based** | Omitted when **`page === 1`** |
| **`per`** | **`10`**, **`20`**, **`50`** | Invalid / missing coerced to **`20`**; **`per`** omitted when **`20`** |

Existing filters on list URLs are preserved: **`buildOpsPaginationHref`** merges into the current query (**`URLSearchParams`** clone).

Changing **`per`** at the UI **must** navigate with **`page`** reset to **1** (omit **`page`** in URL).

**Collision audit:** **`/ops/search`** already uses **`page`** (booking grid). **`per`** is introduced here for ops pagination — no prior **`per`** usage conflict found for **`/ops/*`** list URLs.

### Truncation

- **`totalPages ≤ 7`:** show every page number — **no** ellipsis.
- **`totalPages > 7`:** **`first`**, **`current ± 2`** (clamped), **`last`**, with **`…`** between non-adjacent runs — **`buildPaginationWindowItems`** (`src/features/ops/lib/ops-pagination-window.ts`).

### `OpsPagination` (`src/features/ops/components/OpsPagination.tsx`)

| Prop | Notes |
|------|-------|
| **`pathname`** | Path only (e.g. **`/ops/bookings`**). |
| **`query`** | Optional serialized query **without** **`?`** — preserves **`status`**, **`q`**, etc. |
| **`currentPage`**, **`totalPages`**, **`totalCount`**, **`perPage`** | Callers compute from server counts; **`perPage`** should be **`10` \| `20` \| `50`**. |

**`totalPages === 0`:** “No results” line only — numeric pager, prev/next, and per-page control **hidden**.

### Behaviour & RSC boundary

- **`next/link`** with **`scroll={false}`** for page navigation (**progressive enhancement**, history-friendly).
- **One client island:** **`'use client'`** on **`OpsPagination`** for **`useRouter().push`** when **`per`** changes via native **`<Select>`** (`src/components/ui/select.tsx` — **no new Radix Select** dependency).
- Parents remain **Server Components** and pass **`query`** from **`searchParams`**.

### Copy (`src/features/ops/copy/ops-pagination-copy.ts`)

- **`Showing a–b of t`** uses **en dash (U+2013)** between **`a`** and **`b`** — not ASCII hyphen.
- Prev/next **`aria-label`**s and **“Results per page”** live in this module (**NFR.17.8**).

### Accessibility

- **`aria-current="page"`** on the active page **`<span>`** (not a link).
- Disabled prev/next are **`<span aria-disabled>`** with **`aria-label`** (not focusable links).
- Logical tab order: Prev → page links → Next → per-page **`<select>`**.

### Usage example (composition)

```tsx
<OpsPagination
	pathname="/ops/bookings"
	query={serializedFilters}
	currentPage={page}
	totalPages={totalPages}
	totalCount={count}
	perPage={per}
/>
```

### Tests

- **`ops-pagination-window.test.ts`**, **`ops-pagination-url.test.ts`**, **`OpsPagination.test.tsx`**.

---

<span id="parity-17-9"></span>

## FE.17.5 / Story 17.9 — Split list / detail (`OpsSplitView` + `OpsDetailRail`)

**Sources:** [`docs/epic-17.md`](epic-17.md) **FE.17.5** (~131–160); [`docs/stories/17.9.story.md`](stories/17.9.story.md); Wheelzie **1**, **3**, **4**, **5**, **8** (list + right rail density) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **Drawer** | **`< lg`:** Radix **`Sheet`** (`src/components/ui/sheet.tsx`), **`showCloseButton={false}`** — header close lives on **`OpsDetailRail`**. **`SheetTitle`** is **`sr-only`** (`ops-split-view-copy.detailSheetDialogTitle`); **`aria-describedby={undefined}`** on content to satisfy Radix without a visible description. |
| **Rail width** | Default **420px** at **`xl+`**; **`lg`–`xl`:** `min(420px, 38vw)` with **`min-w-[360px]`** floor on the aside. |
| **URL / deep linking** | **Primitives only:** **`OpsSplitView`** does **not** call **`router.push`**. Parents update **`?id=…`** (or sub-routes) when a row opens; keep **`detailVisible`** in sync with URL-derived selection. |
| **Motion** | **`transition-transform duration-200 ease-out`** on **`SheetContent`** — **CSS only** (**NFR.17.2**). |
| **Empty list / no selection** | When **`detailVisible`** is **`false`** on **`lg+`**, the rail is **not** mounted (list uses full width). No focus trap. |
| **Focus return** | Optional **`listFocusReturnRef`** (**`RefObject<HTMLElement | null>`**). On drawer close, **`onCloseAutoFocus`** **`preventDefault`** + focus that node (**Esc**, overlay, or rail close). Desktop dismiss is parent-owned. |
| **Pilot adoption** | **No** route wiring in **17.9** — primitives + tests + docs only. |

### Breakpoints (**NFR.17.1**)

| Range | Layout |
|-------|--------|
| **`< lg` (< 1024px)** | Detail in **`Sheet`** (drawer from the right); focus trap via Radix **`Dialog`**. |
| **`lg+`** | Inline flex rail when **`detailVisible`**; list **`min-w-0 flex-1`**. |
| **`xl+`** | Rail **`sticky`** (`xl:sticky xl:top-4`) with **`max-h-[calc(100vh-6rem)]`** — parent scroll context should allow sticky to engage. |

Viewport **`lg`** is detected with **`React.useSyncExternalStore`** + **`window.matchMedia('(min-width: 1024px)')`**; **`getServerSnapshot`** returns **`false`** (mobile-first SSR).

### `OpsSplitView` (`src/features/ops/components/OpsSplitView.tsx`)

| Prop | Notes |
|------|--------|
| **`list`**, **`detail`** | **Required** **`ReactNode`** — single **`detail`** instance per viewport mode (no duplicate mount across breakpoints). |
| **`detailVisible`** | Controls **`Sheet`** open state on **`< lg`** and rail visibility on **`lg+`**. |
| **`onCloseDetail?`** | **`Sheet` `onOpenChange(false)`**, overlay dismiss, **Esc** (Radix). |
| **`listFocusReturnRef?`** | Drawer focus return target. |

**`use client`:** This file is the **client island** for split/drawer behaviour (**NFR.17.3**).

### `OpsDetailRail` (`src/features/ops/components/OpsDetailRail.tsx`)

Card chrome: **header** (title + optional close), **scroll body**, optional **footer**. **Token-only** surfaces (**`rounded-ops-card`**, **`border-ops-border`**, **`shadow-ops-1`**, **`bg-ops-surface`**).

| Prop | Notes |
|------|--------|
| **`title`** | Header line (**`ReactNode`**). |
| **`children`** | Scrollable body. |
| **`footer?`** | Optional pinned footer (primary actions). |
| **`onClose?`** | Header **X** — visible **`< lg`** by default (**`lg:hidden`** on the button). |
| **`showHeaderClose?`** | **`true`:** always show close; **`false`:** hide; **`undefined`:** responsive default. |

**`use client`** (interactive header/footer).

### Copy (`src/features/ops/copy/ops-split-view-copy.ts`)

**NFR.17.8** — **`closeDetailAriaLabel`**, **`detailPanelAriaLabel`**, **`detailSheetDialogTitle`**.

### Tablet / **FE.5.7**

**[`ops-console.md`](ops-console.md)** is not present in-repo at story time — use this substitute checklist (record in story **Progress Notes**):

1. **~768px:** open detail from a list row → drawer fills rail width cap; **Esc** closes; focus returns when **`listFocusReturnRef`** is set.  
2. **~1024px (`lg`):** rail appears inline; header close hidden; selection toggled from list.  
3. **~1280px (`xl`):** rail sticks while list scrolls (given a suitable parent height / scroll region).

### Tests

- **`OpsSplitView.test.tsx`** — **Esc**, header close → **`onCloseDetail`**; **`lg+`** no dialog; focus return with **`listFocusReturnRef`**.  
- **`OpsDetailRail.test.tsx`** — close callback; footer render.

---

<span id="parity-17-10"></span>

## FE.17.12 / Story 17.10 — `/ops/bookings` queue (Wheelzie **6**)

**Sources:** [`docs/epic-17.md`](epic-17.md) **FE.17.12** item **2**; [`docs/stories/17.10.story.md`](stories/17.10.story.md); Wheelzie **6** (bookings table + status pills + pagination) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### Task 0 decisions

| Topic | Decision |
|-------|-----------|
| **List sizing** | **`OPS_BOOKINGS_QUEUE_LIMIT`** (**100**) remains for **`/ops/walk-in`** and **`/ops/accounts`**; **`/ops/bookings`** uses **`page` × `per`** with **`.range(offset, offset + per − 1)`** and a **filtered `count`** — single source of page size on bookings (**no** double cap). |
| **Status / payment pills** | **`bookings.status`** → **`getBookingsQueueStatusPillTone`** (`ops-bookings-queue-pill-tones.ts`). **`bookings.payment_status`** → **`getBookingsQueuePaymentPillTone`** (avoids **`pending`** collision with trip vs payment in **`getOpsStatusPillTone`**). **`OpsStatusPill`** + **`formatQueueStatusLabel`** for visible text. |
| **Quote rejected** | Second **`OpsStatusPill`** (**`danger`**, **`dot={false}`**) when current quote **`status === 'rejected'`**. |
| **Intent / client** | **`OpsStatusPill`** **`neutral`**, **`dot={false}`** — labels from **`formatBookingIntentLabel`** / **`formatQueueStatusLabel`**. |
| **Customer column** | **`OpsAvatarCell`** (**`src: null`**, initials); primary **`customer_name`**; secondary **`customer_email`** or linked **`customer_accounts.name`**. |
| **Row hover** | **`BookingsQueueTableRow`:** **`hover:bg-ops-accent-soft`** (**NFR.17.4**). |
| **Detail rail** | **Out of scope** — **`OpsSplitView`** deferred (follow-up with **17.9**). |

### URL matrix (**`/ops/bookings`**)

| Param | Role |
|-------|------|
| **`status`**, **`payment`**, **`intent`**, **`client`** | Queue filters (unchanged semantics). **`getIgnoredBookingsQueueParamKeys`** ignores invalid filter tokens only — **not** **`page`/`per`**. |
| **`page`** | 1-based; coerced via **`coerceOpsPaginationPage`**; omitted from URL when **`1`**. |
| **`per`** | **`10` \| `20` \| `50`**; **`coerceOpsPaginationPerPage`**; default **20**; omitted when default. |

**`parseOpsBookingsQueueSearchParams`** returns **`OpsBookingsQueueParsed`** including **`page`** and **`perPage`**. **`serializeOpsBookingsQueueSearchParams`** serializes **filters only**; **`opsBookingsPathWithQuery`** composes via **`buildOpsPaginationHref`** (**Story 17.8**). **`opsBookingsQueueHref`** resets **`page`** to **`1`** when any of **`statuses` / `payments` / `intents` / `clients`** is overridden (unless **`overrides.page`** is explicit). **`OpsBookingsQueuePresetChips`** preserves **`perPage`** when toggling **Ready to assign** / clear.

### Copy (**NFR.17.8**)

**`src/features/ops/copy/ops-bookings-queue-copy.ts`** — page title/description, table caption, ignored-params status line.

### RSC boundary

**`src/app/(ops)/ops/bookings/page.tsx`** stays **RSC-first**. **`OpsPagination`**, **`OpsBookingsQueueFilters`**, **`BookingsQueueTableRow`**, **`OpsBookingsRealtimeBridge`**, and preset chips remain **client islands** (unchanged or additive).

### Tablet / **FE.5.7**

Same substitute as **§ 17.9** when **`ops-console.md`** is absent: verify filters + pager at **~768 / 1024 / 1280**; **Back** restores **`page`/`per`** + filters.

### Tests

- **`ops-bookings-queue-query.test.ts`** — **`page`/`per`** parse; **`opsBookingsPathWithQuery`**; **`opsBookingsQueueHref`** filter change resets page with **`per`** preserved.  
- **`ops-bookings-queue-pill-tones.test.ts`** — booking vs payment **`pending`** tone split.  
- **`BookingsQueuePresentation.test.tsx`** — visible pill labels; **jest-axe** on minimal **`OpsTableShell`** row.

---

<span id="parity-17-11"></span>

## FE.17.12 / Story 17.11 — `/ops/clients` (Wheelzie **3**)

**Sources:** [`docs/stories/17.11.story.md`](stories/17.11.story.md); **FE.17.5** / **FE.17.12** item **5**; Wheelzie image **3** (clients roster — checkbox column, avatar + identity, dense table, profile rail) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **Account vs walk-in** | **`OpsSplitView` + detail rail** apply to **account clients** (`customer_accounts`) only. **Walk-in** aggregate table stays **list-only** (no URL `id`, no split) — second-pass optional. |
| **Columns vs epic row** | **Client** = **`OpsAvatarCell`** (name + slug secondary). **Domains** = `authorized_email_domains` (truncated summary). **Phone** = not on account row — em dash with tooltip note in copy. **Engagement / tier** = neutral **`OpsStatusPill`** label **“Corporate account”** (placeholder until product data exists — aligns with visual redesign **§ Wheelzie #3 / points** reframe). **Credit** = `credit_terms_days`. **Status** = `customer_accounts.status` → **`getOpsStatusPillTone`** (`active` / `on_hold` / `suspended` / `closed` added to **`ops-status-pill-tones.ts`**). **Documents** = placeholder column (**“None yet”**); rail section explains future documents. **Actions** = **Search bookings** (`/ops/search?q=…`). |
| **Detail rail MVP** | **Contact** (slug, approved domains, status), **Billing** (credit terms, contract window when present, created), **Recent bookings** (read-only `bookings` rows for `customer_account_id`, link to **`/ops/bookings/[id]`**), **Documents** placeholder, **Engagement** placeholder copy. |
| **Deep link** | Query param **`id`** = `customer_accounts.id` (UUID). Invalid / unknown **`id`** → server **`redirect('/ops/clients')`**. Clearing selection removes **`id`** from URL. **`OpsPagination` (`page` / `per`)** — **deferred**; when added, merge additively with **`id`** (same pattern as bookings filters + **`page`/`per`**). |
| **Bulk selection** | Header **select-all** + per-row checkboxes; **`aria-label`**s from **`ops-clients-copy`**. Toolbar shows **“N selected”** + **disabled** **Bulk actions** button (title explains follow-up story — **no** mutations). |
| **RSC boundary** | **`page.tsx`** remains **RSC** (Supabase reads + redirect). **`OpsClientsAccountSection`** is the **client island** (**split**, selection checkboxes, **`useRouter`** for URL updates). **`OpsAvatarCell`**, **`OpsStatusPill`** stay **server-friendly** inside the client subtree. |
| **Focus / Esc** | **`listFocusReturnRef`** + **`data-ops-client-row`** fallback after **`router.push`** clears **`id`**; drawer **Esc** via **`OpsSplitView`** (**17.9**). |

### URL matrix (`/ops/clients`)

| Param | Role |
|-------|------|
| **`id`** | Optional. When set to a known account id, opens **detail rail** (and loads **recent bookings** slice on the server). Omitted when no selection. |

### Copy (**NFR.17.8**)

**`src/features/ops/copy/ops-clients-copy.ts`** — page strings, table caption, checkbox **`aria-label`s**, bulk toolbar, detail section headings / placeholders.

### URL helpers

**`src/lib/ops-clients-url.ts`** — **`getRawOpsClientsSelectedId`**, **`parseOpsClientsPageSearchParams`**, **`buildOpsClientsHref`**, **`OPS_CLIENTS_PATH`**. Covered by **`ops-clients-url.test.ts`**.

### Tablet / **FE.5.7**

Same substitute as **§ 17.9** when **`ops-console.md`** is absent: **~768px** drawer + **Esc** + focus return; **~1024px** inline rail; **~1280px** sticky rail.

### Tests

- **`ops-clients-url.test.ts`** — parse / build.  
- **`OpsClientsAccountSection.test.tsx`** — select-all + row **`router.push`**; **jest-axe** with rail open.

---

<span id="parity-17-12"></span>

## FE.17.6 / Story 17.12 — `/ops/vehicles` (Wheelzie **7**, **8**, **9**)

**Sources:** [`docs/stories/17.12.story.md`](stories/17.12.story.md); **FE.17.5** (list + detail rail); **FE.17.6** (`OpsCardGrid`); **FE.17.12** rollout **item 6** (surface: vehicles); Wheelzie **7** (card grid), **8** (detail hero + sections), **9** (list image-left) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **`view` + `id`** | **`view`** ∈ **`list`** (default, omitted from URL) \| **`grid`** (`?view=grid`). **`id`** = selected **`vehicles.id`** for **`OpsSplitView`** detail rail. **Invalid `id`** → **`redirect('/ops/vehicles')`** (same pattern as **17.11** clients). **Toggling `view`** preserves **`id`**; **changing selection** preserves **`view`**. |
| **Fleet status pill** | **`vehicle_condition`** + **active (non-terminal) trip count** from existing page aggregation → **`getVehicleFleetStatusKey` / `getVehicleFleetStatusLabel` / `getVehicleFleetStatusPillTone`** in **`src/features/ops/lib/ops-vehicles-fleet-status.ts`** (**On trip**, **Available**, **Maintenance**, **Unavailable**) — avoids overloading **`getOpsStatusPillTone`** with fleet-specific semantics (**17.10** bookings-queue pattern). |
| **Activity chart** | **Placeholder** copy only — no fabricated series (**NFR.17.6**); real analytics deferred. |
| **`AssignBookingPanel`** | **Pattern B:** secondary **“Assign to trip”** links to **`/ops/fulfil`** (no embedded panel on this route — avoids duplicating fulfil data loads / role wiring). |
| **`OpsPagination`** | **Deferred**; **`page`/`per`** documented as future merge with **`view`** + **`id`**. |
| **Shared types** | **`OpsFleetVehicleRow`** / **`OpsFleetCategoryOption`** live in **`src/features/ops/ops-fleet-types.ts`** to avoid circular imports between **`OpsVehiclesFleetPanel`**, **`OpsVehiclesFleetBrowser`**, **`OpsVehicleFleetCard`**. |

### `OpsCardGrid` (`src/features/ops/components/OpsCardGrid.tsx`)

| Prop | Notes |
|------|--------|
| **`children`** | Card cells; each vehicle card uses **`role="listitem"`** on **`OpsVehicleFleetCard`**. |
| **`className?`** | Optional grid override. |

Default layout: **`grid gap-4 sm:grid-cols-2 xl:grid-cols-3`**; wrapper **`role="list"`** (**FE.17.6**).

### `OpsVehicleFleetCard` (`src/features/ops/components/OpsVehicleFleetCard.tsx`)

| Area | Notes |
|------|--------|
| **Image** | **`aspect-video`** container; **`next/image`** **`fill`** when **`primary_image_url`** set; **Car** silhouette + token background when missing — **fixed aspect**, **no CLS** from layout shift. |
| **Content** | Category line, display name, plate, **`OpsStatusPill`**, Lucide **Users / Gauge / Fuel** quick stats, **Open** ( **`router`** from parent via callback) + **Assign to trip** link. |

### URL matrix (`/ops/vehicles`)

| Param | Role |
|-------|------|
| **`view`** | **`grid`** shows **`OpsCardGrid`**; any other / absent → **list** table. |
| **`id`** | Optional selected vehicle UUID for detail rail. |

### Copy (**NFR.17.8**)

**`src/features/ops/copy/ops-vehicles-copy.ts`** — page title/description, view toggle **`aria-label`**, table caption, grid region label, detail sections, CTA strings, **no** “rental” vocabulary on add-vehicle subtitle (**NFR.17.7**).

### URL helpers

**`src/lib/ops-vehicles-url.ts`** — **`parseOpsVehiclesPageView`**, **`parseOpsVehiclesPageSelectedId`**, **`getRawOpsVehiclesSelectedId`**, **`buildOpsVehiclesHref`**, **`OPS_VEHICLES_PATH`**.

### RSC boundary

**`src/app/(ops)/ops/vehicles/page.tsx`** — **RSC**: Supabase reads, **`activeTripCountByVehicleId`**, **`redirect`** on bad **`id`**, passes **`view`** + **`selectedVehicleId`**. **`OpsVehiclesFleetPanel`** remains **client** (forms, dialogs, **`router.refresh`**); **`OpsVehiclesFleetBrowser`** handles **split**, **list/grid**, **URL navigation** (**`next/link`** **`scroll={false}`** on view toggle).

### Tablet / **FE.5.7**

Same substitute as **§ 17.9** / **§ 17.11** when **`ops-console.md`** is absent.

### Tests

- **`ops-vehicles-url.test.ts`** — **`buildOpsVehiclesHref`** merge **`view` + `id`**.  
- **`ops-vehicles-fleet-status.test.ts`** — status key / label / tone matrix.  
- **`OpsVehiclesFleetBrowser.test.tsx`** — **`router.push`** on row activate; **jest-axe** ( **`matchMedia` lg** ) with rail open.

---

<span id="parity-17-13"></span>

## FE.17.5 / Story 17.13 — `/ops/trips` — FE.17.12 rollout item 4 (split list + trip detail rail)

**Sources:** [`docs/stories/17.13.story.md`](stories/17.13.story.md); **FE.17.5** (split list / detail); **FE.17.12** rollout **item 4** (surface: trips); Wheelzie **#4** (tracking split + map + detail card) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md) — **Vestroo** wording only (**NFR.17.7**); canonical PNG index [`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **URL** | **`?id=`** only (no **`/ops/trips/[id]`** segment). **`buildOpsTripsHref`** / **`parseOpsTripsPageSelectedId`** in **`src/lib/ops-trips-url.ts`**. **Invalid `id`** (unknown UUID or not in current list) → **`redirect('/ops/trips')`** — same posture as **17.11** / **17.12**. |
| **`page` / `per`** | **Deferred** — list remains **`.limit(40)`** until **Story 17.8** wires **`OpsPagination`** here; **`id`** is the only query param today (**no collisions**). |
| **`TripOpsForms`** | **Pattern A:** forms **only** in **`OpsDetailRail`** **`footer`** (**`OpsTripsSplitBrowser`**). List rows are select-only + **Close protection** link. |
| **Trip **`status`** → pill** | **`getOpsStatusPillTone`** extended with **`booking` → `warning`**; **`assigned`**, **`en_route`**, **`completed`**, **`cancelled`** unchanged. Display label via **`tripStatusDisplayLabel`** in **`ops-trips-copy.ts`**. |
| **Comms / activity** | **Stub** — empty-state copy only (**NFR.17.6**, no fake thread). |
| **Map** | **Non-interactive** placeholder: **`aspect-[16/10]`** container, **`role="img"`** + **`aria-label`**, token **`bg-ops-surface-active`** / border — **no** map SDK (**NFR.17.2**). |
| **Delay styling** | **`text-ops-warning`** / **`bg-ops-warning/10`** (replacing raw amber utilities). |
| **Tablet / FE.5.7** | Same substitute as **§ 17.9** / **§ 17.11** when **`ops-console.md`** is absent. |

### URL matrix (`/ops/trips`)

| Param | Role |
|-------|------|
| **`id`** | Optional selected **`trips.id`** for detail rail. Omitted when none. |

### Components

| Piece | Location |
|-------|----------|
| **`OpsTripsSplitBrowser`** | **`src/features/ops/components/OpsTripsSplitBrowser.tsx`** — **`'use client'`**; **`OpsSplitView`** + dense **`OpsTableShell`** list; **`OpsDetailRail`** body (summary, vehicle image/fallback, map placeholder, comms stub) + **`TripOpsForms`** footer. |
| **RSC page** | **`src/app/(ops)/ops/trips/page.tsx`** — Supabase reads (**`trips`**, **`vehicles`** incl. **`primary_image_url`**, **`profiles`**), **`redirect`** on bad **`id`**, passes **`selectedTripId`**. |

### Copy (**NFR.17.8**)

**`src/features/ops/copy/ops-trips-copy.ts`** — page strings, table caption, row **`aria-label`**, map/comms labels, close-protection link text, **`tripStatusDisplayLabel`**.

### Tests

- **`ops-trips-url.test.ts`** — build/parse **`id`**.  
- **`ops-trips-copy.test.ts`** — status label helper.  
- **`ops-status-pill-tones.test.ts`** — **`booking`** tone.  
- **`OpsTripsSplitBrowser.test.tsx`** — row **`router.push`**; **jest-axe** with rail open (**`TripOpsForms`** stubbed).

---

<span id="parity-17-14"></span>

## FE.17.9 / Story 17.14 — `OpsCalendarWeek` + `/ops/calendar` (FE.17.12 rollout item 7)

**Sources:** [`docs/stories/17.14.story.md`](stories/17.14.story.md); **FE.17.9**; **FE.17.12** rollout **item 7**; Wheelzie **#5** via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md) and [`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **Libraries** | **No** **`react-big-calendar`** — **`OpsCalendarWeek`** uses **CSS** positioning + flex/grid (**NFR.17.2**). |
| **Week URL** | **`?week=`** = **`YYYY-MM-DD`** for **any** day; server normalizes to **Monday** (local). Non-Monday → **`redirect`** to canonical **`week`**. Malformed **`week`** → **`redirect('/ops/calendar')`**. |
| **Selection** | **`?id=`** = **`trips.id`**. Unknown **`id`** for loaded week → **`redirect`** with same **`week`** + **`view`**, **`id` stripped**. |
| **View toggle** | **`?view=list`** agenda vs default **week** grid. **`min-h-[720px]`** on both modes — **no CLS** toggling (**week ↔ list**). **`OpsCalendarMonth`** / **`/ops/roster`** → **Story 17.15**, **out of scope**. |
| **Data** | **`trips`** in **`[weekStart, weekStart+7d)`** via **`.gte` / `.lt`** on **`time_start_estimate`**, **`.limit(200)`**. Select **`TRIPS_CALENDAR_SELECT_COLUMNS`** (nested **`vehicles(name)`**, **`booking_trips(bookings(...))`**) — **RLS-only** reads (**NFR.17.6**). |
| **`events.tone`** | **`getOpsStatusPillTone(trip.status)`** — same tokens as **`OpsStatusPill`**. |
| **Now line** | Rendered **only after `useEffect` mount** to avoid SSR/client clock skew; updates every **60s** on client. |
| **Midnight / long events** | Event blocks **clip** to the visible day column and **`startHour`–`endHour`** band; overnight spans **not** duplicated across columns (**MVP**). |
| **Keyboard** | **`OpsCalendarWeek`** region **`tabIndex={0}`**; **Arrow** keys rove **`data-calendar-event`** focus; **Enter** / click activates selection (**`router.push`**). **Esc** on document closes rail (**`OpsCalendarShell`**). |
| **Tablet / FE.5.7** | Same substitute as **§ 17.9** / **§ 17.13** when **`ops-console.md`** absent. |

### `OpsCalendarWeek` props (summary)

| Prop | Role |
|------|------|
| **`weekStartYmd`** | Monday **`YYYY-MM-DD`** (local). |
| **`events`** | **`{ id, startsAt, endsAt, title, subtitle, tone, href? }[]`**. |
| **`startHour` / `endHour`** | Default **6** / **24** (exclusive end). |
| **`selectedEventId`**, **`onActivateEvent`** | Controlled selection + click / **Enter** handler. |

### URL matrix (`/ops/calendar`)

| Param | Role |
|-------|------|
| **`week`** | Optional; normalized **Monday** **`YYYY-MM-DD`**. |
| **`id`** | Optional selected trip (**`trips.id`**). |
| **`view`** | **`list`** = agenda; else **week** grid. |

### Files

| Piece | Location |
|-------|----------|
| **`OpsCalendarWeek`** | **`src/features/ops/components/OpsCalendarWeek.tsx`** — client grid + overlap stacking + **today** column + **now** line. |
| **`OpsCalendarShell`** | **`src/features/ops/components/OpsCalendarShell.tsx`** — toolbar, week/list toggle, **`OpsSplitView`**, **`OpsDetailRail`**, **Esc** close. |
| **URL helpers** | **`src/lib/ops-calendar-url.ts`**. |
| **Trip → events** | **`src/features/ops/lib/map-ops-calendar-trips.ts`**. |
| **Copy** | **`src/features/ops/copy/ops-calendar-copy.ts`**. |
| **RSC page** | **`src/app/(ops)/ops/calendar/page.tsx`**. |

### Tests

- **`ops-calendar-url.test.ts`** — week math, **`buildOpsCalendarHref`**, parse helpers.  
- **`map-ops-calendar-trips.test.ts`** — mapping smoke.  
- **`OpsCalendarShell.test.tsx`** — **jest-axe** with rail open.

---

<span id="parity-17-15"></span>

## FE.17.9 / Story 17.15 — `OpsCalendarMonth` + `/ops/roster` (FE.17.12 rollout item 8)

**Sources:** [`docs/stories/17.15.story.md`](stories/17.15.story.md); **FE.17.9**; **FE.17.12** rollout **item 8**; Wheelzie **#5** via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md) and [`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **`OpsCalendarMonth` first consumer** | **(A)** **`/ops/roster`** — **week \| month** toggle on the same page (**no** duplicate month on **`/ops/calendar`** in this story). |
| **URL** | **`?view=week`** (default) \| **`month`**. **`week=`** Monday **`YYYY-MM-DD`** (same normalization as **17.14**). **`month=`** **`YYYY-MM`**. **`driver=`** = **`profiles.id`** (ops driver). **`shift=`** = **`chauffeur_schedules.id`**. Invalid **`week`/`month`/`driver`/`shift`** → **`redirect`** stripping bad params (**align** **17.14**). |
| **Shift → `events` time bands** | **`map-roster-shifts-to-events.ts`** — **`work_date`** + **`shift`** label → **local same-day** band (**morning**/**a** 06–14, **afternoon**/**b** 14–22, **night**/**c** 22–24, else **06–22**). **No** clock columns in DB — bands are **UI placeholders** only. |
| **Rail / forms** | **Read-only** detail + **`opsRosterCopy.readOnlyShiftNote`** — **no** new mutations (**NFR.17.6**). Driver-only rail lists shifts in range with links to set **`?shift=`**. |
| **No CLS** | **`min-h-[720px]`** on week + month main regions inside **`OpsRosterShell`**. |
| **Primitives** | **`OpsCalendarWeek`** reused from **17.14**; **`OpsCalendarMonth`** new; **`OpsSplitView`** / **`OpsDetailRail`** from **17.9**. **No** **`react-big-calendar`**. |

### `OpsCalendarMonth` (summary)

| Area | Notes |
|------|--------|
| **Grid** | **6×7** cells (**42** days), Monday-leading week row, muted **out-of-month** cells. |
| **Chips** | **Max 3** per day + **`+n more`** toggles expanded list (**no** extra route). |
| **`events`** | Same **`OpsCalendarWeekEvent`** shape as **17.14** (**`id`** = schedule row id). |

### URL matrix (`/ops/roster`)

| Param | Role |
|-------|------|
| **`view`** | **`month`** \| **`week`** (default). |
| **`week`** | Week anchor (**Monday **`YYYY-MM-DD`**), week view. |
| **`month`** | **`YYYY-MM`**, month view. |
| **`driver`** | Optional selected driver (**`profiles.id`**). |
| **`shift`** | Optional selected shift (**`chauffeur_schedules.id`**). |

### Files

| Piece | Location |
|-------|----------|
| **`OpsCalendarMonth`** | **`src/features/ops/components/OpsCalendarMonth.tsx`**. |
| **`OpsRosterShell`** | **`src/features/ops/components/OpsRosterShell.tsx`**. |
| **URL** | **`src/lib/ops-roster-url.ts`**. |
| **Shift → events** | **`src/features/ops/lib/map-roster-shifts-to-events.ts`**. |
| **Copy** | **`src/features/ops/copy/ops-roster-copy.ts`**. |
| **RSC page** | **`src/app/(ops)/ops/roster/page.tsx`**. |

### Tests

- **`ops-roster-url.test.ts`** — **`buildOpsRosterHref`**, **`parseMonthYm`**, **`addMonthsYm`**.  
- **`map-roster-shifts-to-events.test.ts`** — band + mapping smoke.

---

<span id="parity-17-16"></span>

## FE.17.12 / Story 17.16 — `/ops/invoicing` (Wheelzie **Payments** KPI strip + queue)

**Sources:** [`docs/stories/17.16.story.md`](stories/17.16.story.md); **FE.17.4** (`OpsKpiCard`), **FE.17.12** rollout **item 9**; Wheelzie **#2** (Payments — Completed / Awaiting / Overdue KPIs above invoice table) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **KPI ↔ metric** | **Completed** → head count `bookings.status = ready_to_invoice` ∧ `client_type = account_client`. **Awaiting** → head count `invoiced` ∧ account client. **Overdue** → count of invoiced account rows whose **derived** due date (`trip_completed_at` + credit terms, UTC calendar, same mapper as queue) is **before today UTC**, scanned up to **`OPS_INVOICING_OVERDUE_SCAN_LIMIT` (500)** newest-by-`updated_at` rows — if the scan hits the cap, **`overdueScanCapped`** is true in the KPI snapshot (parity Progress Notes). |
| **KPI scope** | **Global** scorecards on **all** tabs (including **Corporate hooks**) — density aligned with Wheelzie reference strip. |
| **`bucket` vs `tab`** | Epic drill **`?bucket=`** aliases: **`completed` → Ready tab** (canonical `tab` omitted); **`awaiting`** / **`overdue` → `tab=invoiced`**. Unknown **`bucket`** → amber status strip; **`bucket`** stripped via **`redirect`** when aliased (**`buildInvoicingBucketRedirectUrl`**). |
| **`OPS_INVOICING_QUEUE_LIMIT` (150)** | Still caps the **PostgREST** select for the **queue table** (`fetchInvoicingQueueBookings`). **Pagination** (`page` / `per` via **`OpsPagination`**) slices the **already-fetched** queue client-side — total pages ≤ **`ceil(min(count_loaded, 150) / per)`**. No second hidden cap: the **150** row cap is the fetch ceiling document here; overdue KPI uses a separate bounded scan. |
| **Sort vs pagination** | Column sort remains **client-side** on the loaded slice (max **150** rows); paginator **`totalCount`** uses **sorted** row length. |

### URL matrix (`/ops/invoicing`)

| Param | Role |
|-------|------|
| **`tab`** | **`ready`** (default) \| **`invoiced`** \| **`hooks`** — **`parseOpsInvoicingTabParam`**. |
| **`bucket`** | Optional epic alias → **`redirect`** to canonical **`tab`** + **`page`/`per`** preserved — **`src/lib/ops-invoicing-url.ts`**. |
| **`page`**, **`per`** | **`OpsPagination`** — merged with **`serializeOpsInvoicingPaginationQuery`** (preserves **`tab`**). |

### Components & files

| Piece | Location |
|-------|----------|
| **KPI band** | **`OpsInvoicingKpiBand`** — **`OpsKpiCard`** + **`OpsSparkline`** (`opsInvoicingDemoSparklinePoints`). |
| **Copy** | **`src/features/ops/copy/ops-invoicing-copy.ts`** (**NFR.17.8**). |
| **KPI loaders** | **`src/lib/ops-invoicing-kpis.ts`** (`fetchInvoicingKpiSnapshot`). |
| **Queue** | **`OpsInvoicingQueueClient`** — **`OpsStatusPill`** (**pipeline** + optional **Overdue**), **`OpsAvatarCell`**, **`hover:bg-ops-accent-soft`**, **`OpsPagination`**. |
| **URL** | **`src/lib/ops-invoicing-url.ts`**. |

### `OpsStatusPill` column map

| Column | Tone source |
|--------|-------------|
| **Status** | **`getBookingsQueueStatusPillTone('ready_to_invoice' \| 'invoiced')`** + optional **`danger`** pill when overdue (derived due vs today). |

### RSC boundary

**`src/app/(ops)/ops/invoicing/page.tsx`** — **RSC**: Supabase reads, **`redirect`** for **`bucket`** + out-of-range **`page`**, **`OpsInvoicingKpiBand`**. **`OpsInvoicingQueueClient`** — client (sort, CSV, row actions, pagination chrome).

### Tablet / **FE.5.7**

Use **[`docs/ops-console.md`](ops-console.md)** checklist for **`/ops/invoicing`** (sidebar drawer **768px**, desktop chrome **≥1024px**).

### Tests

- **`ops-invoicing-url.test.ts`** — **`bucket`** redirects + **`serializeOpsInvoicingPaginationQuery`**.  
- **`ops-invoicing-kpis.test.ts`** — overdue predicate smoke.

---

<span id="parity-17-17"></span>

## FE.17.12 / Story 17.17 — `/ops/comms`, `/ops/compliance`, `/ops/close-protection`, `/ops/experiences` (chrome polish)

**Sources:** [`docs/stories/17.17.story.md`](stories/17.17.story.md); **FE.17.12** rollout **items 10–11**; Wheelzie **#1** (dense tables + status), **#10** (recent activity feed pattern for comms — **not** duplicated on `/ops` dashboard per visual-redesign mapping) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **Comms activity timeline** | **Read-only** vertical timeline built from **`buildCommsRegistryActivityFeed(rules, templates)`** — merges **`updated_at`** from loaded dispatch rules + template metadata, sorted newest-first, capped (**24**). **No** fabricated events (**NFR.17.6**). |
| **`OpsPagination`** | **Deferred** on all four routes — no new **`page`/`per`** in this story. |
| **Copy** | One export per route: **`ops-comms-copy.ts`**, **`ops-compliance-copy.ts`**, **`ops-close-protection-copy.ts`**, **`ops-experiences-copy.ts`**. |
| **Close protection header** | **`OpsPageHeader`** + **`OpsFilterRow`** replace raw **`h1`** / intro paragraph; filter summary + **Clear** link live in the filter row. |

### Route matrix

| Route | Primitives / polish |
|-------|----------------------|
| **`/ops/comms`** | **`OpsCommsRegistryClient`**: activity timeline section; **`OpsTableShell`** tables with **`hover:bg-ops-accent-soft`**; **`OpsStatusPill`** for active + channel; token error alert; **`ops-comms-copy`**. |
| **`/ops/compliance`** | Incidents list: **`OpsStatusPill`** (category); doc tables: **`OpsStatusPill`** for document type; row/list **`hover:bg-ops-accent-soft`**; **`ops-compliance-copy`**; **`ComplianceDsrPanel`** token border (**amber** / ops). |
| **`/ops/close-protection`** | **`OpsPageHeader`**, **`OpsFilterRow`**, engagement cards **`OpsStatusPill`** via **`getOpsStatusPillTone`**, hover soft accent; **`ops-close-protection-copy`**. |
| **`/ops/experiences`** | **`OpsFilterRow`**; bookings table **`OpsAvatarCell`** + **`OpsStatusPill`** (intent); package grid **`OpsStatusPill`** Active/Inactive; row hover; **`ops-experiences-copy`**. |

### RSC / client boundaries

| Page | Server | Client |
|------|--------|--------|
| **Comms** | **`page.tsx`** — load registry | **`OpsCommsRegistryClient`** — rules/templates/timeline |
| **Compliance** | **RSC** full page | **`ComplianceDsrPanel`** |
| **Close protection** | **RSC** list + URL parse | **`CloseProtectionCreateForm`** |
| **Experiences** | **RSC** packages + bookings | **`OpsExperiencePackagesPanel`** |

### Tests

- **`comms-registry-activity.test.ts`** — feed sort + limit.

### Tablet / **FE.5.7**

Spot-check all four routes per **[`docs/ops-console.md`](ops-console.md)** (sidebar drawer **768px**, desktop **≥1024px**).

---

<span id="parity-17-18"></span>

## FE.17.12 / Story 17.18 — `/ops/settings` (index + bank-account + service-runs)

**Sources:** [`docs/stories/17.18.story.md`](stories/17.18.story.md); **FE.17.12** rollout **item 12**; Wheelzie **#7** (card grid density), **#6** (dense tables + row hover) via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md) and [`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **Index IA** | **`§ Configuration`** heading + **two-up card grid** (**`sm:grid-cols-2`**) linking **`/ops/settings/service-runs`** and **`/ops/settings/bank-account`** — **no** new routes. |
| **Copy** | Single namespaced module **`src/features/ops/copy/ops-settings-copy.ts`** (**`index`**, **`bankAccount`**, **`serviceRuns`**). |
| **`OpsStatusPill`** | **Active patterns** table on **`service-runs`**: pattern **`status`** → **`getOpsStatusPillTone`**, visible label via **`formatPatternStatusLabel`** (humanises DB enums). |
| **Auth boundaries** | **`requireOpsStaffPage`** (**index**, **`service-runs`**) and **`requireOpsAdminPage`** (**`bank-account`**) — **unchanged** call sites and semantics (**NFR.17.6**). |

### Route matrix

| Route | Primitives / behaviour |
|-------|-------------------------|
| **`/ops/settings`** | **`OpsPageHeader`** + card grid (**`hover:bg-ops-accent-soft`** on cards); **`h2`** “Configuration”. |
| **`/ops/settings/bank-account`** | **`OpsPageHeader`** + **`OpsBankAccountSettingsForm`** — sections **Bank details** / **Payment references** (**token** borders); back link **`/ops/invoicing`**. |
| **`/ops/settings/service-runs`** | **`OpsPageHeader`** + **`OpsServiceRunsSettingsForm`** + **`OpsTableShell`** (**Active patterns**, **Recent runs**); **`tbody tr`** **`hover:bg-ops-accent-soft`**. |

### `OpsStatusPill` column map (`service-runs`)

| Column | Tone source |
|--------|-------------|
| **Status** (patterns table) | **`getOpsStatusPillTone(pattern.status)`** — empty → **no** pill (**em dash**). |

### RSC / client boundaries

| Surface | Server | Client |
|---------|--------|--------|
| **Settings index** | **RSC** full page | — |
| **Bank account** | **RSC** loader + **`requireOpsAdminPage`** | **`OpsBankAccountSettingsForm`** |
| **Service runs** | **RSC** loaders + **`requireOpsStaffPage`** | **`OpsServiceRunsSettingsForm`** |

### Tablet / **FE.5.7**

Spot-check **index**, **`bank-account`**, **`service-runs`** at drawer (**~768px**) and desktop (**≥1024px**) per **[`docs/ops-console.md`](ops-console.md)** shell guidance.

### Tests

- **`ops-settings-copy.test.ts`** — copy module smoke (**namespaces** present).

---

<span id="parity-17-19"></span>

## FE.17.11 / Story 17.19 — `/ops/login` (`OpsLoginForm`)

**Sources:** [`docs/stories/17.19.story.md`](stories/17.19.story.md); **FE.17.11**; **FE.17.12** rollout **item 13**; Wheelzie SaaS sign-in density via [`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md) and [`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md).

### Task 0 decisions (reconciliation)

| Topic | Decision |
|-------|-----------|
| **`data-ops-theme`** | **`src/app/(public-ops)/layout.tsx`** wraps **`(public-ops)`** tree with **`data-ops-theme="light"`** + **`bg-ops-canvas`** — **does not** inherit authenticated **`OpsShellClient`** dark theme (**NFR.17.4**). |
| **Forgot password** | No in-app **`resetPasswordForEmail`** route at ship time — **`opsLoginCopy.forgotPasswordHref`** = **`/contact`** (request assistance). Document when a dedicated recovery route is added. |
| **Card chrome** | **`rounded-ops-card`**, **`border-ops-border`**, **`bg-ops-surface`**, **`shadow-ops-2`**. |
| **Brand mark** | **`VestrooMark`** from **`src/components/brand/VestrooMark.tsx`** above the card (**`aria-label`** via copy **`brandAria`**). |
| **Copy** | **`src/features/ops/copy/ops-login-copy.ts`** — all user-visible strings (**NFR.17.8**). |

### URL / query contract (`next`)

| Param | Behaviour |
|-------|-----------|
| **`next`** | If present and starts with **`/ops`**, passed to **`OpsLoginForm`** as **`nextPath`**; else default **`/ops/board`** (unchanged). |

### A11y & autofill

| Item | Notes |
|------|--------|
| **WCAG** | Error region **`role="alert"`**; links and submit use **`focus-visible:ring-2`** **`ring-ops-accent`** with **`ring-offset-ops-surface`**. |
| **Autofill** | **`autoComplete="username"`** (email), **`autoComplete="current-password"`** (password). |

### Files

| Piece | Location |
|-------|----------|
| **Layout (theme)** | **`src/app/(public-ops)/layout.tsx`**. |
| **Page** | **`src/app/(public-ops)/ops/login/page.tsx`**. |
| **Form** | **`src/features/ops/components/OpsLoginForm.tsx`** — primary submit **`bg-ops-accent`** (**rust** CTA). |
| **Copy** | **`src/features/ops/copy/ops-login-copy.ts`**. |

### Tests

- **`ops-login-copy.test.ts`** — export smoke.

### Mobile / **FE.5.7**

Spot-check **`/ops/login`** at narrow (~**390px**) and tablet (**768px**) widths; **`docs/ops-console.md`** has no dedicated login lines — use parity substitute in story **Progress Notes**.

---

<span id="parity-18-master-index"></span>

## Epic 18 — Account portal (`/account/*`) — § 18 master index

This block is the **authoritative entry point** for **[Epic 18](epic-18.md)** in this document. Subsections **[§ 18.1](#parity-18-1)**–**[§ 18.12](#parity-18-12)** mirror repo stories **18.1**–**18.12** (incremental parity). **FE.18.13** (shared SaaS primitives) is documented under **[Story 18.3 / § 18.3](#parity-18-3)**; **Story 18.13** closes the **documentation** obligation for **FE.18.13** — it does **not** ship **`src/components/saas/`** code (**Story 18.3**).

### Story ↔ epic requirement ↔ parity anchor

| Story | Epic requirement (FE) | Parity |
|------|------------------------|--------|
| **18.1** | **[FE.18.1](epic-18.md#fe181-account-token-namespace-and-theme-wrapper)** — account token namespace + `data-account-theme` | **[#parity-18-1](#parity-18-1)** |
| **18.2** | **[FE.18.2](epic-18.md#fe182-persistent-shell-sidebar-top-bar)** — persistent shell (sidebar + top bar) | **[#parity-18-2](#parity-18-2)** |
| **18.3** | **[FE.18.13](epic-18.md#fe1813-shared-saas-primitives-with-ops)** — shared SaaS primitives (`saas/` + `theme`) | **[#parity-18-3](#parity-18-3)** |
| **18.4** | **[FE.18.3](epic-18.md#fe183-dashboard-redesign-scorecards-upcoming-trips-recent-invoices)** — dashboard | **[#parity-18-4](#parity-18-4)** |
| **18.5** | **[FE.18.4](epic-18.md#fe184-account-bookings-redesign-table-detail-rail)** — bookings | **[#parity-18-5](#parity-18-5)** |
| **18.6** | **[FE.18.5](epic-18.md#fe185-account-invoices-redesign-kpi-summary-table-detail-rail)** — invoices | **[#parity-18-6](#parity-18-6)** |
| **18.7** | **[FE.18.6](epic-18.md#fe186-account-members-redesign-roster)** — members | **[#parity-18-7](#parity-18-7)** |
| **18.8** | **[FE.18.7](epic-18.md#fe187-account-preferences-redesign-sectioned-settings)** — preferences | **[#parity-18-8](#parity-18-8)** |
| **18.9** | **[FE.18.8](epic-18.md#fe188-account-profile-new-member-level-page)** — profile | **[#parity-18-9](#parity-18-9)** |
| **18.10** | **[FE.18.9](epic-18.md#fe189-account-help-new-help-contact-surface)** — help / contact | **[#parity-18-10](#parity-18-10)** |
| **18.11** | **[FE.18.10](epic-18.md#fe1810-sign-in-and-invite-surfaces)** — sign-in & invite | **[#parity-18-11](#parity-18-11)** |
| **18.12** | **[FE.18.12](epic-18.md#fe1812-mobile-responsiveness)** — mobile responsiveness | **[#parity-18-12](#parity-18-12)** |

**FE.18.11** (empty states) has **no** dedicated **`#parity-18-*`** row — it lands across dashboard, bookings, lists, etc.; see **[FE.18.11](epic-18.md#fe1811-empty-states-and-onboarding-nudges)**.

### Glossary (§ 18)

| Term | Meaning |
|------|--------|
| **`data-account-theme`** | Layout attribute (e.g. **`"light"`**) on the account subtree wrapper — scopes **`--account-*`** CSS variables. See **[§ 18.1](#parity-18-1)**. |
| **`account.*` / `account-*` Tailwind** | Token namespace parallel to **`ops.*`** — **`bg-account-canvas`**, **`text-account-foreground`**, **`border-account-border`**, **`ring-account`**, sidebar width utilities, etc. Registered in **`tailwind.config.ts`**; vars under **`[data-account-theme='light']`** in **`globals.css`**. |
| **`theme="account"` \| `theme="ops"`** | Prop on shared **`src/components/saas/`** primitives (**`KpiCard`**, **`StatusPill`**, **`Pagination`**, rails, …). **`theme="account"`** is valid **only** under **`data-account-theme`** (**[§ 18.3](#parity-18-3)**). Ops wrappers pin **`theme="ops"`**. |
| **Booker vs admin** | **Booker** — book trips; **admin** — org administration (invoices, members, billing defaults). **NFR.18.1** (see **[Epic 18](epic-18.md)** — *Related Non-Functional Requirements*) — nav hides capability-gated items; direct URL still **403** / redirect. Sidebar grouping and visibility: **[§ 18.2](#parity-18-2)**. |

### Cross-reference — Epic 17 (ops sister epic)

Account portal **[Epic 18](epic-18.md)** reuses the **same presentation primitives** as **[Epic 17](epic-17.md)** ops console where possible (**FE.18.13**). Canonical ops primitives, routes, and **`#parity-17-*`** anchors live under **[§ 17 — Epic 17 (ops)](ops-design-system-parity.md#epic-17-parity)** — use the **Story → Anchor** table in that section, from **[#parity-17-1](#parity-17-1)** through **[#parity-17-19](#parity-17-19)**.

### NFR.18.4 — Theme isolation

**`data-account-theme`** (**NFR.18.4** — **[Epic 18](epic-18.md)** *Related Non-Functional Requirements*) MUST **not** appear on **`/ops/*`** or marketing / booking layouts. **`/account/login`**, **`/account/signup`**, **`/account/unauthorized`** use account tokens via **`(public-account)`** **`layout.tsx`** only (**no** `AccountShell`) — see **[§ 18.1](#parity-18-1)** and **[§ 18.11](#parity-18-11)**.

---

<span id="parity-18-1"></span>

## FE.18.1 / Story 18.1 — Account theme tokens (`data-account-theme="light"`)

**Sources:** [`docs/stories/18.1.story.md`](stories/18.1.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.1**; [`docs/design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) **§1.4**; HSL parity with [`docs/design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) **§1.2** (ops light semantics). **§ 18 index:** [master index (glossary & map)](#parity-18-master-index) — *this subsection is **FE.18.1** only.*

### Scoping (NFR.18.4)

| Surface | `data-account-theme` |
|--------|------------------------|
| **`/account/*` member portal** | Set on **`src/app/(account)/account/(portal)/layout.tsx`** — authenticated account subtree (**Story 18.1**). |
| **`/account/login`**, **`/account/signup`**, **`/account/unauthorized`** | Set on **`src/app/(public-account)/layout.tsx`** — **Story 18.11** / **FE.18.10**; **no** **`AccountShell`**. |
| **`/ops/*`** | Uses **`data-ops-theme`** only — **does not** set **`data-account-theme`**. |
| **Marketing / booking** | **` :root`** tokens unchanged; no account vars at document root. |

### Usage (composition)

Portal chrome composes **`account.*`** utilities resolved under the layout wrapper:

```tsx
<div data-account-theme="light" className="min-h-screen bg-account-canvas text-account-foreground">
  <header className="border-account-border bg-account-topbar border-b">
    <p className="text-account-muted">Secondary copy</p>
  </header>
  <section className="rounded-lg border border-account-border bg-account-surface p-4 shadow-sm">
    <span className="rounded-full bg-account-success px-2 py-0.5 text-xs text-account-success-foreground">
      Paid
    </span>
  </section>
</div>
```

### Implementation anchors

| Piece | Location |
|-------|----------|
| **CSS variables** | **`[data-account-theme='light']`** in **`src/app/globals.css`** |
| **Tailwind** | **`theme.extend.colors.account`**, **`width.account-sidebar*`**, **`ringColor.account`** — **`tailwind.config.ts`** |
| **Contract test** | **`src/features/account/account-layout-tokens.ts`** + **`account-layout-tokens.test.ts`** |

---

<span id="parity-18-2"></span>

## FE.18.2 / Story 18.2 — Account shell (`AccountShell`, `AccountSidebar`, `AccountTopBar`)

**Sources:** [`docs/stories/18.2.story.md`](stories/18.2.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.2**; mirrors [`src/features/ops/components/OpsShellClient.tsx`](../../src/features/ops/components/OpsShellClient.tsx) (mobile drawer, focus trap, **Esc**, focus restore). **§ 18 index:** [master index](#parity-18-master-index).

### Layout & scoping (NFR.18.4)

* **`data-account-theme="light"`** on **`src/app/(account)/account/(portal)/layout.tsx`** (Story **18.1**) wraps the authenticated portal; **`AccountShell`** lives **inside** that wrapper. **Sign-in** / **invite** / **unauthorized** stay **without** **`AccountShell`** but use the same tokens via **`src/app/(public-account)/layout.tsx`** (**Story 18.11** / **FE.18.10** — **[§ 18.11](#parity-18-11)**).
* Ops / marketing: **no** `data-account-theme` and **no** account shell on **`/ops/*`**.

### Shell behaviour (AC)

| Concern | Implementation |
|--------|------------------|
| **Desktop** | **`md+`**: sticky sidebar, **`w-account-sidebar`** / **`w-account-sidebar-collapsed`**, collapse control. |
| **Mobile** | **`< md`**: off-canvas drawer **`#account-sidebar-panel`**, backdrop (dismiss), **Tab** cycles focus **in-panel**, **Escape** closes and **restores focus** to the control that opened the drawer. |
| **Top bar** | **`AccountTopBar`**: **`AccountTopBarSearch`** (placeholder **“Search bookings, invoices…”**, **Enter** → **`/account/search?q=`**), **`AccountNotificationsBell`** (count prop; **0** until wired), **`AccountProfileMenu`** (**Profile** → **`/account/profile`**, **Switch organisation** for multi-member, **Sign out**). |
| **Copy** | **`src/features/account/copy/account-sidebar-copy.ts`**, **`account-top-bar-copy.ts`**, **`account-stub-pages-copy.ts`** (placeholder **help** / **search** routes only; **`account-profile-copy.ts`** for **`/account/profile`** — **Story 18.9**). |
| **Nav config** | **`src/features/account/account-nav-config.ts`** — grouped **Activity**, **Billing** (admin), **Organisation**, **Help**; **Trips** → **`/account/bookings?view=trips`**. |
| **Landmarks** | Skip link → **`#account-main`**; **`<main id="account-main" tabIndex={-1}>`**; sidebar **`nav[aria-label]`**; top bar **`header[role="banner"]`**. |
| **Focus** | **`ring-account`** on interactive controls. |

### Files

| Piece | Location |
|-------|----------|
| Shell | **`src/features/account/components/AccountShell.tsx`** |
| Sidebar / top bar | **`AccountSidebar.tsx`**, **`AccountTopBar.tsx`**, **`AccountTopBarSearch.tsx`**, **`AccountNotificationsBell.tsx`**, **`AccountProfileMenu.tsx`** |
| Layout | **`src/app/(account)/account/(portal)/layout.tsx`** (**`Suspense`** for **`useSearchParams`** in sidebar) |
| Thin routes | **`help/page.tsx`**, **`search/page.tsx`** — minimal RSC stubs (**`account-stub-pages-copy`**). **`profile/page.tsx`** — full member profile (**[§ FE.18.8 / Story 18.9](#parity-18-9)**). |

### Tests

* **`src/features/account/components/account-sidebar.test.tsx`**, **`account-top-bar.test.tsx`**

---

<span id="parity-18-3"></span>

## FE.18.3 / Story 18.3 — Shared SaaS primitives (`src/components/saas/`)

**Sources:** [`docs/stories/18.3.story.md`](stories/18.3.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.13**; **`Ops*`** wrappers remain under [`src/features/ops/components/`](../../src/features/ops/components/) for stable **`/ops/*`** imports. **§ 18 index:** [master index](#parity-18-master-index). Do **not** conflate **Story 18.3** (code) with **Story 18.13** (docs) or **FE.18.13** (requirement).

### Theme contract

| Pattern | Notes |
|--------|--------|
| **`theme="ops" \| "account"`** | Presentation primitives accept **`theme`** on shared components (**`KpiCard`**, **`StatusPill`**, **`Pagination`**, **`SplitView`**, **`DetailRail`**, **`EmptyState`**, **`LoadingRegion`**, charts, …). |
| **Ops wrappers** | **`OpsKpiCard`**, **`OpsPagination`**, … omit **`theme`** from their public props and pass **`theme="ops"`** internally. |
| **Account** | Use **`theme="account"`** only under **`data-account-theme`** (**[§ FE.18.1](#parity-18-1)**, **NFR.18.4**). |

### Primitive matrix (shared → ops wrapper)

| Shared (`src/components/saas/`) | Ops re-export | Epic 17 reference |
|--------------------------------|---------------|-------------------|
| **`KpiCard.tsx`**, **`KpiCardOverflowMenu.tsx`** | **`OpsKpiCard.tsx`**, **`OpsKpiCardOverflowMenu.tsx`** | KPI band — e.g. **§ FE.17.4** / dashboard stories |
| **`Sparkline.tsx`**, **`BarChart.tsx`**, **`DonutChart.tsx`**, **`AreaChart.tsx`**, **`ChartEmpty.tsx`** | **`OpsSparkline`**, **`OpsBarChart`**, **`OpsDonutChart`**, **`OpsAreaChart`**, **`OpsChartEmpty`** | Charts — **§ FE.17.7**, **`ops-chart-tones`** |
| **`chart-utils.ts`**, **`chart-tones.ts`** | **`ops-chart-utils.ts`** (re-export), **`ops-chart-tones.ts`** ( **`OpsChartTone`** aliases) | Tone mapping **§17.5** |
| **`StatusPill.tsx`**, **`AvatarCell.tsx`** | **`OpsStatusPill`**, **`OpsAvatarCell`** | Tables / lists — **§ FE.17.8** |
| **`Pagination.tsx`** | **`OpsPagination.tsx`** | Table footers — pagination URL helpers unchanged |
| **`SplitView.tsx`**, **`DetailRail.tsx`** | **`OpsSplitView`**, **`OpsDetailRail`** | List + detail — **§ FE.17.5** (`ops-split-view-copy`) |
| **`EmptyState.tsx`**, **`LoadingRegion.tsx`**, **`ErrorState.tsx`** | **`OpsEmptyState`**, **`OpsLoadingRegion`**, **`OpsErrorState`** | Data regions — **§ FE.5.3** |

### Barrel

* **`src/components/saas/index.ts`** — discoverability exports for account and cross-cutting imports.

### Tests

Co-located Vitest files under **`src/features/ops/components/`** (**`OpsKpiCard.test.tsx`**, **`OpsCharts.test.tsx`**, **`OpsPagination.test.tsx`**, **`OpsSplitView.test.tsx`**, **`OpsDetailRail.test.tsx`**, **`OpsAvatarCell.test.tsx`**, **`OpsStatusPill.test.tsx`**) exercise **`Ops*`** surfaces (implementation lives in **`saas/`**).

---

<span id="parity-18-4"></span>

## FE.18.3 / Story 18.4 — Account home dashboard (`/account`)

**Sources:** [`docs/stories/18.4.story.md`](stories/18.4.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.3**; primitives from **[Story 18.3 / FE.18.13](#parity-18-3)**. **§ 18 index:** [master index](#parity-18-master-index). **Do not** conflate with **FE.18.4** / **Story 18.5** (bookings table page).

### Section map (top → bottom)

| # | Block | Notes |
|---|--------|--------|
| **1** | **Welcome** | Organisation name (**`h1`**), role pill, signed-in email, muted **Last sign-in** from Supabase Auth **`user.last_sign_in_at`**. |
| **2** | **Scorecards** | **`KpiCard`** with **`theme="account"`**, **`scorecardOnly`** (no delta / sparkline band). **2×2** at **`sm`**, **4** columns at **`lg`**. **Admin-only** cards omitted for bookers (not zero-masked). |
| **3** | **Upcoming trips** | Future pickup + **non-terminal** pipeline statuses; horizontal scroll **`< md`**, **2-col `md+`**. **`StatusPill`**, **View details** → booking. Empty → **`EmptyState`** + CTA **`/book/search`**. |
| **4** | **Recent invoices** (admin) | **5** rows from invoice archive; **View all** → **`/account/invoices`**. |

### Deep links (KPI strip)

| Label | URL |
|-------|-----|
| Trips this month | **`/account/bookings?period=this_month`** (UTC month on **`pickup_datetime`**) |
| Upcoming trips | **`/account/bookings?status=upcoming`** (virtual filter; see **`ACCOUNT_DASHBOARD_UPCOMING_STATUSES`**) |
| Open invoices | **`/account/invoices?status=open`** (filters **ready_to_invoice** / **invoiced** rows) |
| Active members | **`/account/members`** |

### Copy & QA

* **Strings:** [`src/features/account/copy/account-dashboard-copy.ts`](../../src/features/account/copy/account-dashboard-copy.ts).
* **Visual density:** Wheelzie **#6** (KPI) / **#10** (dashboard) — **shuttle / chauffeur** vocabulary only.

### Tests

* **`src/lib/__tests__/account-bookings-epic-params.test.ts`**, **`account-dashboard-rail-status.test.ts`**

---

<span id="parity-18-5"></span>

## FE.18.4 / Story 18.5 — Bookings list + detail rail (`/account/bookings`)

**Sources:** [`docs/stories/18.5.story.md`](stories/18.5.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.4**; primitives from **[Story 18.3 / FE.18.13](#parity-18-3)**. **Do not** conflate with **FE.18.5** (invoices) / **Story 18.6**.

### Layout (filter row → table → **SplitView** + **DetailRail**)

```text
┌ Filter row (date range, quick window, status multi, trip type, search, legacy intent) ─┐
├ Dense table (ref, pickup, route, class, StatusPill, amount, kebab) ───────────────────┤
├ Pagination (theme=account, acct_page / acct_per, per hidden at 25) ───────────────────┤
└ When ?id= — right rail: map (Static Maps URL from server), trip, driver placeholder,  │
  quote timeline, actions (Modify → /book/search?…&modify=, Cancel, Re-book), admin PDF  │
```

* **URL state:** namespaced `acct_*` params + `id` for rail selection; dashboard **`period` / `status`** presets preserved (**Story 18.4**).
* **Static Maps:** `GOOGLE_MAPS_SERVER_KEY` in env; URL built in [`src/lib/google-static-map-url.server.ts`](../../src/lib/google-static-map-url.server.ts) only — **no** browser key, no Maps JS.
* **Copy:** [`src/features/account/copy/account-bookings-copy.ts`](../../src/features/account/copy/account-bookings-copy.ts).
* **Deep link:** legacy **`/account/bookings/[id]`** → **`/account/bookings?id=`** (redirect).

### Tests

* **`src/lib/__tests__/account-bookings-epic-params.test.ts`** (URL / parse helpers)

---

<span id="parity-18-6"></span>

## FE.18.5 / Story 18.6 — Invoices workspace (`/account/invoices`)

**Sources:** [`docs/stories/18.6.story.md`](stories/18.6.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.5** (invoices block); primitives from **[Story 18.3 / FE.18.13](#parity-18-3)**; same **SplitView** / **DetailRail** composition as **[§ FE.18.4 / Story 18.5](#parity-18-5)**. **Critical numbering:** **Story 18.6** implements epic **FE.18.5** (invoices), **not** epic **FE.18.6** (members / **Story 18.7**).

### Layout (KPI strip → table → rail)

```text
┌ KPI strip (KpiCard scorecardOnly, theme=account): Paid (90d), Awaiting, Overdue ────────┐
┌ Filter toggle: ?status=open (legacy dashboard link) vs all ────────────────────────────┐
├ Table: ref, issue date, due (issue + credit_terms_days), amount, StatusPill, Pay / PDF ┤
├ Pagination (acct_page / acct_per, default 25) ─────────────────────────────────────────┤
└ ?id=<uuid> — DetailRail: summary, PO block, line items, timeline, full HTML quote link │
```

* **Row identity for `?id=`:** **`booking_quotes.id`** when the list row is quote-backed; otherwise **`bookings.id`** for booking-only supplementals — **`loadAccountInvoiceRailDetail`** resolves both.
* **Pay now:** Same as dashboard — deep-link **`/account/bookings?id=<bookingId>`** (no new PSP integration).
* **PDF:** Server action **`accountPortalInvoicePdfSignedUrl`** verifies **admin** + account scope, then **`createSignedUrl`** via **service role** on bucket **`SUPABASE_BOOKING_QUOTE_PDF_BUCKET`** (default `booking-quote-pdfs`) for **`pdf_storage_path`**.
* **KPI definitions:** **`computeAccountInvoiceKpis`** — paid uses **`payment_received_at`** within 90d on **`paid_invoice`**; awaiting = **`ready_to_invoice`** or **`invoiced`** with payment not paid; overdue = awaiting subset past **issue + `credit_terms_days`** (from **`customer_accounts`**).
* **Copy:** [`src/features/account/copy/account-invoices-copy.ts`](../../src/features/account/copy/account-invoices-copy.ts).
* **Full HTML quote:** Existing **`/account/invoices/[quoteId]`** viewer remains; rail links **View full quote** when **`rendered_html`** exists.

### Tests

* **`src/lib/__tests__/account-invoices-list-query.test.ts`** (URL parse / slice helpers)

---

<span id="parity-18-7"></span>

## FE.18.6 / Story 18.7 — Members roster (`/account/members`)

**Sources:** [`docs/stories/18.7.story.md`](stories/18.7.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.6** (members block); primitives **[Story 18.3 / FE.18.13](#parity-18-3)**. **Critical numbering:** **Story 18.7** implements **FE.18.6** (members). **FE.18.7** / **Story 18.8** is **preferences** — not this section.

### Layout (toolbar → table → pagination)

```text
┌ Search (GET `acct_q`, preserves `acct_per`) + primary “Invite member” (Sheet) ─────────┐
├ Table: AvatarCell + name, email, StatusPill (portalRoleLabel), last activity, actions ┤
├ Row menu: resend (pending), change role (Sheet), deactivate (AlertDialog) ────────────┤
├ Pagination (`acct_page` / `acct_per`, default 25) ────────────────────────────────────┤
└ Empty: team vs search-specific copy; invite CTA ───────────────────────────────────────┘
```

* **Data:** `loadAccountMemberRows` (server) — optional **ILIKE** on `email` / `full_name` + **range** pagination; **no** new RLS. “Last activity” = latest of `invited_at`, `accepted_at`, `invite_email_last_sent_at` on the row (no `profiles` join).
* **URL helpers:** [`src/lib/account-members-list-query.ts`](../../src/lib/account-members-list-query.ts); tests in [`src/lib/__tests__/account-members-list-query.test.ts`](../../src/lib/__tests__/account-members-list-query.test.ts).
* **Copy:** [`src/features/account/copy/account-members-copy.ts`](../../src/features/account/copy/account-members-copy.ts); role labels only via **`portalRoleLabel`** in UI.
* **Mutations:** existing server actions in [`src/actions/accountMembers.ts`](../../src/actions/accountMembers.ts) only.
* **Optional `?view=card|table`:** **deferred** (table-only) — see **Story 18.7** Progress Notes.

### Tests

* **`src/lib/__tests__/account-members-list-query.test.ts`**

---

<span id="parity-18-8"></span>

## FE.18.7 / Story 18.8 — Account preferences (`/account/preferences`)

**Sources:** [`docs/stories/18.8.story.md`](stories/18.8.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.7** (preferences block). **Critical numbering:** **Story 18.8** implements **FE.18.7** (organisation preferences). **FE.18.8** / **Story 18.9** is **profile** — not this section.

### Layout (vertical cards — no tabs)

```text
┌ Page title + org context + back link ────────────────────────────────────────────────┐
├ Card: Email notifications — informational / marketing switches, transactional locked ─┤
│         Per-section Save → `updateAccountCommsPreferencesAction` (unchanged contract)  │
├ Card (admin only): Default billing entity — `<select>` from booking refs + current ─┤
│         Save → RPC `set_customer_account_default_billing_entity` (SECURITY DEFINER)    │
├ Card: Communication preferences — locale placeholder (read-only), timezone read-only ─┤
└ Footnote: SMS categories deferred ───────────────────────────────────────────────────┘
```

* **Deep link:** `?category=informational|marketing|transactional` — **`parseAccountPrefsCategoryQuery`**; scroll + ring highlight on matching **`#prefs-*`** block (**15C.6**).
* **Feedback:** Per-section **`Alert`** (success emerald / destructive) — **no Sonner** (**NFR.18.2**).
* **Copy:** [`src/features/account/copy/account-preferences-copy.ts`](../../src/features/account/copy/account-preferences-copy.ts).
* **Notifications:** [`src/actions/accountCommsPreferences.ts`](../../src/actions/accountCommsPreferences.ts) — **`loadAccountCommsPreferencesAction`** / **`updateAccountCommsPreferencesAction`** unchanged semantics.
* **Billing default:** [`src/actions/accountPreferencesOrg.ts`](../../src/actions/accountPreferencesOrg.ts); options from [`src/lib/account-preferences-load.server.ts`](../../src/lib/account-preferences-load.server.ts) (`bookings.billing_entity_ref` distinct, RLS-safe). **Note:** picklist is **historical refs from bookings** + current default — a **new** ref must appear on a booking before it can be selected as the account default.
* **Default cost centre:** **not** in `customer_accounts` schema — **deferred** (see **Story 18.8** Progress Notes).
* **Sticky save row:** **deferred** (see **Story 18.8** Progress Notes).

### Tests

* **`src/lib/__tests__/account-preferences-billing.test.ts`**

---

<span id="parity-18-9"></span>

## FE.18.8 / Story 18.9 — Account member profile (`/account/profile`)

**Sources:** [`docs/stories/18.9.story.md`](stories/18.9.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.8** (member profile). **Critical numbering:** **Story 18.9** implements **FE.18.8** (**profile**). **FE.18.9** / **Story 18.10** is **help** — not this section.

### Scope (vs organisation preferences)

| Surface | Route | Notes |
|--------|-------|------|
| **Member (personal)** | **`/account/profile`** | Name, phone, optional avatar, password, MFA placeholder, sessions note, membership exit link. |
| **Organisation** | **`/account/preferences`** | Notifications, billing defaults, comms — **[§ FE.18.7 / Story 18.8](#parity-18-8)** only. |

### Layout (vertical `Card`s, account tokens)

* **RSC loader:** [`src/app/(account)/account/(portal)/profile/page.tsx`](../../src/app/(account)/account/(portal)/profile/page.tsx) — `requireAccountMemberPage`, `profiles` row (`full_name`, `phone`, `avatar_url`), work email from session; passes props to client content.
* **Client UI:** [`src/features/account/components/AccountProfilePageContent.tsx`](../../src/features/account/components/AccountProfilePageContent.tsx) — sectioned cards; **`Alert`** for success/error (**NFR.18.2** — no Sonner).
* **Copy:** [`src/features/account/copy/account-profile-copy.ts`](../../src/features/account/copy/account-profile-copy.ts) — B2B shuttle / organisation vocabulary (no rental / driver portal wording).
* **Actions:** [`src/actions/accountProfile.ts`](../../src/actions/accountProfile.ts) — `updateAccountProfileNamePhoneAction`, `changeAccountPasswordAction`, `uploadAccountAvatarAction` (user-scoped Supabase; **`profiles`** RLS `profiles_update_self`).
* **Phone validation:** [`src/features/account/lib/account-profile-phone.ts`](../../src/features/account/lib/account-profile-phone.ts) — `libphonenumber-js/min`, same posture as booking funnel (`trip-request-submit-schema` / `passengerPhoneToE164`).
* **Name mapping:** [`src/features/account/lib/account-profile-name.ts`](../../src/features/account/lib/account-profile-name.ts) — `full_name` ↔ first/last for UI.
* **Avatar flag:** [`src/lib/account-profile-env.ts`](../../src/lib/account-profile-env.ts) — **`ACCOUNT_PROFILE_AVATAR_UPLOAD_ENABLED`** (server; truthy = **`1` \| `true` \| `yes` \| `on`**). When off, upload controls are hidden and copy explains uploads are disabled.
* **Storage:** migration **`account_profile_avatars_bucket`** — bucket **`account_profile_avatars`** (public read URL); object path prefix **`{auth.uid()}/…`** via **`split_part(name, '/', 1)`** storage policies.
* **Active sessions:** No end-user Supabase session list in MVP — support-style copy only (no `auth.admin` from portal).
* **Membership exit:** Link to **`/contact`** with explicit copy (no self-serve delete).
* **MFA:** Placeholder **“Coming soon”** from copy module.
* **Loading:** [`profile/loading.tsx`](../../src/app/(account)/account/(portal)/profile/loading.tsx) — **`LoadingRegion`** `theme="account"`.

### Tests

* **`src/features/account/lib/__tests__/account-profile-name.test.ts`**, **`account-profile-phone.test.ts`**, **`src/lib/__tests__/account-profile-env.test.ts`**

---

<span id="parity-18-10"></span>

## FE.18.9 / Story 18.10 — Help & contact (`/account/help`)

**Sources:** [`docs/stories/18.10.story.md`](stories/18.10.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.9** (help / contact). **Critical numbering:** **Story 18.10** implements **FE.18.9** (**help**). **FE.18.10** / **Story 18.11** is **sign-in / invite** — do not conflate.

### Scope

| Area | Implementation |
|------|------------------|
| **Route** | [`src/app/(account)/account/(portal)/help/page.tsx`](../../src/app/(account)/account/(portal)/help/page.tsx) — **`requireAccountMemberPage`**, RSC-only (**NFR.18.3**), **`AccountShell`** / **`bg-account-canvas`** via portal layout. |
| **Copy** | [`src/features/account/copy/account-help-copy.ts`](../../src/features/account/copy/account-help-copy.ts) — all user-visible strings; curated FAQ as static **`ACCOUNT_HELP_FAQ_ENTRIES`** (MVP), display capped at **`ACCOUNT_HELP_FAQ_MAX_DISPLAY`** (5). B2B shuttle / organisation wording only. |
| **Empty FAQ** | When zero entries, **`EmptyState`** `theme="account"` + **`emptyFaqTitle`** / **`emptyFaqBody`** — no broken list chrome. |
| **Contact** | [`src/lib/email/email-copy.ts`](../../src/lib/email/email-copy.ts) — **`resolveSupportEmailAddress()`**, **`resolveSupportContactLine()`**; prominent **`mailto:`**; SLA-style guidance only from copy module (no invented response-time guarantees). |
| **Status link** | Optional **`NEXT_PUBLIC_STATUS_PAGE_URL`** — absolute **http/https** URL only; entire card omitted when unset. External **`target="_blank"`** + **`rel="noopener noreferrer"`** with descriptive link text (**NFR.18.5**). |
| **Feedback** | Informational only — **no Sonner** (**NFR.18.2**). |

### Layout

Matches **Stories 18.4–18.9**: page **`h1`** + intro, vertical **`Card`** sections (**`border-account-border`**, **`CardHeader`** with **`h2`** + description, **`CardContent`**). FAQ uses **`dl`** / **`dt`**/**`dd`** with **`h3`** per question for heading hierarchy.

### Stub cleanup

**`accountStubPagesCopy.help*`** removed; help route does not reference **`account-stub-pages-copy.ts`**.

---

<span id="parity-18-11"></span>

## § 18.11 — FE.18.10 / Story 18.11 — Sign-in & invite surfaces (`/account/login`, `/account/signup`, `/account/unauthorized`)

**Sources:** [`docs/stories/18.11.story.md`](stories/18.11.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.10** (sign-in / invite). **Critical numbering:** **Story 18.11** implements **FE.18.10** (**login** + **invite signup** + **unauthorized** chrome). **Story 18.10** / **FE.18.9** is **`/account/help`** — do not conflate.

### Route table

| URL | RSC page | Notes |
|-----|-----------|--------|
| **`/account/login`** | [`src/app/(public-account)/account/login/page.tsx`](../../src/app/(public-account)/account/login/page.tsx) | **`next`** / **`returnUrl`** → portal (**unchanged** contract). |
| **`/account/signup`** | [`src/app/(public-account)/account/signup/page.tsx`](../../src/app/(public-account)/account/signup/page.tsx) | Invite via **`?token=`**; invalid / missing token uses same shell as success. |
| **`/account/unauthorized`** | [`src/app/(public-account)/account/unauthorized/page.tsx`](../../src/app/(public-account)/account/unauthorized/page.tsx) | **Task 0:** visual parity — **`VestrooMark`** + centered card (**invalid invite** parity). |

### Theme scoping (**NFR.18.4**)

| Area | Implementation |
|------|----------------|
| **Wrapper** | **[`src/app/(public-account)/layout.tsx`](../../src/app/(public-account)/layout.tsx)** — **`data-account-theme="light"`**, **`min-h-screen`**, **`bg-account-canvas`**, **`text-account-foreground`**; flex centering for child routes. |
| **Leakage** | Marketing root **`/`** and **`/ops/*`** do **not** mount this layout — **`data-account-theme`** stays off those trees. |

### Shared chrome & copy

| Piece | Location |
|-------|----------|
| **Card shell** | **`AccountPublicAuthCard`** — **`max-w-md`**, **`border-account-border`**, **`bg-card`** (portal **`Card`** alignment). |
| **Help (pre-auth)** | **`AccountPublicAuthHelpRow`** — primary CTA text **"Need help signing in?"** → **`mailto:`** + **`resolveSupportEmailAddress()`** ([`src/lib/email/email-copy.ts`](../../src/lib/email/email-copy.ts)). Optional secondary line: Help after sign-in (**no** deep link to **`/account/help`** for anonymous users — route is member-only; **[§ FE.18.9 / Story 18.10](#parity-18-10)**). |
| **User-visible strings** | [`src/features/account/copy/account-auth-surfaces-copy.ts`](../../src/features/account/copy/account-auth-surfaces-copy.ts) |
| **Brand** | **`VestrooMark`** above the card on **login**, **signup** (all states), **invalid invite**, and **`unauthorized`** (**Task 0** mark parity). |
| **Primary submit** | **`bg-account-accent`** + **`text-account-accent-foreground`** on **`AccountLoginForm`** / invite flows — **no** unscoped marketing **`bg-primary`** for those CTAs. |
| **Secondary links** | **`text-account-muted`** + **`ring-account`** / **`ring-offset-account-canvas`** (**`accountPublicAuthSecondaryLinkClassName`**). |

### Forms (**NFR.18.2**, **NFR.18.3**, **NFR.18.5**)

| Item | Notes |
|------|--------|
| **Client boundary** | **`AccountLoginForm`**, **`AccountInviteSignupPanel`** remain **`'use client'`**; **`page.tsx`** files stay **async** RSC. |
| **Feedback** | **No Sonner**; inline errors, **`role="alert"`** on auth errors (**login** unchanged contract). |
| **Future auth steps** | Password-only today; any future magic-link / OTP under the same routes **must** reuse **`AccountPublicAuthCard`** + account tokens. |

### Tests

* **`account-auth-surfaces-copy.test.ts`** — copy smoke.

---

<span id="parity-18-12"></span>

## § 18.12 — FE.18.12 / Story 18.12 — Mobile responsiveness (account portal)

**Sources:** [`docs/stories/18.12.story.md`](stories/18.12.story.md); [`docs/epic-18.md`](epic-18.md) **FE.18.12** (lines **227–236**). **§ 18 index:** [master index](#parity-18-master-index). **Critical numbering:** **Story 18.12** = **FE.18.12** (mobile). **FE.18.13** = shared SaaS primitives (often **Story 18.3**); **Story 18.13** = documentation finalisation — do **not** conflate.

### Breakpoints (Tailwind-aligned)

| Token | Typical width | Use in account work |
|-------|---------------|----------------------|
| **`md`** | **768px** | **Table** layout **at/above**; **stacked card lists** **below** (`< md` / `max-md:`). |
| **`lg`** | **1024px** | **SplitView** uses **`(min-width: 1024px)`** in code — **inline detail rail** at/above; **Sheet** drawer **below**. |

### Expectations (FE.18.12)

| Area | Expected behaviour |
|------|--------------------|
| **Shell** | **Hamburger** → **left drawer** with **Tab/Shift+Tab** focus loop on `#account-sidebar-panel`, **Esc** and backdrop close. **`#account-main`** uses the **`inert`** attribute while the drawer is open so focus and interaction do not reach portal content (**NFR.18.5**). Focusable selector includes links, buttons, and form controls used in the panel. |
| **Tables** | **Bookings**, **invoices**, **members** (and **dashboard** invoice preview) — use shared **`AccountResponsiveTableShell`** (`src/features/account/components/account-responsive-table-shell.tsx`): **`md`+** retains **`Table`** / wide `<table>` with horizontal scroll where needed; **`< md`** — stacked card lists (`role="region"` + **`aria-label`** aligned with table caption). Avoid **only** `min-w-[880px]` horizontal scroll as the sole narrow-phone UX. |
| **Detail** | **< lg** — **`SplitView`** mobile **`Sheet`**: **full viewport width** (`max-w-full`), **`100dvh`** height, slide from **right**; inner padding includes **`safe-area-inset-bottom`**. **≥ lg** — unchanged inline **`aside`** rail. **`DetailRail`** **`theme="account"`** footer: **`max-lg:`** sticky elevation + **safe-area** bottom padding so primary rail actions (e.g. **Pay**) stay reachable (**FE.18.12** / **FE.5.7** alignment). |
| **Primary CTA** | **`AccountInvoicesPageShell`** — **`canPay`**: primary **`Pay now`** in **`DetailRail`** **`footer`**; mobile sheet layout + footer classes above; **no Sonner**. |
| **Public auth** | **`/account/login`**, **`/account/signup`**, **`/account/unauthorized`** — **`AccountPublicAuthCard`** **`min-w-0`**, **`p-4 sm:p-6`**, layout **`px-3 sm:px-4`**; controls **`min-h-11`** where applicable (**~390px**, **Story 18.11**). |

**Implementation notes:** **`aria-modal`** was **not** set on **`<nav>`** — `jsx-a11y` / implicit **`navigation`** role does not pair cleanly with **`aria-modal`**; **`inert`** on **`#account-main`** plus the existing focus loop satisfy **NFR.18.5** without duplicate modality traps.

**NFR:** **NFR.18.5** (a11y), **NFR.18.6** (performance), **NFR.18.3** (server-first shell). **Alignment:** [`FE.5.7`](epic-5.md) mobile-first booking funnel.

**§ 18 index:** [master index](#parity-18-master-index) — *this subsection documents **FE.18.12** (mobile) only.*

---

## Related links

- **[ADR 0001](adr/0001-ops-field-ui-stack-tailwind-radix.md)**
- **[Epic 17 story ↔ artifacts matrix](design/epic-17-story-to-artifacts-matrix.md)** (Story **17.20**)
- **[Design / Wheelzie → route map](design/visual-redesign-references.md)** — **`§ Epic 17 implementation traceability`**
- **[UI/UX specification — Operations console (`/ops/*`)](ui-ux-specification.md#operations-console-ops-visual-language)** (§ Operations console — Epic 17)
- **[UI/UX specification — Account portal (`/account/*`)](ui-ux-specification.md#account-portal-visual-language-epic-18)** (Epic 18 visual language)
- **[ops-console.md](ops-console.md)**
- **[Epic 5 — FE.5.2](epic-5.md)**
- **[Epic 5 — FE.5.3](epic-5.md)** (CRUD / data-heavy patterns)
