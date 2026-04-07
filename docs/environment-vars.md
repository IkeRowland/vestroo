# Environment Variables

Values are set locally in `.env.local` (from [`.env.example`](../.env.example)) and in **Vercel** per environment. This stack is **Next.js 15 + Supabase** (no Payload CMS in-repo).

**Cross-check with `.env.example`:** Every variable named in the tables below has a corresponding line in `.env.example` (active placeholder or commented optional example). Optional pricing and SMS vars appear as **commented** lines—uncomment and fill when you use them.

**VST-13 integrations:** Full matrix and runbook notes live in **[integrations-and-payments.md](integrations-and-payments.md)**.

## Client-side (`NEXT_PUBLIC_*`)

**Rule:** No secrets in `NEXT_PUBLIC_*`. These names are embedded in browser bundles.

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key; RLS applies. |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | **Browser only** — Google Maps JavaScript API / Places (e.g. `AddressAutocomplete`). Restrict in Google Cloud by **HTTP referrer**. **Do not** use this key for Distance Matrix on the server. |
| `NEXT_PUBLIC_APP_URL` | Site base URL (return/cancel links, PayFast `notify_url` prefix, e.g. `http://localhost:3000`). |

## Server-only

| Variable | Purpose |
| -------- | ------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Full database access; **never** expose to the client or `NEXT_PUBLIC_*`. Used in Server Actions and API routes that must bypass RLS safely. |
| `GOOGLE_MAPS_SERVER_KEY` | **Server only** — Google Distance Matrix / web services for `calculateQuote` and `reconcileBookingQuote` (see `src/lib/maps.ts`). Restrict by **IP** or server identity in Google Cloud. |
| `PAYFAST_MERCHANT_ID` | PayFast merchant id (signing/checkout; **not** `NEXT_PUBLIC_*`). |
| `PAYFAST_MERCHANT_KEY` | PayFast merchant key for server-side signing (`processPayment`). |
| `PAYFAST_PASSPHRASE` | PayFast passphrase for signatures and webhook verification. |
| `PAYFAST_URL` | PayFast site root (sandbox or production); used for checkout form `action` base (`/eng/process`) and defaults to sandbox when unset. |
| `RESEND_API_KEY` | Resend API for transactional email. |
| `RESEND_FROM_EMAIL` | From address (verified in Resend). |
| `PRICING_BASE_PRICE_PER_KM` | Optional; per-km rate for point-to-point quotes (premium default **22** ZAR/km if unset — see `src/lib/pricing-env.ts`). |
| `PRICING_HOURLY_MINIMUM_HOURS` | Optional; minimum billable hours for hourly hire (default **3**). |
| `PRICING_HOURLY_BASE_RATE_ZAR` | Optional; ZAR per hour before vehicle multiplier (default **520**). |
| `SMS_PROVIDER_API_KEY` | Optional stub for **VST-9**; not read by booking actions yet (`src/services/sms-stub.ts`). |
| `SMS_PROVIDER_FROM_NUMBER` | Optional; same — future SMS provider. |

## Integration matrix by tier (names only)

| Name | Dev | Staging | Production | Client? |
|------|-----|---------|------------|---------|
| `NEXT_PUBLIC_SUPABASE_*` | Dev project | Staging project | Prod project | Yes (anon only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Dev | Staging | Prod | **No** |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Referrer-restricted test key | Staging host | Prod host | Yes |
| `GOOGLE_MAPS_SERVER_KEY` | Dev / team key | Staging | Prod | **No** |
| `PAYFAST_MERCHANT_ID` | Sandbox | Sandbox | Live | **No** |
| `PAYFAST_MERCHANT_KEY` | Sandbox | Sandbox | Live | **No** |
| `PAYFAST_PASSPHRASE` | Sandbox | Sandbox | Live | **No** |
| `PAYFAST_URL` | `https://sandbox.payfast.co.za` | Sandbox URL | Live URL | **No** |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Staging URL | Prod URL | Yes |
| `RESEND_*` | Test / dev sender | Staging | Prod | **No** |

**Invoicing hooks** use database columns only — no separate env toggles in MVP.

## Optional

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Direct Postgres URL (Supabase CLI, tools). Not required for the Next.js Supabase JS client alone. |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | Supabase Storage S3-compatible API (`src/lib/image-url.ts`). |
| `SUPABASE_STORAGE_BUCKET` | Fallback bucket name if `S3_BUCKET` is unset. |

## Deprecated / removed

- **Payload CMS** (`PAYLOAD_SECRET`, `payload.config.ts`): not used by the current app; omit from new environments.
- **`NEXT_PUBLIC_PAYFAST_MERCHANT_ID` / `NEXT_PUBLIC_PAYFAST_URL`:** removed in VST-13 — merchant id is **`PAYFAST_MERCHANT_ID`** (server); PayFast host is read on the server and passed to the client as **`payfastProcessBaseUrl`** from `processPayment`.
