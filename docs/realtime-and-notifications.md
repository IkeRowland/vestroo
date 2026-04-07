# Realtime and notifications (VST-9)

This document describes **live vehicle location**, **ETA**, **operational notifications**, **rate limits**, and **privacy tiers** for the Vestroo stack (Supabase PostgreSQL + Realtime + Next.js).

## Legal and product boundary (VST-12)

Engineering documentation here supports **POPIA-oriented** design (minimise PII in notification copy, RLS, consent concepts). **It does not replace legal sign-off**, privacy policies, or data-processing agreements. Full **compliance vault**, **retention/export** UIs, and **legal approval** are **VST-12** and out of scope for this story.

## Channels and roles

| Channel / surface | Dispatcher / admin | Chauffeur | Customer |
|-------------------|-------------------|-----------|----------|
| **`vehicle_trackings`** (Realtime `postgres_changes`) | Yes — full row set permitted by RLS (`is_staff`) | Yes — rows for own `chauffeur_assignments` only | **No** in MVP — customers do **not** have `SELECT` on `vehicle_trackings` (phased RLS; add explicit customer policies + consent before exposing). |
| **`trips`** Realtime | Yes — staff RLS | Partial — own trips per existing policies | Own trips only where policies allow |
| **`notifications` table** | Insert for others via staff JWT (`notifications_own` check includes `is_staff`) | Insert for **linked trip customer** via policy `notifications_chauffeur_customer_insert` | Read own rows (`recipient_id`) |
| **In-app / table only** | As above | As above | As above |
| **Native push (Apple/Google)** | **Out of scope** for this slice unless product adds it explicitly | Same | Same |

## Privacy matrix (VIP vs corporate vs staff)

| Tier | Location / map precision | ETA display | Notes |
|------|-------------------------|-------------|--------|
| **Staff** (dispatcher/admin) | Full lat/lng from DB / Realtime | Full — use `estimated_arrival` or trip window | Ops board uses staff-tier data. |
| **Corporate** (contract + consent, future customer app) | ~4 decimal degrees (~10 m) via `roundCoordinatesForPrivacyTier` | Rounded minutes / windows | Implement in UI when customer subscription path exists. |
| **VIP** | ~3 decimal degrees (~100 m) | Coarser wording (e.g. bands) | Product rule: never show higher precision to a lower tier than policy allows. |

**MVP:** Customer **Realtime** on `vehicle_trackings` is **not** enabled; chauffeur and staff paths are implemented first so precision cannot leak to the wrong role via this table.

## Consent and visibility (stub)

- **User-facing copy** and **account flags** (e.g. “share live location with booker”) are **stubs** pending PO/UX — store future consent on `profiles` or `bookings` in a later migration when defined.
- **Engineering:** only emit location and notifications when the active **Server Action** authorises the actor (chauffeur JWT for own trips; staff JWT for ops).

## Update intervals and rate limits

| Layer | Value | Where |
|-------|--------|--------|
| **Server** | Max **12** writes per **minute** per `chauffeur_assignment_id` | Enforced by minimum **5 s** between successful `vehicle_trackings` updates (`src/lib/vehicle-tracking-throttle.ts`, `publishChauffeurLocationAction`). |
| **Client (field)** | Publish attempt every **8 s** while `assigned` / `en_route` | `FIELD_LOCATION_PUBLISH_INTERVAL_MS` in `FieldLocationPublisher` (well under server cap). |
| **Ops board** | **2 s** debounce before `router.refresh()` after Realtime events | `OpsBoardRealtimeBridge` — coalesces bursts. |

## Supabase Realtime + RLS

- Clients use **`createClientClient()`** (anon key + user JWT only). **Never** ship the **service role** key to the browser.
- Subscriptions: `postgres_changes` on **`public.vehicle_trackings`** and **`public.trips`** (see `src/lib/supabase/realtime.ts`).
- **RLS:** Each subscriber receives only rows allowed by policies for their JWT. **Verification (staging):** (1) Sign in as chauffeur A — expect **only** tracking rows tied to A’s assignments. (2) Sign in as staff — expect broader read. (3) Sign in as customer — expect **no** `vehicle_trackings` events until policies are added.
- **Provider caveats:** See [Supabase Realtime](https://supabase.com/docs/guides/realtime) and [Realtime quotas](https://supabase.com/docs/guides/realtime/rate-limits) for connection and message limits; large payloads and high churn may require filtering or narrower subscriptions.

## ETA

- **Primary on tracking row:** `vehicle_trackings.estimated_arrival` — set server-side when the chauffeur publishes location and a booking **destination** lat/lng exists (haversine + default **35 km/h** stub speed in `src/lib/maps.ts`).
- **Upgrade path:** Prefer **Google Distance Matrix** (already used for quotes via `calculateRouteDistance`) when keys and quotas allow; keep haversine as fallback for field ETA when Matrix is unavailable.

## Operational notifications

- **Persistence:** `public.notifications` with **`kind`** (`assignment`, `change`, `no_show`, `trip_status`, `general`), **`metadata`** (jsonb, ids/status labels only), **`channel`** (`in_app` default).
- **Paths:** Server Actions **`opsDispatch.ts`** (assign, status, delay, swap) and **`fieldChauffeur.ts`** (confirm / complete → customer) call **`insertOperationalNotifications`** (`src/lib/operational-notifications.ts`). Inserts use the **same user-scoped Supabase client** as the action; **staff** and **chauffeur** policies allow targeted inserts without service role.
- **No-show:** Ops **cancelled** status uses `kind = no_show` as a **hook**; finer rules (e.g. explicit no-show reason) can narrow this later.

## Security and audit

- **No service role in the browser.**
- **Sensitive patterns:** Prefer logging operational actions in **`ops_audit_log`** (already used by dispatch/field). Optional future: audit Realtime subscription attempts (defence in depth) — not required for MVP.

## Related code

- `src/actions/fieldLocation.ts` — location ingestion + throttle.
- `src/lib/supabase/realtime.ts` — channel builders.
- `docs/ops-console.md`, `docs/field-tools.md` — product runbooks.
