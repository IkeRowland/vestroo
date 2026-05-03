# Epic 18: Account Portal Visual Redesign — `/account/*` SaaS-grade UX/UI (Wheelzie-inspired)

## Description

This epic delivers a **comprehensive visual and interaction-density redesign** of the Vestroo customer **account portal** (`/account/*`) — the authenticated surface used by **organisation admins** and **bookers** for B2B / corporate clients to manage trips, members, invoices, and preferences. It mirrors the visual language established for `/ops/*` in [Epic 17](epic-17.md) so customers see a coherent product family, while keeping copy, navigation, and capability scope **strictly customer-facing**.

The current account portal is intentionally minimal: a thin shadcn `Card` quick-link grid (organisation block + 2–5 cards in `AccountDashboard`) and a small set of feature pages (`/account/bookings`, `/account/invoices`, `/account/members`, `/account/preferences`). It works, but it does **not** look like a tool customers expect to use weekly, and it does **not** showcase the value Vestroo Ops is doing on their behalf. This epic upgrades the chrome and adds **trip-centric scorecards, upcoming-trip rail, recent-invoice list with status, member activity, and a profile sidebar** matching Wheelzie's aesthetic — recast in **B2B-shuttle** vocabulary, never car-rental.

**Product framing (locked, unchanged):** The account portal is for **corporate clients** of Vestroo's shuttle / chauffeur / VIP service. It is **not** a self-serve fleet management product, **not** a rental dashboard. Wheelzie patterns are visual references; copy and information architecture are **Vestroo customer** terms (Bookings, Trips, Invoices, Members, Preferences).

**Stack constraint (locked, unchanged):** Tailwind + Radix + shadcn-style primitives. Account portal **shares** the new tokens introduced in [`FE.17.1`](epic-17.md#fe171-visual-token-expansion-for-ops-light-theme), specifically the **light theme** flavour (`data-ops-theme="light"` semantic colors) **applied via a sister token namespace** so account screens never read as "ops staff" surfaces. See [`FE.18.1`](#fe181-account-token-namespace-and-theme-wrapper).

**Living artifacts referenced:**

* [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) — design tokens shared with Epic 17 (**§1.1a** — same Wheelzie selection/surface targets apply to **account** nav when mirroring reference density).
* [`design/visual-redesign-references.md`](design/visual-redesign-references.md) — Wheelzie image → Vestroo route map (§ **Mapping — `/account/*`**; **do not** copy rental vocabulary).
* [`design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md) — same **`01`–`10`** PNG set for visual QA; account shell should be compared to **#10** (dashboard), **#6** (bookings table density), **#1** / **#3** (rosters) as applicable.
* [`ui-ux-specification.md`](ui-ux-specification.md) — extended with account portal visual language.

**Alignment note:** Epic 18 inherits the **Gap analysis** lesson from Epic 17 ([`visual-redesign-references.md`](design/visual-redesign-references.md)): fulfilling individual story ACs does not guarantee a **full-band** match to Wheelzie until **composition + selection tokens** are explicitly QA’d against the PNGs.

## Goals

1. Replace the bare `Card` grid on `/account` (dashboard) with a **scorecard layout**: trips this month, trips upcoming, open invoices, members active — each a brand-consistent KPI card.
2. Introduce an **upcoming trips list** with map snapshot or vehicle photo per trip, status pill, and quick CTAs ("Modify", "Cancel", "Re-book") — replacing the implicit "go to bookings" link.
3. Refresh **`/account/bookings`** to a polished table with filters, status pills, search, pagination, and a **detail rail** showing trip itinerary, vehicle, driver (when assigned), and PDF receipt link.
4. Refresh **`/account/invoices`** to a clean table with KPI summary on top (Paid / Awaiting / Overdue), filters, and detail rail (line items, payment status, "Pay now" or "Download PDF").
5. Refresh **`/account/members`** to a SaaS-style member roster — avatar+name, role badge, last active, action menu — modelled on Wheelzie's "Drivers" page (image 1) but for **org members**.
6. Refresh **`/account/preferences`** to a sectioned settings layout (Notifications, Default cost centre, Default billing entity, Communication preferences) with consistent form chrome.
7. Add a **left sidebar** + **top bar** to the account portal (currently has neither) so navigation is persistent and the portal feels like a product, not a hub-and-spoke link tree.
8. Add an **`/account/profile`** page (member-level — distinct from org-level account row) so members can edit their own name, phone, comms prefs.
9. Add an **`/account/help`** surface — empty by default, but slotted so future content (FAQ, contact ops, status page link) lands here.
10. Hold the line on accessibility, performance, and security parity with Epic 17 (NFR.18.1–18.5).

## User Stories / Requirements

### FE.18.1: Account token namespace and theme wrapper

The system MUST introduce a **`data-account-theme`** wrapper applied at the account portal layout (`src/app/(account)/account/(portal)/layout.tsx`). Initial value: `"light"`. The wrapper MUST scope a token set that **shares the brand palette** with `data-ops-theme="light"` but uses **distinct sidebar / topbar surface variables** so customer chrome can be tuned independently (e.g. softer, less dense than ops):

* `--account-canvas`, `--account-surface`, `--account-surface-hover`, `--account-border`, `--account-foreground`, `--account-muted`, `--account-topbar`, `--account-sidebar-width` (default 14rem), `--account-sidebar-collapsed-width` (default 4.5rem).
* Brand semantic tokens (`--account-accent`, `--account-success`, `--account-warning`, `--account-danger`, `--account-info`) reuse the same HSL values as `--ops-*` variants.

`tailwind.config.ts` MUST register a parallel `account.*` color namespace (`bg-account-canvas`, `text-account-foreground`, `w-account-sidebar`, etc.) so account components compose cleanly without arbitrary values.

The marketing/booking `:root` tokens MUST remain untouched. Test: `src/features/account/account-layout-tokens.test.ts` (new) snapshots the token names.

---

### FE.18.2: Persistent shell — sidebar + top bar

The account portal MUST gain a persistent shell mirroring `/ops/*` ergonomics, **scoped to `(account)/account/(portal)`**:

* **`AccountShell`** (analogous to `OpsShellClient`) with the same sidebar collapse + mobile drawer pattern (focus trap, Esc to close, restore focus on close).
* **`AccountSidebar`** — light theme sidebar with grouped nav: "Activity" (Dashboard, Bookings, Trips), "Billing" (Invoices), "Organisation" (Members, Preferences), "Help".
* **`AccountTopBar`** — light theme with global search ("Search bookings, invoices…"), notifications bell (in-app message count, e.g. quote-ready notice), profile chip with avatar+name+role and a `DropdownMenu` (Profile, Switch organisation, Sign out). Account switcher remains the existing `AccountSwitcher` component, surfaced inside the profile dropdown for `multi_account` members.

Routes that get the shell (no behaviour change to data, only chrome):
* `/account` (dashboard)
* `/account/bookings`
* `/account/invoices` (admin only — capability check unchanged)
* `/account/members` (admin only — capability check unchanged)
* `/account/preferences`
* `/account/profile` (new — see FE.18.8)
* `/account/help` (new — see FE.18.9)

Sign-in (`/account/login` / invite signup at `/account/invite/...`) MUST keep a clean centered card layout (no shell) — see [`FE.18.10`](#fe1810-sign-in-and-invite-surfaces).

---

### FE.18.3: Dashboard redesign — scorecards + upcoming trips + recent invoices

The system MUST replace `AccountDashboard` content with three sections, in order:

**Section 1 — Welcome strip** (exists today; refined):
* Org name (existing), role pill, signed-in email.
* Add: "Last sign-in: <timestamp>" muted line.
* Replace plain "Quick links" with the scorecards below.

**Section 2 — Scorecards** (new — KPI grid, 2-up on `sm`, 4-up on `lg`):
* "Trips this month" → `/account/bookings?period=this_month`
* "Upcoming trips" → `/account/bookings?status=upcoming`
* "Open invoices" → `/account/invoices?status=open` (admin only — hidden for bookers)
* "Active members" → `/account/members` (admin only — hidden for bookers)

Each card uses the **shared** `AccountKpiCard` component (parallel to `OpsKpiCard` from Epic 17 — implementation MAY share a common atom; see [`FE.18.13`](#fe1813-shared-saas-primitives-with-ops)). No sparklines required for accounts (lighter feel) — primary metric + small descriptor only. Loading skeletons MUST match `OpsLoadingRegion` semantics.

**Section 3 — Upcoming trips rail** (new):
* Horizontal-scroll card row on mobile, 2-up grid on `md+`.
* Each card: pickup → drop-off, date/time, vehicle class image (silhouette if not yet assigned), status pill ("Pending quote", "Confirmed", "Driver assigned"), CTA "View details".
* Empty state: friendly illustration + "Book your next trip" CTA → `/book/search`.

**Section 4 — Recent invoices** (admin only):
* 5-row table preview with "View all →" link to `/account/invoices`.
* Columns: Reference, Date, Amount, Status (pill), Action (Download / Pay).

**Reference:** Wheelzie image 10 (dashboard scorecards + recent activity feed) and image 6 (KPI cards above table) — recast for end-customer reading.

**Acceptance:**
* Dashboard renders in < 200ms on cached data.
* No card displays data the member is not authorised to see.

---

### FE.18.4: `/account/bookings` redesign — table + detail rail

The system MUST refresh the bookings list using primitives shared with Epic 17:

* **Filter row:** date range, status (pill multi-select), trip type (point-to-point, hourly, tour, close protection — match domain), search.
* **Table:** Booking ref, date+time, route (pickup → drop-off, ellipsised), vehicle class, status pill, amount (if quoted), action menu.
* **Row click** opens detail rail (split view) showing:
  * Pickup / drop-off addresses with mini map snapshot (static Google Static Maps, no client JS).
  * Date, time, passengers, special instructions.
  * Vehicle (class, model when assigned).
  * Driver (avatar + first name + first letter of surname, when assigned).
  * Comms timeline (quote-sent, quote-accepted, payment-link-sent, etc.) — read-only.
  * Actions: "Modify" (links to `/book/search?modify=<ref>`), "Cancel" (opens AlertDialog), "Re-book" (BookThisAgainButton — already exists).
  * Footer: "Receipt PDF" (download).
* **Pagination:** shared `OpsPagination` primitive.

**Reference:** Wheelzie image 6 (bookings table) and image 1 (drivers split view → reused as "trip detail rail" pattern).

**Acceptance:**
* Modify and Cancel respect existing capability gates and PO policy.
* Detail rail deep-link works (`/account/bookings?id=<ref>`).

---

### FE.18.5: `/account/invoices` redesign — KPI summary + table + detail rail

The system MUST refresh the invoices list (admin only — unchanged):

* **KPI strip on top:** Paid (last 90d), Awaiting payment, Overdue. Reuses `AccountKpiCard`.
* **Table:** Reference, Issue date, Due date, Amount, Status pill, Action (Pay / Download PDF).
* **Detail rail:** invoice header (ref, dates, amounts), line items (booking refs, descriptions, amounts), payment status timeline, PO reference (if account requires), action footer (Pay now / Download).

**Reference:** Wheelzie image 2 (Payments KPIs + table).

**Acceptance:**
* "Pay now" continues to use existing PayFast / payment-link flow (no change to integration).
* PDF link uses existing storage signed URL pattern.

---

### FE.18.6: `/account/members` redesign — roster

The system MUST refresh the members list (admin only):

* Card or table view (default table — admins manage usually 5–50 members).
* Avatar + name + email + role pill (admin / booker) + last active + action menu (resend invite, change role, deactivate).
* Search box.
* Primary CTA: "Invite member" → existing invite flow modal.
* Empty state: "Invite your team to book and track trips together."

**Reference:** Wheelzie image 1 (drivers list with avatars + status).

**Acceptance:**
* Existing role gates (`portalRoleLabel`, admin-only invite) remain authoritative.
* Resend / deactivate actions use existing server actions.

---

### FE.18.7: `/account/preferences` redesign — sectioned settings

The system MUST refresh preferences:

* Vertical sectioned layout (no tabs):
  * **Notifications** — informational vs marketing email toggles (existing).
  * **Default cost centre** — input field (existing if applicable).
  * **Default billing entity** — select bound to org's billing entities (admin only).
  * **Communication preferences** — locale (placeholder, single value today), timezone (display only).
* Each section has its own save button. Toast-equivalent inline `Alert` for success/error (no Sonner — NFR.5.2).

**Reference:** Wheelzie aesthetic for settings (clean white card per section, sticky save row).

---

### FE.18.8: `/account/profile` — new member-level page

The system MUST add a member-level profile page (distinct from `/account/preferences`, which targets the **organisation** preferences):

* Personal info: first name, last name, work email (read-only), phone (with `libphonenumber-js` validation), avatar upload (Supabase Storage).
* Sign-in security: change password (Supabase Auth), MFA placeholder ("Coming soon").
* Active sessions list (if available via Supabase API; otherwise note "Manage in Vestroo support").
* **Delete or transfer my membership** — link to a contact form or admin transfer flow.

This is a **chrome page** — implementation depth depends on existing Supabase Auth surface. MVP scope: name + phone editable; password change; avatar upload optional behind a flag.

---

### FE.18.9: `/account/help` — new help / contact surface

The system MUST add a help page that:

* Lists "Common questions" (curated 3–5 entries — content authored by ops).
* Surfaces "Contact ops" with the support email and SLA copy from existing comms config.
* Links to status page when configured.
* Is empty-friendly — copy gracefully degrades when no FAQ entries are configured.

This page is **content-driven**; future story may pull from a CMS collection.

---

### FE.18.10: Sign-in and invite surfaces

The system MUST refresh `/account/login` and the invite-signup pages:

* Centered card on `bg-account-canvas`, brand mark above, single-column form, `bg-account-accent` CTA.
* Link to "Need help signing in?" → `/account/help` (or static support email).
* Magic-link / OTP variants (per existing flow) keep their content but inherit the new chrome.
* Invite signup: shows org name and inviter clearly (existing `AccountInviteSignupPanel` — minor visual refresh only).

---

### FE.18.11: Empty states and onboarding nudges

The system MUST author **first-class empty states** for every list surface:

* Bookings empty: illustration + "You haven't booked yet — start your first trip" + primary CTA.
* Invoices empty (admin only): "No invoices yet. They'll appear here when ops bills your organisation."
* Members empty (admin only): "Invite your team to start booking together."

Empty states use a shared `AccountEmptyState` primitive (parallel to `OpsEmptyState`). Illustrations: simple SVGs in repo (no external images), monochrome with a single accent — no decorative photography.

---

### FE.18.12: Mobile responsiveness

The system MUST ensure all account surfaces work well at mobile widths:

* Sidebar collapses behind a hamburger; drawer with focus trap on open.
* Tables collapse to **stacked card lists** at `< md` (each row becomes a small card with key fields stacked).
* Detail rails open as **full-screen drawers** at `< lg` (slide from right).
* Sticky bottom action bar on mobile for primary CTAs (e.g. "Pay invoice").

This matches the booking funnel mobile-first stance and is consistent with [`FE.5.7`](epic-5.md).

---

### FE.18.13: Shared SaaS primitives with ops

Where primitives can be **reused** across `/ops/*` and `/account/*`, they MUST live in a shared `src/components/saas/` namespace (or `src/components/ui/` with a clearly tokenised consumer pattern). Reuse list:

* `KpiCard` (consumes `--ops-*` or `--account-*` via a `theme` prop or by composition).
* `Sparkline`, `BarChart`, `DonutChart`, `AreaChart` (token-driven via `currentColor`).
* `StatusPill`, `AvatarCell`.
* `Pagination`.
* `SplitView`, `DetailRail`.
* `EmptyState`, `LoadingRegion`, `ErrorState` (existing ops variants generalised).

The shared primitive set MUST be documented in [`ops-design-system-parity.md`](ops-design-system-parity.md) § 18 (cross-reference to § 17). Where an ops-only or account-only variant exists, that is fine — the goal is **no duplication** of pure-presentation logic.

---

## Related Non-Functional Requirements

* **NFR.18.1 — Authorisation parity:** No portal page MUST expose data not allowed by the member's role. Booker-vs-admin gates are unchanged. Hidden nav items still 403/redirect when accessed directly.
* **NFR.18.2 — Lean client:** Same NFR.5.2 + NFR.17.2 guidance applies. No new chart/calendar lib introduced; charts are SVG primitives shared with Epic 17.
* **NFR.18.3 — Server-first rendering:** Shell may be `'use client'` (sidebar collapse, drawer, dropdown). Data fetching stays server-side.
* **NFR.18.4 — Theme isolation:** `data-account-theme` MUST NOT leak to `/ops/*` or marketing/booking layouts.
* **NFR.18.5 — Accessibility:** WCAG 2.1 AA for all redesigned surfaces. Dropdowns, dialogs, drawers, table sort (when added) follow Radix primitives' a11y guarantees.
* **NFR.18.6 — Performance:** Dashboard and bookings list TTFB < 600ms on cached data; LCP < 2.5s on a cold mobile connection (NFR.1.1 reaffirmed for authenticated surfaces).

## Design Goals

* **Overall vision:** The account portal feels like a **trusted concierge** — calm, polished, never intimidating. Customers should feel they're seeing a confirmation that ops are running their travel professionally on their behalf.
* **Tone:** Slightly softer than `/ops/*` — same primitives, fewer dense lists, more whitespace, larger card padding.
* **Hero use of brand-rust:** primary CTA and a small accent on the active sidebar item. Status pills use semantic tones (success / warning / danger / info), not brand-rust.
* **Don't do:** marketing-style hero images on dashboard, promotional banners, "upgrade your plan" patterns (this is not a self-serve SaaS in the consumer sense — it's a B2B portal for an existing engagement).

## Suggested child stories (implementation sequence)

1. **18.1 — Token expansion + `data-account-theme` wrapper** (FE.18.1) — globals + tailwind + tests.
2. **18.2 — `AccountShell` + `AccountSidebar` + `AccountTopBar`** (FE.18.2) — chrome only, no content change.
3. **18.3 — Shared SaaS primitives extraction** (FE.18.13) — KpiCard, Sparkline, BarChart, DonutChart, AreaChart, StatusPill, AvatarCell, Pagination, SplitView, DetailRail, EmptyState. Lands ahead of consumer surfaces.
4. **18.4 — Dashboard redesign** (FE.18.3) consuming primitives.
5. **18.5 — `/account/bookings` redesign** (FE.18.4).
6. **18.6 — `/account/invoices` redesign** (FE.18.5).
7. **18.7 — `/account/members` redesign** (FE.18.6).
8. **18.8 — `/account/preferences` redesign** (FE.18.7).
9. **18.9 — `/account/profile` page** (FE.18.8).
10. **18.10 — `/account/help` page** (FE.18.9).
11. **18.11 — Sign-in and invite surface refresh** (FE.18.10).
12. **18.12 — Mobile responsiveness sweep** (FE.18.12).
13. **18.13 — Documentation finalisation** — extend `ops-design-system-parity.md` § 18 and `ui-ux-specification.md`.

## Non-Goals

* No change to authentication, RLS, or the server-side session model.
* No commerce / self-serve plan upgrades.
* No new translation system in this epic.
* No mobile-native app for accounts.
* No real-time push notifications (in-app polling for the bell stays the MVP).

## Relationship to other epics

| Other epic | Relationship |
|---|---|
| [Epic 17](epic-17.md) | Sister epic. Shares tokens (FE.17.1 / FE.18.1) and primitives (FE.18.13). Account portal applies them in customer-friendly density. |
| [Epic 1 / 10](epic-1.md) | "New booking" links from the dashboard route into the simplified booking funnel of [Epic 19](epic-19.md). |
| [Epic 12 / 12c (client type inference)](epic-12.md) | Member→organisation mapping authoritative for `/account/*` access; epic 18 only consumes the resolution. |
| [Epic 13](epic-13.md) | Invoicing flows feed `/account/invoices` data; epic 18 only presents. |
| [Epic 15 / 15a–15d](epic-15.md) | Customer notifications and quote/invoice archive — surfaced in the new bell + invoices surfaces. |
| [Epic 16](epic-16.md) | New bookings home & walk-in flow — Vestroo Ops side; mirrored on customer side as "Pending quote" status pill on dashboard / bookings rail. |

## References

* [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)
* [`design/visual-redesign-references.md`](design/visual-redesign-references.md)
* [`ops-design-system-parity.md`](ops-design-system-parity.md) — § **18**: [`#parity-18-master-index`](ops-design-system-parity.md#parity-18-master-index) (entry point + glossary), subsections [`#parity-18-1`](ops-design-system-parity.md#parity-18-1)–[`#parity-18-12`](ops-design-system-parity.md#parity-18-12); documentation consolidated in **Story 18.13**. **FE.18.13** shared primitives: [`#parity-18-3`](ops-design-system-parity.md#parity-18-3) (**Story 18.3** implementation).
* [`ADR 0001`](adr/0001-ops-field-ui-stack-tailwind-radix.md)
