# Epic 15 — Industry benchmark enhancements (portal, rider share tracking, comms matrix, optional dispatch intelligence)

## Description

This epic captures **larger, competitive** capabilities that **depend on** **[`docs/epic-12.md`](epic-12.md)** through **[`docs/epic-14.md`](epic-14.md)** infrastructure: a **customer account portal**, **rider / passenger share tracking** (live location or milestone-based, per product choice), a **communications matrix** (who gets SMS/email/push and when), and **optional dispatch intelligence** (suggestions, load balancing — **non-blocking** assist, not autonomous dispatch).

The epic is **intentionally broad**; stories **will be split into sub-epics** (**15A Portal**, **15B Rider Tracking**, **15C Comms Matrix**, **15D Dispatch Intelligence**) and each sub-epic is shippable **independently** once Epics 12–14 land. This is the **competitive moat** slice — research against Zaui, Moovs, Busify, and Zeelo showed the highest-retention shuttle/tour platforms let **account clients self-serve** and **riders self-track**, which reduces ops load by 40–60% per their public marketing claims. Epics 12–14 close the functional gap; Epic 15 closes the **experience** gap.

It depends on **[`docs/epic-11.md`](epic-11.md)** (**E1** stable RLS, **E2** ops runtime patterns), **[`docs/epic-12.md`](epic-12.md)** (VST-14 account model + unified bookings queue), **[`docs/epic-13.md`](epic-13.md)** (email module + `booking_quotes` lifecycle + retry queue), and **[`docs/epic-14.md`](epic-14.md)** (HMAC token pattern + public-facing routes). It does **not** replace any infrastructure shipped in 12–14; it extends and consumes it.

## 1. Epic summary & goals

### Root cause summary (product + experience gap)

- **Account clients have no self-serve surface.** After Epics 12 and 13, an account admin must email or phone ops to: see their booking history, see outstanding balances, invite a new member, update credit card / billing contact, download a past invoice, or start a new booking with one click. Every one of these creates avoidable ops load and signals a non-modern product to enterprise buyers.
- **Riders have no trip visibility.** Today the customer who booked receives a confirmation email; the **rider** (the employee / guest actually being transported) receives nothing unless the booker forwards it. Industry leaders (Moovs, Zeelo, Transfervista) ship tokenised rider-facing tracking links as a default — table stakes for corporate shuttle.
- **Operational comms are ad-hoc.** Epic 13 wires Resend for the account trip confirmation; Epic 14 wires it for the walk-in quote email. Neither codifies the full matrix of *who* gets *what* on *which* state transition. When finance asks "why didn't my client get a reminder 3 days before the trip?" the answer today is "we don't send one." A comms-matrix approach lets ops change who-gets-what without a deploy.
- **Dispatchers are flying blind on fleet utilisation.** The current Fulfil panel lists bookings and vehicles side-by-side but makes no suggestions about which vehicle fits best for the trip window, cost profile, or chauffeur availability. Every benchmark competitor ships at least read-only suggestions; the more sophisticated ones (Moovs) do auto-assign with ops confirmation. Epic 15 ships **suggestions only** — no autonomous dispatch.
- **Quote history is invisible to clients.** Epic 13 stores versioned quotes immutably; a customer disputing a price has to ask ops for a PDF of what they received. The portal surfaces this natively.

### Business goals

- **Self-service:** Account clients **manage bookings**, **users**, and **documents** within policy.
- **Transparency:** End customers and bookers **see trip progress** commensurate with privacy and safety constraints.
- **Reliability of communications:** No duplicate or missing **critical** messages; **auditable** template set; changes to the matrix are possible without a code deploy.
- **Dispatch efficiency:** Suggestions reduce time-to-assign and error rate without removing human judgement — benchmark research showed this as the highest-leverage dispatch improvement short of full automation.

### Technical goals

- **Portal:** Authenticated area at `/account/*` with RLS aligned to **`customer_account_members`**. Reuses Next.js app router groups; customer auth shares the existing Supabase auth layer.
- **Rider share tracking:** Tokenised per-trip URLs (HMAC pattern reused from Epic **14** **Q16**) rendering a map view with driver location (from `vehicle_trackings`) or milestone progress (`assigned → en_route → arrived → completed`) depending on what data is live at rendering time.
- **Comms matrix:** Data-driven `comms_templates` table + `comms_dispatch_rules` table (event_key → channels + recipients); feature flags for rollout; ops UI for ops leads to edit recipient lists without a deploy (template body changes still PR-reviewed for legal).
- **Dispatch intelligence:** Read-only suggestions first; human confirmation required. Algorithm is deterministic and explainable (scored by capacity fit, last-used gap, chauffeur familiarity with run) — **no ML model** in this epic.

### Product decisions locked (inherits Epic 12 Q1–Q7, Epic 13 Q8–Q12, Epic 14 Q13–Q19; epic-15-specific below)

| Id | Decision |
|----|----------|
| **Q20** | **Portal scope is account clients only.** Walk-in customers do **not** get a portal login in Epic 15. Their existing HMAC-signed quote links (Epic 14) remain the only surface. Rationale: walk-ins are transactional — a portal for a one-off customer creates friction without value. Revisit only if a walk-in conversion funnel analysis shows a portal would lift repeat rate. |
| **Q21** | **Rider share tracking is tokenised, not authenticated.** The rider receives a link; no signup required. Token expires **2 hours after trip `completed`** per benchmark norms. Anonymous view; no rider-side actions (no tipping, no rating — Epic 15 ships display-only; actions are a future epic). |
| **Q22** | **Rider tracking mode:** **Milestone-first, live-location opt-in.** Default view is "Your driver is assigned / en route / arrived / completed" timeline. A live map with GPS-level location is **ENV-flag-gated** (`RIDER_LIVE_LOCATION_ENABLED`) and **per-account-opt-in** (`customer_accounts.live_rider_tracking=true`). Rationale: live-location has real privacy implications for chauffeurs and customers; default-off is the responsible choice. |
| **Q23** | **Comms matrix governance:** Two-axis permission model. **Template body** changes require a PR (legal / brand review); **recipient rules** (who gets what, on which event, via which channel) are editable by ops leads through the `/ops/comms` UI. Rationale: wording is a legal surface; delivery rules are an operational surface. |
| **Q24** | **Unsubscribe / preference centre:** One preference centre per account member (not per account, not per booking). Choices: transactional (cannot unsubscribe from; required for operational reasons), informational (can unsubscribe), marketing (can unsubscribe). Unsubscribe links in every non-transactional email per CAN-SPAM / POPIA best practice. |
| **Q25** | **Dispatch suggestions are advisory and dismissable.** The Fulfil panel shows up to 3 vehicle suggestions per booking with a score and a one-line rationale. Dispatcher can dismiss or accept; every accepted suggestion is logged to `ops_audit_log` with the score for later algorithm calibration. **No auto-assign** in Epic 15. |
| **Q26** | **Algorithm transparency:** Suggestion score is a weighted sum of 4 deterministic signals: capacity fit (40%), schedule gap since last use (20%), chauffeur familiarity with the run (20%), cost tier alignment (20%). Weights live in a config file, not a DB table — changing them is a code review concern, not a runtime setting. Rationale: prevents ops from silently biasing the algorithm; keeps calibration auditable. |
| **Q27** | **Sub-epic independence:** Each sub-epic (15A, 15B, 15C, 15D) ships independently behind its own feature flag and has its own DoD. PO may prioritise any ordering. The recommended order is 15A → 15C → 15B → 15D based on customer-facing impact and technical dependency. |

## 2. Non-goals / out of scope (unless pulled into a sub-epic explicitly)

- **Autonomous dispatch** without human acceptance.
- **Replacing** core booking schema beyond extensions agreed in **12–14**.
- **Walk-in customer portal / login** — Q20. Authenticated customer area is account-members only.
- **Rider-side actions** (tipping, rating, rebooking from tracking page) — Q21. Display-only in Epic 15.
- **Live driver ETA / route polyline** rendering on the rider tracking map when live-location is disabled — Q22. Milestone timeline only.
- **Mobile apps (native iOS/Android)** for rider, driver, or account admin — Epic 15 is web-responsive only.
- **ML / predictive models** for dispatch — Q26. Deterministic scoring only.
- **Comms matrix body editing in the ops UI** — Q23. Bodies stay in source control.
- **Accounting integrations** (Xero, Sage, QuickBooks) for the portal's invoice view — portal surfaces Epic 13's invoice records read-only; accounting sync is a separate future epic.
- **Multi-tenancy / white-label** for partner operators — single-tenant (Vestroo) only.
- **Push notifications** via mobile web or service worker — email and SMS only in the comms matrix; push is a future channel.

## 3. Phased delivery plan (sub-epics)

**Ordering principle:** Ship **15A (Portal)** first — it unblocks enterprise deals and has the highest customer-facing ROI per story point. **15C (Comms Matrix)** next because it reduces ops load immediately and is low-risk infrastructure work. **15B (Rider Tracking)** third — higher UX complexity, privacy-sensitive, best shipped after comms matrix exists to notify riders of their tracking link. **15D (Dispatch Intelligence)** last — has the least customer-visible impact and depends on having enough booking data to tune the algorithm against.

| Sub-epic | Focus | Depends on | Sizing | Recommended sequence |
|----------|--------|-----------|--------|----------------------|
| **15A — Account portal** | Self-service lists, quote view, invoice records if applicable, member management | Epic **12** accounts; Epic **13** quotes / invoicing data | ~30 pts / 10 stories | **1st** — highest business ROI |
| **15C — Comms matrix** | Template registry, dispatch rules, recipient editing UI, unsubscribe / preference centre | Epic **11 E2**, Epic **13** email module, Resend + SMS infra | ~25 pts / 8 stories | **2nd** — reduces ops load; enables 15B |
| **15B — Rider share tracking** | Tokenised rider URLs, milestone timeline, optional live map | Epic **14** HMAC token pattern; fleet/driver data from `vehicle_trackings`; Epic **15C** to dispatch the link | ~22 pts / 8 stories | **3rd** — UX polish, privacy-sensitive |
| **15D — Dispatch intelligence** | Vehicle suggestions + score + audit logging, no auto-assign | Epic **12** unified queue, Epic **13** dispatch reasons, booking history for calibration | ~18 pts / 6 stories | **4th** — lowest visible impact |

**Sizing totals:** ~95 story points / 32 stories across all four sub-epics. At team velocity 15 pts/sprint (single-dev) ≈ 6–7 sprints; 2-dev parallel ≈ 3.5 sprints if sub-epics run concurrently after 15A. **Recommended PO stance:** ship 15A end-to-end, validate with 1–2 pilot accounts, then parallelise 15B and 15C.

## 4. Themes with user stories & acceptance criteria

### Theme A — 15A Account portal

**US-A1 — As an account user**, I need a **portal at `/account`**, so that **I can see bookings and statuses without calling ops**.

- **AC:** New Next.js route group `src/app/(account)/account/` with its own layout; gated by Supabase auth where user's `auth.users.id` matches a `customer_account_members.profile_id` row with `role IN ('admin','booker','rider')`.
- **AC:** Home page shows: account name, user's role badge, quick-link cards for Bookings, Members (admin-only), Invoices (admin + booker), New Booking.
- **AC:** RLS matches membership; no cross-org leakage — a member of Account A never sees Account B data. Verified by smoke RLS assertions with two seeded accounts.
- **AC:** If a user has memberships in multiple accounts, an account-switcher in the top nav lets them pick; all pages scope to the active account.

**US-A2 — As an account user**, I need a **bookings list** showing past, current, and upcoming bookings, so that **I have one place to see what's scheduled and what's historic**.

- **AC:** `/account/bookings` paginates the bookings for the active account, sortable by pickup date.
- **AC:** Row fields: booking reference, pickup datetime, route (origin → destination), vehicle category, status badge, total amount, payment status.
- **AC:** Filter chips: status (multi-select), intent, time window (next 7d / next 30d / past 90d / all).
- **AC:** Clicking a row opens `/account/bookings/[id]` with full detail, including the current quote's line items and any downloadable artefacts.
- **AC:** "New booking" button prefills the public booking form with the account's default PO (if `default_po_required`) and the member's email.

**US-A3 — As an account admin**, I need to **manage members** of my account, so that **I can invite colleagues to book and remove departing staff**.

- **AC:** `/account/members` (admin-only) lists current members with role, email, invite/accept status.
- **AC:** "Invite member" creates a `customer_account_members` row with `accepted_at IS NULL` and emails the invitee a signup link (new email template in Epic 13's registry).
- **AC:** Admin can change a member's role (admin ↔ booker ↔ rider) or remove them. Removal is soft (member row deleted); any bookings they created remain intact under the account.
- **AC:** Admin cannot remove themselves if they are the only admin on the account (UI blocks; server double-checks).
- **AC:** `ops_audit_log` records every member change with `actor_id` (the admin making the change).

**US-A4 — As an account admin**, I need a **quote and invoice archive**, so that **I can resolve billing disputes without contacting ops**.

- **AC:** `/account/invoices` lists all `booking_quotes` rows for the account's bookings where `status IN ('sent','accepted','superseded','expired','rejected')`, plus the Epic 13 invoice-queue rows where `bookings.status IN ('ready_to_invoice','invoiced','paid_invoice')`.
- **AC:** Each row displays: booking reference, quote version, total, status, sent/accepted/invoiced/paid dates as applicable, "View" link to the rendered HTML snapshot.
- **AC:** "View" opens the immutable `rendered_html` in a read-only page — exactly what the customer received on the day.
- **AC:** Admin-only for Epic 15 scope; a future refinement may extend read access to `booker` role for their own bookings.

**US-A5 — As an account booker**, I need to **start a new booking from a past trip**, so that **recurring corporate travel is one click**.

- **AC:** Booking detail page has a "Book this again" button that prefills the public booking form with the same origin, destination, vehicle category, and passenger count; the date is left empty.
- **AC:** Prefilled booking reuses the account context automatically; member's email is prefilled; PO is prefilled from account default if applicable.

### Theme B — 15C Comms matrix

**US-B1 — As ops**, I need a **comms matrix** registry and dispatch-rules table, so that **we can change who is notified without a code deploy** (Q23).

- **AC:** Two new tables: `comms_templates` (event_key, channel, subject, body_html, body_text, sms_body, version, active) and `comms_dispatch_rules` (event_key, channel, recipient_role, recipient_filter jsonb, active).
- **AC:** Existing triggers (Epic 13 trip confirmation, Epic 14 walk-in quote, existing booking-created stubs) are refactored to query `comms_dispatch_rules` for `(event_key, channel)` pairs and send according to the active rules.
- **AC:** The event keys are enumerated in a shared type (`CommsEventKey`) so invalid strings are a compile error: `booking_submitted`, `quote_sent_account`, `quote_sent_walk_in`, `quote_accepted`, `quote_rejected`, `payment_received`, `trip_assigned`, `trip_en_route`, `trip_completed`, `trip_cancelled`, `invoice_due_reminder`, `member_invited`, etc.
- **AC:** If no active rule exists for `(event_key, channel)`, send is a no-op (logged as `comms_no_rule_matched` in `ops_audit_log` at debug level).

**US-B2 — As an ops lead**, I need an ops UI at `/ops/comms` to **edit recipient rules and toggle templates on/off**, so that **I can respond to a policy change without a deploy** (Q23).

- **AC:** `/ops/comms` is admin-only. Lists all `comms_templates` and `comms_dispatch_rules`.
- **AC:** For each rule, ops lead can: toggle active / inactive, change recipient role (customer, booker, rider, ops, admin), edit the filter jsonb (visual editor preferred; raw JSON acceptable as fallback).
- **AC:** For each template, ops lead can: preview rendered HTML / text / SMS with seeded variables, toggle active / inactive. Body edits are **disabled** in this UI — clicking edit links to a GitHub PR template.
- **AC:** Every rule or template change writes `ops_audit_log` with the prior and new value.

**US-B3 — As an account member**, I need a **preference centre** to manage my email preferences (Q24).

- **AC:** `/account/preferences` lets the member toggle informational and marketing emails on/off. Transactional emails cannot be disabled.
- **AC:** Unsubscribe links in every non-transactional email open the preference centre with the relevant category pre-highlighted.
- **AC:** Unsubscribe writes immediately; the next scheduled send respects the setting.
- **AC:** `ops_audit_log` records every preference change.
- **AC:** A `customer_account_members.comms_preferences` jsonb column stores the settings; defaults = all categories opted-in except marketing (opt-in required per POPIA).

**US-B4 — As the system**, I need **critical reminders** (e.g. invoice due in 3 days for account clients) to be triggered by a scheduled job, so that **operational comms don't depend on human timing**.

- **AC:** Daily cron job (extends Epic 13's expiry cron, not a new scheduler) queries: bookings in `ready_to_invoice` or `invoiced` where `due_date - now()` is within configurable windows (default: 3 days before due, 1 day overdue).
- **AC:** For each match, dispatches the `invoice_due_reminder` event via the comms matrix (ignored if rules disable it).
- **AC:** Idempotent: a reminder sent yesterday is not re-sent today even if the window still matches (dedupe via `ops_audit_log` history).

### Theme C — 15B Rider share tracking

**US-C1 — As a rider**, I need a **tokenised tracking URL** in my trip confirmation SMS/email, so that **I can see my driver's status without creating an account** (Q21).

- **AC:** Every trip confirmation (account + walk-in) that includes a rider contact (new optional fields on bookings: `rider_name`, `rider_phone`, `rider_email`) also emits a per-trip tracking token using the HMAC module from Epic 14.
- **AC:** Token payload = `{trip_id, purpose: 'rider_track', exp}` with `exp = trip.time_end_estimate + 2 hours` (Q21).
- **AC:** The URL `/track/[token]` is public, renders without auth, and expires 2h after trip completion.
- **AC:** If `rider_email` is not set, the URL is still included in the booker's confirmation so they can forward it; if `rider_phone` is set, an SMS with a short link (via SMS provider if live; stubbed if not) goes to the rider when the trip transitions to `en_route`.

**US-C2 — As a rider on the tracking page**, I need a **milestone timeline** showing where my driver is in the flow (Q22).

- **AC:** Milestone view shows: Booking confirmed, Driver assigned, Driver en route, Driver arrived, Trip completed. Current milestone is visually emphasised; prior ones are ticked; future ones are dimmed.
- **AC:** Each milestone shows a timestamp when reached; "driver en route" additionally shows estimated pickup time based on `time_start_estimate`.
- **AC:** Page also shows: driver's first name, vehicle make/model/colour, vehicle plate (masked: first 2 chars + ***), driver's photo if on file, a "call driver" action if the ops config permits it.
- **AC:** The page polls for updates every 30 seconds; switches to realtime Supabase subscription if available.
- **AC:** Expired tokens render a polite "This tracking link has expired" page with a contact ops CTA — no personal data displayed.

**US-C3 — As an account admin (of an account with `live_rider_tracking=true`)**, I want the rider map to show **live driver location on a map** (Q22).

- **AC:** Gated by **both** `RIDER_LIVE_LOCATION_ENABLED=true` env flag **and** `customer_accounts.live_rider_tracking=true` (double opt-in for safety).
- **AC:** When enabled, the tracking page embeds a Google Maps view with the driver's latest position from `vehicle_trackings` (read-only; no route polyline in this sub-epic).
- **AC:** Position updates every 30 seconds; staleness > 90 seconds shows a "last updated X ago" note.
- **AC:** Position is only visible during `en_route` status — once `completed`, the map is hidden immediately (not at token expiry) and the milestone view reverts to static.

**US-C4 — As a chauffeur**, I need to **see when my location is being tracked live by riders**, so that **I'm aware of the privacy boundary**.

- **AC:** Field-side chauffeur UI (`/field/*` routes) surfaces a small "Live tracking: ON" indicator when the active trip has `live_rider_tracking=true`.
- **AC:** Chauffeur cannot disable tracking per-trip (that's a per-account setting); the indicator is informational only. If a chauffeur objects globally, that's a config conversation with ops, not a runtime toggle.

### Theme D — 15D Dispatch intelligence (advisory)

**US-D1 — As a dispatcher**, I need **vehicle suggestions** when assigning a booking to a service run, so that **I can choose faster with a defensible rationale** (Q25).

- **AC:** The Fulfil assign panel gains a "Suggested vehicles" section showing up to 3 vehicles sorted by score descending.
- **AC:** Each suggestion row shows: vehicle name, score (0–100), one-line rationale (e.g. *"Capacity 8 matches 6 passengers; last used 3 days ago; chauffeur has run this route 12 times"*).
- **AC:** Dispatcher clicks a suggestion → populates the existing vehicle picker → dispatcher still clicks Assign. No auto-assign.
- **AC:** Dismissing all suggestions is always possible; falls through to the current free-pick UI.

**US-D2 — As the system**, I need the **scoring algorithm** implemented as a deterministic, unit-testable module (Q26).

- **AC:** New module `src/lib/dispatch-suggestions.ts` exports `suggestVehiclesForBooking(bookingId) : Suggestion[]`.
- **AC:** Score = `0.4 * capacityFit + 0.2 * scheduleGap + 0.2 * chauffeurFamiliarity + 0.2 * costTierAlignment`. Each sub-score normalised 0–100.
- **AC:** Weights live in `src/lib/dispatch-suggestions-config.ts` as exported constants, not a DB table — changes are code-reviewed (Q26).
- **AC:** Unit tests cover: obvious best-fit returned first, overlapping availability excluded, fully-booked vehicles excluded, at least 2 suggestions when data is thin (relax filters rather than returning empty).

**US-D3 — As an algorithm owner**, I need **every accepted suggestion logged** for later calibration (Q25).

- **AC:** When a dispatcher accepts a suggestion (clicks it in the panel), `assignBookingToRun` receives an optional `fromSuggestion: {vehicleId, score}` param.
- **AC:** On successful assign, `ops_audit_log` records `action='assignment_from_suggestion'` with the score, rank (was it #1, #2, #3?), and the vehicle ID in payload.
- **AC:** A separate, unlogged free-pick assignment writes `action='assignment_free_pick'` so comparison reports can be generated.
- **AC:** A simple report query (SQL or admin-only page) can answer "what % of assignments over the last 30 days came from suggestions, and what was the average rank?" — enables calibration conversations with the team.

### Theme E — Sub-epic story catalogue

| ID | Title | Sub-epic | Pts | Depends |
|----|-------|----------|-----|---------|
| **15A.1** | `/account` route group + auth gating + account switcher | 15A | **3** | Epic 12 complete |
| **15A.2** | Account home dashboard with quick-links | 15A | **2** | 15A.1 |
| **15A.3** | `/account/bookings` list with filters and pagination | 15A | **3** | 15A.1 |
| **15A.4** | `/account/bookings/[id]` detail with current-quote view | 15A | **3** | 15A.3 |
| **15A.5** | `/account/members` list + invite + remove flows | 15A | **5** | 15A.1 |
| **15A.6** | Invite email template + signup landing page | 15A | **3** | 15A.5, Epic 13 email module |
| **15A.7** | `/account/invoices` archive with immutable HTML viewer | 15A | **3** | 15A.1, Epic 13 invoicing |
| **15A.8** | "Book this again" prefill from past booking | 15A | **2** | 15A.4 |
| **15A.9** | Smoke RLS coverage for portal (two-account isolation) | 15A | **3** | 15A.5 |
| **15A.10** | E2E for portal golden paths + accessibility audit | 15A | **3** | 15A.2–15A.8 |
| **15B.1** | Add `rider_name`, `rider_phone`, `rider_email` to bookings; form updates | 15B | **2** | Epic 12 complete |
| **15B.2** | Rider tracking token mint in trip-assigned email | 15B | **2** | 15B.1, Epic 14 HMAC module |
| **15B.3** | `/track/[token]` public page with milestone timeline | 15B | **3** | 15B.2 |
| **15B.4** | SMS provider integration (live — replaces `sms-stub`) | 15B | **5** | — |
| **15B.5** | Live-location map gated by double opt-in (Q22) | 15B | **5** | 15B.3, 15B.4 |
| **15B.6** | Chauffeur-side "live tracking: on" indicator | 15B | **2** | 15B.5 |
| **15B.7** | Expired token page + "contact ops" CTA | 15B | **1** | 15B.3 |
| **15B.8** | E2E + privacy-scenario tests | 15B | **2** | 15B.5–15B.7 |
| **15C.1** | `comms_templates` and `comms_dispatch_rules` tables + RLS | 15C | **3** | Epic 13 email module |
| **15C.2** | Refactor Epic 13/14 triggers to consume the matrix | 15C | **3** | 15C.1 |
| **15C.3** | `/ops/comms` admin UI for rule toggles | 15C | **5** | 15C.1 |
| **15C.4** | Template preview with seeded variables | 15C | **2** | 15C.3 |
| **15C.5** | `/account/preferences` member preference centre | 15C | **3** | 15A.1 |
| **15C.6** | Unsubscribe links + POPIA-compliant footer | 15C | **2** | 15C.5 |
| **15C.7** | Scheduled invoice-due reminder job | 15C | **3** | 15C.2, Epic 13 cron |
| **15C.8** | E2E + compliance review checklist | 15C | **2** | 15C.1–15C.7 |
| **15D.1** | `dispatch-suggestions.ts` module + unit tests | 15D | **5** | Epic 12 complete |
| **15D.2** | Suggestions panel in Fulfil assign flow | 15D | **3** | 15D.1 |
| **15D.3** | Audit logging `assignment_from_suggestion` vs `assignment_free_pick` | 15D | **2** | 15D.2 |
| **15D.4** | Admin calibration query / report view | 15D | **3** | 15D.3 |
| **15D.5** | E2E + edge cases (sparse data, all vehicles busy) | 15D | **3** | 15D.4 |
| **15D.6** | Documentation of algorithm weights and tuning process | 15D | **2** | 15D.1 |

## 5. Cross-cutting dependencies matrix

| Item | Depends on | Notes |
|------|------------|--------|
| **15A Portal** | Epic **12** accounts + members model; Epic **13** quotes / invoicing; shared auth | May reuse **`account_snapshot`** for historic invoice rendering |
| **15B Rider tracking** | Epic **14** HMAC token pattern; fleet/driver data (`vehicle_trackings`); SMS provider (first live integration in 15B.4) | Privacy review mandatory; chauffeur awareness indicator required |
| **15C Comms matrix** | Epic **13** email module; Resend + SMS providers; POPIA unsubscribe compliance | Template governance split (body = PR; rules = UI) |
| **15D Dispatch intelligence** | Epic **12** unified queue; Epic **13** reason codes; sufficient historic booking data for calibration | Optional flag per install; no auto-assign |
| **SMS provider first-time integration** | 15B.4 ships a real SMS integration (replacing `src/services/sms-stub.ts`); provider choice documented at that time | Enables both 15B (rider SMS) and 15C (SMS channel in matrix) |

**References:** **[`docs/epic-12.md`](epic-12.md)**, **[`docs/epic-13.md`](epic-13.md)**, **[`docs/epic-14.md`](epic-14.md)**, **[`docs/epic-11.md`](epic-11.md)**, **[`docs/epic-10.md`](epic-10.md)**, **[`docs/realtime-and-notifications.md`](realtime-and-notifications.md)**, **[`docs/integrations-and-payments.md`](integrations-and-payments.md)** (INT.8.2 SMS policy inventory).

## 6. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Portal RLS gap leaks cross-account booking data | **High** | Every portal route gated by `customer_account_members` JOIN in RLS; smoke tests seed two accounts and assert zero bleed; pilot with 1–2 accounts before public rollout. |
| Live rider tracking privacy complaint (chauffeur or customer) | **High** | Double opt-in (Q22) — env flag + per-account setting. Chauffeur indicator (US-C4) ensures awareness. Default-off globally. Token expires 2h post-trip. No historic location archive visible to riders. |
| SMS provider outage breaks trip-assigned rider notifications | **Medium** | First-time integration (15B.4) includes a retry queue pattern similar to Epic 13's email retry. SMS failure does not roll back the trip assignment. |
| Comms matrix rule misconfigured → customer receives no comms on a critical event | **Medium** | `/ops/comms` UI shows a "rule coverage" panel listing every event key and whether at least one active rule exists for each; visible warning if an event has zero active rules. Story 15C.3 AC. |
| Unsubscribe respected for transactional emails by accident | **High** | Transactional emails bypass the preference centre check — enforced in `comms_dispatch_rules` schema (a `never_unsubscribable` flag on transactional event keys). Unit-tested. |
| Dispatch suggestions bias ops away from strategically-important choices (e.g. using a specific vehicle for a VIP client) | **Medium** | Suggestions are advisory (Q25); free-pick is always one click away. Audit log distinguishes `assignment_from_suggestion` vs `assignment_free_pick` so patterns can be reviewed. |
| Algorithm weights tuned by someone with incomplete context | **Low** | Weights in source control (Q26); PR review required. Documentation story (15D.6) captures the calibration process and data sources. |
| Portal "Book this again" prefills stale pricing expectations | **Low** | Prefill includes origin/destination/vehicle only — NOT the price. The new booking flows through the normal pricing engine; customer sees current price. |
| Invite email flood from a new account onboarding 100 members | **Low** | Invite throttling at the server action level (max 10 invites per hour per admin). UI shows a "sending..." state and batches if the admin bulk-imports. |
| SMS costs spiral in a high-volume month | **Medium** | SMS provider chosen at 15B.4 time with cost-per-message and monthly caps documented. Comms matrix allows disabling SMS channel globally if costs exceed budget — a single config change. |
| Comms template rendering breaks with an unset variable (`{{ customer_name }}` literal) | **Medium** | Template preview (15C.4) shows rendered output with seeded vars before a template is marked active. Playwright E2E asserts no `{{` strings in rendered HTML across all 10+ templates. |

## 7. Definition of Done for Epic 15 (per shipped sub-epic)

- **Security:** RLS and tokenised links **pen-tested** or **checklisted** per org norms; double-opt-in gates verified (Q22); transactional-email unsubscribe bypass asserted.
- **UX:** Coherent with ops console patterns (**E2**); accessibility audit (WCAG AA minimum) on every customer-facing page.
- **Observability:** Comms and tracking events **logged** with correlation ids; calibration report available for dispatch intelligence.
- **Docs:** Sub-epic **README** or epic addendum lists **flags** and **rollback**; POPIA / CAN-SPAM checklist complete for comms matrix; chauffeur privacy note for rider tracking.
- **Product locks:** **Q20–Q27** reflected in ACs or explicit story notes; no auto-assign; body changes remain PR-reviewed.
- **Pilot:** Each sub-epic validated with at least 1–2 pilot accounts or trips before general availability. Pilot feedback captured in a short retro doc.
- **Feature flags:** Every sub-epic behind its own feature flag; rollback is a config change, not a code revert.
- **Quality:** Sub-epic-specific E2E specs green in CI; smoke RLS extensions green; no new sev-1 or sev-2 issues open at ship time.

## 8. References to likely code areas (paths only)

### 15A Portal
- **Routes:** `src/app/(account)/account/` — new route group with `layout.tsx`, `page.tsx`, `bookings/`, `members/`, `invoices/`, `preferences/`, `settings/`
- **Components:** `src/features/account/components/` — new `AccountSwitcher`, `BookingsTable`, `MembersTable`, `InvoicesArchive`, `QuoteRenderedHTMLViewer`
- **Server actions:** `src/actions/accountMembers.ts`, `src/actions/accountInvoices.ts` (thin wrappers; most reads are RLS-gated queries)
- **Migrations:** `supabase/migrations/` — add `comms_preferences jsonb` to `customer_account_members`; any new indexes for portal query performance

### 15B Rider tracking
- **Routes:** `src/app/(public-track)/track/[token]/` — public rider track; `src/app/(public-track)/track/expired/` (15B.7)
- **Components:** `src/features/rider-tracking/components/` — new `MilestoneTimeline`, `LiveLocationMap`, `DriverContactCard`
- **Shared:** `src/lib/quote-tokens.ts` extended (or a sibling `src/lib/tracking-tokens.ts` reusing the HMAC pattern)
- **SMS:** `src/services/sms-stub.ts` replaced by real provider integration at `src/services/sms.ts` with provider-specific driver module
- **Migrations:** `supabase/migrations/` — add `rider_name`, `rider_phone`, `rider_email` columns to `bookings`; `live_rider_tracking boolean` on `customer_accounts`

### 15C Comms matrix
- **Tables + RLS:** `supabase/migrations/` — `comms_templates`, `comms_dispatch_rules`, preference jsonb on members
- **Ops UI:** `src/app/(ops)/ops/comms/` — new route, `page.tsx`, `rules/[event_key]/page.tsx`, `templates/page.tsx`
- **Email module extension:** `src/lib/email/dispatch.ts` — new function that consumes the matrix
- **Scheduled job:** extend Epic 13's cron function to add reminder dispatch

### 15D Dispatch intelligence
- **Algorithm:** `src/lib/dispatch-suggestions.ts`, `src/lib/dispatch-suggestions-config.ts`, `src/lib/__tests__/dispatch-suggestions.test.ts`
- **Ops UI:** `src/features/ops/components/VehicleSuggestionsPanel.tsx` — embedded in the existing `AssignBookingPanel`
- **Action integration:** `src/actions/opsDispatch.ts` extended with optional `fromSuggestion` param
- **Calibration report:** `src/app/(ops)/ops/reports/suggestions/page.tsx` — admin-only

## Relationship to other epics

- **[`docs/epic-11.md`](epic-11.md):** E1 RLS and E2 ops quality patterns apply to every sub-epic; portal and tracking pages follow E2 error / empty-state conventions.
- **[`docs/epic-12.md`](epic-12.md):** Portal RLS builds directly on `customer_accounts` + `customer_account_members`; unified `/ops/bookings` is referenced from the ops-comms UI.
- **[`docs/epic-13.md`](epic-13.md):** Email infrastructure, retry queue pattern, daily cron, and invoicing queue are all extended — not replaced. Comms matrix **consumes** the email module.
- **[`docs/epic-14.md`](epic-14.md):** HMAC token pattern (Q16) reused for rider-tracking tokens; public-facing route conventions (`/q/[token]/*`) mirrored in `/track/[token]`.
- **Future epics:** A native mobile app, partner white-label, ML dispatch model, and accounting-sync epics all build on Epic 15 primitives. None are in scope here.
