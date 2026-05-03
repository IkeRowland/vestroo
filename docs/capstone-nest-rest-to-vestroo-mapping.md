# Capstone Nest REST → Vestroo mapping (BE.6.3 / Story 6.3)

**Living artifact** for **[Epic 6](epic-6.md)** **BE.6.3** (Nest REST → Server Actions / Route Handlers mapping).

## Scope

**Vestroo interaction patterns** — when to use **Server Actions** vs **Route Handlers** vs server-only clients — remain authoritative in **[Front-end API interaction](front-end-api-interaction.md)** (action/route tables and **Decision: new Server Action vs new route.ts**). **This document** is the **Nest `@Controller` / route-prefix → Vestroo entry point** map: it answers *which reference REST surface became which `src/actions/*.ts` action, which `src/app/api/.../route.ts`, or is intentionally **deferred** / **N/A**?* It does **not** duplicate the full Server Action encyclopedia.

**Companion artifacts:** **[Capstone backend module matrix](capstone-backend-module-matrix.md)** (**BE.6.1** / **FE.5.10**) — domain ↔ Supabase / RLS / high-level examples; **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**) — axios, JWT-in-browser, Firebase/socket anti-patterns vs Supabase.

**Inventory (2026-04-08):** **`docs/capstone-reference/backend/src/modules/**/*.controller.ts`** — **23** files; **`KeytokenModule`** has **no** controller (service-only). Together with **Keytoken**, coverage matches the **24** domain imports in **[`app.module.ts`](capstone-reference/backend/src/app.module.ts)**.

---

## Master mapping (24 domain modules, `app.module` order)

Reference paths are under **`docs/capstone-reference/backend/src/modules/`**. **`@Controller('prefix')`** is the Nest route group (global API prefix in reference may prepend **`/api`** — not replicated here).

| Reference surface | Domain module (Nest) | Vestroo pattern | Vestroo surface | Notes |
| ----------------- | -------------------- | --------------- | --------------- | ----- |
| `vehicle-categories/vehicle-category.controller.ts` — `@Controller('vehicle-categories')` | `VehicleCategoryModule` | **deferred** (admin CRUD) / **Server Action** (read via quotes) | Category tiers loaded inside **`calculateQuote`**, **`calculateHourlyQuote`**, **`calculateExperienceQuote`** through **`src/lib/pricing-data.ts`** (`vehicle_categories`); no dedicated category CRUD actions | Dedicated **`/ops/category`** parity **deferred** — [admin → ops mapping](capstone-admin-to-ops-mapping.md). |
| `vehicles/vehicles.controller.ts` — `vehicles` | `VehiclesModule` | **deferred** (fleet CRUD) / indirect reads | Same quote path as categories; **`/ops/vehicles`** uses **RSC** + Supabase server reads (not Nest-shaped REST) | Fleet list/detail CRUD vs reference **deferred**. |
| `users/users.controller.ts` — `users` | `UsersModule` | **deferred** | **`requireOpsStaffPage`**, **`requireChauffeurPage`**, profile shell; **Supabase Auth** for identity — no port of reference users grid REST | **BE.6.5**; staff directory UI **deferred** — [ops-console](ops-console.md). |
| `auth/auth.controller.ts` — `auth` | `AuthModule` | **deferred** (Nest JWT REST) | **Supabase Auth** (SSR/session); **`/ops/login`**, **`/field/login`** — server clients in **`src/lib/supabase/server.ts`** | **BE.6.5** — forbid JWT-in-`localStorage` port without ADR — [stack integration](capstone-reference-stack-integration.md). |
| `keytoken/` — **no** `*.controller.ts` (service only) | `KeytokenModule` | **N/A** | Reference:**`KeyTokenService`** (Mongo) consumed by reference auth; Vestroo:**Supabase session** — no HTTP surface | **BE.6.5**; do not copy refresh-token semantics without ADR. |
| `OTP/otp.controller.ts` — `otp` | `OtpModule` | **deferred** | **N/A** — no OTP Server Actions or OTP **`route.ts`** in repo | Align with **BE.6.5** when a provider is chosen. |
| `pricing/pricing.controller.ts` — `pricing` | `PricingModule` | **Server Action** | **`calculateQuote`**, **`calculateHourlyQuote`**, **`calculateExperienceQuote`** (`src/actions/`) | End-to-end quote → booking → pay:**[CORE.6.4](epic-6.md)** (same epic) / **[front-end API](front-end-api-interaction.md)**. |
| `scenic-route/scenic-route.controller.ts` — `scenic-routes` | `ScenicRouteModule` | **deferred** | **RSC** / Supabase reads where **`service_routes`** / **`service_points`** apply; no dedicated scenic-route Server Action bundle | Map authoring **`/ops/service-areas`** **deferred** — **not** Epic 9 mass-transit default — [epic-9](epic-9.md). |
| `driver-schedule/driver-schedule.controller.ts` — `driver-schedules` | `DriverScheduleModule` | **deferred** / **Server Action** (field/ops trip flows touch schedules) | Chauffeur schedules created/linked inside dispatch (**`assignBookingToRun`** in **`opsDispatch.ts`**) and **RSC** roster/calendar pages | Reference CRUD surface not 1:1 — [field-tools](field-tools.md). |
| `search/search.controller.ts` — `search` | `SearchModule` | **deferred** | **RSC** + Supabase in **`/ops/search`**, **`/ops/fulfil`**, etc. — no exported “search” Server Action mirroring Nest | **CORE.6.4** traveller search lives in marketing/wizard + **`calculateQuote`** path, not Nest **GET /search**. |
| `booking/booking.controller.ts` — `booking` | `BookingModule` | **Server Action** | **`createBooking`**, **`cancelBooking`**, **`searchBooking`**; staff:**`assignBookingToRun`**, **`updateTripStatusAction`**, … in **`opsDispatch.ts`** | **CORE.6.4**; idempotency / PayFast:**[front-end API](front-end-api-interaction.md)**. |
| `trip/trip.controller.ts` — `trip` | `TripModule` | **Server Action** | **`opsDispatch.ts`** (dispatch, delay, swap vehicle), **`fieldChauffeur.ts`** (chauffeur trip status, contact intent) | Realtime:**[realtime-and-notifications](realtime-and-notifications.md)** — not socket.io drop-in. |
| `checkout/checkout.controller.ts` — `checkout` | `CheckoutModule` | **Server Action** + **Route Handler** | **`processPayment`**; **`POST`** **`src/app/api/payfast/webhook/route.ts`**; **`GET`** **`src/app/api/booking-confirmation/route.ts`** | **VST-13** / **[integrations-and-payments](integrations-and-payments.md)**. |
| `bus-stop/bus-stop.controller.ts` — `bus-stops` | `BusStopModule` | **N/A** | **N/A** | **[Epic 9](epic-9.md)** (**SH.9.1**) — not default shuttle HTTP port. |
| `bus-route/bus-route.controller.ts` — `bus-routes` | `BusRouteModule` | **N/A** | **N/A** | **Epic 9** — renamed **`service_routes`** exist for data/seeds; no mandatory Nest **`bus-routes`** API port. |
| `bus-schedule/bus-schedule.controller.ts` — `bus-schedules` | `BusScheduleModule` | **N/A** | **N/A** | **Epic 9** optional patterned shuttle — not 1:1 **`bus-schedules`** REST. |
| `tracking/tracking.controller.ts` — `tracking` | `TrackingModule` | **Server Action** | **`publishChauffeurLocationAction`** (`src/actions/fieldLocation.ts`); tracking rows via **`vehicle_trackings`** + Realtime | Customer-facing live map **deferred** per product; chauffeur publish path implemented. |
| `rating/rating.controller.ts` — `rating` | `RatingModule` | **deferred** | **`public.ratings`** exists; no **`/ops/rating`** Server Actions yet | [Manager mapping](capstone-manager-to-vestroo-mapping.md) gap. |
| `notification/notification.controller.ts` — `notification` | `NotificationModule` | **Server Action** (internal) | **`insertOperationalNotifications`** (`src/lib/operational-notifications.ts`) called from **`opsDispatch.ts`**, **`fieldChauffeur.ts`** — not a public Nest-style notification hub | Email/SMS:**[integrations-and-payments](integrations-and-payments.md)**. |
| `conversation/conversation.controller.ts` — `conversation` | `ConversationModule` | **N/A** | **N/A** — chat **out of scope** web MVP (**`tel:`** / audit) | **VST-8** — [field-tools](field-tools.md). |
| `shared-itinerary/shared-itinerary.controller.ts` — `share-itinerary` | `SharedItineraryModule` | **deferred** | **N/A** — no socket shared-itinerary port | [Field mapping](capstone-driver-to-field-mapping.md) gap / design TBD. |
| `driver-bus-schedule/driver-bus-schedule.controller.ts` — `driver-bus-schedules` | `DriverBusScheduleModule` | **N/A** | **N/A** | **Epic 9** — not default corporate shuttle schema. |
| `ticket/ticket.controller.ts` — `tickets` | `TicketModule` | **N/A** | **N/A** | **Epic 9** / **not applicable** B2B shuttle default — `public.tickets` is schema legacy, not a product HTTP port. |
| `bus-tracking/bus-tracking.controller.ts` — `bus-tracking` | `BusTrackingModule` | **N/A** | Fleet tracking via **`TrackingModule`** row (**`vehicle_trackings`**) — not “bus line” REST | **Epic 9** / **NFR.5.4** — [module matrix](capstone-backend-module-matrix.md). |

**Additional Route Handler:** **`GET`** **`src/app/api/health/route.ts`** — ops/health probe (no Nest module row; infrastructure-level).

---

## Why first-party UI does not default to axios → internal Nest-style REST

Reference **capstone** apps call **Nest** with **axios** and often **JWT in browser storage** — see **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**). **Vestroo App Router** first-party flows should use:

1. **Server Actions** (`'use server'`) for mutations and typed reads invoked from trusted UI — colocated **Zod** validation, **no** secret URLs or signing keys in the client bundle, and a single **server** place to call **`createServiceRoleClient()`** or **`createUserServerClient()`** as appropriate (**[front-end API interaction](front-end-api-interaction.md)**).
2. **Supabase RLS** for **user-scoped** data when using the **user** server client — authorization stays in **Postgres policies**, not duplicated as “check JWT then trust client” in ad hoc REST wrappers (**NFR.3.1**).
3. **Route Handlers** only where **plain HTTP** is required (webhooks, third-party callbacks, health checks, unguessable capability URLs like booking confirmation) — see **`app/api/*`** table in **[front-end API interaction](front-end-api-interaction.md)**.

**Browser axios** to an **internal** “Vestroo REST” layer tends to imply **bearer tokens in the client**, **wider** attack surface, **CORS** complexity, and **duplicated** authz logic that **RLS** already solves for Supabase-backed reads. Partner or mobile **REST** contracts are **out of scope** of this default; if added, they should be **explicitly** scoped (**BE.6.6** optional OpenAPI) and still **not** replace Server Actions for first-party **Next** UI.

---

## Secrets, service role, and environment variables

This subsection does **not** duplicate the env catalog. Authoritative names and tiers:**[Environment variables](environment-vars.md)** (**service role**, **`NEXT_PUBLIC_*`** rules, PayFast, Google Maps, Resend, etc.).

**Discipline:**

- **No** secrets in **`NEXT_PUBLIC_*`** — browser-exposed vars are for **non-secret** config only (e.g. **Supabase anon** key, **public** Maps loader key where used).
- **`SUPABASE_SERVICE_ROLE_KEY`** (and similar) **only** in **server** bundles: Server Actions, Route Handlers, server components — never exposed to client JS.
- **When to use which Supabase client:** align with **[Front-end API interaction](front-end-api-interaction.md)** (guest booking, staff **`getOpsStaffForAction`**, admin DSR) and, for **layout gates**, **[Ops console](ops-console.md)** and **[Field tools](field-tools.md)**.

---

## Related documentation

* **[Front-end API interaction](front-end-api-interaction.md)** — Server Actions & Route Handlers tables; **Decision: new Server Action vs new route.ts**
* **[Capstone backend module matrix](capstone-backend-module-matrix.md)** — **BE.6.1** domain ↔ Supabase / migrations / RLS
* **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** — **FE.5.9** anti-patterns
* **[Epic 6](epic-6.md)** — **BE.6.3** narrative; **[Epic 9](epic-9.md)** — deferred **Bus**\* / **Ticket** product gate
* **[Environment variables](environment-vars.md)** — secrets & tiers
* **[Ops console](ops-console.md)**, **[Field tools](field-tools.md)** — staff vs chauffeur server gates
