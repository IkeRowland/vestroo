# Integrations and payments (VST-13)

This document is the engineering contract for **maps**, **PayFast**, **email/SMS consumers**, **corporate invoicing hooks**, and **environment-specific configuration**. It complements **[environment-vars.md](environment-vars.md)**, **[data-models.md](data-models.md)**, and **[front-end-api-interaction.md](front-end-api-interaction.md)**.

## Integration matrix

| Integration | Role in app | Implementation touchpoints |
|-------------|-------------|----------------------------|
| **Google Maps** | Places Autocomplete (browser); Distance Matrix (server) for point-to-point quotes | `src/components/ui/AddressAutocomplete.tsx`, `src/lib/maps.ts`, `src/actions/calculateQuote.ts`, `src/lib/booking-quote-reconcile.ts`, `src/lib/quote-engine.ts` |
| **PayFast** | Hosted checkout, ITN webhook, signatures | `src/actions/processPayment.ts`, `src/lib/payfast.ts`, `src/lib/payfast-client.ts`, `src/app/api/payfast/webhook/route.ts` |
| **Resend** | Transactional email (paid confirmation) | `src/services/email` (invoked from webhook) |
| **SMS** | Stub / future provider | `src/services/sms-stub.ts` — consumer only; no gateway in this slice |
| **Corporate invoicing** | Flags + short references on `bookings`; ops visibility | Columns on `public.bookings` (migration `20260413130000_vst13_corporate_invoicing_hooks.sql`), Zod on `src/actions/booking-schemas.ts`, staff UI `src/app/(ops)/ops/invoicing/page.tsx`, `src/actions/opsInvoicingHooks.ts` |
| **Future accounting export** | Not implemented | Documented here as **out of scope** for MVP (no Xero/Sage sync) |

## Per-environment expectations (dev / staging / production)

| Tier | Maps | PayFast | Email |
|------|------|---------|--------|
| **Local dev** | Sandbox/restricted keys; `GOOGLE_MAPS_SERVER_KEY` + `NEXT_PUBLIC_GOOGLE_MAPS_KEY` as needed | `PAYFAST_URL=https://sandbox.payfast.co.za`, sandbox merchant credentials | Resend test domain or skip sending |
| **Staging** | Non-production Google project or restricted keys tied to staging host | Sandbox merchant; `notify_url` must hit **staging** base URL | Same as dev or staging sender |
| **Production** | Production Google project; **separate** server vs browser key restrictions | Live PayFast merchant; live `PAYFAST_URL` | Verified production domain in Resend |

Quote tolerance and premium defaults remain environment-driven via **`src/lib/pricing-env.ts`** (see **[environment-vars.md](environment-vars.md)**).

## PayFast webhook lifecycle

1. **ITN URL:** `POST {NEXT_PUBLIC_APP_URL}/api/payfast/webhook` — set in `processPayment` as `notify_url`.
2. **Signature:** `verifyPayFastWebhookSignature` in **`src/lib/payfast.ts`** is the **only** verification path for this route (do not duplicate MD5 logic elsewhere).
3. **Idempotency:** PayFast may retry ITNs. Behaviour:
   - **`COMPLETE`:** If `bookings.payment_status` is already **`paid`**, respond **`200`** with `{ message: "Already processed" }` — **no** second email, **no** conflicting status writes.
   - **First `COMPLETE`:** Conditional update `… WHERE payment_status <> 'paid'` so only one writer transitions the row; confirmation email runs **only** after a successful transition.
   - **`FAILED` / `CANCELLED`:** Sets `payment_status = failed`, `status = pending` (retry path); if the row is already **paid**, respond **`200`** and **do not** downgrade.
4. **Customer reference:** `payment_reference` (`VST-*`) stays customer-facing; **`trans_id`** stores PayFast `pf_payment_id` (gateway id).

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

## Cross-links

- **[data-models.md](data-models.md)** — `bookings` payment + invoicing columns
- **[environment-vars.md](environment-vars.md)** — integration variable matrix
- **[front-end-api-interaction.md](front-end-api-interaction.md)** — actions, webhook, maps boundaries
- **[local-development.md](local-development.md)** — sandbox + failure simulation
- **[staging-and-promotion.md](staging-and-promotion.md)** — staging PayFast checks
- **Code:** `src/lib/maps.ts`, `src/lib/pricing-env.ts`, `src/actions/processPayment.ts`, `src/app/api/payfast/webhook/route.ts`
