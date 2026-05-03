> **Q19 superseded:** PayFast checkout flow described below is replaced by Epic 16 Theme N (EFT-to-bank-account, ops manual mark). All references below to PayFast, ITN webhook, and `/q/[token]/pay` are historical. See [`docs/epic-16.md`](epic-16.md) for current behaviour.

# Epic 14 — Walk-in quote-first flow, PayFast handoff, paid → ready-to-assign queue

## Description

This epic implements the **walk-in** path where **quote-first** is the default: customers receive a **versioned quote** with **`booking_quotes.expires_at`** (**72h** default per Epic 12 **Q2**), complete payment via **PayFast** where applicable, and land in a **paid → ready-to-assign** queue for ops. It shares **`booking_quotes`**, **`bookings.client_type`**, and **`/ops/bookings`** infrastructure with **[`docs/epic-12.md`](epic-12.md)** and account behaviour introduced in **[`docs/epic-13.md`](epic-13.md)**.

This is the **first epic where a customer interacts with `booking_quotes`** — Epic 13 writes them for ops/account purposes, but Epic 14 adds **public-facing accept / reject / pay** routes that customers land on from emailed quote links. It is also the first epic that introduces an **automated booking → quote** transition for walk-ins on ops action (the "Send quote" button), and the first that closes the loop between the existing **PayFast ITN webhook** and the **`bookings.status` state machine** introduced in Epic 12.

It depends on **[`docs/epic-12.md`](epic-12.md)** (**VST-14** schema) and reuses the **Resend email infrastructure**, **`booking_quotes` lifecycle actions**, and **daily expiry job pattern** established in **[`docs/epic-13.md`](epic-13.md)**. It does **not** re-open core PayFast signature / ITN behaviour — the existing webhook at `src/app/api/payfast/webhook/route.ts` is the authoritative handler per **[`docs/integrations-and-payments.md`](integrations-and-payments.md)**; Epic 14 only extends what happens **after** a successful `payment_status='paid'` transition.

## 1. Epic summary & goals

### Root cause summary (product + data)

- **Today's walk-in path has no ops-initiated quote step.** `reconcileBookingQuote()` computes a price at booking-form submit time and silently pins it to `bookings.total_amount`; the customer sees the price on the booking form confirmation screen, but there is **no emailed quote record**, no accept/reject, no separation between "we've offered this price" and "customer has committed."
- **Today's payment flow is tightly coupled to booking creation.** The booking form flows directly into PayFast; there is no step where ops reviews the inquiry, confirms vehicle availability for the requested window, or sends a formal quote first. This is acceptable for the simplest point-to-point bookings but brittle for higher-value tours, charter requests, or bookings where capacity needs checking.
- **No "ready to assign" queue exists for paid walk-ins.** Once a walk-in pays, their booking's `status` becomes `paid`, but there is no dedicated ops surface that says "these are paid, nobody has touched them yet, assign them now." The existing `/ops/fulfil?queue=paid` tab exists but pre-dates the unified `/ops/bookings` queue from Epic 12 and applies `booking_intent` filters that hide `trip_request` rows.
- **No quote-expiry enforcement for walk-ins.** The 72h default is specified in Epic 12 **Q2** but no job or UI enforces it today; a customer could click a 6-month-old quote link and hit a stale price.
- **No customer-facing accept / reject / pay landing pages.** Epic 13 writes quote rows and emails HTML confirmations, but the links in those emails currently have nowhere to land — customer action is implicit (they either pay via the confirmation email's PayFast link, or they don't).

### Business goals

- **Cashflow clarity:** Walk-ins **pay** (or explicitly accept quote terms) before scarce capacity is committed, except where product rules say otherwise.
- **Ops clarity:** Paid walk-ins appear in the **same unified bookings** semantics as Epic **12**, with a **ready-to-assign** slice that is the single source of truth — no duplicate queue logic across `/ops/fulfil` and `/ops/bookings`.
- **Customer trust:** A formal emailed quote with an expiry date and a clear "Accept & pay" path is the norm for corporate-shuttle benchmark competitors (Zaui, Moovs, Busify) — walk-ins expect this parity.
- **Audit parity with account path:** Walk-in quotes land in the **same** `booking_quotes` table with the **same** lifecycle values, so dispute resolution and reporting don't branch on `client_type`.

### Technical goals

- **Quote-first server actions:** `createBookingQuote` from Epic 13 is reused; a new `sendWalkInQuote(bookingId)` composes the customer-facing email template (`walk-in-quote` — new) with accept / pay / reject links signed with a short-lived token.
- **Public-facing landing pages:** Three new routes under `src/app/(public-ops)/` (or a new `src/app/(quote)/`, naming TBD at implementation time):
  - `/q/[token]/accept` — customer clicks "Accept this quote"; transitions quote `sent → accepted`, booking `quote_sent → awaiting_payment`, redirects to PayFast checkout.
  - `/q/[token]/reject` — customer clicks "This isn't right for me"; transitions quote `sent → rejected` with an optional free-text reason.
  - `/q/[token]/pay` — direct "Pay now" link (skips the accept screen); same end-state as accept but records `client_type_source` as `direct_pay_skip`.
- **Token signing:** Short-lived (quote's `expires_at`), HMAC-signed tokens embedded in email links. `booking_quotes.idempotency_key` doubles as the token payload; verification is a stateless HMAC compare (no new DB table needed).
- **PayFast integration reuse:** The existing `processPayment` action and the existing ITN webhook at `src/app/api/payfast/webhook/route.ts` are used unchanged; Epic 14's contribution is wiring the **pre-pay** state transitions (`quote_sent → awaiting_payment`) and the **post-pay** transitions (`paid → ready_to_assign` — a new status value added in this epic's migration).
- **`ready_to_assign` status + ops queue:** Adds `ready_to_assign` to `bookings_status_check`; `/ops/bookings` gains a "Ready to assign" filter chip; `/ops/fulfil?queue=paid` is either retired or refactored to reference the same predicate (decision in Story 14.9).
- **Daily expiry job reuse:** The daily `sent → expired` cron from Epic 13 extends trivially — same query, no new job needed. Epic 14 only verifies the walk-in 72h default is respected.

### Product decisions locked (inherits Epic 12 Q1–Q7 and Epic 13 Q8–Q12; epic-14-specific below)

| Id | Decision |
|----|----------|
| **Q13** | **Quote-first is the default for walk-ins.** The public booking form for **non-trivial** intents (`trip_request`, `hourly_hire`, `experience_package`) routes to **`quote_sent`** without triggering PayFast immediately; ops reviews and sends the quote email. For **simple `point_to_point`** bookings, the existing flow (booking form → PayFast → paid) is **preserved** — quote-first is opt-in per intent, not retrofitted onto every path. |
| **Q14** | **Accept-without-pay is not a distinct state.** When a customer clicks "Accept", the quote transitions `sent → accepted` and the booking transitions `quote_sent → awaiting_payment`; the customer is **immediately** redirected to PayFast. There is no intermediate "accepted but not yet paying" state exposed to the customer. Rationale: minimises abandoned-accept rows cluttering the queue. |
| **Q15** | **Reject is soft-terminal.** A `rejected` quote does **not** cancel the booking; it transitions the booking back to `triaged` so ops can re-send a corrected quote. The booking is only `cancelled` via an explicit ops cancel action. Rationale: price rejection is a negotiation, not a cancellation. |
| **Q16** | **Token strategy:** HMAC-signed tokens (not JWT, not stored in DB). Token payload = `{quote_id, booking_id, purpose: 'accept' | 'pay' | 'reject', exp}` signed with a new server-only env var `QUOTE_LINK_SIGNING_KEY`. Expiry mirrors `booking_quotes.expires_at`. Stateless verification — no new table. |
| **Q17** | **Expired quote landing:** If a customer clicks a link after `expires_at`, the public page renders a clear "This quote has expired" message with a "Request a new quote" button that deep-links back to the booking form pre-filled with the original trip details. **No** silent auto-regeneration. |
| **Q18** | **`ready_to_assign` vs existing `/ops/fulfil?queue=paid`:** The `queue=paid` tab is **refactored** to use the new `ready_to_assign` status as its predicate (not retired outright — URL stability for bookmarks matters). `/ops/bookings` gains the same filter chip. Two surfaces, one predicate. |
| **Q19** | **Webhook-driven status transition:** The `quote_sent → awaiting_payment → paid → ready_to_assign` chain is driven by **existing PayFast ITN** behaviour (`payment_status='paid'` transition) plus a **database trigger** on `bookings` that sets `status='ready_to_assign'` when `payment_status` flips to `'paid'` AND `client_type='walk_in'`. Rationale: keeps the critical state transition **inside** the existing atomic webhook operation — no race window. |

## 2. Non-goals / out of scope (brief)

- **Account dispatch without prepayment** — **[`docs/epic-13.md`](epic-13.md)**.
- **Customer account portal** — **[`docs/epic-15.md`](epic-15.md)**.
- **Alternative payment gateways** beyond what the repo already supports (PayFast only).
- **Quote negotiation UI for customers** — customers can accept, reject, or pay. They cannot counter-offer or edit line items. Counter-offers remain an out-of-band conversation; ops sends a new quote version when terms change.
- **Multi-currency quotes** — ZAR only, consistent with current pricing engine.
- **Quote-first retrofit onto `point_to_point`** — the existing simple flow is preserved (**Q13**); only `trip_request`, `hourly_hire`, and `experience_package` default to quote-first in Epic 14.
- **Customer-facing quote PDF download** — HTML email is the artefact; PDF generation is deferred (same scope line as Epic 13 **Q10**).
- **SMS notifications** for walk-in quote events — email only for this epic; SMS may be added in Epic 15 as part of the comms matrix.
- **Saving a customer's accept / pay / reject action to an authenticated profile** — all public routes are stateless and authenticated via the HMAC token only; a signed-in customer area is Epic 15.
- **Refund flows** — current PayFast doc (`docs/integrations-and-payments.md`) marks refunds as manual / TBD; Epic 14 does not change this.

## 3. Phased delivery plan

**Ordering principle:** **Status + trigger first** (so the data layer is correct before any UI depends on it), **server actions before public routes** (routes are thin handlers over actions), **public routes before ops UI polish** (without the customer side, the ops side has nothing to queue).

| Phase | Focus | Includes (story roll-up) | Parallelism |
|-------|-------|---------------------------|-------------|
| **1 — Schema + trigger** | Add `ready_to_assign`, DB trigger on payment_status flip (**Q19**) | **14.1** migration + smoke RLS + trigger tests | Blocker — must complete before Phase 2+ |
| **2 — Token + public routes** | HMAC tokens (**Q16**), accept / reject / pay pages (**Q14**, **Q15**, **Q17**) | **14.2** token signing module; **14.3** `/q/[token]/accept`; **14.4** `/q/[token]/reject`; **14.5** `/q/[token]/pay` | All four after 14.1; 14.2 blocks 14.3–14.5 |
| **3 — Server actions + template** | `sendWalkInQuote` server action, customer email template | **14.6** `sendWalkInQuote` + customer `walk-in-quote` email template; **14.7** intent-based quote-first routing on booking form (**Q13**) | Both after 14.2; parallelisable |
| **4 — Ops queue integration** | `ready_to_assign` filter chip, `/ops/fulfil?queue=paid` refactor (**Q18**) | **14.8** chip added to `/ops/bookings`; **14.9** refactor `/ops/fulfil?queue=paid` to shared predicate | 14.8 parallel after 14.1; 14.9 after 14.8 |
| **5 — PayFast wiring verification** | Walk-in golden path + failure modes | **14.10** end-to-end walk-in quote → pay → ready-to-assign test; webhook idempotency regression | After 14.6, 14.9 |
| **6 — Quality + docs** | E2E, smoke, doc updates | **14.11** E2E + smoke coverage; **14.12** docs update | Last; covers all above |

**Sizing estimate:** ~29 story points across 12 stories. Smaller than Epic 13 because most email infrastructure is reused; the bulk is public-facing routes + token logic. Single-developer throughput ≈ 2 sprints; 2-dev parallel ≈ 1.5 sprints.

## 4. Themes with user stories & acceptance criteria

### Theme A — Schema, trigger, ready_to_assign predicate

**US-A1 — As a maintainer**, I need **`ready_to_assign`** added to `bookings_status_check` and a **DB trigger** that sets `status='ready_to_assign'` when `payment_status` flips to `'paid'` AND `client_type='walk_in'`, so that **the transition is race-free and owned by one layer** — **Q19**.

- **AC:** Migration adds `ready_to_assign` to `bookings_status_check` values (preserves all existing values including transitional `pending`).
- **AC:** Trigger `bookings_walk_in_paid_to_ready_to_assign` fires on `UPDATE OF payment_status ON bookings`; if `NEW.payment_status='paid'` AND `OLD.payment_status <> 'paid'` AND `NEW.client_type='walk_in'`, sets `NEW.status='ready_to_assign'` inline (no follow-up UPDATE).
- **AC:** Trigger is a no-op for `account_client` rows — their path continues to use the `ready_to_invoice` flow from Epic 13.
- **AC:** Trigger is a no-op if `NEW.status` is already a terminal value (`cancelled`, `expired`, `completed`) — prevents a late webhook from resurrecting a cancelled booking.
- **AC:** `supabase/smoke_rls.sql` (or a new `smoke_triggers.sql`) asserts: walk-in `pending→paid` triggers → `status='ready_to_assign'`; account `pending→paid` triggers → `status` unchanged; walk-in already-cancelled `pending→paid` → `status` stays `cancelled`.

**US-A2 — As ops security**, I need **smoke RLS assertions** for the new status value, so that **no role accidentally writes `ready_to_assign` without authorization**.

- **AC:** Non-staff cannot UPDATE `bookings.status` to `ready_to_assign` directly (enforced by existing RLS; asserted here).
- **AC:** Staff can UPDATE to `ready_to_assign` (for manual ops corrections).
- **AC:** The trigger path is not subject to RLS (runs inside a `SECURITY DEFINER` function or is attached to the table — document the choice in the migration header).

### Theme B — HMAC tokens for public links

**US-B1 — As a customer**, I need a **stateless signed token** embedded in quote email links, so that **public accept / reject / pay routes don't require authentication** and **tokens expire automatically with the quote** — **Q16**.

- **AC:** New module `src/lib/quote-tokens.ts` exports `signQuoteToken(payload)` and `verifyQuoteToken(token)`; payload shape = `{quoteId, bookingId, purpose: 'accept' | 'reject' | 'pay', exp: number}`.
- **AC:** Signing uses HMAC-SHA256 with `QUOTE_LINK_SIGNING_KEY` from environment; key must be ≥ 32 bytes; missing/weak key **fails fast at server startup**, not at token sign time.
- **AC:** Verification returns `{valid: true, payload}` for signed-and-unexpired tokens, `{valid: false, reason: 'expired' | 'invalid_signature' | 'malformed'}` otherwise. Timing-safe compare for signature check.
- **AC:** Token payload's `exp` mirrors `booking_quotes.expires_at` rounded to the second; server enforces `exp > Date.now()` at verify time.
- **AC:** Unit tests cover: valid token round-trip, expired token, tampered payload, tampered signature, truncated token, empty token, wrong purpose.
- **AC:** `QUOTE_LINK_SIGNING_KEY` documented in `docs/environment-vars.md` with rotation guidance.

### Theme C — Public customer-facing routes

**US-C1 — As a customer who received a walk-in quote**, I need an **"Accept & pay"** landing page that verifies my token and redirects to PayFast, so that **I can commit to the quote without creating an account** — **Q14**.

- **AC:** Route `/q/[token]/accept` (or equivalent — final path decided at implementation): verifies token with `verifyQuoteToken`, checks `purpose='accept'`, loads `booking_quotes` row, checks `status='sent'` (reject if already accepted / rejected / superseded / expired).
- **AC:** On success: transitions quote `sent → accepted`, transitions booking `quote_sent → awaiting_payment`, invokes existing `processPayment` server action to produce a PayFast checkout URL, redirects (302) to that URL.
- **AC:** The existing PayFast `return_url` and `cancel_url` in `processPayment` are reused; customer lands back on the existing `/confirmation` and `/book/payment?error=cancelled` pages unchanged.
- **AC:** If token is invalid/expired: renders an error page with Q17's "Request a new quote" CTA.
- **AC:** If quote is already `accepted` or `paid`: renders a friendly "You've already accepted this quote — check your email for next steps" page (no double-charge risk).
- **AC:** Page has no customer-side JS beyond minimal analytics; server-rendered so it works with JS disabled.

**US-C2 — As a customer**, I need a **"This isn't right"** rejection page with an optional reason, so that **ops knows to send a corrected quote** — **Q15**.

- **AC:** Route `/q/[token]/reject`: verifies token with `purpose='reject'`, loads quote, checks `status='sent'`.
- **AC:** Renders a minimal form: "Why is this quote not right for you?" textarea (optional, max 2000 chars), "Submit" button, "Actually, I'll accept" secondary button that deep-links to the accept route with the same token.
- **AC:** On submit: transitions quote `sent → rejected`, sets `rejection_reason`, transitions booking `quote_sent → triaged` (NOT `cancelled` — per Q15).
- **AC:** After submit, renders a "Thanks, we'll be in touch" confirmation page.
- **AC:** `ops_audit_log` receives an entry `action='customer_rejected_quote'` with the rejection reason (null if none) in the payload.
- **AC:** The updated booking appears on `/ops/bookings` with a `rejected quote` visual indicator (small badge or a "last action" field), so ops sees it and can re-quote.

**US-C3 — As a customer**, I need a **direct "Pay now"** link that skips the accept screen, so that **trusted repeat customers can pay in one click** — **Q14**.

- **AC:** Route `/q/[token]/pay` with `purpose='pay'`: same verification and quote-state checks as accept; transitions quote `sent → accepted` and booking `quote_sent → awaiting_payment` identically; redirects to PayFast.
- **AC:** Audit log notes `client_type_source='direct_pay_skip'` on the booking (or a similar one-off marker on the quote) so ops can see the customer skipped the accept screen.
- **AC:** Functionally equivalent to accept — this is purely a UX shortcut; no separate state machine branch.

**US-C4 — As a customer with an expired link**, I need a **clear expired-quote page with a "Request a new quote" CTA**, so that **I can re-enter the booking funnel without frustration** — **Q17**.

- **AC:** When `verifyQuoteToken` returns `{valid: false, reason: 'expired'}`, the public route renders a dedicated expired page (not a generic 404 or 500).
- **AC:** Page shows: the original trip details (origin, destination, date — safe to show, no payment info), an explanation that prices move and quotes expire after 72h, a "Request a new quote" button linking to `/book?origin=X&destination=Y&date=Z&passengers=N` pre-filled from the expired booking.
- **AC:** Clicking the button creates a **new** booking row (new `VST-*` reference); the expired booking stays in its final state (`expired` on the status machine once the daily job has run; otherwise `quote_sent`).
- **AC:** No customer PII beyond the original trip inputs appears on the expired page.

### Theme D — Server actions + email template

**US-D1 — As ops staff**, I need a **"Send quote"** action on walk-in bookings that emails the customer with accept / reject / pay links, so that **the walk-in quote-first flow is actionable from the ops console** — **Q13**.

- **AC:** New server action `sendWalkInQuote(bookingId)`: validates booking is `client_type='walk_in'` and `status IN ('submitted','triaged','quote_sent')` (re-send allowed).
- **AC:** Creates a new `booking_quotes` row via the Epic 13 `createBookingQuote` action (versioned; prior version if any is superseded).
- **AC:** Renders the new `walk-in-quote` email template with `signQuoteToken`-generated links for accept / reject / pay.
- **AC:** Sends via Resend, captures `rendered_html`, marks quote `status='sent'`, updates `bookings.current_quote_id`, transitions booking to `quote_sent`.
- **AC:** Failure handling matches Epic 13 **Q9**: Resend failure does not roll back; retry queue from Epic 13 handles it (same panel, shared logic).
- **AC:** Ops UI surfaces the action as a button on the booking detail view for walk-ins only (hidden for `account_client`).

**US-D2 — As a customer**, I need the **walk-in quote email** to be clear, branded, and actionable, so that **I understand what I'm being offered and can commit in one click**.

- **AC:** New template `src/lib/email/templates/walk-in-quote.tsx` (or equivalent) renders: customer name, booking reference, pickup date/time, origin → destination, vehicle category suggested (if selected), passenger count, total amount, line items, expiry date in customer's friendly format ("This quote expires on Fri 22 April at 18:00 SAST"), "Accept & pay" CTA, "This isn't right for me" secondary link, company contact info.
- **AC:** CTAs use the three HMAC-signed URLs; no query-string PII beyond the opaque token.
- **AC:** Template renders correctly in Gmail, Outlook web, Apple Mail desktop, and iOS Mail (team checks 3 of these manually during Story 14.11 E2E).
- **AC:** Subject line format: `Your Vestroo quote — {booking_reference} — valid until {expires_at}`.

**US-D3 — As the booking form**, I need to route **non-trivial intents** to quote-first instead of directly to PayFast, so that **complex walk-in bookings get ops review before a customer pays for something that may not be feasible** — **Q13**.

- **AC:** `src/actions/createBooking.ts` (or the client-side form handler) branches on `booking_intent`:
  - `point_to_point` → existing flow preserved (direct to PayFast, no quote email).
  - `trip_request` | `hourly_hire` | `experience_package` → new flow: creates booking with `status='submitted'`, shows a customer-friendly "Thanks — we're preparing your quote and will email within 1 business hour" confirmation page; does NOT redirect to PayFast.
- **AC:** The simple-path behaviour for `point_to_point` is unchanged for existing customers (no regression risk on the highest-volume path).
- **AC:** A feature flag `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS` (env-var-driven) can force-disable the new branching if a rollback is needed mid-deploy; default is ON in all environments once Story 14.7 ships.

### Theme E — Ops queue integration

**US-E1 — As ops staff**, I need a **"Ready to assign"** filter chip on `/ops/bookings`, so that **paid walk-ins are one click away from dispatch** — **Q18**.

- **AC:** The Epic 12 chip set gains a new chip / preset view "Ready to assign" that applies `status='ready_to_assign'` (walk-in path) plus whatever `account_client` equivalent exists by Epic 14 ship (likely nothing — account bookings go directly from `triaged → assigned`).
- **AC:** Chip shows a live count next to the label (reusing the count pattern from Epic 12 **12.2**).
- **AC:** Clicking a row from this view deep-links to the Fulfil assign flow (same destination as the existing Fulfil "Assign" button).

**US-E2 — As a maintainer**, I need **`/ops/fulfil?queue=paid`** refactored to query the new predicate, so that **two surfaces stay in sync with one predicate** — **Q18**.

- **AC:** The `queue=paid` tab query changes from "bookings with `status='paid' AND payment_status='paid' AND booking_intent NOT IN (...)` without a linked trip" to "bookings with `status='ready_to_assign'`" — the trigger from Story 14.1 guarantees the same set of rows.
- **AC:** The tab's visible rows before and after the refactor are identical for the test data set; documented in the PR description.
- **AC:** `docs/fulfil-queue-buckets.md` is updated to reflect the new predicate.
- **AC:** URL stability: `/ops/fulfil?queue=paid` still resolves; only the underlying query changes.

### Theme F — Quality + docs

**US-F1 — As QA**, I need **end-to-end coverage of the walk-in quote-first golden path plus key failure modes**, so that **no regression ships**.

- **AC:** Playwright spec covers: submit non-trivial booking → row appears as `status='submitted'` on `/ops/bookings` → ops clicks "Send quote" → `booking_quotes` row created with `status='sent'` and correct `expires_at` → customer opens accept link → redirected to PayFast (mocked) → PayFast ITN webhook simulated → booking lands at `status='ready_to_assign'` → visible on "Ready to assign" chip → ops assigns → trip created.
- **AC:** Playwright spec covers reject path: customer opens reject link → submits reason → quote `rejected`, booking `triaged` → ops sees the `rejected quote` badge → ops sends a new quote (new version) → previous quote row marked `superseded`.
- **AC:** Playwright spec covers expired path: token with past `exp` → expired page renders → "Request a new quote" creates a new booking.
- **AC:** Playwright spec covers webhook idempotency: duplicate `COMPLETE` ITN for an already-paid booking does not re-trigger the `ready_to_assign` trigger or create a duplicate trip (rides on existing webhook idempotency in `src/app/api/payfast/webhook/route.ts`).
- **AC:** Token verification unit tests cover the 7 cases listed in US-B1.

**US-F2 — As a maintainer**, I need **documentation** updated so the new flow is discoverable.

- **AC:** `docs/integrations-and-payments.md` updated with a new section "Walk-in quote-first flow (Epic 14)" describing the state chain and the trigger.
- **AC:** `docs/environment-vars.md` documents `QUOTE_LINK_SIGNING_KEY` and `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS`.
- **AC:** `docs/ops-console.md` updated to mention the new "Ready to assign" chip and the "Send quote" action on walk-in bookings.
- **AC:** `docs/fulfil-queue-buckets.md` updated with the refactored predicate.
- **AC:** `docs/data-models.md` updated to reflect `ready_to_assign` status value and the trigger.

### Theme G — Story catalogue (reference for SM)

| ID | Title | Theme | Pts | Depends |
|----|-------|-------|-----|---------|
| **14.1** | Migration: `ready_to_assign` status + DB trigger on `payment_status` flip (**Q19**) | A | **3** | Epic 13 complete |
| **14.2** | HMAC token signing module + unit tests + env validation (**Q16**) | B | **3** | 14.1 |
| **14.3** | `/q/[token]/accept` public route + PayFast handoff (**Q14**) | C | **3** | 14.2 |
| **14.4** | `/q/[token]/reject` public route + ops audit log (**Q15**) | C | **2** | 14.2 |
| **14.5** | `/q/[token]/pay` public route + expired-token page (**Q17**) | C | **2** | 14.2 |
| **14.6** | `sendWalkInQuote` server action + `walk-in-quote` email template | D | **5** | 14.2, Epic 13 email module |
| **14.7** | Booking form intent-based routing to quote-first (**Q13**) + feature flag | D | **3** | 14.6 |
| **14.8** | "Ready to assign" filter chip on `/ops/bookings` with live count | E | **2** | 14.1 |
| **14.9** | Refactor `/ops/fulfil?queue=paid` to shared predicate (**Q18**) | E | **2** | 14.8 |
| **14.10** | Walk-in quote → pay → ready-to-assign golden path regression | F | **2** | 14.7, 14.9 |
| **14.11** | E2E + smoke extensions (all scenarios in US-F1) | F | **2** | 14.3–14.10 |
| **14.12** | Docs update across 5 files per US-F2 | F | **1** | 14.11 |

## 5. Cross-cutting dependencies matrix

| Item | Depends on | Blocks |
|------|------------|--------|
| **`ready_to_assign` status + trigger** | Epic **12** `bookings.status` CHECK; existing PayFast webhook | All Epic 14 ops-queue work |
| **HMAC token module** | New env var `QUOTE_LINK_SIGNING_KEY` | All public routes (14.3–14.5) |
| **`sendWalkInQuote` action** | Epic **13** email module (`src/lib/email/`), `createBookingQuote` | Walk-in quote-first customer flow |
| **Customer-facing email template** | Resend domain verification (already done for Epic 13); Epic 13 template base | Customer trust metrics |
| **Booking form intent-based routing** | Epic **12** unified `/ops/bookings` (so ops has a visible surface for the new `submitted` rows before they become `quote_sent`) | Revenue for non-trivial walk-in intents |
| **`/ops/fulfil?queue=paid` refactor** | Epic **12** shared predicate model; Epic **11 E3** fulfil semantics | SLA reporting in Epic **15** |
| **Expiry job** | Epic **13** daily cron — reused verbatim, no new job | Stale-quote customer experience |

**References:** **[`docs/epic-12.md`](epic-12.md)**, **[`docs/epic-13.md`](epic-13.md)**, **[`docs/epic-11.md`](epic-11.md)**, **[`docs/epic-10.md`](epic-10.md)** (funnel UX patterns), **[`docs/integrations-and-payments.md`](integrations-and-payments.md)**, **[`docs/fulfil-queue-buckets.md`](fulfil-queue-buckets.md)**.

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Trigger misfires and marks an account booking `ready_to_assign` | **High** | Trigger explicitly checks `client_type='walk_in'`; Story 14.1's smoke test asserts account `pending→paid` is a no-op. Trigger code is short and reviewable. |
| HMAC signing key leaked via logs or error messages | **High** | Key is loaded once at server start; never logged; never echoed in error messages. Key rotation guidance in `docs/environment-vars.md` mandates regeneration on any suspected leak. Unit tests assert `QUOTE_LINK_SIGNING_KEY` never appears in any error `.message` string. |
| Customer clicks accept on a superseded quote | **Medium** | `/q/[token]/accept` checks quote status is `sent` — superseded quotes have `status='superseded'` and are rejected. Error page directs customer to check their latest email. |
| Race between customer clicking "Accept" and ops clicking "Re-send quote" | **Medium** | Quote versions are append-only; both actions create a new version. The older token points to the superseded quote and fails status check. Customer sees the error page + "check your email" copy. |
| Webhook fires before trigger is deployed (staging/prod migration ordering) | **Medium** | Migration applies trigger **and** status CHECK in one transaction; no window where status CHECK allows `ready_to_assign` without the trigger being active. CI runs migration + smoke before any app deploy. |
| `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS` feature flag default ON regresses existing `trip_request` behaviour | **Medium** | Existing behaviour for `trip_request` is: booking created with `status='pending'`, lands on `/ops/fulfil?queue=trip_request`, manual ops follow-up. New behaviour: booking created with `status='submitted'`, lands on `/ops/bookings` default view, ops clicks "Send quote". This **is** a regression on the happy path but is the **intended** regression. Story 14.7 includes a migration note and ops training item. |
| Expired-quote page leaks customer data via query string in "Request a new quote" link | **Low** | Pre-fill uses only non-PII trip inputs (origin, destination, date, passengers); no name, email, or phone. Links are customer-visible anyway (they're in the email). |
| Customer receives quote email, accepts, PayFast succeeds, but webhook is delayed and customer refreshes `/ops/bookings` not seeing their booking | **Low** | This is an ops-visibility concern, not a customer concern (customer already sees confirmation page). Acceptable latency of ≤ 3 min for webhook processing; realtime subscription from Epic 12 **12.4** picks it up when it lands. |
| Resend outage during `sendWalkInQuote` leaves booking in `submitted` with no customer comms | **Medium** | Same retry pattern as Epic 13 **Q9** — email send failure does not roll back booking or quote; retry panel handles re-send. Customer has not been emailed, so no double-send risk on retry. |

## 7. Definition of Done for Epic 14

- **Golden path:** Quote → accept → pay → `ready_to_assign` → ops assigns → trip created, **E2E** tested with mocked PayFast and real Resend-test-mode.
- **Rejection path:** Customer reject → `status=triaged` with visible ops indicator; ops can send a new quote version that supersedes the rejected one.
- **Expiry path:** Expired tokens land on the dedicated expired page; daily job transitions `sent → expired` correctly; customer can request a new quote pre-filled with original trip inputs.
- **No orphan bookings:** Paid walk-ins **discoverable** on both `/ops/bookings` (chip) and `/ops/fulfil?queue=paid` (refactored predicate) without requiring a `trips` row prematurely.
- **Trigger correctness:** Smoke tests prove the trigger fires only for walk-ins on a true `pending→paid` transition, and is a no-op for account bookings, cancelled bookings, and duplicate webhook deliveries.
- **Token security:** HMAC signing key required at server startup; unit tests cover 7 verification cases; key documented with rotation guidance.
- **Product locks:** **Q13–Q19** reflected in ACs or explicit story notes; **point-to-point** flow preserved unchanged (no regression risk on the highest-volume walk-in intent).
- **Docs:** Predicate definitions updated for **`/ops/fulfil`** vs **`/ops/bookings`** per Story 14.12; environment vars documented; ops console doc updated.
- **Quality:** All Playwright specs in US-F1 running green in CI; webhook idempotency regression test passing.

## 8. References to likely code areas (paths only)

- **Public customer routes:** `src/app/(public-ops)/` (likely location — or a new `src/app/(quote)/` route group), new files `/q/[token]/accept/page.tsx`, `/q/[token]/reject/page.tsx`, `/q/[token]/pay/page.tsx`, `/q/expired/page.tsx`
- **Token module:** `src/lib/quote-tokens.ts` (new) + `src/lib/__tests__/quote-tokens.test.ts`
- **Server actions:** `src/actions/sendWalkInQuote.ts` (new); updates to `src/actions/createBooking.ts` for intent-based routing
- **Email template:** `src/lib/email/templates/walk-in-quote.tsx` (new, extends Epic 13 template infrastructure)
- **PayFast integration:** `src/actions/processPayment.ts`, `src/lib/payfast.ts`, `src/app/api/payfast/webhook/route.ts` — **no changes expected** (existing idempotency + signature behaviour is sufficient); any touch here requires explicit review per `docs/integrations-and-payments.md`
- **Ops UI:** `src/app/(ops)/ops/fulfil/page.tsx` (refactor predicate), `src/app/(ops)/ops/bookings/` (new chip), `src/features/ops/components/` (new "rejected quote" badge, updated filter chip config)
- **Migrations:** `supabase/migrations/` — Epic 14 migration adds `ready_to_assign` to `bookings_status_check` and creates the trigger
- **Tests:** `tests/` — Playwright specs for all Theme A–E paths; unit tests for token module
- **Environment:** `.env.example` updated with `QUOTE_LINK_SIGNING_KEY` and `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS`

## Relationship to other epics

- **[`docs/epic-12.md`](epic-12.md):** Epic 14 extends the `/ops/bookings` queue model with a new chip/predicate and adds the `ready_to_assign` status value to the Epic 12 state machine. Every schema primitive used by Epic 14 was shipped in Epic 12.
- **[`docs/epic-13.md`](epic-13.md):** Epic 14 **reuses** the email module (`src/lib/email/`), the `createBookingQuote` / `sendBookingQuote` pattern, the daily expiry job, and the retry queue. Walk-in email is a new **template** in the existing registry — not a new infrastructure.
- **[`docs/epic-11.md`](epic-11.md):** E1 RLS and E2 ops error patterns apply unchanged; no new RLS recursion risks introduced.
- **[`docs/epic-15.md`](epic-15.md):** Customer portal will let authenticated customers see their quote history (same `booking_quotes` rows Epic 14 creates). Portal will also eventually surface "self-service re-request a new quote" as a replacement for the public expired-quote page — Epic 15 builds on, doesn't replace, Epic 14's public surfaces.
