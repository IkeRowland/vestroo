# Epic 4: Vestroo Premium Transport Platform (VST)

## Description

This epic defines the **company-aligned** product roadmap for **Vestroo Pty Ltd** (South Africa): premium shuttle, corporate transport, VIP transfers, curated tours, and close protection—delivered as a **Next.js + Supabase** application. Scope runs from **marketing and conversion** through **booking, fulfilment, and compliance** in one coherent system. Planning and naming **supersede** bus-centric capstone narratives; not every historical path in the repo must be renamed in one pass.

Authoritative positioning: [`docs/Overview Vestroo-Pty-Ltd.pdf`](Overview%20Vestroo-Pty-Ltd.pdf). Older epics in this repo ([`epic-1.md`](epic-1.md), [`epic-2.md`](epic-2.md), [`epic-3.md`](epic-3.md)) remain **historical slices**; confirm implementation against the live stack (`package.json`, `supabase/`).

## Goals

* Present a **credible, high-trust brand** (discretion, punctuality, safety, fleet quality).
* Support **on-demand and pre-booked** movement: point-to-point, scheduled patterns, multi-stop itineraries, **hourly/dedicated hire**, and **packaged tours/experiences**.
* Enable **operations** to assign **chauffeurs**, **vehicles**, and (where applicable) **protection details** without treating the business as public mass transit.
* Provide **one clear path** for local, staging, and production: documented environments, Supabase alignment, repeatable **lint/test/build** gates, migrations, and **no secrets in git**.
* Order delivery so **schema and auth** precede **operations consoles and field tools**; **compliance** has hooks from day one with fuller UI later.

## User Stories / Requirements

**Story ID:** `VST-{n}` (integer only, e.g. **VST-1**, **VST-2** — no `VST-1.1`-style suffixes). **Story file:** `docs/stories/vst-{n}.story.md` (optional: `vst-{n}.story-validation.md`). Legacy `docs/stories/1.*` / `2.*` files are **not** this register unless explicitly remapped.

**Dependencies (by ID):** **VST-5** blocks **VST-6–VST-9**; **VST-7** depends on **VST-5** and benefits from **VST-6**; **VST-12** should define policy hooks early even if UI lands later.

### VST-1: Foundation — environments, Supabase alignment, developer workflow

The system MUST document end-to-end local setup (**Node 20+**, `npm install`, copy `.env.example` → `.env.local` with **placeholders only**, `supabase/migrations/` and optional Supabase CLI), and **quality gates** before merge (**`npm run lint`**, **`npm run test`**, **`npm run build`** on Node 20, placeholder `NEXT_PUBLIC_*` for build)—via **local runs** and/or **host** (e.g. Vercel) checks; **this repo does not ship GitHub Actions workflows**. The docs MUST state when to use **Server Actions** vs **Route Handlers** (including health as a Route Handler). A new developer MUST be able to complete a **stub booking** (**search → quote → booking** from **`/book/search`**, Server Actions such as **`calculateQuote`**, **`createBooking`**, **`processPayment`**, with **`createBooking`** using the **service role** as in `src/lib/supabase/server.ts`) against the dev database following the runbook. Track detail in [`docs/stories/vst-1.story.md`](stories/vst-1.story.md).

### VST-2: Foundation — staging parity, promotion, and repo conventions

The system MUST document **staging/preview vs production**: separate Supabase projects (dev / staging / production), **Vercel (or agreed host) Production vs Preview** environment sets with **Preview targeting a non-production** database (not production), optional dedicated staging host env, and **secrets only in provider dashboards**—with **`.env` / `.env.local` gitignored**, **`.env.example` placeholder-only**, and cross-links to **`docs/environment-vars.md`**. Post-deploy checks MUST include **`GET /api/health`** (**`200`** / **`503`**, JSON **`status`**, **`message`**, **`timestamp`**, generic bodies—aligned with the Route Handler and health helper). **Migration promotion** MUST be **PR merge → apply dev/staging → production**, **forward-only / append-only** migrations under **`supabase/migrations/`**, **destructive** changes only with an **explicit ops plan**, and **RLS** (`ENABLE ROW LEVEL SECURITY`, policies) **explicitly reviewed in migration PRs**. **Git/PR conventions** MUST live in root **`CONTRIBUTING.md`** (short-lived branches from **`main`**, **lint / test / build** passing per that file—**no** required in-repo GitHub Actions workflow), **schema changes** with migrations in the **same PR** or a **prior merged migration PR**, and PRs using **`.github/pull_request_template.md`** where present. **Repo layout** MUST be indexed from **`docs/repo-conventions.md`** and reachable from **`docs/index.md`** (Developer onboarding) alongside **staging-and-promotion** and **CONTRIBUTING**. Track detail in [`docs/stories/vst-2.story.md`](stories/vst-2.story.md).

### VST-3: Foundation — security baseline, dependency hygiene, operational readiness

The system MUST provide a **private security disclosure** path in root **`SECURITY.md`** (placeholder contact, no undisclosed vulnerabilities via public issues, **coordinated disclosure** in plain language, scope covering **this repo and hosted infrastructure**). **Dependency hygiene** MUST be documented (**`package-lock.json`** as source of truth, **`npm ci`** for reproducible installs in pipelines/clones, **`npm audit`** on an agreed cadence—**no** bundled scheduled GitHub Actions workflow in this repo—major upgrades via **dedicated PRs**) with **`docs/dependencies.md`** linked from **`docs/operational-guidelines.md`** under **Security**. **`GET /api/health`** MUST follow a documented **JSON contract** (`status`, `message`, `timestamp`; **200** vs **503**; **generic** bodies only—no secrets, raw provider errors, or stack traces) in runbooks. **Baseline HTTP security headers** in **`next.config.ts`** MUST be documented to match implementation (including **`Permissions-Policy`** with **`geolocation=(self)`** for maps/booking). **Supabase backups and PITR** MUST be **awareness-level** documented with provider links; **restore drills** belong to **VST-12** / **later ops/hardening**, not this slice. Track detail in [`docs/stories/vst-3.story.md`](stories/vst-3.story.md).

### VST-4: Marketing site — brand, services, trust, SEO, lead capture

The platform MUST ship **dedicated marketing routes** under **`src/app/(marketing)/`** (or equivalent) for **premium shuttle**, **corporate**, **VIP**, **tours**, **close protection** (teaser where appropriate), plus **fleet** (vehicle classes), **safety / standards** teaser, **contact** with lead capture, and **about**—aligned with **Overview Vestroo-Pty-Ltd.pdf** and **`docs/epic-4.md`** domain vocabulary (no misleading mass-transit framing). **Header/Footer** navigation MUST surface these areas. **SEO:** unique **`generateMetadata()`** (or Metadata API) per primary corridor, **`sitemap.ts`** / **`robots.ts`**, canonical/Open Graph via **`NEXT_PUBLIC_APP_URL`** / **`metadataBase`**. **Performance:** **`next/font`**, sensible **LCP** treatment for hero images, documented **ISR/revalidate** for static content modules. Core Web Vitals posture MUST avoid obvious regressions; visible copy MUST NOT use legacy demo naming. Track detail in [`docs/stories/vst-4.story.md`](stories/vst-4.story.md).

### VST-5: Data model, migrations, RLS, and Vestroo domain naming

The platform MUST express core data in **Vestroo language** (organisations/clients, **service routes**, **patterns**, **runs**, **service points**, **vehicles**, **chauffeurs**, **bookings**/**trips**, optional tour packages, close protection engagements, documents, audit fields) in `supabase/migrations/` with **RLS by role** (customer, chauffeur, dispatcher, admin). Migrations MUST apply cleanly; RLS MUST be smoke-tested. The system MUST **eliminate misleading public-transit naming** in schema, APIs, and user-facing strings where it misrepresents the operator (e.g. inventory/rename tables and columns per domain vocabulary, update RLS/FKs and app types in coordinated changes). **Canonical delivery detail:** [`docs/stories/vst-5.story.md`](stories/vst-5.story.md) and [`docs/data-models.md`](data-models.md).

### VST-6: Booking and quotes

The platform MUST support high-conversion flows for **point-to-point**, **hourly hire**, and seeds for **corporate patterns** and **packages**, with premium (non–public-transit) pricing, **Server Actions**, **server-side quote reconciliation**, **booking lifecycle states**, **email** (paid confirmation) and **SMS** stubs; **end-to-end staging** search → quote → PayFast sandbox → confirmation. Web **`bookings`** precede **`booking_trips`/`trips`** (ops assignment). Track detail in [`docs/stories/vst-6.story.md`](stories/vst-6.story.md).

### VST-7: Operations console

The platform MUST give dispatchers **vehicle** availability, **chauffeur** roster, **run** assignment, and handling of exceptions (delays, vehicle swap) via role-gated internal routes (or a split ops app), with calendar/board views. A dispatcher MUST assign a **run** and see **trip** status transitions. **Delivered:** Next.js route group **`src/app/(ops)/`**, URLs under **`/ops/*`**, staff JWT Server Actions in **`src/actions/opsDispatch.ts`**, audit **`public.ops_audit_log`** — see [`docs/ops-console.md`](ops-console.md) and [`docs/stories/vst-7.story.md`](stories/vst-7.story.md).

### VST-8: Driver and field tools

The platform MUST allow **chauffeurs** to confirm assignments, update **trip** status, open navigation (maps deep link), and contact customers within policy, via responsive web MVP; actions MUST be logged and chauffeurs MUST NOT access other clients’ PII. **Delivered:** Next.js route group **`src/app/(field)/`**, URLs **`/field/*`**, **`src/lib/field-auth.ts`**, **`src/actions/fieldChauffeur.ts`**, maps helpers **`src/lib/maps.ts`**, RLS migration **`20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql`** — see [`docs/field-tools.md`](field-tools.md) and [`docs/stories/vst-8.story.md`](stories/vst-8.story.md).

### VST-9: Realtime and notifications

The platform MUST provide live **vehicle location** and **ETA** for authorised viewers and operational notifications (assignment, change, no-show), with rate limits and privacy tiers (e.g. VIP vs corporate). Consent and visibility rules MUST be documented; dev subscribers MUST see timely updates on agreed channels. **Delivered:** `docs/realtime-and-notifications.md`, migration **`20260409120000_vst9_realtime_notifications.sql`**, `src/actions/fieldLocation.ts`, `src/lib/supabase/realtime.ts`, ops board Realtime bridge + field `FieldLocationPublisher`, operational notification helpers + `opsDispatch` / `fieldChauffeur` hooks — see [`docs/stories/vst-9.story.md`](stories/vst-9.story.md).

### VST-10: Tours and experiences

The platform MUST support publishing **tour/experience packages**, itineraries, and booking attachments (dates, group size, add-ons) from an agreed content source (markdown, DB, or headless), tied to **bookings**. At least one package MUST be bookable end-to-end (**delivered:** Postgres **`experience_packages`**, marketing **`/tours`**, **`calculateExperienceQuote`**, **`booking_metadata`** — see [`docs/tours-and-experiences.md`](tours-and-experiences.md)). Track detail in [`docs/stories/vst-10.story.md`](stories/vst-10.story.md).

### VST-11: Close protection (phased)

The platform MUST support a high-level **close protection engagement** workflow linked to **bookings**/**trips**, with restricted roles and coordination notes, without over-building tactical security tooling in MVP. Engagements MUST be visible only to cleared roles; PII minimisation MUST be documented. **Delivered in-repo:** **`public.close_protection_engagements`**, staff RLS, **`src/actions/opsCloseProtection.ts`**, **`/ops/close-protection`**, audit events, **`docs/close-protection-engagements.md`**. Track detail in [`docs/stories/vst-11.story.md`](stories/vst-11.story.md).

### VST-12: Compliance and safety

The platform MUST support South Africa–aware handling of personal information, **incident** logging, **vehicle** and **chauffeur** document tracking, retention, and export/delete flows where applicable, with audit tables and admin compliance views. Practices MUST map to a POPIA-oriented checklist (legal sign-off outside engineering). **Delivered in-repo:** **`compliance_incidents`**, **`vehicle_compliance_documents`**, **`chauffeur_compliance_documents`**, retention columns on **`profiles`** / **`bookings`**, staff RLS, **`/ops/compliance`**, **`src/actions/opsCompliance.ts`**, **`getOpsAdminForAction()`** for DSR, **`docs/compliance-and-safety.md`**. Track detail in [`docs/stories/vst-12.story.md`](stories/vst-12.story.md).

### VST-13: Integrations and payments

The platform MUST integrate **maps** (autocomplete, routes), **payments** or deposits suitable for the SA market, and **invoicing** hooks for corporate, with provider-specific config per environment and idempotent webhooks. Test payments MUST work in sandbox with a failed-payment recovery path. Track detail in [`docs/stories/vst-13.story.md`](stories/vst-13.story.md).

### VST-14: Hardening and go-live

The platform MUST have **documented** E2E for **booking** (Playwright; **fixtures** where Maps/actions need secrets), **explicit ops coverage** via **automated E2E** *or* a **numbered manual smoke** checklist in **[`docs/hardening-and-go-live.md`](hardening-and-go-live.md)** (staff session complexity), plus **MVP load smoke**, **monitoring** expectations, **runbook** cross-links, and a **production go/no-go** checklist including **backup verification pointers**. Track detail in [`docs/stories/vst-14.story.md`](stories/vst-14.story.md).

## Related Non-Functional Requirements

* **NFR.1.1 / NFR.1.2:** Web performance and scalability — public and booking flows SHOULD meet strong Core Web Vitals; architecture MUST scale with demand (e.g. serverless hosting).
* **NFR.1.3:** Availability — core site and booking engine SHOULD target high uptime (e.g. **99.9%** where agreed).
* **NFR.3.1:** Security — all data transfer MUST use **HTTPS/TLS**; secrets MUST NOT live in git; service role keys MUST be server-only.
* **NFR.4.1:** Type safety — new application code SHOULD be **TypeScript** unless exception is documented.

## Technical Context

* **Framework:** Next.js (App Router), deployment on **Vercel** or equivalent.
* **Data:** **Supabase** (PostgreSQL, Auth, Realtime, Storage as needed); migrations in `supabase/migrations/`.
* **APIs:** Prefer **Server Actions** for App Router mutations; **Route Handlers** for webhooks and non-Next HTTP clients.
* **Delivery grouping (themes, not story IDs):** Foundation **VST-1–VST-3** → Marketing **VST-4** → Data/RLS **VST-5** → Booking **VST-6** → Ops **VST-7** → Field **VST-8** → Realtime **VST-9** → Tours **VST-10** → Close protection **VST-11** → Compliance **VST-12** → Integrations/payments **VST-13** → Hardening **VST-14**.

## Domain vocabulary (schema, UI, APIs)

| Concept | Preferred terms | Avoid for Vestroo product surface |
|--------|------------------|-----------------------------------|
| Scheduled or repeated movement | **Service route**, **service pattern**, **run** | “Bus route” as generic label for VIP/corporate work |
| Pickup/drop-off / waypoints | **Service point** | “Bus stop” (implies public stop infrastructure) |
| Staff | **Chauffeur** / **driver**; **assignments** | Arcade-game “driver” semantics |
| Fleet | **Vehicle**; classes: sedan, SUV, MPV, minibus, **armoured** | — |
| Customer commitment | **Booking**; **trip** / **leg** / **segment** | “Ticket” unless sold as tickets |
| Corporate / recurring | **Corporate pattern**, **contracted service**, **standing booking** | — |
| Leisure / packaged | **Tour** / **experience package**, **itinerary** | — |
| High-risk / executive | **Close protection engagement** | — |
| Live status | **Trip status**, **vehicle location**, **ETA** | “Bus tracking” as product name |

**Runs** = operational instances. **Patterns** = templates (dow, times, default service points). **Service routes** = marketed or logical corridors.

## Design Goals

* **Overall vision:** Premium, discreet, trustworthy, punctual, safety-forward—aligned with Vestroo’s corporate, government, tourism, and VIP clients.
* **Language:** Product and schema labels reflect **chauffeured transport**, not public mass transit, unless describing a literal public pickup zone in copy.
* **Responsiveness:** **Mobile-first** for customer booking; **responsive** ops and field tools.

## Legacy reference code (optional)

Material under **`docs/capstone-reference/`** and **`src/legacy/capstone-reference/`** is **optional** reference only. Do **not** ship capstone or demo **product** names as Vestroo naming; relabel to the domain vocabulary above before release.

---

## Document control

| Version | Date | Notes |
|--------|------|-------|
| 1.0 | 2026-04-02 | Initial Vestroo-aligned roadmap. |
| 1.1 | 2026-04-02 | Canonical file `epic-4.md` (replaces `epic-vestroo-platform.md`). |
| 1.2 | 2026-04-02 | Per-epic story tables under VST-1–12. |
| 1.3 | 2026-04-02 | **Aligned to `epic-1`–`epic-3` structure:** Description, Goals, User Stories / Requirements, Related NFRs, Technical Context, Design Goals. |
| 1.4 | 2026-04-02 | **Integer story IDs only:** **VST-1** … **VST-14** and `vst-{n}.story.md` (removed `VST-x.y` / `vst-x.y` pattern). |
| 1.5 | 2026-04-06 | **VST-5 delivery:** epic VST-5 points to `docs/stories/vst-5.story.md` + `docs/data-models.md`; duplicate § VST-5 terminology notes removed. |
