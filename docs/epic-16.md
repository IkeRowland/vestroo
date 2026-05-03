# Epic 16 — Ops Workflow Re-Architecture & Industry-Standard Shuttle Console Completion (OPS-16)

## Description

This epic **re-architects the `/ops/*` console** so that the two materially different booking workflows — **walk-in** (availability → quote → email with bank details → ops-confirms-EFT → fulfil) and **account client** (availability → fulfil → invoice with bank details → ops-confirms-EFT) — are delivered on **separate, workflow-shaped primary pages**; introduces a **first-class availability check stage** that staff must complete **before** committing a quote (walk-in) or a dispatch (account); **removes PayFast payment integration entirely** in favour of EFT-to-bank-account collected via emailed quote (walk-in) and emailed invoice (account); **remediates two live blocker defects** visible in the current build (`service_runs` × `tickets` RLS recursion cycle, comms-retry RPC schema-cache miss); **establishes a repository RLS convention** preventing further recursion-class regressions; **completes the Chauffeur → Driver UI display copy sweep** scoped under [`docs/epic-11.md`](epic-11.md) Theme G; and closes remaining gaps against **industry-standard shuttle operations consoles** (dispatch & scheduling board, driver management module, live tracking map, KPI dashboard completion, alerts & notifications center, RBAC admin, map-first route & pickup-point authoring, fleet maintenance & fuel tracking).

Epic 16 does **not** re-open the **VST-14** schema foundation from [`docs/epic-12.md`](epic-12.md), the **account dispatch guardrail** or **Resend** email infrastructure from [`docs/epic-13.md`](epic-13.md), the **walk-in quote-first** architecture from [`docs/epic-14.md`](epic-14.md) **except** to retire the PayFast leg of that flow, or anything shipped in Epic 15 (audit-actor role hardening — referenced by `OpsAuditActorRoleDb`). It **builds on those foundations** and **corrects the delivery layer** so staff get a workflow-shaped console plus a payment model the business actually uses.

It supersedes the **single-surface** primary-staff UX decision implicit in [`docs/epic-12.md`](epic-12.md) (where `/ops/bookings` + chips was intended as the main staff queue) and the **`/ops/fulfil?queue=paid`** primacy from [`docs/epic-14.md`](epic-14.md) Q18 in favour of **two workflow-specific surfaces** (`/ops/walk-in` and `/ops/accounts`) **plus** the **retained** master queue `/ops/bookings` as a **cross-cutting triage surface** for finance/admin review and misclassification rescue (per **Q20**). It supersedes the **PayFast checkout** for walk-in quote acceptance ([`docs/epic-14.md`](epic-14.md) §4 Q19) in favour of EFT — quote acceptance is now a customer-confirmation step on `/q/[token]/accept`, with bank details rendered on the page and in the email; payment receipt is **manually marked by ops** after EFT lands in the bank account (per **Q31** and **Q32**).

The full database-level rename of `chauffeur_*` tables, columns, and role enum values is **out of scope for this epic** — see [`docs/epic-17.md`](epic-17.md) (Chauffeur → Driver schema rename, full codebase + Supabase). Epic 16 delivers a UI-display-only rename via `role-display.ts`; Epic 17 delivers the data-layer rename after Epic 16 stabilises.

Authoritative framing remains **corporate shuttle**, consistent with [`docs/epic-4.md`](epic-4.md) and [`docs/epic-5.md`](epic-5.md); Epic 16 **does not** adopt public-transit IA, and **does not** introduce Ant Design (remains **Tailwind + Radix + shadcn-style** per **FE.5.2**).

**Story provenance is tracked per story** as one of three types, because risk profiles and DoD differ:

- **NEW** — net-new scope not covered in any prior epic.
- **REMEDIATION** — prior epic scope that shipped partially or did not land. Requires reproduction of the failure in a test before the fix is accepted.
- **EXTENSION** — prior epic foundation extended into new UX. Inherits prior epic invariants; must not regress them.

## 1. Epic summary & goals

### Root cause summary — forensic (verified against the Vestroo codebase, not inferred from screenshots)

**Workflow-UX gaps (NEW scope):**

- **Two workflows share one queue.** `/ops/bookings` renders walk-in and account rows in the same table with a `Client` filter chip. But the action set staff need differs by client type: walk-ins need **Send quote → Record acceptance → Confirm EFT receipt → Assign**; accounts need **Check availability → Assign → Confirm dispatch → Invoice → Confirm EFT receipt**. A dispatcher today reads the `client_type` column, mentally switches workflow, and finds the right action in a condensed dropdown. Verified by reading `src/features/ops/ops-nav-config.ts`: `/ops/walk-in` and `/ops/accounts` do not exist as nav items.
- **Availability is not a gate.** `/ops/fulfil`'s empty-state copy reads "*assign a run, chauffeur, and vehicle here*" — staff are expected to commit an assignment without a prior read-only view that shows vehicle and driver availability for the pickup window. `assignBookingToRun` (server action) detects conflicts **after** staff click submit. Outcome today: quotes sent against already-booked vehicles (walk-in), account assignments un-done because the driver has a conflict.
- **Industry-standard features are absent or scattered.** Verified missing nav items in `ops-nav-config.ts` (no `/ops/dispatch`, `/ops/drivers`, `/ops/live`, `/ops/alerts`, `/ops/admin/roles`, `/ops/service-areas`); current `Roster` page (`/ops/roster`) is read-only, listing chauffeurs without detail, document, or performance pages; `/ops/vehicles` lacks maintenance and fuel tabs; `/ops/` dashboard has 7 cards but the v1 industry-grade card set per **Q26** needs 12.

**Live blockers (REMEDIATION scope):**

- **RLS recursion on `service_runs` × `tickets`.** Live red-banner error visible on `/ops/fulfil` (Assignment tab): *"Service runs could not be loaded — infinite recursion detected in policy for relation `service_runs`."* Root cause **proven by reading the policies**, not guessed:
  - Migration `20260418150000_sh94_patterned_run_realtime.sql` (Epic 9 SH.9.4 "go" path, dated 2026-04-18) installs `service_runs_select_party` which uses `EXISTS … from public.tickets tk where tk.service_run_id = service_runs.id`.
  - Migration `20260418140000_sh93_service_run_capacity_holds.sql` (same day) installs `tickets_chauffeur_run_select` which uses `EXISTS … from public.service_runs sr where sr.id = service_run_id and sr.chauffeur_id = auth.uid()`.
  - Selecting `service_runs` evaluates `tickets` policies (which select `service_runs`) ⇒ **PostgreSQL infinite-recursion-detected error**.
  - Neither policy uses the `SECURITY DEFINER` helper pattern established by Epic 11 E1 (`booking_is_visible_to_chauffeur_via_trips`) for exactly this class of issue. The pattern was known and ignored.
- **Missing `ops_list_booking_quote_comms_retry_candidates_v1` RPC** *as far as the runtime is concerned*. Live red banner on `/ops/bookings/comms-retry`: *"Could not find the function … in the schema cache."* The migration **does exist** (`20260420190000_epic13_story138_…sql` is in-repo and the function body is correct). The error is therefore one of: (a) PostgREST schema cache stale — needs `NOTIFY pgrst, 'reload schema';` or container restart; (b) Migration applied to dev/staging but not the environment rendering the error (promotion gap per VST-2). The live error is not "missing migration" — it's a deployment-state defect.
- **Systemic recursion regressions.** Three recursion-fix migrations in three weeks: `20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql`, `20260419220000_reapply_e1_bookings_chauffeur_rls_recursion_fix.sql`, `20260420120000_vst14_customer_account_members_rls_recursion_fix.sql`. The pattern continues with `service_runs × tickets`. **There is no repository convention preventing inline `EXISTS` cross-table checks in new RLS policies.** Without one, the next epic will need a fourth fix.

**Terminology drift (REMEDIATION scope):**

- **"Chauffeur" persists across UI, server actions, and the database role enum.** Codebase review confirms:
  - **UI strings** (sweep target): screenshot-confirmed across at least 7 distinct strings spanning 5 pages including `/ops/roster` heading "Chauffeur roster" and `/ops/vehicles` "Chauffeur roster" button.
  - **Server action filenames and helpers**: `src/actions/fieldChauffeur.ts`, `src/lib/chauffeur-trip-transitions.ts`, `src/lib/resolve-chauffeur-assignment.ts`, function `getChauffeurForAction()` in `src/lib/field-auth.ts`.
  - **Database**: `ProfileRole` enum (`src/types/database.types.ts`) is `'customer' | 'chauffeur' | 'dispatcher' | 'admin'`; `trips.chauffeur_id` column; `chauffeur_assignments` table; `chauffeur_schedules` table; `chauffeur_compliance_documents` table; `OpsAuditActorRoleDb` includes `'chauffeur'`.
- **Q21 holds with a sharpening:** UI **display label** is "Driver"; **database enum value** remains `'chauffeur'` until [`docs/epic-17.md`](epic-17.md) ships the schema rename. Code-layer renames (filenames, helper names) are scoped per file in Theme L1 audit — non-trivial server actions stay named `…Chauffeur…` to preserve `git blame` history; UI components rename freely.

**Payment model (NEW scope per Q31, replacing Epic 14 PayFast leg):**

- **Today (Epic 14):** Walk-in quote acceptance redirects customer to PayFast; ITN webhook (`src/app/api/payfast/webhook/route.ts`) flips `bookings.payment_status='paid'`; DB trigger `20260420220000_epic14_story141_ready_to_assign_walk_in_paid_trigger_v1.sql` transitions booking to `ready_to_assign`. PayFast integration footprint: `src/lib/payfast.ts`, `src/lib/payfast-client.ts`, `src/actions/processPayment.ts`, `src/app/(quote)/q/[token]/pay/`, `src/app/(quote)/q/[token]/accept/` (Epic 14 customer accept landing currently calls `processPayment`).
- **Future (this epic):** Quote email and invoice email contain **bank account details**. Customer EFTs the amount. Ops staff verifies receipt in the bank statement and uses a new `markBookingPaymentReceived` server action on `/ops/walk-in` (per **Q32**). PayFast files, routes, webhook, and the `payment_status='paid'` DB trigger are **physically removed**, not feature-flagged. Customer keeps `/q/[token]/accept` as a "quote acceptance + bank-details + reference" landing (per **Q33**); `/q/[token]/pay` is retired.

### Business goals

- **Workflow clarity.** Walk-in staff see only walk-in stages and walk-in actions; account staff see only account stages and account actions. Stage-specific CTAs surface by default, not via a conditional render inside a shared table.
- **Availability-first fulfilment.** Staff visually confirm a vehicle and a driver are free for the pickup window **before** they commit. Outcome target: fewer "we need to swap your driver" follow-ups; fewer quotes sent against already-booked capacity.
- **Payments matched to the operator's reality.** Vestroo is currently collecting via EFT in practice; PayFast was a mismatch. Removing it eliminates an operationally-unused integration, simplifies the customer flow (one email with bank details vs a redirect to a third-party gateway), and reduces compliance surface area (no PCI-adjacent webhook to maintain).
- **Zero live errors on staff-critical pages.** `/ops/fulfil` and `/ops/bookings/comms-retry` load without red error blocks. Table stakes for a console staff depend on daily.
- **No more recurring recursion fixes.** A repository RLS convention plus smoke-test gating prevents the next recursion regression at PR-review time, not in production.
- **Industry-grade console.** A new dispatcher onboards in under a working day because the IA matches their mental model from other shuttle operators.
- **Single source of truth per workflow.** Walk-in staff have one URL (`/ops/walk-in`); account staff have one URL (`/ops/accounts`); finance/admin use `/ops/bookings` for cross-cutting triage. Legacy URLs redirect rather than co-exist.
- **No regression of VST-14 invariants.** Account-snapshot immutability, `booking_quotes` append-only versioning, PO guardrail, `client_type` linkage check — all preserved.

### Technical goals

- **Route re-architecture (Theme A):** Two new primary routes under `src/app/(ops)/ops/`:
  - `/ops/walk-in` — walk-in workflow queue with stage tabs aligned to the [`docs/epic-12.md`](epic-12.md) state machine: `submitted → triaged → quote_sent → awaiting_payment → ready_to_assign → in_progress → completed`. Adds a new `availability_checked` sub-state between `triaged` and `quote_sent`. The `awaiting_payment → ready_to_assign` transition is now driven by `markBookingPaymentReceived` (ops manual mark) instead of the PayFast ITN webhook trigger.
  - `/ops/accounts` — account workflow queue with stage tabs: `submitted → triaged → assigned → in_progress → completed → invoiced → paid`. Adds `availability_checked` sub-state between `triaged` and `assigned`. Account `paid` is also driven by `markBookingPaymentReceived`.
  - `/ops/bookings` **retained** as the cross-cutting master queue (per **Q20**) — finance/admin view with both client types, unchanged filter chips.
  - `/ops/fulfil` **redirects** to `/ops/walk-in?stage=ready_to_assign` (preserves bookmarks per Epic 14 Q18).
  - `/ops/board`, `/ops/calendar`, `/ops/trips`, `/ops/search` **retained** as trip-centric / utility views, no longer implied as primary staff queues.

- **Availability check stage (Theme B):** New columns on `bookings`:
  - `availability_checked_at timestamptz NULL`
  - `availability_checked_by uuid NULL REFERENCES public.profiles(id)` — codebase uses `public.profiles` for staff identity per VST-5.
  - `availability_check jsonb NULL` — snapshot of candidates considered.

  Server-side guardrails: `sendWalkInQuote` and `assignBookingToRun` both reject if `availability_checked_at IS NULL`, with a new `OpsActionError` variant `availability_check_required`.

- **Payment model swap (Theme N):** Remove all PayFast files and routes. Add `bank_account_details` to email render context for both quote and invoice templates. Add `markBookingPaymentReceived(bookingId, evidenceRef, amountReceived, receivedAt)` server action with audit log entry (`action='payment_received_eft'`) and credit-side-effect that fires the existing `awaiting_payment → ready_to_assign` (walk-in) and `invoiced → paid` (account) transitions previously triggered by the PayFast webhook.

- **Dispatch & Scheduling Board (Theme C):** `/ops/dispatch` — day/week calendar grid, vehicles × time, drag-assign from unassigned panel.

- **Driver Management (Theme D):** `/ops/drivers` — extends `/ops/roster` with detail / schedule / documents / performance / activation pages.

- **Live Tracking Map (Theme E):** `/ops/live` — map view subscribing to the existing `vehicle_trackings` Realtime channel (per VST-9).

- **KPI Dashboard completion (Theme F):** 12-card v1 set per **Q26**.

- **Alerts & Notifications Center (Theme G):** New `ops_alerts` table + `/ops/alerts` page + 7 alert kinds.

- **RBAC admin (Theme H):** `/ops/admin/roles` with invite / role change / deactivate flows. Note: existing `OPS_CONSOLE_ROLES = ['dispatcher', 'admin']` (verified in `ops-nav-config.ts`) governs ops console access. RBAC admin manages assignment of the `ProfileRole` enum across `customer | chauffeur | dispatcher | admin` (UI shows "Driver" for `chauffeur` per Q21).

- **Route & Pickup-Point Authoring (Theme I):** `/ops/service-areas` map-first editor.

- **Fleet Maintenance & Fuel (Theme J):** Vehicle detail page extension.

- **REMEDIATION — `service_runs × tickets` recursion fix (Theme K1):** Drop `service_runs_select_party` and `tickets_chauffeur_run_select` and replace each with a `SECURITY DEFINER` helper following the Epic 11 E1 pattern. Reproduce in `smoke_rls.sql` first.

- **REMEDIATION — Comms-retry RPC schema cache (Theme K2):** Issue `NOTIFY pgrst, 'reload schema';` to the affected environment; verify migration is applied; if missing in any environment, re-promote per VST-2.

- **NEW — RLS convention ADR + repo gate (Theme O):** ADR `0006-rls-cross-table-helpers.md` mandating: any new RLS policy whose `USING` or `WITH CHECK` clause needs to reference another table must use a `SECURITY DEFINER STABLE` helper function, not inline `EXISTS`. Add a CI lint script flagging migrations whose `create policy` body contains `from public.<another_table>` outside an existing helper. `smoke_rls.sql` extended with an assertion that selecting from each policy-bearing table does not raise SQLSTATE 42P17 (infinite recursion).

- **REMEDIATION — Chauffeur → Driver UI display rename (Theme L):** Audit table; UI-only display rename ("Driver"); `role-display.ts` map; one component-filename rename. **DB enum value `chauffeur` retained** with mapping documented; full data-layer rename is [`docs/epic-17.md`](epic-17.md).

### Product decisions locked (continues Epic 14 Q19)

| Id | Decision |
|----|----------|
| **Q20** | **Master `/ops/bookings` queue is retained** as a cross-cutting triage surface (finance, admin, misclassified-booking rescue). Not the primary staff workflow page; `/ops/walk-in` and `/ops/accounts` are. |
| **Q21** | **"Driver" is the final UI display label** for the operational role across ops, field, and customer-visible surfaces. **Database enum value `chauffeur` is preserved** in `ProfileRole`, `OpsAuditActorRoleDb`, column names `trips.chauffeur_id`, table `chauffeur_assignments`, etc. The full database rename is [`docs/epic-17.md`](epic-17.md). Epic 16 is UI-display-only with mapping documented at `src/features/ops/role-display.ts`. |
| **Q22** | **Separate primary pages for walk-in and account workflows** (`/ops/walk-in`, `/ops/accounts`). |
| **Q23** | **Availability check is a mandatory stage** before `sendWalkInQuote` and before `assignBookingToRun`. Admin override available with mandatory reason text (mirrors Epic 13 Q12); override writes to `ops_audit_log` with `action='availability_check_override'`. |
| **Q24** | **Dispatch scheduler is read-only aggregation + existing assign action** for v1. Manual drag-assign only. |
| **Q25** | **Driver rename exception: Close Protection.** Close-protection engagement staff retain "Close Protection Officer". |
| **Q26** | **KPI dashboard v1 card set is finite and locked** at 12 cards. Definitions in `docs/ops-dashboard-kpis-v1.md`. |
| **Q27** | **Live map defaults to dark mode.** |
| **Q28** | **`ops_alerts` is a new domain table**, 7 alert kinds in v1. |
| **Q29** | **RBAC admin writes Supabase Auth user claims**; session invalidation on role downgrade is documented limitation, not enforced in v1. |
| **Q30** | **Route authoring uses Google Maps**, not Leaflet. |
| **Q31** | **PayFast payment integration is removed entirely.** Replaced with EFT-to-bank-account collected via emailed quote (walk-in) and emailed invoice (account). Removal is **physical** — no feature flag, no leave-behind dead code. PayFast files, routes, webhook handler, ITN signature verification, redirect builder, and the DB trigger that flipped `payment_status` on PayFast ITN are all deleted. `bank_account_details` added to ops settings (a single shared row in a new `ops_settings` table — masked for non-admins, full for admins; rendered into outgoing emails server-side). |
| **Q32** | **Walk-in `awaiting_payment → ready_to_assign` (and account `invoiced → paid`) is driven by ops manual mark.** New server action `markBookingPaymentReceived(bookingId, evidenceRef, amountReceived, receivedAt)`; CTAs surface on `/ops/walk-in?stage=awaiting_payment` and on `/ops/accounts?stage=invoiced` (per workflow). Manual mark writes to `ops_audit_log` with `action='payment_received_eft'`, `payload.evidence_ref`, `payload.amount_zar`. **Bank-statement integration is not in scope** (deferred to a future epic). |
| **Q33** | **`/q/[token]/accept` is retained** as a customer-facing landing showing "quote accepted, here are our bank details and your reference number". On accept, system records acceptance, sets booking to `awaiting_payment`, sends a confirmation email with bank details + the same reference. **`/q/[token]/pay` is retired** entirely (route deleted; the page never had a non-PayFast purpose). Tokens already in customer inboxes pointing to `/q/[token]/pay` get redirected to `/q/[token]/accept` via a one-line route handler kept for 90 days as a deprecation window, then deleted. |
| **Q34** | **No DB-level rename of `chauffeur_*` tables, columns, or enum values in this epic.** That work is scoped as [`docs/epic-17.md`](epic-17.md) — Chauffeur → Driver schema rename (full codebase + Supabase), sequenced after Epic 16 ships and stabilises. Epic 16 Theme L produces `role-display.ts` (`{ chauffeur: 'Driver', dispatcher: 'Dispatcher', admin: 'Admin', customer: 'Customer' }`) and uses it everywhere a role string surfaces in UI. Server actions and audit logs keep writing `'chauffeur'` until Epic 17 lands. **Forward compatibility:** `role-display.ts` remains useful after Epic 17 (audit history rows pre-Epic-17 retain `'chauffeur'`, and `role-display.ts` normalises them in any historical UI views). |
| **Q35** | **RLS convention is enforced going forward via ADR + CI lint, not retroactive policy rewrite.** Theme O fixes only the live-error pair (`service_runs × tickets`) plus the three already-fixed pairs are documented as conformant. Other policies are left as-is unless a future incident forces re-evaluation. This avoids a "rewrite every RLS policy" epic-within-an-epic. |

## 2. Non-goals / out of scope

- **Schema rename of `chauffeur_*` tables, columns, role enum values** (per **Q34**) — scoped as [`docs/epic-17.md`](epic-17.md).
- **Bank-statement integration / automated payment matching** (per **Q32**).
- **Feature-flagged PayFast leave-behind** — removal is physical (per **Q31**).
- **Multi-leg trip model** — Epic 12 Q1 invariant holds (`UNIQUE(booking_id)` on `booking_trips`).
- **Auto-assign, preference scoring, shift planning** on dispatch board (per **Q24**).
- **Native mobile driver app** — Epic 5 FE.5.6 deferral holds.
- **In-app chat between ops and drivers** — Epic 7 RT.7.3 deferred.
- **Passenger manifests UI** — SH.9.2 schema exists; UI belongs in its own epic.
- **Full ERP integration** — Epic 13 Q10 holds.
- **Audit log visualisation page** — `ops_audit_log` continues to be written; no viewer page.
- **Retroactive rewrite of all existing RLS policies to the helper pattern** (per **Q35**).
- **`/q/[token]/pay` route retained for any reason** — deleted; redirect kept 90 days only.

## 3. Phased delivery plan

**Ordering principle:** **Remediation first** (unblock live errors and prevent regressions). **Schema additions before UI**. **Payment model swap before workflow page builds** (because workflow page CTAs depend on the new payment-mark action). **Workflow primary pages before nice-to-have modules**. **Rename sweep parallel** (low coupling).

| Phase | Focus | Includes (theme / story roll-up) | Parallelism |
|-------|-------|---------------------------------|-------------|
| **0 — Remediation** | Unblock live errors; prevent regressions | **K1** `service_runs × tickets` RLS fix (helper pattern); **K2** comms-retry schema-cache reload + promotion verify; **O1** RLS convention ADR; **O2** CI lint + smoke gate; **L1** Chauffeur → Driver UI audit produced | K1+K2 sequential; O1+O2 after K1; L1 fully parallel |
| **1 — Schema & invariants** | Availability columns; ops_alerts; ops_settings (bank details); driver_assignments view | **B1** `bookings.availability_checked_*`; **G1** `ops_alerts`; **N1** `ops_settings` table + bank details columns; **L2** `driver_assignments` view aliased | All parallel after Phase 0 |
| **2 — Payment model swap** | Remove PayFast; add EFT mark action | **N2** delete PayFast code paths and DB trigger; **N3** `markBookingPaymentReceived` server action; **N4** quote email template adds bank details; **N5** account invoice email adds bank details; **N6** `/q/[token]/accept` becomes EFT confirmation landing; **N7** `/q/[token]/pay` deleted + 90-day redirect; **N8** Epic 14 state machine cleanup (remove ITN-driven transition) | N2 first; N3+N4+N5+N6+N7 parallel; N8 last |
| **3 — Workflow primary pages** | `/ops/walk-in` and `/ops/accounts` | **A1** walk-in shell + tabs + EFT-mark CTA; **A2** accounts shell + tabs + EFT-mark CTA; **A3** nav IA update; **A4** legacy URL redirects | A1+A2 parallel; A3+A4 after |
| **4 — Availability check UX** | Check screen + guardrails | **B2** check-availability UI; **B3** server guardrails; **B4** admin override | B2+B3 parallel after Phase 3 |
| **5 — Industry-standard modules** | Dispatch / Drivers / Live / Alerts / RBAC / Service areas / Fleet maintenance | **C1**, **D1**+**D2**, **E1**, **G2**+**G3**, **H1**, **I1**, **J1**+**J2** | All parallel after Phase 4 |
| **6 — KPI dashboard completion** | Remaining 5 cards + drill-downs | **F1** KPI cards; **F2** definitions doc | After Phase 5 |
| **7 — Sweep finalisation & quality** | Driver rename completion + E2E + smoke | **L3** UI display rename via `role-display.ts`; **L4** non-blocking filename rename pass; **M1** Playwright E2E for both workflows including EFT-mark flow; **M2** smoke RLS extensions | Last phase |

**Sizing estimate:** approximately 62 story points across 24 stories. Single-developer throughput is ≈ 4–5 sprints; two-dev parallel is ≈ 2.5–3 sprints. **Descope lever:** Phases 0–4 deliver the must-haves (workflow separation, availability gate, EFT swap, RLS remediation, rename); Phase 5 modules can split off as Epic 16.5 if timeline pressure arises.

## 4. Themes with user stories & acceptance criteria

### Theme A — Separated workflow pages (NEW)

**US-A1 — As walk-in ops staff**, I need a dedicated `/ops/walk-in` page showing only walk-in bookings with workflow-shaped stage tabs and walk-in-appropriate actions.

- **AC:** Page renders only `bookings` rows where `client_type='walk_in'`.
- **AC:** Stage tabs: `New` (`submitted`), `Triaged`, `Availability checked`, `Quote sent`, `Awaiting payment`, `Ready to assign`, `In progress`, `Completed`. Counts per tab refresh on Realtime INSERT/UPDATE per Epic 11 E2.
- **AC:** Default CTAs per stage: New → Triage; Triaged → Check availability; Availability checked → Send quote (with bank details in email); Quote sent → (view only); **Awaiting payment → Mark EFT received** (per **Q32**, opens dialog requesting `evidence_ref`, `amount_zar`, `received_at`); Ready to assign → Assign trip; In progress → (view only); Completed → Archive.
- **AC:** Drill-down from dashboard "New Bookings" card filters to `client_type='walk_in'` on this page.
- **AC:** Page header pattern matches existing `OpsPageHeader` component; data-freshness bar matches `OpsDataFreshnessBar`; error island matches `OpsErrorState`.
- **AC:** Mobile responsive — stage tabs collapse to a select dropdown below `768px` viewport.

**US-A2 — As account ops staff**, I need a dedicated `/ops/accounts` page showing only account-client bookings.

- **AC:** Page renders only `bookings` rows where `client_type='account_client'`.
- **AC:** Stage tabs: `New`, `Triaged`, `Availability checked`, `Assigned`, `In progress`, `Completed`, `Invoiced`, `Paid`.
- **AC:** Default CTAs: New → Triage; Triaged → Check availability; Availability checked → Assign trip; Assigned → Confirm dispatch (triggers Epic 13 trip confirmation email); In progress → (view only); Completed → Hand off to invoicing (triggers Epic 13 `ready_to_invoice` transition); **Invoiced → Mark EFT received** (per **Q32**); Paid → (terminal).
- **AC:** Credit limit / PO / contract health chip per row, surfacing the `can_dispatch_account_booking()` reason codes from Epic 13 (`account_on_hold`, `credit_limit_exceeded`, `po_required_and_missing`, etc.) when not `ok`.
- **AC:** Same shell components (header, freshness bar, error island) as `/ops/walk-in`.
- **AC:** Mobile responsive — same pattern.

**US-A3 — As any ops staff**, the sidebar navigation reflects the new workflow-primary IA.

- **AC:** Edits to `src/features/ops/ops-nav-config.ts`:
  - **Add** under `fulfilment` group, **above** the existing `Bookings` item: `{ href: '/ops/walk-in', label: 'Walk-in bookings', icon: ClipboardList }` and `{ href: '/ops/accounts', label: 'Account bookings', icon: ClipboardList }`.
  - **Add** under `fulfilment` group: `{ href: '/ops/dispatch', label: 'Dispatch', icon: Calendar }` (Theme C; this story adds the nav item with feature-flag visibility if Theme C ships in a later phase).
  - **Move** existing `Fulfil` and `Board` items into a new sub-group `legacy` rendered visually distinct (smaller font, "Legacy" pill); keeps the items reachable for bookmark continuity.
  - **Add** to `SEGMENT_LABELS` map: `'walk-in': 'Walk-in bookings'`, `'accounts': 'Account bookings'`, `'dispatch': 'Dispatch'`, `'drivers': 'Drivers'`, `'live': 'Live tracking'`, `'alerts': 'Alerts'`, `'service-areas': 'Service areas'`, `'admin': 'Admin'`, `'roles': 'Roles & permissions'`, `'settings': 'Settings'`.
  - **Update** the FE.5.11 audit comment to note the new pages.
- **AC:** Role-aware visibility per FE.5.1 — finance-only roles (if introduced via Theme H) see `Bookings` + `Invoicing` + `Compliance` but not `Walk-in bookings` / `Account bookings` primary queues.
- **AC:** Existing `ops-nav-config.test.ts` updated to assert the new items present and breadcrumb labels resolved.

**US-A4 — As a returning user with old bookmarks**, legacy URLs redirect to the appropriate new surface.

- **AC:** `src/middleware.ts` (or a per-route handler) issues redirects:
  - `/ops/fulfil` → `/ops/walk-in?stage=ready_to_assign` (preserves the bulk of Epic 14 Q18 users).
  - `/ops/fulfil?queue=paid` → same.
  - `/ops/fulfil?queue=trip_request` → `/ops/walk-in?stage=new`.
  - `/ops/fulfil?queue=pending` → `/ops/walk-in?stage=awaiting_payment`.
- **AC:** Legacy pages `/ops/board` and `/ops/trips` and `/ops/calendar` are **not** redirected — these are trip-centric views retained for operational utility per non-goals.
- **AC:** Redirects use 302 (temporary) so search engines and link rot are not committed permanently.
- **AC:** Test in `tests/e2e/legacy-url-redirects.spec.ts` asserts each redirect returns 302 to the expected path.

### Theme B — Availability check stage (NEW)

**US-B1 — As a migration author**, I add `bookings` columns for availability-check audit.

- **AC:** New migration `YYYYMMDDHHMMSS_ops16_availability_check_columns.sql`:
  ```sql
  alter table public.bookings
    add column if not exists availability_checked_at timestamptz null,
    add column if not exists availability_checked_by uuid null references public.profiles(id) on delete set null,
    add column if not exists availability_check jsonb null;
  
  comment on column public.bookings.availability_checked_at is
    'Epic 16 Theme B: when staff completed the vehicle/driver availability review for this booking. Null = not yet checked. Required before sendWalkInQuote / assignBookingToRun unless admin-overridden.';
  comment on column public.bookings.availability_checked_by is
    'Staff profile id of who completed the availability check.';
  comment on column public.bookings.availability_check is
    'Snapshot of candidates considered (vehicles, drivers), conflicts noted, staff rationale, and override flag if admin-bypassed.';
  
  create index if not exists idx_bookings_availability_checked
    on public.bookings (availability_checked_at)
    where availability_checked_at is not null;
  ```
- **AC:** RLS extension: existing `bookings_update` policy already covers staff updates (Epic 12 / VST-14). No new policy needed; the new columns inherit the existing policy.
- **AC:** Field-role accounts (drivers signing into the field app) cannot update these columns — verified by the existing role-narrow policies on `bookings`.
- **AC:** `smoke_rls.sql` extended:
  ```sql
  -- Theme B / US-B1: availability-check columns RLS
  set role authenticated;
  -- as ops staff: can read and write
  -- as field driver: can read but not write (existing policy)
  -- as customer: cannot see other customers' check details
  reset role;
  ```

**US-B2 — As ops staff**, I have a "Check availability" screen showing which vehicles and drivers are free for the pickup window.

- **AC:** Screen reachable from the `Triaged` stage row action on both `/ops/walk-in` and `/ops/accounts`. Route: `/ops/walk-in/[bookingId]/availability` and `/ops/accounts/[bookingId]/availability`.
- **AC:** Layout: time-window strip centred on the booking pickup datetime ±2 hours by default. Y-axis lists candidate vehicles (filtered by passenger capacity ≥ booking passengers); X-axis is time. Existing `trips` and `chauffeur_assignments` rows in the window render as blocks. Conflicts highlighted in red.
- **AC:** A second strip below shows driver availability for the same window — driver rows, time blocks for any existing assignments. Same red-conflict highlighting.
- **AC:** Staff selects one vehicle and one driver via click. Selection is sticky per session.
- **AC:** Free-text rationale field (max 500 chars) — required only if there's any visible conflict in the candidates considered (system enforces).
- **AC:** Submit button calls server action `submitAvailabilityCheckAction(input: { bookingId, selectedVehicleId, selectedDriverId, rationale, candidatesConsidered: { vehicleIds: string[], driverIds: string[] } })`. On success: writes `availability_checked_at = now()`, `availability_checked_by = auth.uid()`, `availability_check = { selected_vehicle_id, selected_driver_id, candidates_considered: {...}, rationale }` in a single round-trip; redirects to the booking detail page.
- **AC:** Loading state, error state, success toast match Epic 11 Theme B patterns (`OpsLoadingRegion`, `OpsErrorState`).
- **AC:** Mobile responsive — strips become vertical on narrow viewports.

**US-B3 — As a developer**, server guardrails block downstream actions when availability check is missing.

- **AC:** `sendWalkInQuote` (Epic 14) rejects with a new `OpsActionError` variant `availability_check_required` if `bookings.availability_checked_at IS NULL`. Error response includes a `reason` field set to `'availability_check_required'` and a `redirect_hint` pointing to the check screen URL.
- **AC:** `assignBookingToRun` (account dispatch path) rejects under the same condition with the same error variant.
- **AC:** Tests in `src/actions/__tests__/sendWalkInQuote.test.ts` and `src/actions/__tests__/opsDispatch.test.ts` assert the rejection.
- **AC:** Playwright test asserts that a UI attempt to skip the check screen and call the action via direct URL navigation is blocked with a clear error message, not a silent failure.

**US-B4 — As an admin**, I may override the availability-check requirement with a mandatory reason.

- **AC:** New server action `adminOverrideAvailabilityCheckAction(input: { bookingId, reason })` — admin role only.
- **AC:** Validation: `reason.length >= 10` (mirrors Epic 13 Q12 credit-override pattern).
- **AC:** On success: writes `availability_checked_at = now()`, `availability_checked_by = auth.uid()`, `availability_check = { override: true, override_reason: $reason, override_at: now() }`.
- **AC:** Always writes a row to `ops_audit_log` with `action='availability_check_override'`, `payload={ booking_id, reason }`.
- **AC:** UI: an admin-visible "Override availability check" button appears on the Triaged stage row actions, opening a dialog requiring the reason text. Non-admin staff do not see this affordance.
- **AC:** Test asserts non-admin call rejects with `forbidden_admin_only`.

### Theme C — Dispatch & Scheduling Board (NEW)

**US-C1 — As dispatch staff**, I have a calendar grid showing vehicles × time with current trips drawn in.

- **AC:** New page at `/ops/dispatch` (route file `src/app/(ops)/ops/dispatch/page.tsx`).
- **AC:** Default view: today, day mode. Toggle controls: day / week. Date navigation: prev / next / "today" buttons + jump-to-date picker.
- **AC:** Grid: vehicles on Y-axis (rows show plate + category from `vehicle_categories`); time on X-axis (hours marked, 30-minute gridlines).
- **AC:** Existing `trips` rows render as blocks positioned by `time_start_estimate` and `time_end_estimate`. Block content: booking reference (truncated), customer name (truncated). Block colour by `trips.status`: `booking` (grey), `assigned` (blue), `en_route` (yellow), `completed` (green), `cancelled` (strikethrough).
- **AC:** Right-side panel lists unassigned bookings: walk-in `ready_to_assign` + account `availability_checked` (not yet `assigned`). Card layout: reference, customer/account name, pickup datetime, passengers, requested vehicle category.
- **AC:** Drag-and-drop: drag an unassigned booking card onto a vehicle row at a time slot. On drop, calls `assignBookingToRun` server action (existing). Server-side conflict check returns error if target window collides with an existing block; error toast shown; card returns to panel.
- **AC:** Reuse existing `ops-time-windows.ts` overlap helpers (per `/ops/vehicles` Overlap self-check feature).
- **AC:** Read-only conflict check helper view: clicking a block opens a popover showing booking detail link, current vehicle, current driver, conflict warnings (if any).
- **AC:** Loading state while initial query resolves; empty state when no trips and no unassigned bookings; error island on query failure.
- **AC:** Performance: virtualise the grid for ≥ 50 vehicles or ≥ 7 days. Day view target: < 200ms render with 30 trips visible. Week view target: < 500ms with 200 trips.
- **AC:** No new schema. Aggregates existing `trips`, `vehicles`, `staff_profiles`, `chauffeur_assignments`.
- **AC:** Realtime: subscribes to `trips` INSERT/UPDATE/DELETE per VST-9 + Epic 11 E2; debounced refresh (1s) when changes arrive.

### Theme D — Driver Management (EXTENSION of `/ops/roster`)

**US-D1 — As ops staff**, I have a drivers list with status, upcoming trips, and license validity at a glance.

- **AC:** New page at `/ops/drivers` (replaces today's `/ops/roster` as primary; roster URL redirects).
- **AC:** Lists `profiles` rows where `role='chauffeur'` (DB literal preserved per Q21 / Q34); UI labels show "Driver" via `role-display.ts`.
- **AC:** Columns: Name (`full_name`), Status (`profiles.status`), Trips (count of `trips` where `chauffeur_id = profile.id` and `time_start_estimate >= now() - interval '30 days'`), On-time % (count of completed-trips where `actual_end_at <= time_end_estimate + interval '15 minutes'` ÷ total completed in 30d), License expiry (most-relevant `chauffeur_compliance_documents` row of type `drivers_licence`), PrDP expiry (type `pdp`).
- **AC:** Expiry columns highlighted: red if expired, amber if ≤ 30 days, neutral otherwise.
- **AC:** Row click → `/ops/drivers/[id]` detail page (US-D2).
- **AC:** Filter row: Active / Inactive / All status filter; search by name.
- **AC:** Realtime refresh on `chauffeur_assignments` INSERT/UPDATE/DELETE for the visible drivers.
- **AC:** `/ops/roster` returns 302 to `/ops/drivers`.

**US-D2 — As ops staff**, I view driver detail: schedule, documents, activity, and (de)activation.

- **AC:** Detail page at `/ops/drivers/[id]`. Tabs: **Overview**, **Schedule**, **Documents**, **Activity**, **Settings**.
- **AC:** **Overview tab:** Driver name, contact (phone, email — masked for non-admin if PII compliance applies — verify VST-12), employment status, hire date if available, current vehicle (if assigned today), license + PrDP expiry summary.
- **AC:** **Schedule tab:** This driver's upcoming `chauffeur_assignments` (next 14 days by default). List view: date, vehicle, time window, run reference, assignment status. Read-only.
- **AC:** **Documents tab:** Lists `chauffeur_compliance_documents` for this driver. Columns: type, document number, expiry date, status (active/expired). Upload affordance for new documents (uses existing VST-12 Storage flow).
- **AC:** **Activity tab:** Last 30 days of trips this driver completed. Columns: date, booking reference, route, on-time/late, status. Pagination if > 50 rows.
- **AC:** **Settings tab:** Admin-only. Deactivate button (soft — sets `profiles.status='deactivated'` plus `deactivated_at = now()`); reactivate button. Confirmation dialog required.
- **AC:** All sensitive PII (phone, email) follows the Epic 11 `is_staff` predicate that's already in `profiles_select` policies; no new RLS work needed.

### Theme E — Live Tracking Map (EXTENSION of VST-9)

**US-E1 — As dispatch staff**, I have a live map showing active vehicles and trip statuses.

- **AC:** New page at `/ops/live`.
- **AC:** Subscribes to `vehicle_trackings` Realtime channel scoped to active trips (per migration `20260402133703_vestroo_rls_policies_tracking_drivers.sql` — RLS already filters by staff visibility).
- **AC:** Google Maps canvas (per Q30 / matches Epic 3 stack — already integrated). Vehicle markers placed at `vehicle_trackings.latitude` / `longitude` (or whatever the actual columns are — story implementer verifies the live-tracking schema).
- **AC:** Marker click → popover with driver name (display via `role-display.ts`), vehicle plate, trip reference (link to trip detail), trip status, ETA if computed.
- **AC:** **Dark-mode default** (per **Q27**) using Google Maps dark style. Toggle to light mode; preference persists in `localStorage` keyed by user id.
- **AC:** Sidebar list of active trips (left of map): scrollable list, click-to-focus a marker on the map.
- **AC:** Legend showing marker colour by trip status (assigned / en_route).
- **AC:** Graceful degradation if Realtime disconnects: amber banner "Live updates paused — reconnecting" with a manual refresh button. On reconnect, banner clears.
- **AC:** Empty state: "No active trips right now" centred on the map area.
- **AC:** Error state: red banner "Map could not load — [error message]" if Google Maps fails to initialise.
- **AC:** Read-only in v1. No editing, no manual marker placement.

### Theme F — KPI Dashboard completion (EXTENSION)

**US-F1 — As any ops user**, the dashboard home shows the v1 KPI card set with drill-downs to filtered queues.

- **AC:** Card grid on `/ops/` shows the following 12 cards in this order, in a 4-column grid (3 rows on desktop, stacked on mobile):
  1. **New Bookings** — count of bookings where `status IN ('submitted','triaged','quote_sent','awaiting_payment')`. Drill: `/ops/bookings?status=submitted,triaged,quote_sent,awaiting_payment`.
  2. **Open Trips** — count of trips where `status IN ('booking','assigned','en_route')`. Drill: `/ops/board`.
  3. **Trips — booking** — count where `status='booking'`. Drill: `/ops/board?status=booking`.
  4. **Trips — en route** — count where `status='en_route'`. Drill: `/ops/live`.
  5. **Completed (7 days)** — count of trips with `time_end_estimate >= now() - interval '7 days'` and `status='completed'`. Drill: `/ops/board?status=completed&window=7d`.
  6. **Pending Payment** — count of bookings where `status='awaiting_payment'`. Drill: `/ops/walk-in?stage=awaiting_payment`.
  7. **Trip Requests** — count of bookings where `booking_intent='trip_request'`. Drill: `/ops/walk-in?intent=trip_request`.
  8. **Revenue Today** — sum of `bookings.payment_amount_zar` (or quote-derived equivalent — story implementer verifies the exact column) where `payment_received_at::date = current_date`. Drill: `/ops/invoicing?period=today`.
  9. **Drivers On Duty** — count of `profiles` with `role='chauffeur'` who have at least one `chauffeur_assignments` row covering `now()`. Drill: `/ops/drivers?status=on_duty`.
  10. **Vehicles In Service** — count of `vehicles` where `vehicle_condition='active'` and `archived_at IS NULL`. Drill: `/ops/vehicles?status=active`.
  11. **Delayed Trips** — count of trips where `status IN ('en_route','assigned')` and `ops_revised_time_end_estimate IS NOT NULL`. Drill: `/ops/board?status=delayed`.
  12. **Alerts** — count of `ops_alerts` where `acknowledged_at IS NULL` and `dismissed_at IS NULL`. Drill: `/ops/alerts`.
- **AC:** Each card shows: label, value, optional secondary text (e.g. "vs yesterday" delta if computable cheaply), and a "Needs attention" pill when value > threshold (per existing `OpsDashboardView` patterns).
- **AC:** Loading and error states reuse `OpsLoadingRegion` and `OpsErrorState` per Epic 11 Theme B.
- **AC:** Card values refresh on Realtime INSERT/UPDATE for the source tables, debounced 2s (per Epic 11 E2).

**US-F2 — As a developer**, KPI definitions are documented for ongoing reference.

- **AC:** Update `docs/ops-dashboard-kpis-v1.md` with one section per card. Each section includes: numerator (SQL expression), denominator (where applicable), timezone (UTC unless specified), inclusion window, drill-down URL.
- **AC:** File linked from `/ops/` page header tooltip ("Dashboard KPIs").
- **AC:** Definitions reviewed by product before story is closed.

### Theme G — Alerts & Notifications Center (NEW)

**US-G1 — As a migration author**, I add the `ops_alerts` table.

- **AC:** Migration `YYYYMMDDHHMMSS_ops16_ops_alerts_table.sql`:
  ```sql
  create table public.ops_alerts (
    id uuid primary key default gen_random_uuid(),
    kind text not null check (kind in (
      'maintenance_due',
      'license_expiring',
      'prdp_expiring',
      'quote_expiring_soon',
      'email_retry_failed',
      'delayed_trip',
      'overdue_invoice'
    )),
    severity text not null default 'medium' check (severity in ('low','medium','high','critical')),
    subject_table text not null,
    subject_id uuid,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    acknowledged_at timestamptz,
    acknowledged_by uuid references public.profiles(id) on delete set null,
    dismissed_at timestamptz,
    dismissed_by uuid references public.profiles(id) on delete set null
  );
  
  create index idx_ops_alerts_open
    on public.ops_alerts (created_at desc)
    where acknowledged_at is null and dismissed_at is null;
  
  create index idx_ops_alerts_subject
    on public.ops_alerts (subject_table, subject_id);
  
  alter table public.ops_alerts enable row level security;
  
  -- Staff: read all
  create policy ops_alerts_staff_select on public.ops_alerts
    for select to authenticated
    using (public.is_staff(auth.uid()));
  
  -- Staff: acknowledge (UPDATE acknowledged_at, acknowledged_by)
  create policy ops_alerts_staff_acknowledge on public.ops_alerts
    for update to authenticated
    using (public.is_staff(auth.uid()))
    with check (public.is_staff(auth.uid()));
  
  -- Admin: dismiss (UPDATE dismissed_at, dismissed_by) — tighter than staff acknowledge
  -- Note: enforced at Server Action layer via role check; no separate policy needed.
  
  -- Server-only inserts (alert generators run with service role); no client INSERT policy.
  ```
- **AC:** `smoke_rls.sql` extended with INSERT (service role) / SELECT (staff) / UPDATE (staff acknowledge) assertions.

**US-G2 — As an engineer**, alert generators run on server-action side-effects and on the daily cron.

- **AC:** Generator functions in `src/lib/ops-alerts/`:
  - `generateMaintenanceDueAlerts()` — daily cron; scans `vehicle_maintenance_records` (Theme J) for next-service-date within 30 days; inserts one `ops_alerts` row per due vehicle if not already alerted (idempotent via `subject_table='vehicles'`, `subject_id=vehicle.id`, `kind='maintenance_due'` lookup).
  - `generateLicenseExpiringAlerts()` — daily cron; scans `chauffeur_compliance_documents` for `document_type IN ('drivers_licence','pdp')` with `expires_on - now() <= 30 days`; idempotent.
  - `generateQuoteExpiringSoonAlerts()` — daily cron; scans `booking_quotes.status='sent'` where `expires_at - now() <= 24 hours`; idempotent.
  - `generateEmailRetryFailedAlerts()` — fired inline from `sendWalkInQuote` and `sendBookingQuote` failure paths after 3rd retry strike (Epic 13 Q9).
  - `generateDelayedTripAlerts()` — fired inline from `markTripDelayedAction` (existing) when transitioning to `delayed`.
  - `generateOverdueInvoiceAlerts()` — daily cron; scans `bookings` where `status='invoiced'` and `(invoice_sent_at + (account_snapshot->>'credit_terms_days')::int * interval '1 day') < now()`; idempotent.
- **AC:** Daily cron extends Epic 13's `expire_sent_booking_quotes_daily_v1` cron job structure (matches the existing pattern).
- **AC:** Each generator is **idempotent** — re-running it does not create duplicate alerts for the same subject.
- **AC:** Tests assert: each generator inserts when condition met, does not insert when already alerted.

**US-G3 — As ops staff**, I can view alerts, acknowledge, and dismiss them with deep-links to subjects.

- **AC:** New page `/ops/alerts`. Lists open alerts (`acknowledged_at IS NULL AND dismissed_at IS NULL`) grouped by `kind`, sorted by `severity DESC, created_at DESC`.
- **AC:** Each alert row shows: kind label, severity pill, subject link (e.g. for `kind='maintenance_due'` link to `/ops/vehicles/[id]`), payload summary text (e.g. "License expires in 12 days"), age (e.g. "3 hours ago").
- **AC:** Per-row actions: **Acknowledge** (any staff; sets `acknowledged_at`/`acknowledged_by`, alert moves to "Acknowledged" section but still visible), **Dismiss** (admin only; sets `dismissed_at`/`dismissed_by`, alert disappears).
- **AC:** Filter row: kind multiselect, severity multiselect, "show acknowledged" toggle.
- **AC:** Acknowledged section: collapsible list below open alerts.
- **AC:** Dashboard "Alerts" card (US-F1) reads count of `acknowledged_at IS NULL AND dismissed_at IS NULL`. Card click → `/ops/alerts`.
- **AC:** Realtime: subscribes to `ops_alerts` INSERT to push toast notifications for high/critical severity alerts.

### Theme H — RBAC Admin (NEW)

**US-H1 — As an admin**, I can invite, change role, and deactivate staff users.

- **AC:** New page `/ops/admin/roles`. Admin role-only — server check + client conditional render.
- **AC:** Lists all `profiles` rows. Columns: Name, Email, Role (display via `role-display.ts` per Q21 — shows "Driver" for `chauffeur`), Status, Last sign-in (`last_sign_in_at` from Supabase Auth admin API).
- **AC:** Filter: role multiselect, status filter, search by name/email.
- **AC:** **Invite form:** input email + role select. On submit, calls server action `adminInviteStaffAction({ email, role })`:
  - Validates: admin role, email format, role in allowed set.
  - Creates a Supabase Auth user with `signInWithOtp` magic link (email invite) OR `auth.admin.inviteUserByEmail` (admin SDK).
  - Inserts a `profiles` row with the given role.
  - Writes `ops_audit_log` `action='admin_invite_staff'`.
- **AC:** **Role change:** click a row, role dropdown shows display labels (`Driver`, `Dispatcher`, `Admin`, `Customer` per Q34) but persists DB values (`chauffeur`, `dispatcher`, `admin`, `customer`). Calls server action `adminSetStaffRoleAction({ profileId, newRole })`:
  - Updates `profiles.role`.
  - Updates Supabase Auth `app_metadata.role` via `auth.admin.updateUserById(id, { app_metadata: { role: newRole } })`.
  - Writes `ops_audit_log` `action='admin_set_staff_role'`, payload includes `prior_role`, `new_role`.
  - **Documented limitation per Q29:** Existing JWT for the user retains old `app_metadata.role` until natural refresh (1h). UI displays a notice "Role change applied; affected user may need to sign out and back in for full effect." Server-side `requireOpsStaffPage` reads `profiles.role` fresh on every request, so authorisation is enforced regardless of JWT staleness.
- **AC:** **Deactivate:** soft — sets `profiles.status='deactivated'` plus `deactivated_at = now()`. Confirmation dialog. Calls server action `adminDeactivateStaffAction({ profileId })`. Reactivate path available.
- **AC:** **Cannot deactivate self.** Server action rejects if `profileId === auth.uid()`.
- **AC:** Tests cover non-admin rejection of all four actions.

### Theme I — Route & Pickup-Point Authoring (EXTENSION of FE.5.4)

**US-I1 — As ops admin**, I have a map-first page to manage service corridors, zones, and approved pickup/drop-off points.

- **AC:** New page `/ops/service-areas`. Admin role-only.
- **AC:** Three tabs: **Corridors**, **Zones**, **Pickup points**.
- **AC:** **Corridors tab:** List of service corridors (origin/destination named pairs with optional polyline path). CRUD via map-side panel. Map shows existing corridors as polylines. Editor draws new polylines on the map.
- **AC:** **Zones tab:** List of named polygons (e.g. "Sandton CBD", "OR Tambo airport"). CRUD via map; polygon drawing with vertex editing.
- **AC:** **Pickup points tab:** List of named single-point geo records (e.g. "Sandton Convention Centre — Bay 4"). CRUD via map; single-marker placement.
- **AC:** Google Maps for the map canvas (per **Q30**); reuses `src/lib/maps.ts` helper if it covers the needed primitives, otherwise extends it.
- **AC:** Persistence: writes to existing geo data model. **Story implementer first verifies the geo data model exists** (FE.5.4 / FE.5.11 scope). If gaps exist (e.g. no `service_corridors` table), this story includes a migration for the minimum viable schema:
  ```sql
  -- Only if not already present:
  create table public.service_corridors (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    path geometry(LineString, 4326),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  -- analogous tables for service_zones (polygon), approved_pickup_points (point)
  ```
- **AC:** RLS: staff select; admin write only.
- **AC:** Realtime not required (low edit volume).
- **AC:** Story includes a **schema-gap review meeting** before coding starts — story implementer + tech lead + PO confirm what already exists vs needs creating.

### Theme J — Fleet Maintenance & Fuel (EXTENSION of `/ops/vehicles`)

**US-J1 — As a migration author**, I add maintenance and fuel log tables.

- **AC:** Migration `YYYYMMDDHHMMSS_ops16_vehicle_maintenance_and_fuel.sql`:
  ```sql
  create table public.vehicle_maintenance_records (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    service_type text not null,
    service_date date not null,
    next_service_date date,
    odometer_km integer,
    cost_zar numeric(10,2),
    notes text,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now()
  );
  
  create index idx_vehicle_maintenance_records_vehicle
    on public.vehicle_maintenance_records (vehicle_id, service_date desc);
  create index idx_vehicle_maintenance_records_next_service
    on public.vehicle_maintenance_records (next_service_date)
    where next_service_date is not null;
  
  create table public.vehicle_fuel_logs (
    id uuid primary key default gen_random_uuid(),
    vehicle_id uuid not null references public.vehicles(id) on delete cascade,
    logged_at timestamptz not null default now(),
    odometer_km integer not null,
    litres numeric(8,2) not null check (litres > 0),
    cost_zar numeric(10,2) not null check (cost_zar > 0),
    fuel_type text,
    created_by uuid not null references public.profiles(id) on delete restrict,
    created_at timestamptz not null default now()
  );
  
  create index idx_vehicle_fuel_logs_vehicle
    on public.vehicle_fuel_logs (vehicle_id, logged_at desc);
  
  alter table public.vehicle_maintenance_records enable row level security;
  alter table public.vehicle_fuel_logs enable row level security;
  
  create policy vehicle_maintenance_records_staff_all on public.vehicle_maintenance_records
    for all to authenticated
    using (public.is_staff(auth.uid()))
    with check (public.is_staff(auth.uid()));
  
  create policy vehicle_fuel_logs_staff_all on public.vehicle_fuel_logs
    for all to authenticated
    using (public.is_staff(auth.uid()))
    with check (public.is_staff(auth.uid()));
  ```
- **AC:** RLS scope: ops staff read+write; field-role drivers do **not** write fuel logs in this epic (deferred — would require a dedicated field-app screen).
- **AC:** `smoke_rls.sql` covers both tables.

**US-J2 — As ops staff**, vehicle detail pages show maintenance schedule and fuel log.

- **AC:** `/ops/vehicles/[id]` gains two new tabs: **Maintenance**, **Fuel**.
- **AC:** **Maintenance tab:** Upcoming service banner if `next_service_date` is within 30 days (matches the threshold of `generateMaintenanceDueAlerts` in US-G2). Service history list: date, type, km, cost, notes. "Log service" form: date, type, km, cost, notes, next-service-date.
- **AC:** **Fuel tab:** Last 30 days log entries: timestamp, km, litres, cost, fuel type. Totals row: R spent, total litres, average R/litre, average L/100km (computed from km deltas where available).
- **AC:** New server actions: `logVehicleMaintenanceAction`, `logVehicleFuelAction`, `deleteVehicleMaintenanceAction` (admin only), `deleteVehicleFuelAction` (admin only).
- **AC:** Maintenance log entries trigger `generateMaintenanceDueAlerts` re-evaluation if `next_service_date` is within 30 days at insert time (alert created immediately if within window).

### Theme K — REMEDIATION: Unblock live errors

**US-K1 — As a developer**, the `service_runs × tickets` RLS recursion is fixed using the helper-function pattern, with regression assertion.

- **AC:** **Reproduce first:** `smoke_rls.sql` extended with a block that authenticates as a chauffeur user and runs `select count(*) from service_runs;`. The assertion expects no SQLSTATE 42P17. Initially this assertion **fails** — confirming the bug. The fix migration removes the failure.
- **AC:** New migration `YYYYMMDDHHMMSS_ops16_service_runs_tickets_rls_helpers.sql`:
  - Drops policy `service_runs_select_party` (originally from migration `20260418150000_sh94_patterned_run_realtime.sql`).
  - Drops policy `tickets_chauffeur_run_select` (originally from migration `20260418140000_sh93_service_run_capacity_holds.sql`).
  - Creates `public.service_run_is_visible_to_party(p_service_run_id uuid) returns boolean` as `SECURITY DEFINER STABLE`. Body encapsulates the original 5-clause OR (chauffeur on linked trip via `trips.chauffeur_id`; customer on linked trip via `trips.customer_id`; customer via `booking_trips → bookings.customer_id`; ticket passenger via `tickets.passenger_id`; ticket-via-booking via `tickets → bookings.customer_id`).
  - Creates `public.ticket_is_visible_to_run_chauffeur(p_ticket_id uuid) returns boolean` as `SECURITY DEFINER STABLE`. Body: `SELECT EXISTS(SELECT 1 FROM public.tickets t JOIN public.service_runs sr ON sr.id = t.service_run_id WHERE t.id = p_ticket_id AND sr.chauffeur_id = auth.uid())`. Note: this is a SINGLE-direction lookup that does not re-enter `service_runs` RLS because of `SECURITY DEFINER`.
  - Recreates the policies as `using (public.<helper>(id))`-style — no inline `EXISTS`.
  - `revoke all on function ... from public; grant execute on function ... to authenticated; grant execute on function ... to service_role;` for both helpers.
  - Comment on each helper cites `docs/adr/0006-rls-cross-table-helpers.md` (Theme O).
- **AC:** Post-fix, `smoke_rls.sql` regression block passes.
- **AC:** `/ops/fulfil` (or its redirect target after US-A4) loads without the red error block.
- **AC:** Tests in `tests/migrations/rls-no-recursion.spec.ts` exercise `select count(*)` on `service_runs`, `tickets`, `bookings`, `booking_trips` under each role and assert no recursion.
- **AC:** Paired migration review by another engineer required before merge.

**US-K2 — As a developer**, the comms-retry RPC schema-cache miss is resolved.

- **AC:** Verification step: confirm migration `20260420190000_epic13_story138_ops_list_booking_quote_comms_retry_candidates_v1.sql` has applied in the affected environment via `supabase migration list` (or equivalent dashboard inspection).
- **AC:** **If applied:** issue `NOTIFY pgrst, 'reload schema';` against the affected environment's database (admin SQL console or psql with service role). Verify `/ops/bookings/comms-retry` loads the queue successfully.
- **AC:** **If not applied:** re-promote per VST-2 promotion flow; verify post-apply.
- **AC:** New runbook section in `docs/ops-runbook.md` titled "PostgREST schema cache reload" documenting:
  - When to use: any "function not found in schema cache" error after a migration that adds an RPC.
  - How: `NOTIFY pgrst, 'reload schema';` via admin SQL console.
  - Alternative: restart the Supabase API container (Vercel cron or dashboard action).
- **AC:** No code change required. This is an operational / deployment-state fix.

### Theme L — REMEDIATION: Chauffeur → Driver UI display rename completion

**US-L1 — As a product owner**, I have a grep-audit table of every `Chauffeur` / `chauffeur` occurrence segmented by layer.

- **AC:** New file `docs/ops/chauffeur-to-driver-audit.md` lists all occurrences across:
  - **UI files** (`src/app/(ops)/**`, `src/features/ops/**`, `src/features/field/**`, `src/components/**`)
  - **Email templates** (`src/lib/email/templates/**`)
  - **Server actions** (`src/actions/**`)
  - **Lib/helper files** (`src/lib/**`)
  - **Type definitions** (`src/types/**`) — flagged **DB-out-of-scope per Q34**
  - **Tests** (`tests/**`, `src/**/__tests__/**`)
  - **Documentation** (`docs/**`) — flagged **rename freely except capstone-reference**
  - **Migrations** (`supabase/migrations/**`) — flagged **historical / immutable, out of scope**
  - **Capstone reference** (`src/legacy/capstone-reference/**`, `docs/capstone-reference/**`) — flagged **out of scope per Epic 5 FE.5.9 / Epic 9**
- **AC:** Columns: file path, line number, context (5 chars before/after), current text, proposed action (`rename to driver` / `keep — DB scope deferred to Epic 17` / `keep — capstone reference` / `keep — historical migration`), exception flag (Q25 Close Protection / Q34 DB / capstone).
- **AC:** Audit produced via grep tooling; sign-off recorded at top of file.
- **AC:** Becomes the single source of truth for US-L3 sweep work.

**US-L2 — As a developer**, a `role-display.ts` map renders DB role values as UI labels.

- **AC:** New file `src/features/ops/role-display.ts`:
  ```ts
  import type { ProfileRole } from '@/types/database.types'
  
  /**
   * Epic 16 Q21/Q34: UI display labels for ProfileRole enum values.
   * Database keeps 'chauffeur' until Epic 17 schema rename. UI always shows 'Driver'.
   * DO NOT REMOVE — Epic 17 retains this file for audit-history normalisation per Q41.
   */
  export const ROLE_DISPLAY_LABELS: Record<ProfileRole, string> = {
    customer: 'Customer',
    chauffeur: 'Driver',
    dispatcher: 'Dispatcher',
    admin: 'Admin',
  }
  
  export function getRoleDisplayLabel(role: ProfileRole): string {
    return ROLE_DISPLAY_LABELS[role] ?? role
  }
  ```
- **AC:** All UI surfaces displaying a role string import `getRoleDisplayLabel`. Direct `'chauffeur'` literal in `.tsx` files outside this helper is flagged by ESLint or pre-commit grep.
- **AC:** ESLint rule (custom) or grep pre-commit hook configured.
- **AC:** Test in `src/features/ops/__tests__/role-display.test.ts` asserts each role maps correctly.

**US-L3 — As a developer**, every UI string from the audit is replaced with display-label calls or hardcoded "Driver".

- **AC:** All screenshot-confirmed strings replaced:
  - `/ops/vehicles` "Chauffeur roster" button → "Driver roster".
  - `/ops/roster` page heading "Chauffeur roster" → "Driver roster".
  - `/ops/roster` body text "role = chauffeur and upcoming chauffeur_schedules" → "role = driver and upcoming driver schedules" (DB column names preserved per Q34; the description rephrases without surfacing the DB literal).
  - `/ops/roster` empty-state "No chauffeur profiles" → "No driver profiles".
  - `/ops/compliance` "fleet/chauffeur compliance document expiry" → "fleet/driver compliance document expiry".
  - `/ops/trips` description "overlapping `chauffeur_assignments` for the same chauffeur window" → rephrase to "overlapping driver assignments for the same driver window".
  - `/ops/trips` empty-state "assigned to a service run, vehicle, and chauffeur from Fulfil" → "assigned to a service run, vehicle, and driver from Fulfil".
  - `/ops/fulfil` empty-state "assign a run, chauffeur, and vehicle here" → "assign a run, driver, and vehicle here".
- **AC:** Email templates under `src/lib/email/templates/` updated for any "chauffeur" customer-facing strings.
- **AC:** `/q/[token]/accept`, `/q/[token]/reject`, `/q/[token]/expired` user-facing surfaces audited.
- **AC:** Final repo-wide grep gate: `grep -ri "chauffeur" src/app src/features src/components --include="*.tsx" --include="*.html"` returns only documented exceptions (close-protection mentions per Q25; raw type imports from `database.types.ts` which intentionally retain DB literals).

**US-L4 — As a developer (non-blocking)**, low-risk filenames are renamed.

- **AC:** **In scope:** rename `src/features/ops/components/ChauffeurRoster.tsx` → `DriverRoster.tsx` **only if it exists** (audit US-L1 verifies — `/ops/roster/page.tsx` may render directly without a separate component file). Use `git mv` to preserve history.
- **AC:** **Out of scope (deferred to Epic 17):** `src/actions/fieldChauffeur.ts`, `src/lib/chauffeur-trip-transitions.ts`, `src/lib/resolve-chauffeur-assignment.ts`, function names like `getChauffeurForAction`. These rename in Epic 17 along with the schema rename.
- **AC:** Deferred items listed in `docs/ops/chauffeur-to-driver-audit.md` § Future Work referencing Epic 17.
- **AC:** Story marked **non-blocking for Epic 16 DoD**. Done only if a clean merge window exists.

### Theme N — PayFast removal & EFT payment workflow (NEW)

**US-N1 — As a migration author**, I add `ops_settings` table with bank account details and bookings payment-receipt columns.

- **AC:** Migration `YYYYMMDDHHMMSS_ops16_ops_settings_and_payment_columns.sql`:
  ```sql
  create table public.ops_settings (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    value jsonb not null,
    updated_at timestamptz not null default now(),
    updated_by uuid references public.profiles(id) on delete set null
  );
  
  -- Seed bank account row (placeholders — admin populates via /ops/admin/settings)
  insert into public.ops_settings (key, value)
  values ('bank_account', '{
    "bank_name": "",
    "account_holder": "",
    "account_number": "",
    "branch_code": "",
    "reference_format": "VST-{booking_ref}"
  }'::jsonb);
  
  alter table public.ops_settings enable row level security;
  
  -- Staff: read (with masking applied at server-action layer for non-admins)
  create policy ops_settings_staff_select on public.ops_settings
    for select to authenticated
    using (public.is_staff(auth.uid()));
  
  -- Admin: full update
  create policy ops_settings_admin_update on public.ops_settings
    for update to authenticated
    using (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
  
  -- Bookings payment-receipt columns (replace PayFast-driven payment_status flip)
  alter table public.bookings
    add column if not exists payment_received_at timestamptz null,
    add column if not exists payment_evidence_ref text null;
  
  comment on column public.bookings.payment_received_at is
    'Epic 16 Theme N: when ops staff confirmed EFT receipt. Null = not yet received.';
  comment on column public.bookings.payment_evidence_ref is
    'Epic 16 Theme N: bank statement reference or other staff-recorded evidence of payment.';
  ```
- **AC:** Server-side masking helper `getBankAccountForReader(reader: ProfileRole)`:
  - Admin: returns full `value` jsonb.
  - Dispatcher: returns `value` with `account_number` replaced by `***last4`.
  - Other roles: returns null (forbidden).
- **AC:** `smoke_rls.sql` extended:
  - Staff (`dispatcher`) can SELECT but server-shaping masks `account_number`.
  - Admin can UPDATE.
  - Non-admin UPDATE rejected.

**US-N2 — As a developer**, all PayFast code paths are deleted.

- **AC:** Files deleted: `src/lib/payfast.ts`, `src/lib/payfast-client.ts`, `src/actions/processPayment.ts`, `src/app/api/payfast/webhook/route.ts` (and its `__tests__/` directory), `src/app/(quote)/q/[token]/pay/` directory.
- **AC:** Migration `YYYYMMDDHHMMSS_ops16_drop_payfast_trigger.sql`:
  ```sql
  -- Drop the PayFast-driven trigger from Epic 14
  drop trigger if exists ready_to_assign_walk_in_paid_trigger on public.bookings;
  drop function if exists public.ready_to_assign_walk_in_paid_v1();
  
  -- bookings.payment_status column retained — now driven by markBookingPaymentReceived
  ```
- **AC:** Patterned-checkout migration `20260418160000_sh95_patterned_checkout_payment.sql` reviewed; marked as **deferred** in [`docs/epic-9.md`](epic-9.md) § SH.9.5 — reason: PayFast was the assumed provider; non-PayFast solution required before further patterned-checkout dev.
- **AC:** Environment variables: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_PROCESS_BASE_URL` and any `PAYFAST_*` deleted from `.env.example`, `.env.test.example`. Update `docs/environment-vars.md`.
- **AC:** `package.json` dependencies reviewed; nothing PayFast-specific to remove (verified).
- **AC:** Repo-wide grep gate: `grep -ri "payfast" src/ docs/` returns matches only in: (a) `docs/` historical references; (b) `supabase/migrations/` historical migrations (with annotation comment "PayFast removed in Epic 16 — see Theme N"); (c) `src/legacy/` per Epic 5 rules.

**US-N3 — As ops staff**, I can mark a booking's payment as received via EFT.

- **AC:** New server action `src/actions/markBookingPaymentReceived.ts`:
  ```ts
  export async function markBookingPaymentReceivedAction(input: {
    bookingId: string
    evidenceRef: string
    amountZar: number
    receivedAt: string  // ISO timestamp
  })
  ```
- **AC:** Validation:
  - `bookingId` is a valid UUID and exists.
  - Current booking status is `'awaiting_payment'` (walk-in path) or `'invoiced'` (account path); reject otherwise with `OpsActionError('invalid_status_for_payment_mark')`.
  - Caller has role `dispatcher` or `admin`.
  - `amountZar > 0`.
  - `receivedAt <= now()` (no future-dated receipts).
- **AC:** On success:
  - Updates `bookings.payment_status = 'paid'`, `payment_received_at = $receivedAt`, `payment_evidence_ref = $evidenceRef`.
  - Transitions booking status: walk-in `awaiting_payment → ready_to_assign`; account `invoiced → paid`.
  - Writes `ops_audit_log` row with `action='payment_received_eft'`, `payload={ evidence_ref, amount_zar, prior_status, new_status }`.
- **AC:** **Idempotent:** re-marking a booking that's already `paid` returns success without side effects (no double audit entries).
- **AC:** **Variance check:** if `amountZar !== quote_amount_zar` (variance > R 0.01), action requires an additional `varianceReason: string` parameter (min 10 chars). Stored in `payload.variance_reason`.
- **AC:** UI dialog on `/ops/walk-in?stage=awaiting_payment` row action: form fields `evidenceRef` (text), `amountZar` (number), `receivedAt` (datetime — defaults to `now()`), `varianceReason` (text — appears when amount differs from quote).
- **AC:** Same dialog on `/ops/accounts?stage=invoiced` row action.
- **AC:** Tests in `src/actions/__tests__/markBookingPaymentReceived.test.ts`:
  - Happy path (walk-in).
  - Happy path (account).
  - Wrong status rejected.
  - Non-staff role rejected.
  - Idempotent re-mark.
  - Variance path requires reason.
  - Future-dated rejection.

**US-N4 — As walk-in customer**, the quote email contains bank details and a unique payment reference.

- **AC:** Email template `src/lib/email/templates/walk-in-quote-sent.tsx` (or current equivalent — verify naming during implementation) renders:
  - Bank name (from `ops_settings.bank_account.bank_name`)
  - Account holder
  - Account number (full unmasked — going to customer)
  - Branch code
  - Reference: computed from `ops_settings.bank_account.reference_format` with `{booking_ref}` substituted (default format: `VST-{booking_ref}`)
- **AC:** Email also contains the `/q/[token]/accept` link as the next step (preserved from Epic 14).
- **AC:** Plaintext fallback contains the same details in readable form.
- **AC:** Bank details rendered server-side in the email send action; never exposed to client.
- **AC:** Test in `src/lib/email/templates/__tests__/walk-in-quote-sent.test.ts` asserts the bank details render from a mocked `ops_settings` row.

**US-N5 — As account customer**, the invoice email contains bank details and the invoice number as reference.

- **AC:** Account invoice email template (current naming verified during implementation) updated similarly to US-N4.
- **AC:** Reference format defaults to invoice number (e.g. `INV-2026-0042`), not booking reference. Configurable via a separate `ops_settings.bank_account.invoice_reference_format` field if product wants it; otherwise hardcode invoice number.
- **AC:** Plaintext fallback contains same details.
- **AC:** Test asserts render from mocked `ops_settings`.

**US-N6 — As a customer who clicked the accept link**, `/q/[token]/accept` confirms acceptance and shows bank details.

- **AC:** Page at `src/app/(quote)/q/[token]/accept/page.tsx` (existing — modified, not deleted).
- **AC:** Server-side: validates the token, loads the booking + quote.
- **AC:** Page renders: heading "Quote accepted"; subheading reference number (`VST-{booking_ref}`); bank details block (bank name, account holder, account number, branch code, reference); next-steps text "We'll confirm receipt within 1 business day. You'll receive a confirmation email shortly."
- **AC:** On first load (acceptance event):
  - Writes `bookings.quote_accepted_at = now()`.
  - Transitions booking status `quote_sent → awaiting_payment`.
  - Sends a customer confirmation email with the same bank details + reference (using a new `walk-in-acceptance-confirmation` template).
  - Writes `ops_audit_log` with `action='customer_accepted_quote'`.
- **AC:** **Idempotent:** re-loading the page after acceptance shows the same confirmation, does not re-write `quote_accepted_at`, does not re-send email. State check: if `quote_accepted_at IS NOT NULL`, skip the writes and just render the confirmation.
- **AC:** Replaces the existing PayFast redirect logic in this file (per US-N2).
- **AC:** Test asserts: first load triggers writes; second load is no-op.

**US-N7 — As a customer with an old `/q/[token]/pay` link**, I land on `/q/[token]/accept`.

- **AC:** New file `src/app/(quote)/q/[token]/pay/route.ts`:
  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  
  // Epic 16 Theme N: 90-day deprecation window — delete after 2026-07-25.
  // Old PayFast pay-redirect URLs in customer inboxes redirect to the EFT acceptance landing.
  export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
  ) {
    const url = new URL(request.url)
    return NextResponse.redirect(
      new URL(`/q/${params.token}/accept`, url.origin),
      302
    )
  }
  ```
- **AC:** The directory `src/app/(quote)/q/[token]/pay/page.tsx` and any other files in that path are deleted (per US-N2).
- **AC:** A calendar reminder or runbook entry in `docs/ops-runbook.md` § Epic 16 Theme N for the 2026-07-25 deletion date.

**US-N8 — As a developer**, the Epic 14 walk-in state machine is updated to remove the PayFast-driven transition.

- **AC:** [`docs/epic-14.md`](epic-14.md) gets an amendment block at the top:
  ```markdown
  > **Q19 superseded:** PayFast checkout flow described below is replaced by Epic 16 Theme N (EFT-to-bank-account, ops manual mark). All references below to PayFast, ITN webhook, and `/q/[token]/pay` are historical. See [`docs/epic-16.md`](epic-16.md) for current behaviour.
  ```
- **AC:** Code comments in any state-machine helper files updated:
  - `src/lib/booking-guards.ts`, `src/lib/booking-navigation.ts`, `src/lib/quote-accept-flow.ts` — review and update any "PayFast" comment.
- **AC:** Tests that exercised PayFast-to-paid path replaced with tests that exercise the manual-mark path:
  - `src/actions/__tests__/processPayment.test.ts` deleted (file gone in US-N2).
  - New `src/actions/__tests__/markBookingPaymentReceived.test.ts` (specified in US-N3).
- **AC:** [`docs/core-traveller-flow-parity.md`](core-traveller-flow-parity.md) reviewed; "search → quote → PayFast" language replaced with "search → quote → email-with-bank-details → ops-mark".
- **AC:** [`docs/integrations-and-payments.md`](integrations-and-payments.md) updated under § INT.8.3 — Vestroo column changes from "PayFast" to "EFT — bank-account, ops mark"; substitution map updated; PayFast NFR slices removed.

### Theme O — RLS convention & repository gate (NEW)

**US-O1 — As an architect**, an ADR establishes the cross-table RLS convention.

- **AC:** New ADR `docs/adr/0006-rls-cross-table-helpers.md` specifying:
  - **Rule:** Any RLS policy whose `USING` or `WITH CHECK` clause references rows in another table must do so via a `SECURITY DEFINER STABLE` SQL helper function, not via inline `EXISTS`. Same for trigger functions touching multiple RLS-protected tables.
  - **Rationale:** Inline `EXISTS` evaluates the other table's RLS recursively; if that other table's policy references back, PostgreSQL raises SQLSTATE 42P17.
  - **Pattern reference:** `booking_is_visible_to_chauffeur_via_trips` (Epic 11 E1) is the canonical example. Epic 16 K1 helpers `service_run_is_visible_to_party` and `ticket_is_visible_to_run_chauffeur` are further examples.
  - **Naming convention:** `<source_table_singular>_is_visible_to_<role_or_relationship>(p_<source_table>_id uuid) returns boolean`.
  - **Grants:** `revoke all from public; grant execute to authenticated; grant execute to service_role` for any helper called from RLS.
  - **Smoke test requirement:** Every new policy MUST be accompanied by an assertion in `smoke_rls.sql` that `select count(*) from <table>;` runs cleanly under the relevant role(s).
  - **Exceptions:** Same-table self-referencing policies (e.g. customer-sees-own-row) do not need the helper pattern.
- **AC:** ADR linked from [`docs/epic-6.md`](epic-6.md) § BE.6.2, [`docs/epic-16.md`](epic-16.md) § Theme O, and from `CONTRIBUTING.md` PR-checklist for migration authors.
- **AC:** ADR includes a worked example: the K1 fix migration (Theme K1) as the canonical "before / after" demonstration.

**Authoritative convention:** **[`docs/adr/0006-rls-cross-table-helpers.md`](adr/0006-rls-cross-table-helpers.md)** — cross-table RLS and related trigger patterns; **US-O2** lint/CI will reference this path.

**US-O2 — As a CI maintainer**, a lint script flags non-conformant RLS policies in PRs.

- **AC:** New script `scripts/lint-rls-policies.mjs`:
  - Parses files matching `supabase/migrations/*.sql`.
  - Finds `create policy` blocks (regex / SQL parser).
  - Within each block's `using` and `with check` clauses, flags any `from public.<another_table>` that is NOT a function call (i.e., direct table reference inside an inline `EXISTS`).
  - Excludes same-table references and ignored helper-function calls.
  - Output: file path, line number, policy name, offending fragment, link to ADR 0006.
- **AC:** GitHub Actions step runs the lint on PRs touching `supabase/migrations/`. Exit code 1 on violations with clear error message: "Cross-table RLS check via inline EXISTS — see ADR 0006. Use a SECURITY DEFINER helper instead."
- **AC:** Lint runs cleanly against the existing migration set after Theme K1 lands (validates the rule is satisfiable on the codebase).
- **AC:** `smoke_rls.sql` extended with a 42P17-detection block:
  ```sql
  -- Theme O / US-O2: 42P17 detection across all policy-bearing tables
  do $$
  declare
    tbl text;
  begin
    for tbl in
      select tablename from pg_tables
      where schemaname = 'public'
        and tablename in (
          'profiles','bookings','booking_trips','trips',
          'service_runs','tickets','chauffeur_assignments',
          'customer_accounts','customer_account_members',
          'booking_quotes','ops_audit_log','ops_alerts','ops_settings',
          'vehicle_trackings','shared_itineraries',
          'service_run_manifest_entries','vehicle_maintenance_records','vehicle_fuel_logs'
        )
    loop
      begin
        execute format('select 1 from public.%I limit 1', tbl);
      exception when sqlstate '42P17' then
        raise exception 'RLS recursion detected on %', tbl;
      end;
    end loop;
  end;
  $$;
  ```
- **AC:** Lint advisory in week 1 (warn-only) then enforcing. Allow `// rls-lint-ok: <reason>` comment escape hatch for genuine exceptions, requiring code-review approval.

### Theme M — Quality & verification

**US-M1 — As QA**, Playwright E2E covers both primary workflows end-to-end.

- **AC:** New test file `tests/e2e/walk-in-eft-workflow.spec.ts`:
  - Submit public trip-request via `/book` (or current funnel entry).
  - As ops staff: visit `/ops/walk-in?stage=new`; verify booking visible.
  - Triage row.
  - Click "Check availability"; complete the screen on `/ops/walk-in/[id]/availability`; submit.
  - Verify booking moved to `Availability checked` tab.
  - Click "Send quote"; verify Resend sandbox received the email with bank details.
  - Customer side: visit `/q/[token]/accept`; verify bank details rendered; verify acceptance writes the record.
  - As ops staff: visit `/ops/walk-in?stage=awaiting_payment`; click "Mark EFT received"; complete the dialog (`evidenceRef`, `amountZar`, `receivedAt`); submit.
  - Verify booking moved to `Ready to assign`.
  - Assign trip via dispatch board or fulfil action.
  - Verify trip in `In progress`.
  - Mark trip complete.
  - Verify booking in `Completed`.
- **AC:** New test file `tests/e2e/account-eft-workflow.spec.ts`:
  - Submit account-domain booking (member of an active `customer_accounts`).
  - Verify Q6 confirms account match.
  - As ops staff: visit `/ops/accounts?stage=new`; triage.
  - Check availability; assign.
  - Confirm dispatch (Epic 13 trip confirmation email sent).
  - Mark trip complete.
  - Hand off to invoicing (Epic 13 transition to `ready_to_invoice`).
  - Verify on `/ops/invoicing` "Ready to invoice" tab.
  - Mark invoiced.
  - Visit `/ops/accounts?stage=invoiced`; click "Mark EFT received".
  - Verify booking moved to `Paid`.
- **AC:** **No PayFast sandbox in any test path** (PayFast deleted per US-N2).
- **AC:** Legacy URL redirect tests in `tests/e2e/legacy-url-redirects.spec.ts` (per US-A4).
- **AC:** Availability-guardrail tests in `tests/e2e/availability-guardrail.spec.ts` — assert `sendWalkInQuote` and `assignBookingToRun` reject without check.
- **AC:** Role display tests in `tests/e2e/role-display.spec.ts` — assert UI shows "Driver" everywhere screenshot-confirmed.

**US-M2 — As QA**, `smoke_rls.sql` is extended.

- **AC:** Regression assertions added:
  - `service_runs` no-recursion (per US-K1).
  - `tickets` no-recursion (per US-K1).
  - Availability-check columns INSERT/UPDATE/SELECT (per US-B1).
  - `ops_alerts` INSERT (service role) / SELECT (staff) / UPDATE (staff acknowledge) / UPDATE (admin dismiss) (per US-G1).
  - `ops_settings` SELECT (staff with masking) / UPDATE (admin only) (per US-N1).
  - `vehicle_maintenance_records` and `vehicle_fuel_logs` policies (per US-J1).
  - 42P17 detection across all top-level policy-bearing tables (per US-O2).
- **AC:** `smoke_rls.sql` runs as a CI step in PRs touching `supabase/migrations/`.

## 5. Cross-cutting dependencies matrix

| Item | Depends on | Blocks |
|------|------------|--------|
| **K1 service_runs × tickets fix** | — (Phase 0, top priority) | A1, A2 (`/ops/fulfil` redirect target works), M1 |
| **K2 comms-retry schema cache** | — | Epic 13 retry UX |
| **O1 RLS ADR** | K1 | O2 (lint references ADR rule); future migrations |
| **O2 RLS lint + smoke** | O1 | All future migrations |
| **L1 chauffeur audit** | — | L2, L3, L4 |
| **N1 ops_settings + payment columns migration** | K1 (clean RLS env) | N2, N3, N4, N5, N6 |
| **N2 PayFast deletion** | N1 (so payment_status writes have a path) | N3, N8 |
| **N3 markBookingPaymentReceived** | N2 (replaces ITN trigger) | A1 (walk-in EFT CTA), A2 (account EFT CTA), M1 |
| **N4–N7 emails + landing page** | N1 | M1 |
| **N8 Epic 14 state machine cleanup** | N2, N3 | DoD |
| **B1 availability columns** | K1 | B2, B3, A1, A2 |
| **G1 ops_alerts** | K1 | G2, G3, F1 |
| **A1, A2 workflow pages** | B1, N3 | F1 drill-downs, M1 |
| **A3 nav update** | A1, A2 | A4 |
| **A4 legacy redirects** | A3 | M1 |
| **C1 dispatch board** | A1, A2, B3 | — |
| **D1, D2 drivers module** | L2 (role-display) | F1 "Drivers on duty" |
| **E1 live map** | — | F1 "Vehicles in service" |
| **F1, F2 KPI dashboard** | C1, D1, E1, G2, J1 (drill-down targets exist) | M1 |
| **G2 alert generators** | G1 | G3 |
| **G3 alerts UI** | G2 | F1 (Alerts card reads count) |
| **H1 RBAC admin** | L2 (role-display in dropdown) | — |
| **I1 service areas** | — | — |
| **J1 maintenance + fuel migration** | — | J2 |
| **J2 vehicle detail tabs** | J1 | G2 (maintenance_due alert generator reads from J1 tables) |
| **L3 UI rename** | L1, L2 | DoD |
| **L4 filename rename (non-blocking)** | L1 | — |
| **M1 E2E** | All Phase 1–6 | DoD gate |
| **M2 smoke RLS** | B1, G1, L2, K1, N1, O2, J1 | DoD gate |

**Upstream epics:** [`docs/epic-4.md`](epic-4.md) (vocab), [`docs/epic-5.md`](epic-5.md) (FE.5.1 nav, FE.5.4 admin mapping, FE.5.9 no blind porting, FE.5.11 staff ops), [`docs/epic-6.md`](epic-6.md) (BE.6.7), [`docs/epic-7.md`](epic-7.md) (RT.7.1 vehicle tracking), [`docs/epic-9.md`](epic-9.md) SH.9.4 (the recursion source — flagged for partial rollback per Theme N's patterned-checkout note), [`docs/epic-11.md`](epic-11.md) (E1 RLS pattern, E2 ops UX, E6 terminology, E7 fleet/drivers), [`docs/epic-12.md`](epic-12.md) (VST-14 schema + state machine), [`docs/epic-13.md`](epic-13.md) (account dispatch + Resend + cron + admin override pattern), [`docs/epic-14.md`](epic-14.md) (walk-in quote-first; Q19 PayFast superseded by Q31), Epic 15 (audit-actor role hardening — `OpsAuditActorRoleDb` confirmed in `database.types.ts`).

**Downstream epics:** [`docs/epic-17.md`](epic-17.md) (Chauffeur → Driver schema rename) consumes Epic 16's `role-display.ts` indefinitely for audit-history normalisation.

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| K1 fix introduces a new policy bug because root cause is shallow | **High** | Reproduce in `smoke_rls.sql` first (US-K1 first AC). Paired review. Theme O lint enforces the helper pattern going forward. |
| PayFast deletion breaks an in-flight customer who clicked `/q/[token]/pay` after migration deploy | **Medium** | N7 redirect kept 90 days. Comms email out before deploy informing customers of the EFT switch. |
| `ops_settings.bank_account` accidentally leaks unmasked account number to non-admin staff | **High** | RLS + masking via `getBankAccountForReader` (US-N1 AC). smoke_rls covers (US-M2). Code review checklist item. |
| Ops staff forgets to mark EFT received → bookings stuck in `awaiting_payment` | **Medium** | `payment_overdue_check` alert kind (Theme G extension — add as 8th alert kind if product approves) flags `awaiting_payment` bookings older than 3 business days. Cron-driven. |
| Customer pays incorrect amount — under or over | **Medium** | `markBookingPaymentReceived` records `amount_zar`; ops surfaces a warning if `amount_zar !== quote_amount_zar` (variance > R 0.01) and requires a reason note before commit. Documented in `docs/ops-runbook.md`. |
| Customer pays without reference number → ops can't match EFT to booking | **Medium** | Reference rendered prominently in email + on `/q/[token]/accept`. Ops `Search` page already supports search by reference (verified in screenshots). Out-of-scope for Epic 16 to handle un-referenced payments — manual ops process. |
| L4 filename rename creates merge-conflict storm with active branches | **Low** | L4 is non-blocking and explicitly deferred to clean merge windows. Fully replaced by Epic 17 anyway. |
| Driver display rename (L3) misses an SVG/PDF/email-subject string | **Medium** | Audit covers `.html`, `.md`, `.svg`, `.hbs` (if any). Final repo-wide grep is a DoD gate. |
| Chauffeur DB role string surfaces in customer-visible audit (`OpsAuditActorRoleDb` value `'chauffeur'`) | **Low** | Customer-visible audit (if any) routes role values through `role-display.ts` per L2. |
| Dispatch scheduler perf at ≥ 100 trips/day | **Medium** | Virtualisation per US-C1 AC; document 500/day perf target; revisit at scale. |
| `ops_alerts` grows unbounded | **Low** | Cleanup cron deferred to a future epic. Indexes mitigate query performance until cleanup ships. |
| RBAC role-change session-invalidation gap (Q29) | **Medium** | Documented limitation in `docs/ops-rbac.md`; UI notice on role change; server-side `requireOpsStaffPage` reads fresh on every request. |
| Patterned-checkout (`SH.9.5`) becomes inoperable post PayFast removal | **Low–Medium** | N2 documents SH.9.5 as deferred until non-PayFast specified. SH.9.1 gate-go status remains valid for the schema work; product decision needed before further patterned-checkout dev. |
| Theme O lint produces false positives blocking PRs | **Low** | Lint advisory in week 1; escape hatch via `// rls-lint-ok: <reason>` comment requiring review approval. |
| Service-areas (I1) schema gaps discovered mid-implementation | **Medium** | Story includes a schema-gap review meeting before coding starts. Migration-included path documented in I1 ACs. |
| Email template changes (N4, N5) introduce broken HTML in some clients | **Medium** | Email-render snapshots in tests; Litmus or equivalent preview check before production deploy. |

## 7. Definition of Done for Epic 16

- **Remediation:** `service_runs`/`tickets` recursion fixed via helper pattern; `/ops/bookings/comms-retry` loads; `smoke_rls.sql` regression assertions present and passing.
- **RLS convention:** ADR 0006 published; lint script in CI; smoke_rls 42P17 detection covers all policy-bearing tables.
- **Workflow pages:** `/ops/walk-in` and `/ops/accounts` live; legacy URL redirects verified.
- **Availability gate:** Columns + UX + server guardrail + admin override per Q23.
- **PayFast removed:** Repo-wide grep for `payfast` returns zero outside historical migrations and `src/legacy/`; `/q/[token]/pay` deleted with 90-day redirect; Epic 14 docs amended.
- **EFT mark live:** `markBookingPaymentReceived` server action working on both `/ops/walk-in` and `/ops/accounts`; bank details rendering in quote and invoice emails; `/q/[token]/accept` is the EFT confirmation landing.
- **Dispatch / Drivers / Live map / Alerts / RBAC / Service areas / Fleet maintenance:** All live per their themes (or split into Epic 16.5 if descope lever pulled).
- **KPI dashboard:** 12 cards live; definitions doc updated.
- **Driver display rename:** UI surfaces uniformly show "Driver" via `role-display.ts`; audit doc archived; deferred filename renames listed for Epic 17.
- **Quality:** Playwright E2E for both workflows including EFT-mark; `smoke_rls.sql` extended.
- **Docs:** `docs/ops-console.md`, `docs/ops-dashboard-kpis-v1.md`, `docs/ops-rbac.md` (new), `docs/ops-runbook.md` (EFT process + schema-cache reload step + Q35 RLS convention guidance), `docs/adr/0006-rls-cross-table-helpers.md` (new), `docs/ops/chauffeur-to-driver-audit.md` (new), [`docs/epic-14.md`](epic-14.md) amended, [`docs/environment-vars.md`](environment-vars.md) (PAYFAST_* deleted), [`docs/integrations-and-payments.md`](integrations-and-payments.md) updated.
- **Product locks Q20–Q35** reflected in story ACs or implementation notes.
- **No open sev-1 defects** on the must-have requirements.

## 8. References to likely code areas (paths verified against repo)

- **Ops shell & pages:** `src/app/(ops)/ops/` — new `walk-in/`, `accounts/`, `dispatch/`, `drivers/` (with `[id]/` detail), `live/`, `alerts/`, `admin/roles/`, `admin/settings/`, `service-areas/`; updates to `page.tsx` (dashboard), `vehicles/[id]/`, `roster/` (redirect)
- **Public ops auth:** `src/app/(public-ops)/ops/login/` and `unauthorized/` — unchanged (verified existing)
- **Customer quote flow:** `src/app/(quote)/q/[token]/accept/` (extended in N6); `pay/` deleted then minimal redirect handler added (N7)
- **Ops nav:** `src/features/ops/ops-nav-config.ts` (per A3 spec)
- **Role display:** `src/features/ops/role-display.ts` (new — Theme L)
- **Ops primitives:** `src/features/ops/components/` — new `WalkInQueueView.tsx`, `AccountQueueView.tsx`, `AvailabilityCheckPanel.tsx`, `DispatchBoard.tsx`, `LiveMap.tsx`, `AlertsCenter.tsx`, `RolesAdmin.tsx`, `ServiceAreaEditor.tsx`, `MaintenanceSchedule.tsx`, `FuelLog.tsx`, `MarkPaymentReceivedDialog.tsx`, `DriverRoster.tsx` (rename of any existing chauffeur-named component, gated by audit US-L1 finding it)
- **Server actions (new):** `src/actions/markBookingPaymentReceived.ts`, `src/actions/opsAvailabilityCheck.ts`, `src/actions/adminOverrideAvailabilityCheck.ts`, `src/actions/opsAlertsGenerate.ts`, `src/actions/opsAlertsAcknowledge.ts`, `src/actions/opsAlertsDismiss.ts`, `src/actions/adminInviteStaff.ts`, `src/actions/adminSetStaffRole.ts`, `src/actions/adminDeactivateStaff.ts`, `src/actions/adminUpdateOpsSettings.ts`, `src/actions/logVehicleMaintenance.ts`, `src/actions/logVehicleFuel.ts`
- **Server actions (deleted):** `src/actions/processPayment.ts`
- **Lib (new):** `src/lib/bank-account-display.ts` (masking helper)
- **Lib (deleted):** `src/lib/payfast.ts`, `src/lib/payfast-client.ts`
- **API routes (deleted):** `src/app/api/payfast/webhook/route.ts` and its tests
- **Email templates:** `src/lib/email/templates/` — quote-sent and invoice templates extended with bank details (N4, N5); new `walk-in-acceptance-confirmation` template (N6)
- **Migrations (new, sequenced):**
  - `YYYYMMDDHHMMSS_ops16_service_runs_tickets_rls_helpers.sql` (K1)
  - `YYYYMMDDHHMMSS_ops16_availability_check_columns.sql` (B1)
  - `YYYYMMDDHHMMSS_ops16_ops_alerts_table.sql` (G1)
  - `YYYYMMDDHHMMSS_ops16_ops_settings_and_payment_columns.sql` (N1)
  - `YYYYMMDDHHMMSS_ops16_drop_payfast_trigger.sql` (N2)
  - `YYYYMMDDHHMMSS_ops16_vehicle_maintenance_and_fuel.sql` (J1)
  - `YYYYMMDDHHMMSS_ops16_service_areas_schema.sql` (I1, conditional on schema-gap-review)
- **Smoke RLS:** `supabase/smoke_rls.sql` extended per US-M2 and US-O2
- **Lint script:** `scripts/lint-rls-policies.mjs` (O2)
- **CI:** `.github/workflows/` — add lint step, add smoke_rls step
- **Tests:** `tests/e2e/walk-in-eft-workflow.spec.ts`, `tests/e2e/account-eft-workflow.spec.ts`, `tests/e2e/availability-guardrail.spec.ts`, `tests/e2e/legacy-url-redirects.spec.ts`, `tests/e2e/role-display.spec.ts`, `tests/migrations/rls-no-recursion.spec.ts` (CI-runnable)
- **Docs:** `docs/ops-console.md`, `docs/ops-dashboard-kpis-v1.md`, `docs/ops-rbac.md` (new), `docs/ops-runbook.md` (EFT + schema-cache process + Theme N 90-day deletion reminder), `docs/adr/0006-rls-cross-table-helpers.md` (new), `docs/ops/chauffeur-to-driver-audit.md` (new)

## 9. Relationship to other epics

- **[`docs/epic-11.md`](epic-11.md):** E1 (RLS) — Theme K remediates and Theme O systematises the pattern; E2 (ops UX) — Themes B/F inherit; E6 (terminology) — Theme L completes display layer; E7 (fleet/drivers) — Themes D/J extend.
- **[`docs/epic-12.md`](epic-12.md):** VST-14 schema unchanged. Theme A supersedes single-surface `/ops/bookings`; Q20 retains it for cross-cutting triage.
- **[`docs/epic-13.md`](epic-13.md):** Account dispatch + Resend infra unchanged. Theme B adds availability gate before dispatch. Theme K2 completes retry-queue deployment.
- **[`docs/epic-14.md`](epic-14.md):** Walk-in quote-first architecture preserved. Theme N supersedes Q19 PayFast checkout. Theme A relocates primary surface from `/ops/bookings` to `/ops/walk-in`. Theme B adds availability gate before `sendWalkInQuote`. Q18 URL stability preserved via redirect.
- **[`docs/epic-9.md`](epic-9.md) SH.9.4:** The two policies introduced by SH.9.4 / SH.9.3 are the K1 fix target. SH.9.5 patterned-checkout deferred until non-PayFast solution specified (per N2).
- **Epic 15:** Audit actor role hardening — preserved (`OpsAuditActorRoleDb` continues to be the source of truth). Theme N writes new audit action `payment_received_eft` using existing `dispatcher` / `admin` actor roles.
- **[`docs/epic-10.md`](epic-10.md):** Public trip-request funnel unchanged.
- **[`docs/epic-17.md`](epic-17.md):** Chauffeur → Driver schema rename, full codebase + Supabase. Sequenced after Epic 16 ships and stabilises (≥ 2 weeks production stable). Spinout decision and parameters locked per user direction 2026-04-25: scope = separate epic, migration strategy = big-bang, audit history = preserve with `role-display.ts` normalisation, cutover = force-logout. Epic 16's `role-display.ts` is consumed indefinitely by Epic 17 for audit-history normalisation.
- **Future epics (anticipated):** Bank-statement integration / automated payment matching (Q32 deferral); `ops_alerts` retention cleanup; SH.9.5 patterned-checkout payment provider decision; native mobile driver app re-evaluation; field-app fuel-logging affordance for drivers.

---

## Document control

| Date | Notes |
|------|-------|
| 2026-04-25 | Epic 16 finalised. Codebase verified via Filesystem connector — forensics grounded in actual migration files (`20260418150000_sh94_…`, `20260418140000_sh93_…`, `20260408120000_vst8_…`, `20260420190000_epic13_story138_…`, `20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql` and others), policy bodies, action filenames, and `database.types.ts` enums. Locks Q20–Q35. Schema-rename out of scope per Q34 / Epic 17. PayFast removal locked per Q31–Q33. Sizing: 24 stories / ≈62 points / 2.5–5 sprints depending on parallelism. Descope lever: Phases 0–4 (must-haves) can ship without Phase 5 (industry-standard modules) if timeline pressure arises. |
