# Realtime and notifications (VST-9)

This document describes **live vehicle location**, **ETA**, **operational notifications**, **rate limits**, and **privacy tiers** for the Vestroo stack (Supabase PostgreSQL + Realtime + Next.js).

## Legal and product boundary (VST-12)

Engineering documentation here supports **POPIA-oriented** design (minimise PII in notification copy, RLS, consent concepts). **It does not replace legal sign-off**, privacy policies, or data-processing agreements. Full **compliance vault**, **retention/export** UIs, and **legal approval** are **VST-12** and out of scope for this story.

## Channels and roles

| Channel / surface | Dispatcher / admin | Chauffeur | Customer |
|-------------------|-------------------|-----------|----------|
| **`vehicle_trackings`** (Realtime `postgres_changes`) | Yes — full row set permitted by RLS (`is_staff`) | Yes — rows for own `chauffeur_assignments` only | **No** in MVP — customers do **not** have `SELECT` on `vehicle_trackings` (phased RLS; add explicit customer policies + consent before exposing). |
| **`trips`** Realtime | Yes — staff RLS | Partial — own trips per existing policies | Own trips only where policies allow |
| **`service_runs`** Realtime (**SH.9.4**) | Yes — `service_runs_staff` + party policy | Yes — runs linked via own **`trips`** (chauffeur) or ticket/booking party predicates | Yes — runs linked via own **`trips`**, **`tickets`**, or **`bookings`** per **`service_runs_select_party`** (no open `USING (true)` read) |
| **`chauffeur_assignments`** Realtime (**SH.9.4**) | Yes — staff | Yes — own `chauffeur_id` only | **No** direct assignment row for unrelated customers — customers consume **trip** / **ticket** surfaces; RLS denies cross-party rows |
| **`notifications` table** | Insert for others via staff JWT (`notifications_own` check includes `is_staff`) | Insert for **linked trip customer** via policy `notifications_chauffeur_customer_insert` | Read own rows (`recipient_id`) |
| **In-app / table only** | As above | As above | As above |
| **Native push (Apple/Google)** | **Out of scope** for this slice unless product adds it explicitly | Same | Same |

## Privacy matrix (VIP vs corporate vs staff)

| Tier | Location / map precision | ETA display | Notes |
|------|-------------------------|-------------|--------|
| **Staff** (dispatcher/admin) | Full lat/lng from DB / Realtime | Full — use `estimated_arrival` or trip window | Ops board uses staff-tier data. |
| **Corporate** (contract + consent, future customer app) | ~4 decimal degrees (~10 m) via `roundCoordinatesForPrivacyTier` | Rounded minutes / windows | Implement in UI when customer subscription path exists. |
| **VIP** | ~3 decimal degrees (~100 m) | Coarser wording (e.g. bands) | Product rule: never show higher precision to a lower tier than policy allows. |

**MVP:** Customer **Realtime** on `vehicle_trackings` is **not** enabled; chauffeur and staff paths are implemented first so precision cannot leak to the wrong role via this table. **Patterned runs (SH.9.4):** run metadata (**`service_runs`**) may reach customers **only** when RLS ties them to a **trip** or **ticket/booking** party — still **no** raw vehicle track stream; any future customer map must use **`roundCoordinatesForPrivacyTier`** (corporate / VIP tiers), not staff-precision **`current_location`** from **`vehicle_trackings`**.

## Consent and visibility (stub)

- **User-facing copy** and **account flags** (e.g. “share live location with booker”) are **stubs** pending PO/UX — store future consent on `profiles` or `bookings` in a later migration when defined.
- **Engineering:** only emit location and notifications when the active **Server Action** authorises the actor (chauffeur JWT for own trips; staff JWT for ops).

## Update intervals and rate limits

| Layer | Value | Where |
|-------|--------|--------|
| **Server** | Max **12** writes per **minute** per `chauffeur_assignment_id` | Enforced by minimum **5 s** between successful `vehicle_trackings` updates (`src/lib/vehicle-tracking-throttle.ts`, `publishChauffeurLocationAction`). |
| **Client (field)** | Publish attempt every **8 s** while `assigned` / `en_route` | `FIELD_LOCATION_PUBLISH_INTERVAL_MS` in `FieldLocationPublisher` (well under server cap). |
| **Ops board** | **2 s** debounce before `router.refresh()` after Realtime events | `OpsBoardRealtimeBridge` — coalesces bursts (`trips`, **`vehicle_trackings`**, **`service_runs`**). |
| **`service_runs` / `chauffeur_assignments`** (**SH.9.4**) | Same **server** caps as other writes (**not** a high-frequency client publish path). **`subscribeChauffeurAssignments`** optional **`chauffeur_id=eq…`** filter for field — align with chauffeur location cadence above when wiring. | Helpers in **`src/lib/supabase/realtime.ts`**; **`chauffeur_schedules`** stays **off** Realtime (roster = query/refresh). |

## Supabase Realtime + RLS

- Clients use **`createClientClient()`** (anon key + user JWT only). **Never** ship the **service role** key to the browser.
- Subscriptions: `postgres_changes` on **`public.vehicle_trackings`**, **`public.trips`**, **`public.service_runs`**, and **`public.chauffeur_assignments`** (see `src/lib/supabase/realtime.ts`; publication extended in **`20260418150000_sh94_patterned_run_realtime.sql`**). **`public.notifications`** is **not** subscribed in shipped app code and was **not** in the original VST-9 publication (**`20260409120000_vst9_realtime_notifications.sql`** added **`vehicle_trackings`** + **`trips` first**). **`public.ratings`** is **also** out of scope for shipped Realtime: **no** channel builder in **`realtime.ts`** and **no** publication row — default ingestion/read remains **batch** / **on navigation** until product + **ADR** say otherwise (**[RT.7.6](capstone-backend-module-matrix.md#rt-7-6)** / **NFR.5.5**).
- **RLS:** Each subscriber receives only rows allowed by policies for their JWT. **Verification (staging):** (1) Sign in as chauffeur A — expect **only** tracking rows tied to A’s assignments. (2) Sign in as staff — expect broader read. (3) Sign in as customer — expect **no** `vehicle_trackings` events until policies are added. (4) **SH.9.4:** As customer B, expect **no** `service_runs` / `chauffeur_assignments` events for runs you are not party to; as chauffeur A, expect **no** other chauffeur’s assignment rows.
- **Provider caveats:** See [Supabase Realtime](https://supabase.com/docs/guides/realtime) and [Realtime quotas](https://supabase.com/docs/guides/realtime/rate-limits) for connection and message limits; large payloads and high churn may require filtering or narrower subscriptions.

## ETA

- **Primary on tracking row:** `vehicle_trackings.estimated_arrival` — set server-side when the chauffeur publishes location and a booking **destination** lat/lng exists (haversine + default **35 km/h** stub speed in `src/lib/maps.ts`).
- **Upgrade path:** Prefer **Google Distance Matrix** (already used for quotes via `calculateRouteDistance`) when keys and quotas allow; keep haversine as fallback for field ETA when Matrix is unavailable.

## Operational notifications

- **Persistence:** `public.notifications` with **`kind`** (`assignment`, `change`, `no_show`, `trip_status`, `general`), **`metadata`** (jsonb, ids/status labels only), **`channel`** (`in_app` default).
- **Paths:** Server Actions **`opsDispatch.ts`** (assign, status, delay, swap) and **`fieldChauffeur.ts`** (confirm / complete → customer) call **`insertOperationalNotifications`** (`src/lib/operational-notifications.ts`). Inserts use the **same user-scoped Supabase client** as the action; **staff** and **chauffeur** policies allow targeted inserts without service role.
- **No-show:** Ops **cancelled** status uses `kind = no_show` as a **hook**; finer rules (e.g. explicit no-show reason) can narrow this later.

### Web MVP gaps and interim patterns (**RT.7.2**)

- **No native push** — table + RLS only unless product adds Apple/Google; aligns with § *Channels and roles* above (**NFR.5.5**).
- **SMS** — not wired as an operational notification channel; stub **`src/services/sms-stub.ts`**, **[environment-vars.md](environment-vars.md)** (**`SMS_PROVIDER_*`**), matrix in **[integrations-and-payments.md](integrations-and-payments.md)**; integration scope **[VST-13 story](stories/vst-13.story.md)**.
- **Interim comms** — **[field-tools.md](field-tools.md)** (maps deep links, **`tel:`** contact policy, audit) plus persisted **`notifications`** for audit-style operational record; **no** dedicated mark-read inbox UI in shipped **`(ops)` / `(field)` / `(app)`** yet — see **[capstone backend module matrix](capstone-backend-module-matrix.md)** § **RT.7.2 / Epic 7 — NotificationModule → Vestroo**.

## Security and audit

- **No service role in the browser.**
- **Sensitive patterns:** Prefer logging operational actions in **`ops_audit_log`** (already used by dispatch/field). Optional future: audit Realtime subscription attempts (defence in depth) — not required for MVP.

**Policy consolidation:** Per-topic **who may subscribe**, **RLS pointers**, **rate limits**, **privacy tiers**, **provider quota posture**, **staging observability**, **`techContext` align-or-gap**, and **load/soak honesty** live in the canonical matrix § **RT.7.4** — **[capstone-backend-module-matrix.md](capstone-backend-module-matrix.md#rt-7-4)**. This document remains authoritative for **channel behaviour** and **interval tables**; if the two diverge, **RT.7.4** should be updated in the same change set.

## Related documentation

- **[Epic 7 — Real-time, tracking & messaging](epic-7.md)** — **RT.7.1** (**`TrackingModule`**, **`TripModule`**, reference **`BusTrackingModule`** → Supabase Realtime): **[capstone backend module matrix](capstone-backend-module-matrix.md)** § **RT.7.1 / Epic 7 — Tracking, Trip, BusTracking → Supabase Realtime**. **RT.7.2** (**`NotificationModule`** → triggers, payloads, read state, Realtime/publication honesty): same matrix § **RT.7.2 / Epic 7 — NotificationModule → Vestroo**. **RT.7.3** (**`ConversationModule`**, **`SharedItineraryModule`** → deferred / N/A stance, **`realtime.ts`** honesty, **FE.5.9** pointer): same matrix § **RT.7.3 / Epic 7 — ConversationModule, SharedItineraryModule → Vestroo**. **RT.7.4** (cross-topic **subscription rules**, **throttle/debounce**, **Supabase provider caveats**, **privacy**, **staging observability**, **`techContext` align-or-gap**, **load/soak** honesty): same matrix § **RT.7.4 / Epic 7 — Realtime policies, abuse controls, observability** ([`#rt-7-4`](capstone-backend-module-matrix.md#rt-7-4)). **RT.7.6** (**`RatingModule`** / **`public.ratings`** — **not** a Realtime topic; publication + **`realtime.ts`** honesty): same matrix § **RT.7.6** ([`#rt-7-6`](capstone-backend-module-matrix.md#rt-7-6)).
- **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**) — compares vendored capstone **socket.io** patterns to this **VST-9** model; **this document** remains authoritative for channels, RLS, and rate limits.

## Related code

- `src/actions/fieldLocation.ts` — location ingestion + throttle.
- `src/lib/supabase/realtime.ts` — channel builders.
- `docs/ops-console.md`, `docs/field-tools.md` — product runbooks.
