# Epic 13 — Account client fulfilment (dispatch without prepayment when healthy), confirmations, quotes, invoicing hooks

## Description

This epic delivers **account-client fulfilment** on top of **[`docs/epic-12.md`](epic-12.md)** (VST-14): staff can **dispatch** or progress work **without prepayment** when **`can_dispatch_account_booking()`** and related **account health** rules pass. It wires **trip confirmation** emails (**Resend**) for the account path, makes **`booking_quotes`** the **operational source** for "what was agreed" before and after dispatch, and adds **invoicing queue hooks** (status fields, list entry points, handoff metadata) so finance tooling can follow in a later slice or integration.

This is the **first epic that writes `booking_quotes` rows** — Epic 12 created the table; Epic 13 is its first live producer. It is also the first epic that **relaxes the hard-coded `payment_status='paid'` gate** in `isBookingDispatchable()` via the `can_dispatch_account_booking()` reason-code matrix. Both changes are high blast-radius: the DoD demands every reason code has a UI block state, every email has a failure mode, and every quote has an append-only audit trail.

It depends on **[`docs/epic-11.md`](epic-11.md)** **E1/E2** as inherited through Epic **12**; it does **not** re-open core RLS recursion work except where **new tables** require policy extensions.

## 1. Epic summary & goals

### Root cause summary (product + data)

- **Today's `isBookingDispatchable(booking)` hard-requires `status='paid' AND payment_status='paid'`.** This is correct for walk-ins but wrong for account clients who settle on 14/30/60-day invoice terms. Account clients who never pay upfront are permanently blocked from dispatch.
- **No ops-initiated email exists.** `Resend` is in `package.json` but no call-site sends trip confirmations; the current SMS stub (`notifyBookingCreatedSmsStub`) fires once at booking creation only.
- **No quote lifecycle.** Today's `reconcileBookingQuote()` computes a total at booking time and silently pins it to `bookings.total_amount`. There's no record of **what was sent to the customer**, no version history, no accept/reject capture, no expiry — the exact audit gap corporate customers are most likely to dispute.
- **Invoicing page exists (`/ops/invoicing`) but has no queue-entry contract.** Finance has no reliable way to pick up "this account booking is done, generate an invoice."

### Business goals

- **Throughput for trusted accounts:** Reduce unnecessary payment friction when **credit / PO / contract** status is healthy. Corporate shuttle benchmark research shows post-paid terms are table stakes for enterprise contracts.
- **Clear communication:** Customers receive **accurate trip confirmations** for account bookings, with driver + vehicle + pickup details + cancellation policy.
- **Auditability:** **Quote versions** and **snapshots** explain what staff dispatched against. Disputes 12+ months later resolvable by retrieving the exact HTML sent.
- **Finance handoff readiness:** Completed account trips land on an invoicing queue with all the metadata required for an invoice PDF, even if PDF generation itself is a later slice.

### Technical goals

- **Dispatch path relaxation:** `isBookingDispatchable(booking)` branches on `client_type`. Walk-ins retain the current paid-check. Account clients delegate to `can_dispatch_account_booking()` and surface the returned reason code via a new `OpsActionError` variant.
- **`booking_quotes` lifecycle:** Server action `createBookingQuote` inserts a new version with `status='draft'`; `sendBookingQuote` flips to `status='sent'`, triggers Resend, captures `rendered_html` + `sent_at` + `sent_to_email` + `idempotency_key`, updates `bookings.current_quote_id`. `acceptBookingQuote` / `rejectBookingQuote` land accept/reject timestamps. Expiry job (daily) transitions `sent → expired` when `now() > expires_at`.
- **Resend integration:** Dedicated email module `src/lib/email/` with template registry (typed), per-template rendering with React-Email or Handlebars (implementation choice), idempotency via `booking_quotes.idempotency_key`, and a structured failure-surface that writes to `ops_audit_log` and renders a retry affordance in ops.
- **Invoicing hooks:** Completed account trips auto-land on a filtered view of `/ops/invoicing` aged by `account_snapshot.credit_terms_days`. Export-friendly fields (`booking_id`, `customer_account_id`, `purchase_order_ref`, `total_amount`, `trip_completed_at`, `credit_terms_days`, `due_date`) exposed as a server-side paginated query — **not** a materialised view in this epic.

### Product decisions locked (inherits Epic 12 Q1–Q7; epic-13-specific below)

| Id | Decision |
|----|----------|
| **Q8** | **Account-quote timing:** For account clients the quote is sent **immediately after dispatch** (trip created), not before. The email is a **trip confirmation with embedded quote line items** — one email, not two. Rationale: trusted accounts do not need a pre-dispatch approval step; that's reserved for walk-ins in Epic 14. |
| **Q9** | **Resend failure policy:** If the Resend call fails, the **trip is still created** (dispatch is not rolled back), the `booking_quotes` row is still inserted with `status='sent'`, but a retry task appears on a dedicated ops panel. Rationale: email is a notification channel, not the system of record; rolling back dispatch because SMTP is flaky creates ops chaos. |
| **Q10** | **Invoice generation scope:** Epic 13 delivers the **queue contract** (data surface, due-date computation, status transitions `ready_to_invoice → invoiced → paid_invoice`). Actual **PDF generation** and sending is **deferred** to a focused follow-up story (Epic 13.10) or a separate finance integration epic — whichever ships first. |
| **Q11** | **Credit-limit display:** When dispatch is blocked by `credit_limit_exceeded`, the ops UI shows the **current outstanding** and **the limit** (both from `customer_accounts` + a live aggregate). This is read-only information to help ops make a judgement call, not a path to override the block. Overrides are admin-only and covered in Q12. |
| **Q12** | **Guardrail override:** Admin-role users (not dispatcher) may **override** a `credit_limit_exceeded` or `overdue_invoices` block with a mandatory `override_reason` text (min 10 chars). Overrides are written to `ops_audit_log` with `action='dispatch_override'` and a structured payload including the original reason code. `contract_expired` and `account_suspended` are **NOT** overridable — they reflect hard business state. |

## 2. Non-goals / out of scope (brief)

- **Full ERP / Xero / QuickBooks** integration (unless already a separate epic or pulled in explicitly).
- **Walk-in PayFast** completion flows — **[`docs/epic-14.md`](epic-14.md)**.
- **Customer self-service portal** — **[`docs/epic-15.md`](epic-15.md)**.
- **Invoice PDF generation and delivery** — deferred per **Q10**; queue contract only in Epic 13.
- **SMS notifications** for account trip confirmations — the existing `notifyBookingCreatedSmsStub` stays; email is the primary channel for this epic.
- **Customer-facing quote accept/reject UI** — accept/reject actions exist as server-side capabilities for ops use; public landing pages for customer accept/reject are Epic 14's concern (walk-in path needs them first).
- **Multi-quote negotiation** (version 1 → edit → version 2 → customer counters). Version 2+ is supported by the schema but the UI flow in Epic 13 is **one-shot dispatch**: send quote-as-confirmation once, handle correction via supersede if needed.
- **Removing `pending` from `bookings_status_check`** — still retained as transitional; Epic 13's Story 13.1 can carry the cleanup if all Epic 12 writers have migrated.

## 3. Phased delivery plan

**Ordering principle:** **Guardrail first** (so the UI block contract is visible before dispatch UI changes), **quote lifecycle before email** (email is a consumer of the quote row, not the other way around), **invoicing hooks last** (they depend on completed trips existing in the account path).

| Phase | Focus | Includes (story roll-up) | Parallelism |
|-------|-------|---------------------------|-------------|
| **1 — Guardrail integration** | Branch `isBookingDispatchable`, surface reason codes in UI | **13.1** dispatch branching; **13.2** reason-code UI block panel; **13.3** admin override for `credit_limit_exceeded` / `overdue_invoices` (**Q12**) | 13.1 blocker; 13.2 + 13.3 parallel after |
| **2 — Quote lifecycle (write)** | First `booking_quotes` producer | **13.4** `createBookingQuote` + `sendBookingQuote` server actions; **13.5** `bookings.current_quote_id` maintenance + view-backed reads | Both depend on 13.1; parallelisable |
| **3 — Resend trip confirmation** | Template + send + retry | **13.6** email module + template registry; **13.7** Resend call on quote send; **13.8** retry panel (**Q9**) | 13.6 parallel after 13.4; 13.7/13.8 after 13.6 |
| **4 — Invoicing queue hooks** | Completed-trip → invoicing surface | **13.9** status transitions `completed → ready_to_invoice`; **13.10** `/ops/invoicing` queue view with due-date column | 13.9 after 13.2; 13.10 after 13.9 |
| **5 — Quality + expiry** | Automated + daily job | **13.11** `sent → expired` daily job; **13.12** E2E + smoke coverage for dispatch branching, reason codes, overrides, quote send, retry | 13.11 parallel with 13.10; 13.12 last |

**Sizing estimate:** ~34 story points across 12 stories. Larger than Epic 12 because of the email infrastructure lift. Single-developer throughput ≈ 2.5 sprints; 2-dev parallel ≈ 2 sprints.

## 4. Themes with user stories & acceptance criteria

### Theme A — Dispatch branching & reason-code UI

**US-A1 — As fulfilment staff**, I need **dispatch** when the **account is healthy** and **PO** rules pass, so that **I am not forced through walk-in payment**.

- **AC:** `isBookingDispatchable(booking)` branches on `booking.client_type`. For `walk_in`, current behaviour (`status='paid' AND payment_status='paid'`) is preserved unchanged.
- **AC:** For `account_client`, the function calls `can_dispatch_account_booking(booking.id)` and returns `{ok: true}` when the SQL function returns `(true, 'ok')`; otherwise returns `{ok: false, reason: <reason_code>}`.
- **AC:** The existing `assignBookingToRun` server action surfaces the reason code via a new `OpsActionError` variant (`NOT_DISPATCHABLE_ACCOUNT` with a `reasonCode` sub-field) — not a generic "not dispatchable" string.
- **AC:** `can_dispatch_account_booking()` is authoritative; no duplicate guardrail logic in TypeScript.
- **AC:** Unit tests cover each reason code path returning correctly from the TS branch.

**US-A2 — As fulfilment staff**, I need a **block panel** that shows the **specific reason** dispatch is refused, so that **I know whether to chase the booker, finance, or admin**.

- **AC:** When `assignBookingToRun` returns `NOT_DISPATCHABLE_ACCOUNT`, the ops UI renders a panel naming the reason code in human language, e.g.:
  - `account_on_hold` → *"This account is currently on hold. Contact account admin before dispatch."*
  - `account_suspended` → *"This account is suspended. Dispatch is not permitted."*
  - `contract_expired` → *"The account's contract expired on {contract_ends_on}. Renew before dispatch."*
  - `contract_not_yet_active` → *"The account's contract starts on {contract_starts_on}. Dispatch is not permitted yet."*
  - `po_required_and_missing` → *"This account requires a purchase order reference. Add one to the booking before dispatch."*
  - `credit_limit_exceeded` → *"Outstanding R{outstanding} + this booking R{this_booking} exceeds credit limit R{credit_limit}."* (**Q11**)
  - `overdue_invoices` → *"This account has {n} overdue invoice(s). Resolve before dispatch."*
- **AC:** Copy lives in a single module (`src/features/ops/reason-code-copy.ts`) for easy i18n / rewording.
- **AC:** Panel is rendered in the Fulfil flow's assign step (same pattern as current conflict errors).

**US-A3 — As an admin**, I need to **override** a `credit_limit_exceeded` or `overdue_invoices` block with a written reason, so that **a trusted override path exists for judgement calls** — **Q12**.

- **AC:** Override is gated to `profiles.role='admin'`; `dispatcher` role sees the block panel but no override button.
- **AC:** The override form requires a `reason` textarea (min 10 chars, max 2000 chars); submit is blocked until the reason meets the minimum.
- **AC:** On successful override, `assignBookingToRun` is re-invoked with an `override_token` that bypasses the specific reason code; server re-verifies the overriding user is admin before honouring.
- **AC:** An `ops_audit_log` row is written with `action='dispatch_override'`, `entity='booking'`, `payload={original_reason_code, override_reason, overridden_by_profile_id, booking_id}`.
- **AC:** `contract_expired`, `contract_not_yet_active`, `account_suspended`, `account_on_hold`, and `po_required_and_missing` are **NOT** overridable — the UI shows no override button for these, and the server rejects any override attempt against them.

### Theme B — Quote lifecycle (write path)

**US-B1 — As ops staff**, I need to **create and send** a `booking_quote` when I dispatch an account booking, so that **what was communicated to the customer is captured**.

- **AC:** A new server action `createBookingQuote(bookingId, lineItems, totalZar, expiresAt?)` inserts a `booking_quotes` row with the next `version` for that booking, `status='draft'`, and an `idempotency_key` derived from `{bookingId}:{version}`.
- **AC:** `sendBookingQuote(quoteId)` transitions the quote `draft → sent`, sets `sent_at`, `sent_to_email`, `sent_by`, optionally `rendered_html` (post-render), and **atomically** updates `bookings.current_quote_id` to the new quote ID.
- **AC:** If `expires_at` is not supplied, defaults to `now() + 14 days` for `account_client` (Epic 12 **Q2**).
- **AC:** Concurrent `createBookingQuote` for the same booking is safe — `UNIQUE(booking_id, version)` prevents duplicates; the second call increments version.
- **AC:** Idempotency: calling `sendBookingQuote` twice with the same quote ID results in one email send (enforced via `idempotency_key UNIQUE`).
- **AC:** A quote cannot be sent if its booking's `status` is `cancelled` or `expired` (validation error, not silent no-op).

**US-B2 — As ops staff**, I need the booking detail view to show the **current quote** including line items and expiry, so that **I don't re-send stale information**.

- **AC:** Booking detail UI reads `bookings.current_quote_id` first; if null, falls back to `v_booking_current_quote` view.
- **AC:** Displayed fields: version number, total, line items (rendered as a mini-table), `sent_at`, `sent_to_email`, `expires_at`, current `status`.
- **AC:** A "Re-send quote" action is available when `status IN ('sent','accepted')` and creates a new version (prior version auto-transitions to `superseded` with `superseded_by_quote_id` populated).
- **AC:** Line items format documented in a shared type (`BookingQuoteLineItem`) used by both the create action and the render module.

### Theme C — Resend trip confirmation email

**US-C1 — As a customer**, I need **trip confirmation** email with driver, vehicle, pickup, and quote details, so that **I have a paper trail and know what to expect**.

- **AC:** A new module `src/lib/email/` contains: `resend-client.ts` (typed wrapper around the Resend SDK), `templates/` (initially `account-trip-confirmation.tsx` using React-Email or equivalent), and `send.ts` (the `sendEmail` function with structured failure return).
- **AC:** `account-trip-confirmation` template renders: customer name, booking reference, pickup date/time, origin → destination, vehicle name + category, chauffeur full name, total amount, line items breakdown, payment terms ("Invoice to follow within X days" where X = `account_snapshot.credit_terms_days`), cancellation policy snippet, support contact.
- **AC:** Template uses `RESEND_FROM_EMAIL` (configured in `.env.local`); production `RESEND_API_KEY` is not checked into the repo.
- **AC:** Rendered HTML is captured and stored on the `booking_quotes` row (`rendered_html` column) at send time — **not** regenerated at read time.
- **AC:** Test-mode detection: when `NODE_ENV !== 'production'` and `RESEND_API_KEY` matches a test pattern, the send is logged but not actually dispatched (protects dev/staging from emailing real customers).

**US-C2 — As ops staff**, I need **retry** when a trip confirmation email fails to send, so that **transient SMTP failures don't silently lose comms** — **Q9**.

- **AC:** On a Resend call failure (timeout, 5xx, rate-limit), the trip and quote rows are **NOT** rolled back. The failure is logged to `ops_audit_log` with `action='email_send_failed'`, `payload={quote_id, error_message, attempt_count}`.
- **AC:** A new ops panel at `/ops/bookings` (or a sub-route `/ops/bookings/comms-retry`) lists quotes where `status='sent'` but `rendered_html IS NULL` or an `email_send_failed` audit entry is more recent than any `email_sent` entry — these are the retry candidates.
- **AC:** Each retry row has a "Retry now" button that calls a `retrySendBookingQuoteEmail(quoteId)` action; the action is idempotent via `idempotency_key`.
- **AC:** After 3 failed retries, the row surfaces a warning badge and a "Mark failed, will contact manually" action that clears it from the queue and writes an audit row.

### Theme D — Invoicing queue hooks

**US-D1 — As finance**, I need **completed account trips** to appear on an **invoicing queue** with due date and PO, so that **I can pick them up for billing** — **Q10**.

- **AC:** When a trip transitions to `status='completed'` and its booking is `client_type='account_client'`, a new value `ready_to_invoice` is writable to `bookings.status` (add to `bookings_status_check` via a small Epic 13 migration).
- **AC:** The transition is triggered by existing `updateTripStatusAction` when the trip's linked booking meets the criteria; no separate job needed for the first version.
- **AC:** The existing `/ops/invoicing` page gains a "Ready to invoice" tab/view showing: `booking_reference`, `customer_account` name, `total_amount`, `trip_completed_at`, `purchase_order_ref`, `credit_terms_days` (from `account_snapshot`), computed `due_date` (= `trip_completed_at + credit_terms_days`).
- **AC:** Columns are sortable by `due_date` ascending (soonest-due first) by default.
- **AC:** Export-friendly: a "Copy as CSV" or "Export visible rows" button produces a standard CSV download — the data surface is stable enough for a human to hand to a bookkeeping tool.

**US-D2 — As finance**, I need to mark an invoice as **invoiced** and **paid_invoice** so that the queue stays clean — **Q10**.

- **AC:** `bookings_status_check` also accepts `invoiced` and `paid_invoice` (both added in the same Epic 13 migration).
- **AC:** A "Mark invoiced" action on each ready-to-invoice row transitions `ready_to_invoice → invoiced` with an optional external invoice reference captured in a new nullable column `bookings.external_invoice_ref text`.
- **AC:** A "Mark paid" action transitions `invoiced → paid_invoice` and sets `payment_status='paid'`, `payment_timestamp=now()`.
- **AC:** Both transitions write to `ops_audit_log`.
- **AC:** PDF generation is **NOT** in scope — Q10 defers it.

### Theme E — Expiry + quality

**US-E1 — As the system**, I need a **daily job** to transition `sent` quotes past their `expires_at` to `expired`, so that **stale quotes don't mislead ops**.

- **AC:** A Supabase cron job (or equivalent — document the choice) runs daily at a defined UTC time.
- **AC:** Query transitions all `booking_quotes` rows where `status='sent' AND expires_at IS NOT NULL AND expires_at < now()` to `status='expired'`.
- **AC:** Job is idempotent (running twice the same day is safe) and logs run count + transition count to an ops-visible location.
- **AC:** If a booking's `current_quote_id` points at a now-expired quote, the booking detail UI shows a clear "Quote expired" badge; ops can re-send a new version.

**US-E2 — As QA**, I need **E2E coverage** of dispatch branching, reason codes, admin override, quote send + email capture, and retry, so that **no regression slips into production**.

- **AC:** Playwright tests cover: account booking with healthy account → dispatches without payment → quote row inserted → email captured in rendered_html → appears on invoicing queue after trip completion.
- **AC:** Playwright tests cover each reason-code block: seeded `account_suspended` blocks, seeded `credit_limit_exceeded` blocks with correct numbers shown, PO-required blocks without a PO set.
- **AC:** Playwright tests cover admin override flow for `credit_limit_exceeded` — dispatcher cannot see override button, admin can, override reason validated, audit log written.
- **AC:** Resend is **mocked** in tests; a mock that simulates a 500 response verifies the retry queue surfaces the entry.
- **AC:** Smoke RLS updated to cover the new `ready_to_invoice`, `invoiced`, `paid_invoice` status values (staff-only writes; customer read as applicable).

### Theme F — Story catalogue (reference for SM)

| ID | Title | Theme | Pts | Depends |
|----|-------|-------|-----|---------|
| **13.1** | Branch `isBookingDispatchable` on `client_type`, wire `can_dispatch_account_booking()` into `assignBookingToRun` | A | **3** | Epic 12 complete |
| **13.2** | Reason-code block panel with human copy + current outstanding display (**Q11**) | A | **3** | 13.1 |
| **13.3** | Admin override for `credit_limit_exceeded` / `overdue_invoices` with audit (**Q12**) | A | **3** | 13.2 |
| **13.4** | `createBookingQuote` + `sendBookingQuote` server actions with version/idempotency | B | **5** | 13.1 |
| **13.5** | Booking detail quote view + re-send action with supersede | B | **3** | 13.4 |
| **13.6** | Email module scaffold (`src/lib/email/`) + Resend typed client + test-mode guard | C | **3** | — (parallel with 13.1) |
| **13.7** | `account-trip-confirmation` template + wire into `sendBookingQuote` | C | **3** | 13.4, 13.6 |
| **13.8** | Email-retry ops panel with idempotent retry action (**Q9**) | C | **3** | 13.7 |
| **13.9** | Status transitions `completed → ready_to_invoice` + migration for new status values (**Q10**) | D | **2** | 13.1 |
| **13.10** | `/ops/invoicing` queue view with due-date column + Mark invoiced / Mark paid actions | D | **3** | 13.9 |
| **13.11** | Daily `sent → expired` job (Supabase cron or equivalent) | E | **2** | 13.4 |
| **13.12** | E2E + smoke coverage across all Theme A–D paths | E | **3** | 13.2–13.11 |

## 5. Cross-cutting dependencies matrix

| Item | Depends on | Blocks |
|------|------------|--------|
| **Dispatch branching** | **[`docs/epic-12.md`](epic-12.md)** VST-14 + `can_dispatch_account_booking()` | Walk-in parity tests in Epic **14** (walk-ins should still hit the old paid-gate) |
| **`booking_quotes` write path** | Epic 12 table + `expires_at` column | Walk-in quote-first flow in Epic **14**; customer portal quote view in Epic **15** |
| **Resend email infrastructure** | `RESEND_API_KEY` + `RESEND_FROM_EMAIL` provisioned; domain verification with Resend | Walk-in quote emails in Epic **14**; all transactional comms in Epic **15** |
| **Admin override (Q12)** | Profile role model (admin vs dispatcher) from Epic 11/E1 | Finance-grade audit trail for dispute resolution |
| **Invoicing queue** | Completed trips in account path; `account_snapshot.credit_terms_days` from Epic 12 | PDF generation and finance-system integration (later epic) |
| **Daily expiry job** | Supabase cron availability (or chosen scheduler) | Walk-in expiry job in Epic **14** (shares the pattern) |

**References:** **[`docs/epic-12.md`](epic-12.md)**, **[`docs/epic-11.md`](epic-11.md)** (E2 ops error patterns), **[`docs/epic-1.md`](epic-1.md)**, **[`docs/ops-server-action-logging.md`](ops-server-action-logging.md)**, **[`docs/integrations-and-payments.md`](integrations-and-payments.md)**.

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Relaxing the paid-gate for account clients creates AR runaway if guardrails have a bug | **High** | Guardrail is a single SQL function with explicit reason codes; Story 13.12's Playwright tests seed each failure mode and assert block. Admin override writes audit rows making any runaway traceable. |
| Resend quota / rate limits exceeded during bulk send | **Medium** | Test-mode guard prevents dev traffic hitting prod; Resend free tier = 100/day, production tier documented in `docs/environment-vars.md`. Retry queue degrades gracefully rather than cascading failures. |
| `rendered_html` bloats `booking_quotes` table over time | **Low** | HTML is tens of KB per row; at 1k quotes/month that's ~15 MB/year. If an issue surfaces, move `rendered_html` to Supabase Storage and keep a `pdf_storage_path`-style reference (column already exists). |
| Admin override abused — admin uses it casually, defeating the guardrail | **Medium** | Override writes an audit row; monthly review process by finance/ops lead. Not solvable in code alone — cultural + reporting safeguard. |
| `ready_to_invoice → invoiced → paid_invoice` statuses confuse the existing `status_history` jsonb | **Low** | `status_history` is already a flexible jsonb array; new values append naturally. Story 13.9 adds a single smoke test confirming history preserves all transitions. |
| `current_quote_id` FK drift — booking points at a quote from a different booking (data bug) | **Low** | Foreign key + `booking_quotes.booking_id` reference are set at migration time; additionally add a CHECK or trigger if a bug is suspected — defer unless it surfaces. |
| Email template typos / variable mismatches render `{{customer_name}}` literally | **Medium** | Template compile-time type-checking via React-Email (if chosen) or Handlebars strict mode; Story 13.12 E2E asserts no `{{` strings in rendered HTML. |
| Concurrent `sendBookingQuote` from two dispatchers creates duplicate email | **Low** | `idempotency_key UNIQUE` on `booking_quotes` prevents double-insert at the DB layer; Resend idempotency key in the SDK call prevents double-send even if the first call was in-flight. |

## 7. Definition of Done for Epic 13

- **Dispatch:** Account bookings can progress per **reason-code** matrix; **PO** and **payment** edge cases covered by tests. Every reason code from `can_dispatch_account_booking()` has a corresponding UI copy entry and at least one Playwright test.
- **Override:** Admin override available for `credit_limit_exceeded` and `overdue_invoices` only; all other reason codes are hard blocks. Override writes auditable rows with mandatory reason text.
- **Email:** Trip confirmation sent on agreed trigger (**Q8** — on quote send after dispatch); failures visible to ops on a dedicated retry panel; idempotency prevents double-send.
- **Quotes:** **`booking_quotes`** used in ops detail; **`expires_at`** enforced via daily job; `current_quote_id` kept in sync by server actions; re-send creates a new version and supersedes the prior.
- **Invoicing hooks:** Documented queue contract with `ready_to_invoice`, `invoiced`, `paid_invoice` status values, due-date computation, PO and account-snapshot surfaced; CSV export of ready-to-invoice rows available.
- **Smoke & E2E:** Smoke RLS updated for new status values; E2E covers dispatch branching, every reason code, admin override, quote send + email capture, retry queue, invoicing queue transitions.
- **Product locks:** **Q8–Q12** reflected in ACs or explicit story notes; **no** PDF generation in this epic (deferred per Q10).
- **Docs:** `docs/ops-console.md` updated with new dispatch behaviour and reason-code UI; `docs/integrations-and-payments.md` updated with Resend setup notes; `docs/environment-vars.md` updated with any new vars.

## 8. References to likely code areas (paths only)

- **Dispatch + guardrail integration:** `src/actions/opsDispatch.ts`, `src/lib/ops-booking.ts` (where `isBookingDispatchable` lives — check and update), `src/features/ops/ops-action-errors.ts`
- **Ops UI:** `src/app/(ops)/ops/fulfil/`, `src/app/(ops)/ops/bookings/` (created in Epic 12), `src/features/ops/components/` — new `ReasonCodeBlockPanel`, `CreditLimitOverrideDialog`, `QuoteDetailPanel`, `EmailRetryQueue`
- **Copy module:** `src/features/ops/reason-code-copy.ts` (new)
- **Quote server actions:** `src/actions/` — new `createBookingQuote.ts`, `sendBookingQuote.ts`, `retrySendBookingQuoteEmail.ts`
- **Email module:** `src/lib/email/` (new) — `resend-client.ts`, `send.ts`, `templates/account-trip-confirmation.tsx`
- **Invoicing queue:** `src/app/(ops)/ops/invoicing/` (update), `src/actions/opsInvoicingHooks.ts` (extend)
- **Migrations:** `supabase/migrations/` — a small Epic 13 migration adds `invoiced`, `paid_invoice`, `ready_to_invoice` to `bookings_status_check` and adds `bookings.external_invoice_ref text`
- **Cron / scheduled job:** `supabase/functions/` or project-equivalent scheduler location for the daily expiry job
- **Tests:** `tests/` — Playwright specs for dispatch branching, reason codes, admin override, quote + email flow, retry queue, invoicing transitions

## Relationship to other epics

- **[`docs/epic-12.md`](epic-12.md):** Epic 13 is the **first live consumer** of the VST-14 schema. Every schema invariant from Epic 12 (versioned quotes, reason-coded guardrail, `account_snapshot` immutability) is stress-tested here.
- **[`docs/epic-11.md`](epic-11.md):** E2 ops error / refresh patterns reused for the reason-code block panel and retry queue.
- **[`docs/epic-14.md`](epic-14.md):** Shares the Resend email infrastructure (`src/lib/email/`), the `booking_quotes` lifecycle actions, and the daily expiry job pattern. Walk-in path additionally requires customer-facing accept/reject pages — not in scope here.
- **[`docs/epic-15.md`](epic-15.md):** Customer portal will read `booking_quotes` history (customer sees what they were quoted). Portal invoicing view will build on Epic 13's invoicing queue data surface.
