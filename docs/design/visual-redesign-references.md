# Visual redesign — Wheelzie reference image → Vestroo route mapping

This document is the **canonical mapping** between the **Wheelzie** SaaS reference screenshots provided as Epic 17 / 18 inspiration and the **Vestroo** routes / screens that adopt each pattern. It supplements [`epic-17.md`](../epic-17.md) and [`epic-18.md`](../epic-18.md) and is the place to look up "what part of which Wheelzie screen am I implementing here?".

**Canonical image files:** [`design/wheelzie-reference/README.md`](wheelzie-reference/README.md) — stable filenames (`01-drivers.png` … `10-dashboard.png`) and PR review usage.

**Reading rules:**

* Wheelzie patterns are **interaction and density references**. We never copy domain naming ("rentals", "rate per day", "car number") — those are forbidden by NFR.5.4 / NFR.17.7.
* The Vestroo route may use a **subset** of the reference pattern (e.g. KPI cards without sparklines on `/account` for lighter feel).
* **Full-page reference** means **all major bands** (e.g. on **Bookings**: KPI row + chart + filter bar + table). Implementing **only** the table band does **not** match **`06-bookings.png`** — see the **Gap analysis** section below.
* Where a Wheelzie pattern has **no Vestroo analogue** (e.g. car-rental-specific maintenance reminder list), the cell says **"not applicable"** with rationale.

---

## Image inventory

The **10** Wheelzie reference screens are catalogued below. **Numbering is fixed** across epic, stories, and this doc (`#1` = Drivers … `#10` = Dashboard). Store PNGs under [`design/wheelzie-reference/`](wheelzie-reference/README.md) using the README naming convention.

| # | Wheelzie page | What it shows | Primary patterns to lift |
|---|---|---|---|
| 1 | **Drivers** | List of drivers with avatars + status pills, right-side **profile rail** with calendar and schedule | Split list/detail, table-with-avatar, status pills, sidebar with promo card, breadcrumb-free top bar with global utilities |
| 2 | **Payments** | KPI strip (Completed / Awaiting / Overdue) above an invoice table | KPI card row above table, status pill, Edit/Delete actions per row |
| 3 | **Clients** | Client roster: table with checkbox column, avatar+name+email, address, document list, points score | Table with bulk-select, document chips, "Points" column → tier/role pill, primary "Add Client" CTA right-aligned |
| 4 | **Tracking** | Vehicle tracking screen: split list of vehicles (left) + map with route + rent info card (top right) | Split view with **map** as detail, vehicle cards in list, "Send a Message" inline action, rent-info top card |
| 5 | **Calendar** | Week-grid calendar with right-side **Schedule Detail** panel showing event metadata + vehicle photo | Calendar week view, event chips with tone, right rail event detail, "Pickup / Return" filter chips, week navigator |
| 6 | **Bookings** | KPI cards (Upcoming / Pending / Cancelled / Completed) + bookings overview bar chart + filterable bookings table | Stacked bar chart "Done vs Cancelled", scorecard polarity (down=good for cancelled), filterable table, pagination |
| 7 | **Units (card grid)** | 3-up vehicle card grid with hero photo, status, attributes | Card grid for fleet, hero image, attribute icons (transmission, seats, fuel), per-card primary CTA |
| 8 | **Unit Details** | Single vehicle detail with hero image, thumbnails, activity area chart, features list, reminders cards | Detail page with hero + media strip, **activity area chart**, feature checklist 2-col, reminders chip row |
| 9 | **Units (list)** | Single-row dense list view of vehicles with image left, attributes inline, primary "Select" + Edit/Delete | List variant of fleet view, inline-attribute density, pagination |
| 10 | **Dashboard** | KPI cards (Total Revenue / New Bookings / Rented Cars / Available Cars), earnings line chart, rent-status donut, bookings bar chart, car-availability filter card on the right, car-types breakdown with progress bars, recent activity feed | Most patterns at once: KPI grid, area chart, donut chart, bar chart, progress-bar list, side filter card, recent activity feed |

---

## Mapping — `/ops/*` (Epic 17)

| Wheelzie image | Wheelzie pattern | Vestroo route | Vestroo treatment | Epic 17 stories |
|---|---|---|---|---|
| 10 | KPI cards with sparkline + delta | `/ops` (dashboard) | Cards: **Trips Today**, **Open Quote Requests**, **Fleet On-Trip**, **Revenue This Week**, **Drivers On Duty**, **Awaiting Payment** | FE.17.4, FE.17.7 (sparkline) |
| 10 | Earnings area chart | `/ops` (dashboard) | "Revenue this week" trend area chart (SVG primitive, no Recharts at MVP) | FE.17.7 |
| 10 | Rent-status donut | `/ops` (dashboard) | "Trip status mix today" donut (On trip / Scheduled / Completed / Cancelled) | FE.17.7 |
| 10 | Bookings bar chart (year) | `/ops` (dashboard) | "Bookings this year — done vs cancelled" stacked bar | FE.17.7 |
| 10 | Car-availability filter card (right rail) | `/ops` (dashboard) | **Skipped** — Vestroo dashboard does not need a vehicle availability check widget on home; that capability lives at `/ops/vehicles` and `/ops/calendar` | — |
| 10 | Car-types progress-bar list | `/ops` (dashboard) | **Optional** "Fleet utilisation by class" progress bars (SVG primitive). Land in a follow-up story if product wants it. | FE.17.7 (primitive reuse) |
| 10 | Recent activity feed (sidebar right) | `/ops` (dashboard) | **Skipped on home** — `/ops/comms` and per-trip detail rails carry activity timelines; the dashboard stays metric-focused | — |
| 1 | Top bar: search input + settings + notifications + profile | All `/ops/*` | Replaces "search button → /ops/search" with inline popover search; settings icon, notifications bell, profile chip with dropdown | FE.17.2 |
| 1 | Sidebar with grouped nav + promo card | All `/ops/*` | Grouped nav (Fulfilment / Fleet & People / Finance & Compliance / Configuration), count badges, optional promo slot behind feature flag | FE.17.3 |
| 1 | Drivers list with avatar + status pill + right detail rail | `/ops/roster`, `/ops/clients` | Avatar cell + status pill primitives; split view with profile rail | FE.17.5, FE.17.8 |
| 6 | KPI strip above table | `/ops/bookings`, `/ops/walk-in`, `/ops/invoicing` | Same scorecard primitive on top of each list | FE.17.4 |
| 6 | Bookings table with status pills + pagination | `/ops/bookings`, `/ops/walk-in`, `/ops/trips` | Status pill primitive, `OpsPagination` | FE.17.8, FE.17.10 |
| 6 | Stacked bar chart (Done vs Cancelled) | `/ops` dashboard, `/ops/reports/*` (future) | `OpsBarChart` primitive | FE.17.7 |
| 3 | Clients table with checkbox bulk select + documents column | `/ops/clients` | Checkbox column for bulk actions, documents inline chip column | FE.17.5, FE.17.8 |
| 3 | Points / tier column | `/ops/clients` | **Reframed**: Vestroo uses "Tier / Engagement type" (corporate / VIP / private) — not loyalty points | FE.17.8 |
| 4 | Tracking split view (vehicle list + map + rent info) | `/ops/trips` | Trip detail rail with **static** map snapshot at MVP, full live map after VST-9 (Realtime) | FE.17.5 |
| 4 | "Send a Message" inline action | `/ops/trips` detail | Map to existing `/ops/comms` channel templates (no new chat UI in Epic 17) | FE.17.5 (cross-link) |
| 5 | Calendar week view + right Schedule Detail | `/ops/calendar`, `/ops/roster` | `OpsCalendarWeek` primitive + detail rail | FE.17.9, FE.17.5 |
| 5 | Pickup / Return filter chips | `/ops/calendar` | Adapted to Vestroo trip event types (Pickup / Drop-off / Service window) | FE.17.9 |
| 7 | Vehicle card grid 3-up | `/ops/vehicles?view=grid` | `OpsCardGrid` primitive; toggle between list and grid persisted in URL | FE.17.6 |
| 8 | Vehicle detail with activity chart + features + reminders | `/ops/vehicles/[id]` | Hero image + thumbnails + `OpsAreaChart` for utilisation + features list + reminders chip row | FE.17.5, FE.17.7 |
| 9 | Vehicle list dense rows with image-left | `/ops/vehicles?view=list` | Default list view; existing pattern with primitive polish | FE.17.5, FE.17.10 |
| 2 | Payments KPI strip + invoice table | `/ops/invoicing` | "Completed" / "Awaiting" / "Overdue" KPI cards + invoice table | FE.17.4 |

---

## Mapping — `/account/*` (Epic 18)

The customer portal uses the **same** Wheelzie images as references but **less** density and **no** ops-only patterns.

| Wheelzie image | Wheelzie pattern | Vestroo route | Vestroo treatment | Epic 18 stories |
|---|---|---|---|---|
| 1, 6, 10 | Sidebar + top bar shell | All `/account/*` | `AccountShell` + `AccountSidebar` + `AccountTopBar` (currently no shell exists) | FE.18.2 |
| 10 | KPI cards (no sparklines) | `/account` (dashboard) | "Trips this month" / "Upcoming trips" / "Open invoices" (admin only) / "Active members" (admin only) | FE.18.3 |
| 10 | Recent activity feed | `/account` (dashboard) | Replaced by **upcoming trips rail** (more product-relevant for customers than abstract "activity") | FE.18.3 |
| 4 | Trip detail with map snapshot | `/account/bookings?id=…` | Detail rail with static Google Static Maps snapshot, comms timeline, action footer | FE.18.4 |
| 6 | Bookings table | `/account/bookings` | Trip type filter (point-to-point / hourly / tour / close protection), status pill, search, pagination | FE.18.4 |
| 2 | Payments KPI + table | `/account/invoices` (admin only) | KPI strip "Paid (90d)" / "Awaiting payment" / "Overdue", invoice table, detail rail with line items | FE.18.5 |
| 1, 3 | Drivers / Clients roster | `/account/members` | Member roster with avatar + role pill (admin / booker), action menu (resend invite, change role, deactivate) | FE.18.6 |
| 7, 9 | Card / list grid for fleet | **Not applicable** — customers don't manage a fleet | Skip. The "Preferred vehicle" picker on `/book/search` is the only customer surface that resembles vehicle cards, and it uses the simplified vehicle slide pattern. | — |
| 8 | Unit details | **Not applicable** — customers don't see vehicle activity charts | Skip. | — |
| 5 | Calendar | **Optional follow-up** — customers may want a "my upcoming trips" calendar after MVP | Defer to a future story. | — |
| 10 | Earnings / donut / bar charts | **Not applicable on `/account`** | Customers don't see Vestroo financials. Their own "Trips per month" mini-chart is the only customer-side metric, and it's deferred. | — |

---

## Mapping — booking funnel `/book/*` (Epic 19)

The booking funnel is a different beast — it's a **transactional form**, not a dashboard. Wheelzie is not a primary inspiration here, but the **brand chrome** and **vehicle card imagery** carry over.

| Wheelzie image | Pattern | Vestroo route | Treatment |
|---|---|---|---|
| 7 | Vehicle card grid (image, class, attributes) | `/book/search` Section 2 | Image + class label + capacity + bag count, **no price**. Selection is **optional** per FE.19.6. |
| 1, 6 | Form chrome | `/book/search` | White card surface, brand-rust submit, sectioned layout per FE.19.1 |

The full field-level walkthrough lives in [`design/booking-flow-simplified.md`](booking-flow-simplified.md).

---

## What we explicitly **do not** copy from Wheelzie

| Wheelzie element | Why not |
|---|---|
| "Rent / Rate per day" pricing copy | Vestroo is quote-deferred; price is never shown in customer surfaces. NFR.5.4 / FE.10.5 / FE.19 reaffirmed. |
| "Pickup" / "Return" rental terminology on calendar | Vestroo events are trips, not rentals. Replaced with Pickup / Drop-off / Service window. |
| Coral / bright red accent on Wheelzie (`#FF4757`, `#FF3B30`, `#E11D48` variants) | Vestroo brand uses **`vest.rust`** (#C04C33) for primary CTAs — **same role**, slightly deeper saturation. Do not introduce a second competing primary red in ops/account themes. |
| "Trip Time: X hours Y minutes" display in tracking | Replaced with "Estimated duration" derived from Google Maps response. |
| Loyalty points column | Reframed as engagement tier (corporate / VIP / private). |
| "Update Now" promo card visual | Repurposed as optional release-notes / training-video slot, off by default in production. |
| Fleet maintenance reminders in unit detail | **Future story** — Vestroo fleet ops may want service reminders, but they fall under a future capability story, not Epic 17. |

---

## Gap analysis — Epic 17 stories 17.1–17.10

The **suggested child stories 17.1–17.10** in [`epic-17.md`](../epic-17.md) delivered **tokens, shell chrome, primitives, dashboard wiring, and bookings table** polish. They **did not** automatically produce a **pixel- or band-for-band** match to the Wheelzie PNGs, for these reasons:

| Area | Reference | What 17.1–17.10 typically covered | Gap |
|------|-----------|-----------------------------------|-----|
| **Active nav / selection** | **#1–#10** — light **blue** pill or band behind the active item, **red** icon | FE.17.3 / 17.2: **left rail** + `bg-ops-surface-active` | **`--ops-surface-active` in light theme was green-tint (hue ~142)**, matching the *old* mint ops shell, **not** Wheelzie’s sky selection. Tokens doc §1.1a — use **soft blue** for nav selection. |
| **Primary red** | Bright coral/red CTA | **vest.rust** per FE.17.1 / NFR.17.7 | Acceptable **brand** swap; structure must still match. |
| **Dashboard (`10-dashboard`)** | KPI + **earnings** + **donut** + **bar** + **right column** (quick check, car types, activity) | Story **17.6** — scorecards + **some** charts; epic **allows skipping** right rail widgets | **Right rail** and **car-type progress** list often **omitted**; layout may be **two-column** only. |
| **Bookings (`06-bookings`)** | **Four KPI cards** + **trend** + **stacked bar** + *then* filters + table | Story **17.10** — **table + filters + pills + pagination** (FE.17.12 item 2) | **No** requirement in 17.10 for the **upper** KPI + chart **bands** — so the page will **not** look like Wheelzie **6** until a **follow-up** story adds that composition. |
| **Current app screenshots** (pre-epic green sidebar) | — | Mix of old and new tokens | May still show **green** active states until **nav active** token is retargeted. |

**Conclusion:** You **do not** need to “re-run” stories 17.1–17.10 as if they failed — they met **their written ACs**. You **do** need a **focused follow-up** (new story, e.g. **17.21 — Wheelzie layout & token parity**) to: (1) align **`--ops-surface-active` / nav selection** with §1.1a, (2) add **Bookings** KPI + chart **bands** per **`06-bookings.png`**, (3) optionally extend **Dashboard** with deferred **`10-dashboard`** zones, (4) **Visual QA** checklist vs [`wheelzie-reference/README.md`](wheelzie-reference/README.md).

---

## Cross-references

* [Epic 17](../epic-17.md) — `/ops/*` redesign (includes **Visual parity standard**)
* [Epic 18](../epic-18.md) — `/account/*` redesign
* [Epic 19](../epic-19.md) — booking funnel simplification
* [`design/visual-redesign-tokens.md`](visual-redesign-tokens.md) — design tokens (§1.1a Wheelzie targets)
* [`design/wheelzie-reference/README.md`](wheelzie-reference/README.md) — PNG filenames
* [`design/booking-flow-simplified.md`](booking-flow-simplified.md) — booking journey
* [`ADR 0001`](../adr/0001-ops-field-ui-stack-tailwind-radix.md) — Tailwind + Radix lock
* [`ops-design-system-parity.md`](../ops-design-system-parity.md) — **§ 17** (Epic 17) consolidated in **Story 17.20**; § 18 in **18.13** (TBD)

---

## Epic 17 implementation traceability (Story 17.20)

The **route ↔ Wheelzie image** table in **§ Image inventory** and **§ Mapping — `/ops/*`** above stays the **product** map. For **implementation story → doc anchor** traceability (17.1–17.19), use the single matrix:

* **[`epic-17-story-to-artifacts-matrix.md`](epic-17-story-to-artifacts-matrix.md)** — Story **17.x** → routes → Wheelzie id → [`ops-design-system-parity.md`](../ops-design-system-parity.md) **`#parity-17-*`** anchors.
