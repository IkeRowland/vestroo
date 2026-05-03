# Epic 6: Backend & Data Parity with Reference NestJS (BE / CORE)

## Description

This epic establishes **traceable parity** between the **reference capstone NestJS + MongoDB** backend under `docs/capstone-reference/backend` and the **production Vestroo stack**: **Next.js App Router**, **Supabase (PostgreSQL)**, **Row Level Security**, **Server Actions**, and **Route Handlers**. Work is **documentation-first** with **implemented gaps** closed in **migrations**, **policies**, and **server-side APIs**—without blindly porting REST shapes or JWT-in-client patterns. **OpenAPI/Swagger** parity with the reference API is **optional** and MUST be explicitly scoped if pursued.

## Goals

* Maintain a **module-by-module capability matrix** from reference `app.module` imports to **Vestroo tables, RLS, and server entry points**.
* Ensure **auth, booking, pricing, search, trip, and checkout** flows have **clear Supabase + Server Action** equivalents where the product requires them.
* Ensure **FE.5.11** staff ops capabilities have **explicit** schema, RLS, and server entry points (**BE.6.7**).
* Document **intentional divergences** (document DB vs Postgres, Nest guards vs Supabase RLS) so engineers do not “port by accident.”
* Optionally produce **machine-readable API contract** artifacts (OpenAPI) **only** where they reduce integration risk—never as a substitute for RLS review.

## User Stories / Requirements

### BE.6.1: Reference module → Vestroo capability matrix

The team MUST maintain a **matrix artifact** (in `docs/` and linked from [Documentation Index](index.md)) mapping **each** reference backend module—**VehicleCategory**, **Vehicles**, **Users**, **Auth**, **Keytoken**, **OTP**, **Pricing**, **ScenicRoute**, **DriverSchedule**, **Search**, **Booking**, **Trip**, **Checkout**, **BusStop**, **BusRoute**, **BusSchedule**, **Tracking**, **Rating**, **Notification**, **Conversation**, **SharedItinerary**, **DriverBusSchedule**, **Ticket**, **BusTracking**—to: **Supabase tables/views** (or **none**), **RLS summary**, **Server Actions / Route Handlers** (paths or action names), and **status** (**implemented / partial / not applicable / deferred**). Rows for reference **Bus***, **Ticket**, and related transit-demo modules MUST follow **FE.5.10** and [Epic 9](epic-9.md): **deferred**, **not applicable**, or **Epic 9 optional patterned-shuttle gate**—not forced into the default corporate shuttle schema without an explicit **SH.9.1** product decision.

**Living artifact:** [Capstone backend module matrix](capstone-backend-module-matrix.md) — satisfies **BE.6.1** and **FE.5.10** (single canonical file; includes **`cline_docs/`** and **`document/`** indexes).

### BE.6.2: Schema, migrations, and RLS alignment

The platform MUST express agreed capabilities in **`supabase/migrations/`** with **RLS enabled** where data is tenant- or role-sensitive. New parity work MUST **not** weaken existing **VST-5** domain naming; additions MUST be reviewed against **`docs/data-models.md`** and Epic 4 vocabulary. The matrix MUST cite **migration filenames** for each implemented row. **Cross-table RLS** (policies that must read another protected table) MUST follow the **`SECURITY DEFINER STABLE`** helper convention in **[ADR 0006 — Cross-table RLS helpers](adr/0006-rls-cross-table-helpers.md)** so migrations do not reintroduce **`42P17`** recursion.

### BE.6.3: Nest REST → Server Actions / Route Handlers mapping

The team MUST document, per reference controller or route group, the **Vestroo replacement pattern**: **Server Action** (default for App Router mutations from trusted UI), **Route Handler** (webhooks, third-party callbacks, non-Next clients), or **deferred**. The doc MUST state **why** axios-style REST clients are **not** the default for first-party UI. **Secrets and service role** usage MUST match **`docs/environment-vars.md`** and **server-only** rules.

**Living artifact:** [Capstone Nest REST → Vestroo mapping](capstone-nest-rest-to-vestroo-mapping.md) — satisfies **BE.6.3** / **Story 6.3**; linked from [Documentation Index](index.md) and [Capstone backend module matrix](capstone-backend-module-matrix.md).

### CORE.6.4: Search, quote, booking, and checkout parity

The system MUST preserve **end-to-end** traveller outcomes: **search → quote → persist booking → payment handoff → confirmation hooks** (see Epic 1, **VST-6**, **VST-13**). The matrix MUST map reference **Search**, **Pricing**, **Booking**, **Trip**, and **Checkout** modules to these flows explicitly, including **idempotency** and **failure** behaviour notes where the reference exposes them.

**Living artifact:** [Core traveller flow parity](core-traveller-flow-parity.md) — satisfies **CORE.6.4** / **Story 6.4**; linked from [Documentation Index](index.md) and [Capstone backend module matrix](capstone-backend-module-matrix.md) (**five** domain rows + **FE.5.11** bookings lifecycle cross-link).

### BE.6.5: Auth, Keytoken, and OTP reference patterns

The team MUST document reference **Auth**, **Keytoken**, and **OTP** behaviour vs **Supabase Auth**, **server sessions**, and **Vestroo** staff gates (**`requireOpsStaffPage`**, field auth). The artifact MUST forbid **copying JWT-in-`localStorage`** or **refresh-token** patterns from the reference without an **ADR**. **OTP** flows MUST state **provider** (if any) and **rate-limit / abuse** expectations.

**Living artifact:** [Capstone Auth, Keytoken, and OTP parity](capstone-auth-keytoken-otp-parity.md) — satisfies **BE.6.5** / **Story 6.5**; linked from [Documentation Index](index.md) and [Capstone backend module matrix](capstone-backend-module-matrix.md) (**`AuthModule`**, **`KeytokenModule`**, **`OtpModule`** rows + intro).

### BE.6.6: OpenAPI / Swagger parity (optional)

If product requests **public or partner HTTP contract** parity, the team MAY produce **OpenAPI 3** describing **Route Handlers** and **external** surfaces only. This MUST be a **separate, time-boxed** deliverable with **scope** (which modules included) and MUST **not** delay RLS or migration work. If not pursued, the matrix MUST state **not applicable** with **rationale**.

**Living artifact:** [External Route Handlers OpenAPI (`docs/openapi/`)](openapi/vestroo-external-route-handlers.yaml) — satisfies **BE.6.6** / **Story 6.6** (**partial**, external **`route.ts`** only; **NFR.3.1** disclaimer in spec).

### BE.6.7: Data and server actions for staff ops (FE.5.11)

The **Epic 6** matrix MUST include **explicit rows** (or a dedicated subsection linked from the main matrix) for **staff-facing CRUD and lifecycle** that powers [Epic 5](epic-5.md) **FE.5.11**, each with **tables/views**, **RLS**, **Server Actions / Route Handlers**, and **status**:

* **Staff directory & roles** — Reference **Users** / **Auth** patterns mapped to **Supabase** staff profiles, role claims, invite/disable flows; MUST **not** weaken server-first gates.
* **Corporate clients** — Customer/account entities distinct from **traveller** profiles where VST models them separately; map reference **manager customers** concepts if useful.
* **Vehicles & vehicle categories** — **VehicleCategory**, **Vehicles** modules → migrations, RLS, ops-only mutations.
* **Service routes / service areas** — **ScenicRoute**, **Pricing**, geo config as product defines; exclude **Epic 9** deferred **Bus**\* modules unless **SH.9.1** is **go**.
* **Bookings, trips, checkout** — **Booking**, **Trip**, **Checkout**, **Search** → end-to-end parity with **CORE.6.4** plus **staff** create/edit/cancel where allowed.

The matrix MUST cross-reference **FE.5.11** so no **ops UI** story lacks a **data owner** row. Gaps MUST be **backlog-visible**, not implied.

**Living artifact:** [Capstone backend module matrix](capstone-backend-module-matrix.md) — **§ FE.5.11 / BE.6.7 — staff ops data owners** satisfies **BE.6.7** / **[Story 6.7](stories/6.7.story.md)**; canonical **six-row** staff-ops **data-owner** checklist (**tables**, **RLS**, **Server Actions / Route Handlers**), complementary to **[Story 5.11](stories/5.11.story.md)** **UI** row ownership.

## Related Non-Functional Requirements

* **NFR.3.1:** Security — **RLS** and **server-only secrets** MUST remain authoritative; parity docs MUST NOT imply client-trusted enforcement.
* **NFR.4.1:** Type safety — new server code MUST be **TypeScript**; shared types SHOULD align with **generated Supabase** types where used.
* **NFR.1.2:** Scalability — Server Actions and Route Handlers MUST stay **stateless** at the app tier; heavy logic belongs in **DB** or **background** patterns agreed under Epic 8.

## Design Goals

* **Single source of truth:** Postgres + RLS, not parallel Mongo semantics.
* **Discoverability:** One matrix developers open before adding a “Nest-like” endpoint.
* **Honest gaps:** **Deferred** and **N/A** rows are preferable to silent fiction.
