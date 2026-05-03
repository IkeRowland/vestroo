# Integrations and payments (VST-13)

This document is the engineering contract for **maps**, **PayFast**, **email/SMS consumers**, **corporate invoicing hooks**, and **environment-specific configuration**. It complements **[environment-vars.md](environment-vars.md)**, **[data-models.md](data-models.md)**, and **[front-end-api-interaction.md](front-end-api-interaction.md)**. **Patterned checkout (Epic 9 / SH.9.5):** **[`#sh-9-5-patterned-checkout`](#sh-9-5-patterned-checkout)** · epic **[SH.9.5](epic-9.md#sh-9-5-checkout)**.

## Integration matrix

| Integration | Role in app | Implementation touchpoints |
|-------------|-------------|----------------------------|
| **Google Maps** | Places Autocomplete (browser); Distance Matrix (server) for point-to-point quotes | `src/components/ui/AddressAutocomplete.tsx`, `src/lib/maps.ts`, `src/actions/calculateQuote.ts`, `src/lib/booking-quote-reconcile.ts`, `src/lib/quote-engine.ts` |
| **Payments (Theme N — EFT)** | **EFT — bank-account, ops mark**; bank-detail / quote emails; **`markBookingPaymentReceived`** audit trail | **`src/actions/markBookingPaymentReceived.ts`**, **`src/lib/quote-accept-flow.ts`**, **`src/lib/email/templates/walk-in-quote.ts`**; reference **Momo / PayOS** outcome parity **[§ INT.8.3](#int-8-3)** |
| **Resend** | Transactional email (paid confirmation) | `src/services/email.ts` (invoked from webhook); inventory **[§ INT.8.1](#int-8-1)** |
| **SMS** | Stub / future provider | `src/services/sms-stub.ts` — consumer only; no gateway in this slice; policy inventory **[§ INT.8.2](#int-8-2)** |
| **Scheduled / background jobs** | Reference Nest `@Cron` inventory vs Vestroo platform (no in-repo **`vercel.json`** / **`@Cron`** today) | **[§ INT.8.4](#int-8-4)** |
| **Secrets / `share/` patterns** | Legacy **`backend-share`** DI (**JWT**, **Redis**, **SMS**, **Momo**, **PayOS**) vs **Supabase** + env | **[§ INT.8.5](#int-8-5)** |
| **HTTP clients / idempotency** | Outbound **`fetch`** / SDKs / webhooks vs reference **axios** / Nest **`HttpModule`** | **[§ INT.8.6](#int-8-6)** |
| **Corporate invoicing** | Flags + short references on `bookings`; ops visibility | Columns on `public.bookings` (migration `20260413130000_vst13_corporate_invoicing_hooks.sql`), Zod on `src/actions/booking-schemas.ts`, staff UI `src/app/(ops)/ops/invoicing/page.tsx`, `src/actions/opsInvoicingHooks.ts` |
| **Future accounting export** | Not implemented | Documented here as **out of scope** for MVP (no Xero/Sage sync) |

## Per-environment expectations (dev / staging / production)

| Tier | Maps | PayFast | Email | SMS |
|------|------|---------|--------|-----|
| **Local dev** | Sandbox/restricted keys; `GOOGLE_MAPS_SERVER_KEY` + `NEXT_PUBLIC_GOOGLE_MAPS_KEY` as needed | `PAYFAST_URL=https://sandbox.payfast.co.za`, sandbox merchant credentials | Resend test domain or skip sending | **Stub only** — **no** outbound SMS until a provider ships (**[§ INT.8.2](#int-8-2)**) |
| **Staging** | Non-production Google project or restricted keys tied to staging host | Sandbox merchant; `notify_url` must hit **staging** base URL | Same as dev or staging sender | **Stub only** — **no** outbound SMS until a provider ships |
| **Production** | Production Google project; **separate** server vs browser key restrictions | Live PayFast merchant; live `PAYFAST_URL` | Verified production domain in Resend | **Stub only** — **no** outbound SMS until a provider ships |

**Settlement — reference vs ZA shipped product:** Mapping of **legacy Momo / PayOS** (VN reference stack) to **Theme N — EFT + ops manual mark** outcomes lives in **[§ INT.8.3](#int-8-3)** (**Epic 16**).

Quote tolerance and premium defaults remain environment-driven via **`src/lib/pricing-env.ts`** (see **[environment-vars.md](environment-vars.md)**).

> **Theme N note:** Hosted **PayFast** checkout, **`processPayment`**, **`src/lib/payfast.ts`**, and **`POST /api/payfast/webhook`** are **not** present in current first-party **`src/`** — settlement is **EFT + ops manual mark** (**[`docs/epic-16.md`](epic-16.md)**; **[§ INT.8.3](#int-8-3)**). The **PayFast webhook lifecycle** and **Walk-in quote-first** subsections below retain **historical** narrative and file paths for archive context; treat **INT.8.3** as the engineering source of truth for **Theme N**.

## PayFast webhook lifecycle

1. **ITN URL:** `POST {NEXT_PUBLIC_APP_URL}/api/payfast/webhook` — set in `processPayment` as `notify_url`.
2. **Signature:** `verifyPayFastWebhookSignature` in **`src/lib/payfast.ts`** is the **only** verification path for this route (do not duplicate MD5 logic elsewhere).
3. **Idempotency:** PayFast may retry ITNs. Behaviour:
   - **`COMPLETE`:** If `bookings.payment_status` is already **`paid`**, respond **`200`** with `{ message: "Already processed" }` — **no** second email, **no** conflicting status writes.
   - **First `COMPLETE`:** Conditional update `… WHERE payment_status <> 'paid'` so only one writer transitions the row; confirmation email runs **only** after a successful transition.
   - **`FAILED` / `CANCELLED`:** Sets `payment_status = failed`, `status = pending` (retry path); if the row is already **paid**, respond **`200`** and **do not** downgrade.
4. **Customer reference:** `payment_reference` (`VST-*`) stays customer-facing; **`trans_id`** stores PayFast `pf_payment_id` (gateway id).

## Walk-in quote-first flow (Epic 14)

**Walk-in** bookings ( **`client_type = 'walk_in'`** ) use **quote-first** for **non-trivial** intents (**Q13**): `trip_request`, `hourly_hire`, and `experience_package` are routed so ops can review and email a formal quote; **`point_to_point`** keeps the existing **booking form → PayFast** path. **Feature flag:** `QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS` — see **[environment-vars.md](environment-vars.md)**.

Narrative **state chain** on **`bookings`**: **`quote_sent` → `awaiting_payment` →** then PayFast records **`payment_status` = `paid`**, and **`bookings.status` = `ready_to_assign`** (dispatch handoff) — for walk-ins after **ITN**, the terminal pair is **`ready_to_assign` + `payment_status` = `paid`**, not **`status` = `paid`** — see **[epic-14.md](epic-14.md)** **Q19**.

- **Public quote links** (accept / pay / reject) live under **`/q/[token]/*`**. Tokens are HMAC-signed with `QUOTE_LINK_SIGNING_KEY` (not documented here; see environment vars and **[epic-14.md](epic-14.md)** **Q16**).
- **PayFast** hosted checkout and **ITN** use the same integration as other web bookings. For **ITN URL, `verifyPayFastWebhookSignature` usage, and idempotency** (including duplicate **`COMPLETE`** handling), the authoritative spec is **[PayFast webhook lifecycle](#payfast-webhook-lifecycle)** above — do not duplicate or fork MD5 verification.
- **Q19 — Webhook + trigger:** The route that applies PayFast **`COMPLETE`** updates **`payment_status`** to **`'paid'`**. A **`BEFORE UPDATE OF payment_status`** trigger — **`bookings_walk_in_paid_to_ready_to_assign`**, function **`bookings_walk_in_paid_to_ready_to_assign_fn()`** ( **migration** **`20260420220000_epic14_story141_ready_to_assign_walk_in_paid_trigger_v1.sql`** ) — sets **`bookings.status`** to **`ready_to_assign`** for **walk-in** rows when **payment** becomes **paid** (and leaves **account** / other client paths to Epic 12/13 **invoicing** behaviour). Rationale: the transition is tied to the same update that records gateway payment, avoiding a race between UI and **ITN** — see **[epic-14.md](epic-14.md)** **Q19** / **Q18** (two surfaces: **`/ops/bookings`**, **`/ops/fulfil?queue=paid`**, one `ready_to_assign` predicate; **[fulfil-queue-buckets.md](fulfil-queue-buckets.md)**).
- **Versioned quotes** (`booking_quotes` rows, **`sent` / `superseded` / `expired`**, and email links to **`/q/...`**) are covered in **[epic-12.md](epic-12.md)**, **[epic-13.md](epic-13.md)**, and **[epic-14.md](epic-14.md)** — this doc does not restate the full **`booking_quotes` lifecycle.

### Manual QA checklist (signature + webhook)

Use sandbox ITN tools or scripted `curl` with `application/x-www-form-urlencoded` bodies:

| Case | Expected |
|------|----------|
| Valid signature | `200`, booking updated per `payment_status` |
| Tampered amount or id after signing | `400` Invalid signature |
| Missing `signature` field | `400` |
| Wrong passphrase on server | `400` Invalid signature |
| Duplicate `COMPLETE` for an already-paid booking | `200`, no duplicate confirmation email |

Automated coverage: **`src/lib/__tests__/payfast-signature.test.ts`**, **`src/app/api/payfast/webhook/__tests__/route.test.ts`**.

<a id="sh-9-5-patterned-checkout"></a>

### Patterned / capacity checkout (SH.9.5)

When **`bookings.booking_intent = corporate_pattern`**, inventory holds and settlement outcomes are tied per **[ADR 0005 — Patterned checkout (SH.9.5)](adr/0005-patterned-checkout-sh9-5.md)** and the VST-6 delta **[`patterned-checkout-vst6-delta.md`](patterned-checkout-vst6-delta.md)**. Post–Theme N, authoritative paid transitions follow **EFT + ops mark** (**`markBookingPaymentReceived`**) per **[§ INT.8.3](#int-8-3)** — reconcile ADR 0005 text if it still references removed gateway hooks.

Refund and no-show automation: **TBD / manual** where not implemented; honesty vs the INT.8.3 matrix is recorded in ADR 0005.

## Failed / cancelled payments and customer recovery

- **Return URL:** PayFast sends the user to `/confirmation?id={bookingId}` on success (unchanged).
- **Cancel URL:** User returns to `/book/payment?error=cancelled` with copy explaining **no charge** and how to **Pay securely** again or use **Manage booking** with **`payment_reference`** if they paid on another attempt.
- **Webhook `FAILED` / `CANCELLED`:** Row stays **`status = pending`**, **`payment_status = failed`** — consistent with **[data-models.md](data-models.md)**. A **new** checkout creates a **new** booking row and new `VST-*` reference (**[front-end-api-interaction.md](front-end-api-interaction.md)** idempotency note).

## Maps provider choice (Google vs Mapbox)

**Decision:** **Google Maps Platform only** for MVP (no Mapbox hybrid). Rationale: existing Places Autocomplete and Distance Matrix usage, single vendor for SA coverage, and simpler key governance.

- **Browser:** `NEXT_PUBLIC_GOOGLE_MAPS_KEY` — Maps JavaScript API + Places; restrict by **HTTP referrer** in Google Cloud.
- **Server:** `GOOGLE_MAPS_SERVER_KEY` — Distance Matrix (and similar web services); **never** `NEXT_PUBLIC_*`; restrict by **server IP** (e.g. Vercel) or equivalent.
- **Permissions-Policy:** `next.config.ts` sets `geolocation=(self)` — aligns with first-party geolocation use; not a grant to arbitrary third-party embeds.

## Security (client bundle hygiene)

**Audit (VST-13):**

- **`PAYFAST_MERCHANT_KEY`**, **`PAYFAST_PASSPHRASE`**, **`PAYFAST_MERCHANT_ID`**, **`GOOGLE_MAPS_SERVER_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`** — **server-only**; do not prefix with `NEXT_PUBLIC_`.
- **`NEXT_PUBLIC_GOOGLE_MAPS_KEY`** — browser Places only; must **not** power unrestricted Distance Matrix quotas (use separate server key).
- **`NEXT_PUBLIC_PAYFAST_*`** — **removed** from the integration: PayFast **process base URL** is supplied from the server (`payfastProcessBaseUrl` from `processPayment`) so the client does not need a public PayFast env var.
- **SMS / Resend:** Server env only (except anon Supabase, documented separately).

## Sub-processors and payment data flows

Card and payment processing are handled by **PayFast** (PCI scope sits with the gateway). Vestroo receives payment **status** and **transaction identifiers** on `bookings`; we do **not** store full card data. Operational and privacy depth (retention, DSR) lives in **[compliance-and-safety.md](compliance-and-safety.md)** — **do not** duplicate VST-12 DSR procedures here.

<a id="int-8-1"></a>

## INT.8.1 — Email template parity (reference Mailer / Handlebars → Vestroo)

Engineering inventory for **Epic 8** transactional email: **grep-backed** call sites in **`src/legacy/capstone-reference/`** vs **Vestroo** (**Resend** + in-repo renderers). Co-located with VST-13 so triggers, env tiers, and webhook **idempotency** stay in one contract.

**Traceability (`share/`):** Top-level **`share/`** is **not vendored** in this repository (no repo-root **`share/`** directory for capstone assets). Reference Mailer/template inventory in this section uses **`src/legacy/capstone-reference/`** only. Upstream capstone **`share/`** email helpers are **out of scope** for INT.8.1 unless **`share/`** is vendored later.

Stack contrast (**FE.5.9**): **[capstone-reference-stack-integration.md](capstone-reference-stack-integration.md)** (Nest / reference vs Vestroo).

**Reference template assets:** `rg --files -g '*.hbs' src/legacy/capstone-reference` returns **zero** paths — **no `.hbs` files** are vendored under capstone-reference; Handlebars templates for `template: 'password-reset'` (and any other Mailer names) may exist **only upstream** in the original capstone repo or build assets, not in this tree.

**Mailer / `sendMail` inventory (`src/legacy/capstone-reference/`):** `MailerService` from `@nestjs-modules/mailer` and **`sendMail`** appear **only** in **`backend-modules/auth/auth.service.ts`** (constructor injection ~17–28, call ~239–248) with **`template: 'password-reset'`** and `context` (`name`, `resetUrl`, `currentYear`). No other `sendMail` / `MailerService` references under this path.

**OTP (reference):** **`auth.service.ts`** ~125–132 — after `otpService.create`, delivery is **`await this.smsService.sendSmsWithoutBrandname(phone, …)`** — **SMS**, not email. The matrix below does **not** treat phone OTP as an email event.

### Compact matrix (INT.8.1)

| Business event | Reference template / trigger | Vestroo template / renderer | Trigger site | Env / secrets | Staging vs prod | Status | Backlog ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Booking paid → customer confirmation | No Mailer `sendMail` callsite in capstone-reference (inventory) | `sendBookingConfirmation` (`src/services/email.ts` — `createResendClient`, internal lazy `getResendClient`, `RETRY_CONFIG`, `isRetryableError`, `renderBookingConfirmationEmail` from `email-templates.ts`) | Route Handler **`src/app/api/payfast/webhook/route.ts`** ~105–121 (`BookingEmailData` → `sendBookingConfirmation`) | **[environment-vars.md](environment-vars.md)** — `RESEND_API_KEY`, `RESEND_FROM_EMAIL`; **server-only** (`RESEND_*` not client) | **Resend:** staging/test sender or non-prod domain; production verified domain (align with [Per-environment](#per-environment-expectations-dev--staging--production) + integration matrix row) | implemented | Story TBD |
| Password reset (transactional email) | `auth.service.ts` ~239–248 — `mailerService.sendMail` / **`template: 'password-reset'`** | No in-repo Resend password-reset template; shipped staff/field auth is **Supabase** (`signInWithPassword` on ops/field login surfaces) | **none** for Resend; reset UX via **Supabase Auth** (not documented here as a Resend trigger) | **`RESEND_*` N/A** for this path; Supabase keys per [environment-vars.md](environment-vars.md) | **Supabase:** separate staging vs prod projects; optional future branded mail **TBD** | **N/A** (Resend) | **P2** — **product** (copy/templates), **platform** (send path) if Mailer-parity branded email is required |
| Phone OTP | `auth.service.ts` ~125–132 — **`sendSmsWithoutBrandname`** (SMS body with OTP) | Email N/A; SMS consumer stub / future work (see VST-13 SMS row) | Reference: Nest service; Vestroo: not an email trigger | SMS vars when implemented — [environment-vars.md](environment-vars.md) | Per SMS provider when wired | **N/A** (email channel) | — |
| Public contact enquiry | — | **Stub** — no Resend/CRM send | Server Action **`src/actions/submitContactEnquiry.ts`** ~50–56 (`TODO` / `console.info` only) | When wired: **`RESEND_*`** — [environment-vars.md](environment-vars.md) | Same Resend tier rules as booking row when implemented | stub / gap | Story TBD — **platform** |
| DB-triggered transactional email | — | — | **none** — `rg -i resend|pg_net` under **`supabase/`** → **no matches** | — | — | **N/A** | — |

**Idempotency (booking email):** Duplicate PayFast **`COMPLETE`** when `payment_status` is already **`paid`** returns **200** / “Already processed” — **no second confirmation email** (see [PayFast webhook lifecycle](#payfast-webhook-lifecycle) above). Automated check: **`src/app/api/payfast/webhook/__tests__/route.test.ts`** (duplicate ITN **~40–68** asserts `sendBookingConfirmation` not called; paid transition + single send from **~70**).

### PII / VST-12 (email slice)

Short engineering checklist (full policy: **[compliance-and-safety.md](compliance-and-safety.md)**; story context: **[stories/vst-12.story.md](stories/vst-12.story.md)** — **no new legal claims** here):

- **Minimisation:** include only fields required for the business event (booking confirmation uses trip/payment fields from `BookingEmailData`; avoid extra attachments of unrelated PII).
- **Subject / preview:** avoid unnecessary **high-risk** or special-category detail in subject lines and preview text; prefer neutral summaries with detail in the body where needed.
- **Retention:** email inboxes are **not** a second database — operational copies, forwarding, and archive policy are **product/ops** concerns; engineering defaults to not logging full bodies with secrets.

### Backlog legend

**P0** — ship blocker / immediate fix · **P1** — next-sprint engineering priority · **P2** — parity / polish (product-led).

### NFR.1.3 — Email failure modes (Resend path)

Verified behaviour in **`src/services/email.ts`**:

- **Missing `RESEND_API_KEY`:** `const error = 'RESEND_API_KEY not configured'`; `console.error` uses a template literal **`[Email Service] ${error}`** (log line is **`[Email Service] RESEND_API_KEY not configured`**); returns **`{ success: false, error }`** — **not** a silent skip. Webhook logs failures via `emailResult` / `catch` (~126–136 in **`route.ts`**); booking remains **paid** (email is best-effort after transition).
- **Retryable errors:** `isRetryableError` matches message substrings **network**, **timeout**, **rate limit**, **429**, **502**, **503** (case-insensitive). **`RETRY_CONFIG`:** `maxRetries: 3`, `initialDelay` 1000ms, `maxDelay` 4000ms, `backoffMultiplier: 2` (exponential backoff via `calculateBackoffDelay` + `sleep`).
- **Operator-visible symptoms:** customer missing confirmation while payment shows paid; spikes of `[Email Service] Attempt … failed` or Resend dashboard errors.
- **Engineering mitigations:** ensure **`RESEND_*`** per tier in [environment-vars.md](environment-vars.md); monitor webhook + Resend logs; verify **verified domain** in staging/prod; tune alerts on repeated `success: false` for the same booking.

**Staging alignment:** use the [Per-environment](#per-environment-expectations-dev--staging--production) table — **Email** column (Resend **verified domain** in production; staging/dev sender rules) and **SMS** column (**stub** only until a provider ships; **[§ INT.8.2](#int-8-2)**).

### NFR.4.1 — TypeScript boundaries

- **Payload / result types:** `BookingEmailData`, `EmailResult` in **`src/services/email.ts`**.
- **Template API:** `renderBookingConfirmationEmail`, `renderBookingConfirmationEmailHTML`, `renderBookingConfirmationEmailText` exported from **`src/services/email-templates.ts`** (compose HTML + text + subject).
- **Tests:** **`src/services/__tests__/email.test.ts`**, **`src/services/__tests__/email-templates.test.ts`**.

**Story 8.1 (INT.8.1)**

<a id="int-8-2"></a>

## INT.8.2 — SMS stub and policy parity

Engineering inventory for **Epic 8** outbound **SMS**: **grep-backed** paths under **`src/legacy/capstone-reference/`** vs **Vestroo** (**stub** only in first-party **`src/`** excluding **`src/legacy/`**). For **email** triggers and the paid-confirmation path, see **[INT.8.1 — Email template parity](#int-8-1)** only — this section does not duplicate the email matrix.

**OTP vs booking SMS:** Reference **phone OTP** is delivered by **SMS** in Nest **`auth.service.ts`**; shipped staff/field auth is **Supabase**-centric and must be read alongside **[capstone-auth-keytoken-otp-parity.md](capstone-auth-keytoken-otp-parity.md)**. **Do not** conflate the **booking-created** stub row with **auth OTP** parity.

**`share/` / capstone SMS — not production Vestroo routing:** Vendored **`backend-share`** types and **`SmsService`** (**`backend-share/sms.ts`**, **`ISMSProvider`** in **`share.port.ts`**, **`SMS_PROVIDER`** in **`di-token.ts`**, provider binding in **`share.module.ts`**) are **reference patterns** only (SpeedSMS-style **`api.speedsms.vn`** comments; **`ESMS_DOMAIN`**, **`ESMS_API_KEY`**, **`ESMS_SECRET_KEY`** env names in reference code). The first-party app MUST **not** import or DI-wire that tree without **product + legal** sign-off, env naming review, and sub-processor diligence. A fuller **`share/`** secrets / adapter matrix is **INT.8.5** in **[Epic 8](epic-8.md)**.

### Compact matrix (INT.8.2)

| Business event | Reference trigger | Vestroo implementation | Opt-in / consent note | Rate limit policy | Staging vs prod | Status + short rationale | Product + legal gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Booking created → transactional SMS | **`backend-share/sms.ts`** — **`SmsService`** implements **`ISMSProvider`** with **`sendSms`** / **`sendSmsWithoutBrandname`**. **`auth.service.ts`** uses **`sendSmsWithoutBrandname`** on the **OTP** path (injects **`SMS_PROVIDER`**). **Inventory:** **grep** of vendored **`src/legacy/capstone-reference/`** found **no** additional **`sendSms`** / **`sendSmsWithoutBrandname`** callsites beyond that OTP path — i.e. no separate reference “booking confirmation SMS” callsite surfaced in this tree. | **`notifyBookingCreatedSmsStub`** in **`src/services/sms-stub.ts`**; **`await notifyBookingCreatedSmsStub({ bookingId, customerPhone })`** from **`src/actions/createBooking.ts`** and **`src/actions/processPayment.ts`** after successful **`bookings`** insert; **`customer_phone`** persisted on the row. | **VST-12:** phone is **PII**; transactional SMS consent / checkbox copy **TBD** where product has not defined marketing vs transactional split — **[compliance-and-safety.md](compliance-and-safety.md)**, **[stories/vst-12.story.md](stories/vst-12.story.md)** (**no** new legal claims here). | **TBD** for a future HTTP client (none on stub). | Stub behaves **identically** in dev / staging / prod — **no** send. | **stub** — **`notifyBookingCreatedSmsStub`** returns **`Promise<void>`**, **`void payload`**, **no** throw, **no** external I/O (**no-op**). Operators should assume **no** customer SMS from this path; rely on **email** / **UI** per product. | Live provider + templates require **product + legal** + sub-processor review before any **`SMS_PROVIDER_*`** consumption or **`share/`**-style wiring. |
| Phone OTP (auth) | **`backend-modules/auth/auth.service.ts`** — after **`otpService.create`**, **`this.smsService.sendSmsWithoutBrandname(phone, …)`** (OTP by **SMS**, not email). **`OTP`** module surface: **`otp.module.ts`**, **`otp.service.ts`**, **`otp.controller.ts`**, **`otp.port.ts`**. **No** **`Twilio`** string matches in **`src/legacy/capstone-reference/`** from **grep** at documentation time. | **N/A** for SpeedSMS / capstone **`SMS_PROVIDER`** DI in Vestroo: shipped auth is **Supabase**-centric per **[capstone-auth-keytoken-otp-parity.md](capstone-auth-keytoken-otp-parity.md)** — **separate** from the booking stub row above. | Product / platform **TBD** (Supabase phone vs third-party OTP SMS). | **TBD** (abuse / resend limits when/if SMS OTP is chosen). | **TBD** per future auth + SMS decision. | **N/A** (pattern lives in vendored reference only). | Any live OTP SMS vendor: **product + legal** + **NFR.3.1** (keys **server-only**; see **[environment-vars.md](environment-vars.md)** when vars exist). |

**Phone fields — persistence / UI / ops (not SMS sends):** Examples: **`src/actions/searchBooking.ts`**, **`src/actions/cancelBooking.ts`**, **`src/app/(app)/confirmation/page.tsx`**, **`src/components/booking/BookingSummary.tsx`**, **`src/app/api/booking-confirmation/route.ts`**, **`src/app/(field)/field/trips/[tripId]/page.tsx`**, **`src/actions/opsCompliance.ts`**.

### VST-12 — Phone (SMS slice)

- **Minimisation:** collect and display **phone** only where the product requires it; avoid logging full numbers in unstructured logs.
- **Consent:** transactional SMS copy / opt-in when a provider replaces the stub is **TBD** — track with product and **[stories/vst-12.story.md](stories/vst-12.story.md)**; full checklist: **[compliance-and-safety.md](compliance-and-safety.md)**.

### Backlog legend

**P0** — ship blocker / immediate fix · **P1** — next-sprint engineering priority · **P2** — parity / polish (product-led). *(Same wording as [INT.8.1](#int-8-1).)*

### Backlog (SMS)

| Gap | Priority |
| --- | -------- |
| Real transactional booking SMS provider, templates, and consent copy | **P1** |
| Rate limits, retries, **429**, timeouts, dead-letter behaviour for a future SMS HTTP client | **P2** (align with **[INT.8.6](#int-8-6)** when outbound client is real) |
| **`processPayment`** test harness asserting **`sms-stub`** mock / invocation | **P2** — **`src/actions/__tests__/createBooking.test.ts`** uses **`vi.mock('@/services/sms-stub', () => ({ notifyBookingCreatedSmsStub: vi.fn().mockResolvedValue(undefined) }))`**; **no** `processPayment` test under **`src/actions/__tests__/`** mocks **`sms-stub`** (**TBD**) |

### NFR.1.3 — Stub failure modes vs future provider (SMS)

**Stub (today):** **`notifyBookingCreatedSmsStub`** in **`src/services/sms-stub.ts`** resolves successfully, performs **no** gateway I/O, and does **not** surface SMS-specific failures to operators — there is **nothing** to retry at the SMS layer.

**Future provider (TBD):** When an adapter replaces the stub, document **timeouts**, **429** / rate-limit handling, **invalid key** behaviour, retries vs dead-letter, and **operator-visible** symptoms (e.g. paid booking without SMS) — mirror the depth of the **Resend** **NFR.1.3** subsection under **[INT.8.1](#int-8-1)** once a vendor is chosen.

### NFR.4.1 — TypeScript boundaries (SMS)

- **Boundary types:** **`BookingSmsStubPayload`** and **`notifyBookingCreatedSmsStub`** exported from **`src/services/sms-stub.ts`** (`Promise<void>` stub).
- **Tests:** **`src/actions/__tests__/createBooking.test.ts`** mocks **`@/services/sms-stub`**. **`processPayment`:** **TBD** — no matching **`sms-stub`** mock file found under **`src/actions/__tests__/`** at documentation time.

### Env alignment (footnote)

**[environment-vars.md](environment-vars.md)** documents optional **`SMS_PROVIDER_API_KEY`**, **`SMS_PROVIDER_FROM_NUMBER`** (and **`.env.example`** optional SMS lines). **`sms-stub.ts`** does **not** read env today (TODO-style comment only) — future wiring stays **server-only** (**NFR.3.1**; no **`NEXT_PUBLIC_*`** SMS secrets).

**Story 8.2 (INT.8.2)**

<a id="int-8-3"></a>

## INT.8.3 — Payments: reference Momo / PayOS vs Vestroo (Theme N — EFT, ops mark)

**Epic 8 (INT.8.3)** — **grep-backed** mapping of **reference** **Momo** / **PayOS** checkout and callbacks (**`src/legacy/capstone-reference/`** only) to **Vestroo** settlement outcomes. **Momo / PayOS do not run in Vestroo production**; this section is **developer + support** substitution and **parity of outcomes**, not copy-paste of VN gateways.

**Shipped ZA path (Epic 16 Theme N):** **EFT — bank-account, ops mark** — customers receive **bank details and payment reference** in quote/accept emails; **`markBookingPaymentReceived`** (`src/actions/markBookingPaymentReceived.ts`) is the **authoritative** transition to **`payment_status = paid`** for supported rows, with **`ops_audit_log`** (`payment_received_eft`). **Hosted PayFast checkout, `processPayment`, and the PayFast ITN webhook are removed** from first-party **`src/`** — do **not** implement new work against those artefacts; see **[`docs/epic-16.md`](epic-16.md)**.

**Thin cross-links:** transactional email **[INT.8.1](#int-8-1)**; **SMS stub** **[INT.8.2](#int-8-2)**. **Idempotency** and Server Actions: **[front-end-api-interaction.md](front-end-api-interaction.md)**. **PCI / sub-processors:** EFT is **out-of-band** from app servers — defer depth to **[compliance-and-safety.md](compliance-and-safety.md)** — **no** duplicate DSR text here.

**Stack contrast (FE.5.9):** **[capstone-reference-stack-integration.md](capstone-reference-stack-integration.md)** — Nest reference vs Vestroo Server Actions / Route Handlers.

### Provider-agnostic matrix (INT.8.3)

| Business event | Reference (Momo / PayOS) — legacy paths | **Vestroo — EFT — bank-account, ops mark** | Customer / ops steps (summary) | Callback / authority model | Refunds | Reconciliation / ops | Staging vs prod | Env / secrets | Status + rationale |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Initiate booking payment | **`checkout.service.ts`** — **`CheckoutBooking`** → **`payos.ts`** **`createPaymentLink`**; **`CheckoutBookingMomo`** → **`momo.ts`** **`createPaymentLink`**. **`booking.service.ts`** calls **`CheckoutBookingMomo`** on new booking paths. **PayOS** client: **`@payos/node`** in **`payos.ts`**. | **`markBookingPaymentReceived`** after EFT clears: validates amount (variance rules), sets **`payment_status`**, **`payment_received_at`**, **`payment_evidence_ref`**, and **`status`** (**walk-in:** **`awaiting_payment` → `ready_to_assign`**; **account:** **`invoiced` → `paid`**). Customer **prepay** path: emails with bank line items + **`/q/[token]/accept`** → **`awaiting_payment`**. | Customer pays bank; ops records evidence in **`/ops`** flows. No browser POST to a card gateway in first-party code. | **Authority** = ops **Server Action** + RLS-backed update (not an external payment ITN). | **TBD** — manual / finance process (same as prior “no automated refund API” posture). | **`payment_reference`**, **`payment_evidence_ref`**, **`payment_received_at`**, **`payment_status`**, **`status`** — **[data-models.md](data-models.md)**; ops queues and **`ops_audit_log`**. | No PayFast merchant tiers for net-new flows; use **[environment-vars.md](environment-vars.md)** for email/maps secrets actually referenced by the booking stack. | **Ops staff session** + Supabase **`createUserServerClient`** — **[environment-vars.md](environment-vars.md)**. | **implemented** (Theme N) vs **pattern-only** (reference gateways). |
| Transfer / payout style payment (reference) | **`checkout.service.ts`** **`momoTransferTripCalbackReturn`**; **`trip.service.ts`** **`createTransferTripPaymentLink`** (Momo transfer path). | **N/A** — no shipped equivalent in first-party **`src/`** (excluding legacy). | — | Momo callback updates trips via **`transferTripAmountSuccess`**. | Reference refund/payout logic on trips. | Trip totals / transfer logic in reference **Mongo** domain. | — | — | **N/A** (Vestroo MVP); **backlog** if product needs payouts. |
| Deposit / partial capture | PayOS/Momo amount semantics in reference code (per-link totals). | **TBD** — **grep** of shipped **`src/`** (non-legacy), **`supabase/migrations/`**, and **`data-models.md`** showed **no** `deposit` / partial-capture schema or action evidence at documentation time. | — | — | — | — | Same environment discipline when implemented. | — | **gap / TBD** — do **not** assume Momo/PayOS deposit parity without product + schema work. |

### Provider substitution map (support + engineering)

| Reference concept (Momo / PayOS — legacy) | **Vestroo Theme N (EFT + ops mark)** |
| --- | --- |
| **Payment link** from **`payos.ts`** / **`momo.ts`** **`createPaymentLink`** | **Bank details + payment reference** in **`walk-in-quote`** / acceptance emails; customer initiates **EFT** externally |
| **Return URL** / PayOS **`code`** query handling (`getPayOsReturn`) | **`/q/[token]/accept`** shows **EFT** confirmation; **`GET /api/booking-confirmation`** for read-only confirmation where used |
| **Cancel URL** | **N/A** for gateway cancel — booking recovery follows **[front-end-api-interaction.md](front-end-api-interaction.md)** and ops triage (**no** PayFast **`cancel_url`** in shipped code) |
| **Momo `ipnUrl`** / controller POST callbacks | **`markBookingPaymentReceived`** — single server-side transition path with audit (**no** duplicate ITN handlers) |
| **Booking / order code** in reference | Customer-facing **`payment_reference`** (**`VST-*`**) in emails; evidence text in **`payment_evidence_ref`** |
| **Gateway transaction id** (e.g. Momo **`transId`**) | **Evidence / bank ref** captured in **`payment_evidence_ref`** (human-entered); no `pf_payment_id` dependency in Theme N |
| **Reference `any` callback bodies** (`momoCalbackReturn`, etc.) | **Contrast:** Zod-validated **`markBookingPaymentReceived`** input and explicit status guards — extend with narrow DTOs if the action grows (**NFR.4.1**). |

### NFR.3.1 — Secrets / access (EFT slice)

- **Ops actions** require **`getOpsStaffForAction`**; booking updates use **`createUserServerClient`** — no client-trusted payment authority.
- **Bank account details** for emails are merged server-side from configured settings — do **not** expose unpublished keys in client bundles (**NFR.3.1** aligns with **[Security](#security-client-bundle-hygiene)**).
- **Reference** Momo/PayOS env patterns (`ESMS_*`, PayOS keys in **`payos.ts`**) are **not** Vestroo env names — **do not** reuse variable names without an ADR and **`environment-vars.md`** update.

### NFR.1.3 — EFT manual mark — failure modes (INT.8.3 slice)

Align with **`markBookingPaymentReceived`** implementation and **[front-end-api-interaction.md](front-end-api-interaction.md)**:

| Situation | Expected behaviour | Operator / customer next step |
| --- | --- | --- |
| **Booking not in markable status** | **`INVALID_STATUS_FOR_PAYMENT_MARK`** — no DB update | Confirm quote acceptance / invoicing state; retry when valid |
| **Amount variance** beyond **R 0.01** vs expected | **`VARIANCE_REASON_REQUIRED`** until **`varianceReason` ≥ 10 chars** | Enter reason; finance review per process |
| **Idempotent re-mark** (already terminal **paid**) | Success with **`idempotent: true`**; **no** duplicate audit row | None |
| **Database update races** (`DATABASE`) | Retriable message; booking unchanged | Retry; escalate if persists |
| **Audit append failure** (`AUDIT`) | Booking may be updated depending on ordering; response fails closed | Retry; verify **`ops_audit_log`** |

**Operator:** confirm settlement in **`/ops`** surfaces and **`ops_audit_log`** — finance runbook **TBD**.

### NFR.4.1 — TypeScript boundaries (Theme N)

- **`markBookingPaymentReceivedAction`**, input Zod schema — **`src/actions/markBookingPaymentReceived.ts`**.
- **Tests:** **`src/actions/__tests__/markBookingPaymentReceived.test.ts`**.

### Backlog legend

**P0** — ship blocker / immediate fix · **P1** — next-sprint engineering priority · **P2** — parity / polish (product-led). *(Same scheme as [INT.8.1](#int-8-1).)*

### Backlog (payments)

| Gap | Priority |
| --- | -------- |
| Automated **refund** or adjustment workflow beyond manual finance process | **P1** |
| **Deposit** / partial capture product rules + schema | **P2** |
| **Settlement export** / reconciliation beyond **`ops_audit_log`** + **`bookings`** columns | **P2** |
| Reference **transfer-trip** / payout flows → Vestroo capability decision | **P2** |

**EFT settlement** is **operator-driven** via **`markBookingPaymentReceived`**, not an **`@Cron`** timer. Broader **Epic 8** scheduling / background inventory: **[§ INT.8.4](#int-8-4)**.

**INT.8.5** — reference **`share/`** vs Vestroo secrets/config mapping: **[§ INT.8.5](#int-8-5)** (Epic narrative remains in **[Epic 8](epic-8.md)**). **INT.8.6** — outbound HTTP, **timeouts**, **retries**, **idempotency**: **[§ INT.8.6](#int-8-6)**.

**Story 8.3 (INT.8.3)**

<a id="int-8-4"></a>

## INT.8.4 — Scheduled jobs and background work

**Epic 8 (INT.8.4)** — **grep-backed** inventory of **reference** Nest **`@Cron`** jobs vs **Vestroo** platform scheduling (**Next.js** app, **Vercel**, **Supabase**). **Design goal:** **no silent cron** — anything that **must** run on a timer needs a **named owner**, **documented** mapping, and **monitoring** posture (**TBD** is acceptable with explicit reason).

**Thin cross-links:** paid-booking **email** **[INT.8.1](#int-8-1)**; **SMS stub** **[INT.8.2](#int-8-2)** (not timer-driven); **EFT ops mark** **[INT.8.3](#int-8-3)** (Server Action, not cron). Outbound HTTP, **timeouts**, **retries**, **idempotency** for **future** job clients: **[§ INT.8.6](#int-8-6)**; **Server Actions** vs **Route Handlers**: **[front-end-api-interaction.md](front-end-api-interaction.md)**.

### `ScheduleModule` vs domain modules (disambiguation)

- **`@nestjs/schedule`** — **`Cron`**, **`CronExpression`** imports appear only in the three **service** files below. **`grep`** of **`src/legacy/capstone-reference/`** for **`ScheduleModule.forRoot`** / **`import { ScheduleModule } from '@nestjs/schedule'`** returned **no matches** in this vendored tree — the upstream app likely registers scheduling at **`app.module`** not vendored here; **do not** assume **`ScheduleModule`** wiring is present in-repo.
- **`DriverScheduleModule`** (**`backend-modules/driver-schedule/driver-schedule.module.ts`**) is a **domain** Nest module (driver shifts), **not** Nest’s **`ScheduleModule`** from **`@nestjs/schedule`**.

### Reference `@Cron` inventory (legacy only)

Nest **`@Cron`** uses a **6-field** cron string **`second minute hour day month weekday`** (see `@nestjs/schedule` docs). Expression **`'0 20 * * * *'`** → **second `0`**, **minute `20`**, each **hour** (i.e. **:20:00** every hour), not “8pm daily”.

| Reference job (`name:`) | Cron expression | One-line purpose | File path (`src/legacy/capstone-reference/`) | Vestroo mapping | Named owner | Monitoring | Secrets posture |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **`autoCheckoutPendingSchedules`** | **`'0 20 * * * *'`** | Auto-checkout **IN_PROGRESS** driver schedules past shift end; vehicle status + gateway hooks | **`backend-modules/driver-schedule/driver-schedule.service.ts`** | **Manual ops / gap** — no shipped **`@Cron`** equivalent; chauffeur run lifecycle is **ops / dispatch**-driven in Vestroo today | **Head of Ops — Fleet** | **TBD** — no **`docs/`** runbook for “missed auto-checkout” (**grep**: no `hardening` / `monitoring` / `SLO` / `observability` doc anchors at delivery time); use **Vercel** / **Supabase** logs if/when automation ships | **N/A** today; future jobs **must** use **server** env only (**NFR.3.1**; no **`NEXT_PUBLIC_*`** auth) |
| **`handleTripStartTimeout`** | **`CronExpression.EVERY_MINUTE`** | **CONFIRMED** trips with **no** start after **5-minute** window → **DROPPED_OFF**, share-itinerary cancel, notifications, conversation cancel, socket emit | **`backend-modules/trip/trip.service.ts`** | **Manual ops / gap** — trip timeout automation **not** implemented as Nest cron in Vestroo; align with **Realtime** / dispatch stories separately | **Platform Engineering** (with **Head of Ops — Fleet** for SLO) | **TBD** — same doc gap as above | **N/A** today; **server-only** if implemented as hosted cron |
| **`checkTimeToOpenAndClose`** | **`CronExpression.EVERY_MINUTE`** | Open **PENDING** conversations when **`timeToOpen`** due; close **OPENED** when trip terminal or **`timeToClose`** | **`backend-modules/conversation/conversation.service.ts`** | **Manual ops / N/A (product)** — Vestroo **ZA** MVP does not expose this reference **Mongo** conversation timer model | **Product Ops — Communications** | **TBD** | **N/A** today |

### Vestroo + platform inventory (shipped `src/`, Vercel, Supabase)

| Surface | Finding (documentation time) | Named owner | Monitoring | Secrets posture |
| --- | --- | --- | --- | --- |
| **Next.js / `src/`** (paths **not** under **`src/legacy/`**) | **`grep`** **`src/app`**, **`src/actions`**, etc.: **no** **`@Cron`** / **`CronExpression`** / **`/api/cron`** matches (legacy excluded) | **Platform Engineering** | **TBD** | **N/A** (no cron handlers) |
| **`vercel.json`** (repo root) | **`glob`** / search: **no** `vercel.json` at repo root | **Platform Engineering** | **Vercel Dashboard → Cron Jobs** / project logs — **TBD** until a job ships | Hosted cron must use **Vercel** project env (**server**); **no** `NEXT_PUBLIC_*` for job auth |
| **`supabase/migrations/`** | **`grep`** `pg_cron`, `cron.schedule`, `pg_net`: **no matches** | **Platform Engineering** | **Supabase** logs / Dashboard — **TBD** | DB extensions / secrets per Supabase project (**server**) |
| **Domain “schedule” strings** (e.g. **`chauffeur_schedules`**) | **Not** platform cron — business **dispatch** data in **`src/actions/opsDispatch.ts`** etc. | **Head of Ops — Fleet** | Ops UI + DB | Standard **RLS** + service role patterns |

### NFR.3.1 — Scheduled work and secrets

- **Forbidden:** scheduled or **hosted-cron** handlers **must not** authenticate with **`NEXT_PUBLIC_*`** vars or **browser-held** secrets.
- **Required:** **server** env (**Vercel** / **Node**), **Supabase** server contexts, or **signed** webhook-style secrets — align with [Security](#security-client-bundle-hygiene) and **[environment-vars.md](environment-vars.md)**.

### NFR.1.3 — Failure visibility (automation vs manual)

- **Implemented automation (future):** document **HTTP status** for Route Handler crons, **Vercel** function logs, **Supabase** / extension logs, and **operator** triage steps — **TBD**; align with **[hardening-and-go-live.md](hardening-and-go-live.md)** (VST-14) when automation ships.
- **Manual ops (today):** owners above rely on **ops rosters**, **dispatch** tools, and **DB** truth — **runbook TBD** for parity with reference cron **outcomes**.

### NFR.4.1 — Types at boundaries

**N/A** today — no shipped TypeScript **cron** Route Handlers. When **`/api/cron`** (or similar) is added, use **Zod** (or equivalent) at the **HTTP boundary** and extend this section with **test** pointers.

### Backlog (scheduling)

*(Priority legend: same as [INT.8.1](#int-8-1).)*

| Gap | Priority |
| --- | --- |
| **`autoCheckoutPendingSchedules`** parity — hosted cron or **manual runbook** with named SLA | **P1** |
| **`handleTripStartTimeout`** parity — timeout policy for **confirmed** trips without start signal | **P1** |
| **`checkTimeToOpenAndClose`** — decide **N/A** vs productised **conversation** windows for ZA | **P2** |
| **Repo-native `vercel.json` cron** or **Supabase `pg_cron`** — document + owner when introduced | **P2** |

**INT.8.5** — **`share/`** / secrets patterns: **[§ INT.8.5](#int-8-5)**. **INT.8.6** — outbound HTTP, **timeouts**, **retries**, **idempotency**: **[§ INT.8.6](#int-8-6)** (Server Actions vs Route Handlers: **[front-end-api-interaction.md](front-end-api-interaction.md)**).

**Story 8.4 (INT.8.4)**

<a id="int-8-5"></a>

## INT.8.5 — Secrets, config, and shared modules (`share/`)

**Epic 8 (INT.8.5)** — **grep-backed** mapping of **reference** Nest **`backend-share`** / **`src/share/...`** DI patterns (**JWT**, **Redis**, **SMS**, **Momo**, **PayOS**) to **Vestroo** primitives (**Supabase** session + **Realtime**, **env** vars, **PayFast**). **Vendored code is pattern-only** — it does **not** run in Vestroo production and **must not** be imported into first-party routes without **product**, **legal**, and **ADR** review.

### `src/share/` imports vs on-disk layout (legacy)

Reference Nest files **`import … from 'src/share/...'`** (path alias). In this repository, implementations live under **`src/legacy/capstone-reference/backend-share/`** (e.g. **`jwt.ts`**, **`redis.ts`**, **`share.module.ts`**, **`share.port.ts`**, **`di-token.ts`**, **`momo.ts`**, **`payos.ts`**, **`sms.ts`**). There is **no** shipped first-party **`src/share/`** package for production **`src/app`**.

### Matrix (INT.8.5)

| Concern | Reference `share/` / legacy files | Vestroo mapping | ADR / gate | Status + rationale |
| --- | --- | --- | --- | --- |
| **JWT / tokens** | **`backend-share/jwt.ts`** — **`jsonwebtoken`** **`jwt.sign`** / verify; **`share.module.ts`** wires **`TOKEN_PROVIDER`** → **`JwtTokenService`**; **`auth.service.ts`** imports **`jsonwebtoken`**; **`wsAuth.guard.ts`** and WebSocket gateways inject **`TOKEN_PROVIDER`**: **`tracking.gateway.ts`**, **`conversation.gateway.ts`**, **`notification.gateway.ts`**, **`shared-itinerary.gateway.ts`**, **`driver-schedule.gateway.ts`**, **`trip.gateway.ts`** | **Supabase Auth** — **`createUserServerClient()`** in **`src/lib/supabase/server.ts`** uses **`@supabase/ssr`** + **`cookies()`** (SSR cookie transport); **`createServerClient()`** for service-role paths. Parity narrative: **[capstone-auth-keytoken-otp-parity.md](capstone-auth-keytoken-otp-parity.md)** | **First-party staff** **`(ops)`** / **`(field)`** MUST **not** persist session **JWT** material in **`localStorage`** / **`sessionStorage`** unless an **ADR** explicitly revises **[Epic 8](epic-8.md)**; **`docs/adr/`** had **no** JWT-in-browser policy file at delivery **grep** | **implemented** (Supabase cookies) vs **pattern-only** (legacy JWT + gateways) |
| **Redis / socket-state** | **`share.module.ts`** — **`ioredis`** **`Redis`** factory + **`REDIS_CLIENT`**; **`REDIS_PROVIDER`** → **`RedisService`** (**`backend-share/redis.ts`**); gateways + services/repos (**`trip.service.ts`**, **`tracking.service.ts`**, **`users.repo.ts`**, **`shared-itinerary.repo.ts`**, …) inject **`REDIS_PROVIDER`** | **Supabase Realtime** + Postgres — **`src/lib/supabase/realtime.ts`** (typed channel helpers; RLS/JWT-scoped per comments); product depth **[realtime-and-notifications.md](realtime-and-notifications.md)** | **Redis (or equivalent) MUST NOT be introduced solely to mimic the reference** — **ADR** must approve **cost** and **hosting**; **`docs/adr/`** had **no** Redis ADR at delivery **grep** | **N/A** — **`ioredis`** only under **`src/legacy/capstone-reference/`**; **no** **`ioredis`** in first-party **`src/`** (excluding **`src/legacy/`**) at delivery **grep**. (**`jsonwebtoken`** / signing — **JWT** row.) |
| **SMS** | **`SMS_PROVIDER`** → **`SmsService`** (**`backend-share/sms.ts`**) | **Stub** + policy — **[INT.8.2 — SMS stub and policy parity](#int-8-2)** | **Product + legal** before any **`share/`**-style provider wiring | **stub** (Vestroo) / **pattern-only** (reference) |
| **Momo** | **`MOMO_PROVIDER`** / **`backend-share/momo.ts`**; **`trip.service.ts`** consumes **`IMomoService`** | **Theme N — EFT + ops mark** substitution — **[INT.8.3 — Payments](#int-8-3)** | **No** VN gateway secrets without ADR + **[environment-vars.md](environment-vars.md)** review | **N/A** (ZA Theme N authoritative) |
| **PayOS** | **`PAYOS_PROVIDER`** / **`backend-share/payos.ts`**; **`checkout.service.ts`** uses **`IPayosService`** | **[INT.8.3 — Payments](#int-8-3)** | Same as **Momo** row | **N/A** (ZA Theme N authoritative) |

**Reference-only UI (`localStorage`):** vendored **`src/features/capstone-reference/`** (admin/manager customer clones) contains **`localStorage`** token patterns — **not** **`src/app/(ops)`**, **`src/features/ops`**, **`src/app/(field)`**, or **`src/features/field`** (**grep** at delivery: **no** `localStorage` / `sessionStorage` matches).

### NFR.3.1 — Secrets (`share/` slice)

- **Server-only** provider keys and signing material — align with [Security](#security-client-bundle-hygiene) and **[environment-vars.md](environment-vars.md)**.
- **`NEXT_PUBLIC_*`** carries **only** anon-safe values (e.g. Supabase URL/anon key) — **never** Redis passwords, Momo/PayOS secrets, or **JWT signing** keys.

### NFR.4.1 — TypeScript boundaries (cited shipped)

- **`createUserServerClient`**, **`createServerClient`** — **`src/lib/supabase/server.ts`** (narrow env + cookie adapter).
- **Realtime row types** — e.g. **`VehicleTrackingRealtimeRow`**, **`TripRealtimeRow`** in **`src/lib/supabase/realtime.ts`** (RLS-scoped payloads).

### INT.8.6 (HTTP / idempotency)

Canonical outbound HTTP + **idempotency** inventory: **[§ INT.8.6](#int-8-6)**. **[front-end-api-interaction.md](front-end-api-interaction.md)** — when to use **Server Actions** vs **Route Handlers** (complementary, not a duplicate of **INT.8.6**).

### Backlog (share / ADR)

*(Priority legend: same as [INT.8.1](#int-8-1).)*

| Gap | Priority |
| --- | --- |
| **ADR** — **Redis** (or equivalent) solely to mimic reference socket fan-out | **P1** |
| **ADR** — exception allowing **staff JWT** in **browser storage** for first-party **`/ops`** / **`/field`** | **P2** (default **forbidden** per Epic 8) |
| Sub-processor / **PII** tone when adding **SMS** / **JWT**-bearing logs | **P2** — **[compliance-and-safety.md](compliance-and-safety.md)**, **[stories/vst-12.story.md](stories/vst-12.story.md)** |

**Thin sibling links:** **[INT.8.2](#int-8-2)** (**SMS** / **`share/`** gate); **[INT.8.3](#int-8-3)** (**Momo/PayOS → Theme N EFT**); **[INT.8.4](#int-8-4)** (**cron** must stay **server-only** — same secrets posture); **[INT.8.6](#int-8-6)** (outbound HTTP / idempotency matrix).

**Story 8.5 (INT.8.5)**

<a id="int-8-6"></a>

## INT.8.6 — Third-party HTTP clients and idempotency

**Epic 8 (INT.8.6)** — **grep-backed** map of **material outbound HTTP** in **Vestroo** vs **reference** Nest **`axios`** / **`@nestjs/axios`** (**`HttpModule`**, **`HttpService`**). **PayFast ITN** idempotency and **Momo/PayOS** substitution are **not** re-documented here — see **[PayFast webhook lifecycle](#payfast-webhook-lifecycle)** and **[INT.8.3](#int-8-3)**. **Resend** retry depth — **[INT.8.1](#int-8-1)**. **SMS** policy / stub — **[INT.8.2](#int-8-2)**. **`share/`** DI secrets — **[INT.8.5](#int-8-5)**.

**Stack contrast (FE.5.9):** **[capstone-reference-stack-integration.md](capstone-reference-stack-integration.md)** — Nest outbound clients vs **Next.js** server **`fetch`** / SDKs.

### Reference inventory (pattern-only)

**`grep`** highlights under **`src/legacy/capstone-reference/`**:
- **`@nestjs/axios`**: **`HttpModule`** in **`backend-share/share.module.ts`**, **`backend-modules/OSR/osr.module.ts`**; **`HttpService`** in **`backend-share/sms.ts`**, **`backend-modules/OSR/osr.service.ts`**.
- **`axios`**: **`backend-share/momo.ts`**; **`frontend-driver/src/services/apiClient.ts`**, **`userServices.ts`**.
- **`@payos/node`** SDK (**not** raw **`axios`**) — **`backend-share/payos.ts`**.
- **`src/features/capstone-reference/**`** — widespread **`axios`** / **`fetch`** in **non-production** reference UIs — **do not** treat as **`(app)`** / **`(ops)`** / **`(field)`** product traffic.

### Shipped inventory (**`src/`** excluding **`src/legacy/`** and **`src/features/capstone-reference/`**)

**`grep`**: **no** **`axios`** in **`src/app`**, **`src/actions`**, **`src/lib`**, **`src/services`**, **`src/features/ops`**, **`src/features/field`** at delivery time. **First-party `fetch(`:** **`src/lib/maps.ts`** (**`calculateRouteDistance`** → Google Distance Matrix JSON); **`src/app/(app)/confirmation/page.tsx`** → **`GET /api/booking-confirmation?id=…`**.

### Matrix (INT.8.6)

| Integration / outbound call | Reference client (legacy / pattern UI) | Vestroo implementation | Timeout | Retries | Idempotency | NFR notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Google Distance Matrix** (server) | Reference stack uses **many** **`axios`** / **`HttpService`** paths elsewhere; **not** this **`fetch`** helper | **`src/lib/maps.ts`** — **`fetch(url)`** in **`calculateRouteDistance`**; **`GOOGLE_MAPS_SERVER_KEY`** on query string | **TBD** — **no** **`AbortSignal`** / explicit **ms** budget on **`fetch`** at delivery **grep** | **none** in **`maps.ts`** (caller may re-invoke) | Read-only **GET**-style URL; quote pipeline treats failures as **`UNKNOWN_ERROR`** / degraded distance | **NFR.3.1** server key only; **NFR.4.1** typed **`DistanceMatrixResponse`** / **`RouteDistanceResult`** |
| **Resend** (booking confirmation email) | Reference **SMS** uses **`HttpService`** (**`sms.ts`**) — different channel | **`src/services/email.ts`** — **Resend** SDK + **`RETRY_CONFIG`** / **`isRetryableError`** | SDK / HTTP defaults + app backoff (**see [INT.8.1](#int-8-1)**) | **Exponential backoff** (bounded) | **Payment authority** is **PayFast ITN** — email is **after** idempotent **`paid`** transition (**[INT.8.3](#int-8-3)**) | **NFR.1.3** in **INT.8.1**; **NFR.4.1** **`BookingEmailData`**, **`EmailResult`** |
| **PayFast ITN ingest** | — | **`POST`** **`src/app/api/payfast/webhook/route.ts`** — **`verifyPayFastWebhookSignature`**, **`Record<string, string>`** payload | Request / platform timeouts (**TBD** runbook) | Provider-driven ITN retries | **Duplicate `COMPLETE`** safe — **[PayFast webhook lifecycle](#payfast-webhook-lifecycle)**; tests **`src/app/api/payfast/webhook/__tests__/route.test.ts`** | **NFR.3.1**; cite **INT.8.3** not duplicate steps |
| **PayFast hosted checkout handoff** | Momo/PayOS reference gateways (**`axios`** / **`@payos/node`**) | **`processPayment`** + **`initializePayFastModal`** — **browser `<form>` POST** to PayFast **`/eng/process`** (**no** first-party **`axios`** to card host) | Browser / PayFast UX | **none** in app | **New** booking row per checkout attempt (**[front-end-api-interaction.md](front-end-api-interaction.md)**) | **NFR.3.1** |
| **Booking confirmation page** (first-party **`fetch`**) | — | **`src/app/(app)/confirmation/page.tsx`** → **`/api/booking-confirmation`** | **TBD** — **no** **`signal:`** seen at delivery **grep** | **none** documented | **GET** by **`id`** — safe to repeat | **NFR.4.1** typed response handling in route |
| **SMS** (future HTTP client) | **`HttpService`** in **`backend-share/sms.ts`** | **Stub** today — **[INT.8.2](#int-8-2)** | **TBD** | **TBD** | **TBD** | **PII** — **[compliance-and-safety.md](compliance-and-safety.md)** when wiring |

### NFR.3.1 / NFR.1.3 / NFR.4.1 (INT.8.6 slice)

- **NFR.3.1:** Outbound integration secrets remain **server-only** — [Security](#security-client-bundle-hygiene), **[environment-vars.md](environment-vars.md)**.
- **NFR.1.3:** Document **timeouts**, **retries**, and **duplicate-event** behaviour per row; **TBD** rows are **backlog**, not hidden defaults.
- **NFR.4.1:** Prefer **narrow** types at HTTP boundaries (**`payfast.ts`**, **`maps.ts`**, webhook **`Record`**, email types — **INT.8.1**).

### Backlog (HTTP / idempotency)

*(Priority legend: same as [INT.8.1](#int-8-1).)*

| Gap | Priority |
| --- | --- |
| **`calculateRouteDistance`** — **`AbortSignal`** + explicit **timeout ms** + failure telemetry | **P1** |
| **`confirmation` page** **`fetch`** — timeout / **AbortSignal** policy | **P2** |
| Future **SMS** provider HTTP client — align rows with **[INT.8.2](#int-8-2)** backlog | **P2** |
| **Idempotency keys** for future **non-GET** outbound side effects (POST to third parties) | **P2** |

**Story 8.6 (INT.8.6)**

## Cross-links

- **[INT.8.1 — Email template parity](#int-8-1)** — Epic 8 inventory (Mailer / Resend / triggers / backlog)
- **[INT.8.2 — SMS stub and policy parity](#int-8-2)** — Epic 8 SMS stub, reference OTP-by-SMS, **`share/`** gate, env footnote
- **[INT.8.3 — Payments: Momo / PayOS vs PayFast](#int-8-3)** — Epic 8 payment substitution map, PayFast lifecycle pointers, backlog
- **[INT.8.4 — Scheduled jobs and background work](#int-8-4)** — Epic 8 `@Cron` inventory, Vercel/Supabase honesty, owners + monitoring **TBD**
- **[INT.8.5 — Secrets, config, and shared modules (`share/`)](#int-8-5)** — Epic 8 `share/` DI vs Supabase/Realtime/PayFast; ADR gates (**Redis**, staff JWT storage)
- **[INT.8.6 — Third-party HTTP clients and idempotency](#int-8-6)** — Epic 8 outbound `fetch`/SDK/webhook matrix vs reference **axios**/**HttpModule**; timeouts + backlog
- **[data-models.md](data-models.md)** — `bookings` payment + invoicing columns
- **[environment-vars.md](environment-vars.md)** — integration variable matrix
- **[front-end-api-interaction.md](front-end-api-interaction.md)** — actions, webhook, maps boundaries
- **[local-development.md](local-development.md)** — sandbox + failure simulation
- **[staging-and-promotion.md](staging-and-promotion.md)** — staging PayFast checks
- **Code:** `src/lib/maps.ts`, `src/lib/pricing-env.ts`, `src/actions/processPayment.ts`, `src/app/api/payfast/webhook/route.ts`
