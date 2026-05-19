# Epic 17 — story → routes → Wheelzie → parity (traceability)

**Purpose:** Map each **implementation story 17.1–17.19** to **primary routes or surfaces**, the **Wheelzie** reference image id (from [`wheelzie-reference/README.md`](wheelzie-reference/README.md)) where the epic used one, and the **stable anchor** in [`docs/ops-design-system-parity.md`](../ops-design-system-parity.md) **§ 17** — so QA and follow-on work can trace **code ↔ docs** without duplicating the full route table in [`visual-redesign-references.md`](visual-redesign-references.md).

**NFR.17.7:** Wheelzie file names and UI labels in reference PNGs are **not** Vestroo product copy; this matrix uses **image numbers** and **Vestroo** route names only.

| Story | Primary routes / surfaces | Wheelzie ref (id) | Parity § anchor | Notes |
|-------|---------------------------|-------------------|------------------|--------|
| **17.1** | All **`/ops/*`** (token consumers) | — (cross-cutting tokens) | [`#parity-17-1`](../ops-design-system-parity.md#parity-17-1) | CSS vars: [`visual-redesign-tokens.md`](visual-redesign-tokens.md) |
| **17.2** | All **`/ops/*`** (top bar, search, profile) | **#1** (top bar utilities) | [`#parity-17-2`](../ops-design-system-parity.md#parity-17-2) | |
| **17.3** | All **`/ops/*`** (sidebar) | **#1** (grouped nav) | [`#parity-17-3`](../ops-design-system-parity.md#parity-17-3) | |
| **17.4** | Primitives; pairs with **17.6** on `/ops` | **#6**, **#10** (KPI cards) | [`#parity-17-4`](../ops-design-system-parity.md#parity-17-4) | `OpsKpiCard` / `NewBookingsHomeCard` |
| **17.5** | Primitives (charts; used on dashboard + invoicing KPI) | **#6**, **#10** (charts) | [`#parity-17-5`](../ops-design-system-parity.md#parity-17-5) | SVG Option A; Recharts deferred |
| **17.6** | **`/ops`** (dashboard) | **#10** (dashboard) | [`#parity-17-6`](../ops-design-system-parity.md#parity-17-6) | MVP sparkline preview |
| **17.7** | Many queues/lists using pills + avatars | **#1**, **#3**, **#6** | [`#parity-17-7`](../ops-design-system-parity.md#parity-17-7) | `OpsStatusPill`, `OpsAvatarCell` |
| **17.8** | List surfaces using URL `page`/`per` | **#1**, **#9** (pager) | [`#parity-17-8`](../ops-design-system-parity.md#parity-17-8) | `OpsPagination` |
| **17.9** | Primitives (`OpsSplitView`, `OpsDetailRail`) | **#1**, **#3**, **#4**, **#5**, **#8** | [`#parity-17-9`](../ops-design-system-parity.md#parity-17-9) | Pilot routes in later stories |
| **17.10** | **`/ops/bookings`** | **#6** (bookings table) | [`#parity-17-10`](../ops-design-system-parity.md#parity-17-10) | |
| **17.11** | **`/ops/clients`** | **#3** (clients roster) | [`#parity-17-11`](../ops-design-system-parity.md#parity-17-11) | |
| **17.12** | **`/ops/vehicles`** | **#7**, **#8**, **#9** | [`#parity-17-12`](../ops-design-system-parity.md#parity-17-12) | Grid + list + detail |
| **17.13** | **`/ops/trips`** | **#4** (split + map idiom) | [`#parity-17-13`](../ops-design-system-parity.md#parity-17-13) | Map placeholder MVP |
| **17.14** | **`/ops/calendar`** | **#5** (calendar week) | [`#parity-17-14`](../ops-design-system-parity.md#parity-17-14) | |
| **17.15** | **`/ops/roster`** | **#5** (week/month) | [`#parity-17-15`](../ops-design-system-parity.md#parity-17-15) | `OpsCalendarMonth` consumer |
| **17.16** | **`/ops/invoicing`** | **#2** (Payments KPI + table) | [`#parity-17-16`](../ops-design-system-parity.md#parity-17-16) | |
| **17.17** | **`/ops/comms`**, **`/ops/compliance`**, **`/ops/experiences`** | **#1**, **#10** (where cited in story) | [`#parity-17-17`](../ops-design-system-parity.md#parity-17-17) | Chrome polish bundle |
| **17.18** | **`/ops/settings`**, **`/ops/settings/bank-account`**, **`/ops/settings/service-runs`** | **#6**, **#7** (density) | [`#parity-17-18`](../ops-design-system-parity.md#parity-17-18) | |
| **17.19** | **`/ops/login`**, **`/ops/unauthorized`** (shared theme layout) | SaaS sign-in density (see **FE.17.11** in epic) | [`#parity-17-19`](../ops-design-system-parity.md#parity-17-19) | Public **`data-ops-theme="light"`** |
| **17.20** | _Documentation_ (this file, § 17, UI/UX spec) | — | [`#epic-17-parity`](../ops-design-system-parity.md#epic-17-parity) | Meta; no app routes |
| **17.21** (optional) | TBD follow-up QA / token pass | — | — | Defer to story; not part of **17.20** deliverables |

**See also:** route → Wheelzie **mapping** (product coverage) in [`visual-redesign-references.md` § Mapping ` /ops/*`](visual-redesign-references.md).
