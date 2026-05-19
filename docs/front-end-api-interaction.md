# Front-End API Interaction

## Server Actions

The app uses **Next.js Server Actions** (`'use server'`) for type-safe mutations and queries invoked from the App Router: e.g. `calculateQuote`, `calculateHourlyQuote`, `createBooking`, `processPayment`, `cancelBooking`, `searchBooking`, **`submitTripRequest`** in `src/actions/`. They call Supabase via `src/lib/supabase/server.ts` (service role where appropriate), Google APIs, and Resend — not an intermediate CMS API.

| Action | Role |
| ------ | ---- |
| `submitTripRequest` | **Public trip request (Epic 10)** — Zod **`tripRequestSubmitPayloadSchema`** (Slides 1–3) → insert **`bookings`** with **`booking_intent = trip_request`**, **`total_amount = 0`**, no **`reconcileBookingQuote`**, no PayFast, no client-triggered email. **Integration boundary:** **[trip-request-integration-boundary.md](trip-request-integration-boundary.md)**. |
| `calculateQuote` | Zod-validated point-to-point params → Distance Matrix (server key **`GOOGLE_MAPS_SERVER_KEY`**) → `computePointToPointQuote` → vehicle options + illustrative totals. Browser Places use **`NEXT_PUBLIC_GOOGLE_MAPS_KEY`** only in **`AddressAutocomplete`**. |
| `calculateHourlyQuote` | Zod-validated hourly hire (pickup, date, passengers, duration) → `calculateHourlyHirePrice` per vehicle tier. |
| `calculateExperienceQuote` | Zod-validated **`packageId`**, **`date`**, **`groupSize`**, **`selectedAddonIds`** → loads **`experience_packages`** → **`computeExperiencePackageQuote`** → single **vehicle** option (tier from **`default_vehicle_category_id`** or first fit) + **stub** origin/destination for the wizard. |
| `createBooking` | Zod `webBookingPayloadSchema` → **`reconcileBookingQuote`** (server recomputes price) → insert **pending** `public.bookings` (+ intent columns). Optional path when not using PayFast. |
| `processPayment` | Same reconcile + insert + PayFast signature; **`amount`** and DB **`total_amount`** use reconciled ZAR only. Returns **`payfastProcessBaseUrl`** (from server env **`PAYFAST_URL`**) for the client form `action` — no **`NEXT_PUBLIC_PAYFAST_*`**. Optional corporate fields (**`invoiceRequested`**, **`purchaseOrderRef`**, **`billingEntityRef`**) persist to **`bookings`** columns. Sets **`customer_id`** when a Supabase session exists. For **`booking_intent = corporate_pattern`** (SH.9.5): **sign-in required**; **`booking_metadata`** must include **`service_run_id`**, **`from_point_id`**, **`to_point_id`**, **`seats`**, optional **`idempotency_key`** (`corporatePatternBookingMetadataSchema`); after insert, **`reserve_service_run_capacity_for_booking_checkout`** holds seats on the run until PayFast ITN confirm/release (**[ADR 0005](adr/0005-patterned-checkout-sh9-5.md)**, **[patterned-checkout-vst6-delta.md](patterned-checkout-vst6-delta.md)**). |
| `cancelBooking` | Zod `{ bookingId, countryCode, phoneNumber }` → phone match → `status = cancelled` (rejects if already **paid**). |
| `searchBooking` | Reservation number = **`payment_reference`** + phone verification → read model for “manage booking”. |
| `assignBookingToRun` | **Staff JWT only** — paid **`bookings`** without **`booking_trips`** → insert **`trips`**, **`booking_trips`**, **`chauffeur_assignments`**, find/create **`chauffeur_schedules`**; vehicle overlap guard; **`ops_audit_log`**; **best-effort** **`notifications`** (**`assignment`**) to chauffeur + customer when known. |
| `updateTripStatusAction` | **Staff JWT** — update **`trips.status`** + **`status_history`**; audit; **best-effort** **`notifications`** (**`trip_status`** / **`no_show`** when cancelled). |
| `recordTripDelayAction` | **Staff JWT** — set **`ops_delay_note`**, **`ops_revised_time_end_estimate`**; audit; **best-effort** **`notifications`** (**`change`**). |
| `swapTripVehicleAction` | **Staff JWT** — update **`trips.vehicle_id`** and overlapping **`chauffeur_assignments`** for same chauffeur window; overlap guard; audit; **best-effort** **`notifications`** (**`change`**). |
| `updateChauffeurTripStatusAction` | **Chauffeur JWT only** — Zod **`tripId`** + **`nextStatus`** (`en_route` \| `completed`); allowed pairs **`assigned→en_route`**, **`en_route→completed`**; **`status_history`** **`source: field_app`**; **`ops_audit_log`** with **`actor_role = chauffeur`**; **best-effort** customer **`notifications`** (**`trip_status`**) when **`customer_id`** is set. |
| `confirmChauffeurAssignmentAction` | **Chauffeur JWT** — alias for **`updateChauffeurTripStatusAction`** with **`nextStatus: en_route`**. |
| `logChauffeurContactIntentAction` | **Chauffeur JWT** — **`tripId`** only; allowed when trip status is **`assigned`** or **`en_route`**; audit **`chauffeur_contact_intent`** (no phone in payload). |
| `publishChauffeurLocationAction` | **Chauffeur JWT** — Zod lat/lng (+ optional accuracy); resolves **`chauffeur_assignments`** from trip + run; upserts **`vehicle_trackings`** with server throttle (12 writes/min/assignment). |
| `listComplianceIncidentsAction` | **Staff JWT** (`getOpsStaffForAction`) — Zod optional **`limit`**; recent **`compliance_incidents`**. |
| `createComplianceIncidentAction` | **Staff JWT** — Zod **`category`**, **`summary`**, **`occurredAt`**, optional **`relatedBookingId`**, **`metadata`**; **`reported_by = auth.uid()`** via RLS; **`ops_audit_log`** **`create_compliance_incident`**. |
| `listExpiringComplianceDocumentsAction` | **Staff JWT** — Zod optional **`daysAhead`** (default **30**); **`vehicle_compliance_documents`** and **`chauffeur_compliance_documents`** with **`expiry_date`** on or before horizon (**includes overdue**). |
| `createVehicleComplianceDocumentAction` | **Staff JWT** — Zod storage + **`vehicleId`** + **`documentType`**; audit **`create_vehicle_compliance_document`**. |
| `createChauffeurComplianceDocumentAction` | **Staff JWT** — Zod storage + **`chauffeurId`** + **`documentType`**; audit **`create_chauffeur_compliance_document`**. |
| `exportDataSubjectAction` | **Admin JWT only** (`getOpsAdminForAction` — **`ProfileRole === 'admin'`**, not merely **`is_staff`**) — Zod **`profileId`** and/or **`email`**; **`profiles.role`** must be **`customer`**. Returns minimal JSON **`vst12_dsr_minimal_v1`**: profile subset, deduped **bookings** (by **`customer_id`** or guest **`customer_email`** match), **trips** with **`customer_id`**. **`ops_audit_log`** **`dsr_export`**. Uses **`createUserServerClient()`** (staff RLS sufficient). |
| `anonymiseDataSubjectAction` | **Admin JWT only** — Zod **`profileId`** + confirm literal **`ANONYMISE`**; customer profiles only; redacts **profile** PII, **booking** guest contact fields, nulls **`trips.customer_id`**; audit **`dsr_anonymise`** with **`auth_users_followup_required`**. |
| `updateBookingInvoicingHooksAction` | **Staff JWT** (`getOpsStaffForAction`) — Zod **`bookingId`** + optional **`invoiceRequested`**, **`purchaseOrderRef`**, **`billingEntityRef`**; updates **`bookings`** invoicing columns (**MVP** — **`/ops/invoicing`**). |

**Auth helpers:** **`getOpsStaffForAction()`** — dispatcher + admin. **`getOpsAdminForAction()`** — **admin** only (DSR). See **`src/lib/ops-auth.ts`**.

See **[ops-console.md](ops-console.md)** for route map and JWT vs service-role discipline. **Compliance engineering checklist and DSR boundaries:** **[compliance-and-safety.md](compliance-and-safety.md)**. **Field chauffeur flows:** **[field-tools.md](field-tools.md)** (`/field/*`, **`src/lib/field-auth.ts`**). **Realtime:** **[realtime-and-notifications.md](realtime-and-notifications.md)** (`createClientClient` subscriptions only in the browser).

### Quote integrity (tamper resistance)

- Client **`quoteAmount`** is **never** trusted for persistence or PayFast: **`reconcileBookingQuote`** in `src/lib/booking-quote-reconcile.ts` recomputes the price for the selected **`selectedVehicleId`** and rejects if `|server − client| > QUOTE_RECONCILE_TOLERANCE_ZAR` (`0.02` in `src/lib/pricing-env.ts`).
- **`calculateQuote`** / **`calculateHourlyQuote`** / **`calculateExperienceQuote`** return **illustrative** options; the **authoritative** amount is always the reconciled value at **`createBooking`** / **`processPayment`**. For **`experience_package`**, **`reconcileBookingQuote`** recomputes from **`experience_packages`** + **`booking_metadata`** (no Maps).
- **Idempotency:** each PayFast **checkout** from the wizard creates a **new** booking row with a new **`payment_reference`** (`VST-*`). If payment **fails** or the user **cancels** at PayFast, the row may show **`payment_status = failed`**; the user starts **Pay securely** again → **new** row and new reference (search/manage uses the reference for the **paid** attempt). Webhook retries for the **same** booking id must not double-send email (**handler dedupes**). For **`corporate_pattern`**, duplicate **`COMPLETE`** ITNs call **`confirm_ticket_holds_for_paid_booking`** idempotently (no double capacity consume); **`FAILED`/`CANCELLED`** releases holds via **`release_ticket_holds_for_failed_booking`** (**[ADR 0005](adr/0005-patterned-checkout-sh9-5.md)**).

**Experience quote tests:** Vitest mocks for **`@/lib/experience-package-data`** and **`@/lib/pricing-data`** in **`src/actions/__tests__/calculateExperienceQuote.test.ts`** (success path, missing package, invalid Zod input).

## Route Handlers (`app/api/.../route.ts`)

Use **Route Handlers** when something **must** be plain HTTP: **webhooks** (e.g. PayFast `notify`), **third-party callbacks**, health checks, or non-Next clients. Examples: `src/app/api/payfast/webhook/route.ts`, `src/app/api/health/route.ts`, `src/app/api/booking-confirmation/route.ts`.

| Route | Role |
| ----- | ---- |
| `GET /api/booking-confirmation?id=<uuid>` | Service-role read of one booking for the **confirmation** page after PayFast return (guest browser cannot `select` **bookings** under RLS with anon key). UUID acts as an unguessable capability. |
| `POST /api/payfast/webhook` | **`verifyPayFastWebhookSignature`** only (`src/lib/payfast.ts`) → idempotent **`COMPLETE`** (conditional update; **no** duplicate confirmation emails on retries; **`200`** for benign duplicates) → **`FAILED`/`CANCELLED`** sets **`payment_status = failed`**, **`status = pending`** without downgrading **paid** rows. **`corporate_pattern`:** after signature-verified transitions, **`confirm_ticket_holds_for_paid_booking`** / **`release_ticket_holds_for_failed_booking`** (SH.9.5). See **[integrations-and-payments.md](integrations-and-payments.md)**. |
| `GET /api/health` | **`checkDatabaseHealth`** (`src/lib/health-check.ts`) — lightweight DB probe for ops; **no** auth; JSON **`status`**, **`message`**, **`timestamp`** (**`200`** healthy / **`503`** unhealthy). |

### Email

- **Paid:** `sendBookingConfirmation` from webhook when **`payment_status`** becomes **paid** (non-blocking on webhook success).
- **Pending booking:** not implemented; optional Resend template + env toggle deferred (no server path yet).

## Decision: new Server Action vs new `route.ts`

| Prefer **Server Action** when | Prefer **Route Handler** when |
| ----------------------------- | ------------------------------ |
| Form or wizard step from a React Server/Client component in the App Router | External service POSTs to a URL (webhook, IPN) |
| Internal mutation with typed payload + Zod | Need specific HTTP semantics (methods, headers, raw body) |
| Caller is always this Next app | Mobile app or partner calls REST without Server Action bridge |
| You want colocation with UI flows | You document a stable public HTTP contract |
| — | **Health checks** and ops probes, e.g. **`GET /api/health`** (`src/app/api/health/route.ts`) |

## Data flow (current)

React (App Router) → **Server Actions** or **Route Handlers** → Supabase / Google / Resend / PayFast.

**Guest trip linkage:** web flow persists **`public.bookings`** (+ intent / hourly columns). **`booking_trips` → `trips`** rows are **not** created in this slice; dispatch (**VST-7**) assigns **service runs** / **trips** and links them when operational data exists.
