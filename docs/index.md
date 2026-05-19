# Documentation Index

This index provides a comprehensive catalog of all project documentation for easy reference and context injection.

## Product Requirements

* [Product Requirements Document (PRD)](prd.md) - Complete product requirements and specifications

## Epics

* [Vestroo platform (company-aligned)](epic-4.md) - Premium shuttle, corporate, VIP, tours & operations — product epics vs. [company profile](Overview%20Vestroo-Pty-Ltd.pdf)
* [Capstone reference layout](capstone-reference-path-map.md) - Optional third-party code import paths (excluded from app build)
* [Epic 1: Traveler Interface & Booking Flow (FE)](epic-1.md) - User-facing booking interface and checkout process
* [Epic 10: Public booking funnel — quote-deferred, slide-based trip request (FE)](epic-10.md) — Single-page trip request (**three data slides** + confirmation per **Epic 19**); no instant quote or payment at booking; global phone; ops-led quote and payment link; supersedes public funnel aspects of Epic 1 (see epic)
* [Epic 19: Booking funnel simplification — four-slide trip request (FE)](epic-19.md) — **`TripRequestBookingShell`**: trip → vehicle → passenger → confirmation on one URL; required vehicle; FE.19.10 analytics; amends Epic 10 FE.10.1 wording; see [`design/booking-flow-simplified.md`](design/booking-flow-simplified.md)
* [Epic 2: Admin Interface & CMS (ADM)](epic-2.md) - Administrative interface and content management system
* [Epic 3: Core Technical Functions (CORE)](epic-3.md) - Foundational technical infrastructure and services
* [Epic 5: Ops console & field vs capstone reference UX](epic-5.md) — Align `/ops` and `/field` shells with `docs/capstone-reference`; **Tailwind + Radix** (optional shadcn-style) for ops/field UI; feature mapping (admin, manager, driver)
* [Capstone admin → ops mapping (FE.5.4)](capstone-admin-to-ops-mapping.md) — `frontend-admin` screens to `/ops/*`, Supabase, and story IDs (admin scope only)
* [Capstone manager → Vestroo mapping (FE.5.5)](capstone-manager-to-vestroo-mapping.md) — `frontend-manager` routes and bookings constants to `/ops/*`, `/field/*`, and backlog (manager scope)
* [Capstone driver → field mapping (FE.5.6)](capstone-driver-to-field-mapping.md) — `frontend-driver` modality, screens, sockets vs `/field/*`, Realtime (VST-9), interim comms
* [Capstone reference — stack & integration (FE.5.9)](capstone-reference-stack-integration.md) — reference Nest/axios/JWT/Firebase/socket.io vs Vestroo Supabase, gates, Server Actions, Storage, Realtime (VST-9); UI dependency inventory; anti-patterns
* [Capstone backend module matrix (FE.5.10 / BE.6.1)](capstone-backend-module-matrix.md) — all **`app.module`** domain modules (24) → Vestroo capabilities; **`cline_docs/`** index; **`document/`** diagram index (excludes `*.vpp.bak_*`)
* [Capstone Nest REST → Vestroo mapping (BE.6.3 / Story 6.3)](capstone-nest-rest-to-vestroo-mapping.md) — reference **`@Controller`** / route-prefix → Server Actions, **`app/api/**/route.ts`**, or **deferred** / **N/A**; links **[front-end API interaction](front-end-api-interaction.md)** for patterns
* [Core traveller flow parity (CORE.6.4 / Story 6.4)](core-traveller-flow-parity.md) — traveller **search → quote → booking → PayFast → confirmation**; maps **Search**, **Pricing**, **Booking**, **Trip**, **Checkout** reference modules; links **[front-end API interaction](front-end-api-interaction.md)**, **[data models](data-models.md)**, **[integrations and payments](integrations-and-payments.md)**
* [Capstone Auth, Keytoken, and OTP parity (BE.6.5 / Story 6.5)](capstone-auth-keytoken-otp-parity.md) — reference **Nest JWT + Mongo KeyToken + OTP** vs **Supabase Auth**, **`src/lib/supabase/`** SSR/cookies, **`requireOpsStaffPage`** / **`requireChauffeurPage`**; **JWT-in-`localStorage`** / browser refresh default **forbidden** without **[ADR](adr/)**
* [External Route Handlers OpenAPI (BE.6.6 / Story 6.6)](openapi/vestroo-external-route-handlers.yaml) — **OpenAPI 3.x** for **`src/app/api/**/route.ts`** surfaces treated as **public/partner** HTTP only (**PayFast** ITN, **booking-confirmation** capability URL, **health**); **not** Server Actions or Nest Swagger parity; **NFR.3.1** disclaimer in spec
* [Staff ops data owners (BE.6.7 / Story 6.7)](capstone-backend-module-matrix.md) — **§ FE.5.11 / BE.6.7 — staff ops data owners**; six-row **data-owner** checklist (**Supabase**, **RLS**, **Server Actions / Route Handlers**); complements **[Story 5.11](stories/5.11.story.md)** **UI** audit
* [Epic 6: Backend & data parity vs reference NestJS](epic-6.md) — Supabase schema/RLS, Server Actions vs Nest REST, module-by-module matrix; OpenAPI parity optional
* [Epic 7: Real-time, tracking & messaging](epic-7.md) — Realtime policies, tracking/notifications/conversation/shared itinerary vs reference sockets; techContext targets
* [Epic 8: Integrations & platform](epic-8.md) — Email/SMS, PayFast vs reference payments, cron/jobs, secrets/config, outbound HTTP idempotency; **[INT.8.1 email inventory (VST-13)](integrations-and-payments.md#int-8-1)**; **[INT.8.2 SMS stub & policy (VST-13)](integrations-and-payments.md#int-8-2)**; **[INT.8.3 Momo/PayOS vs PayFast (VST-13)](integrations-and-payments.md#int-8-3)**; **[INT.8.4 scheduled jobs (VST-13)](integrations-and-payments.md#int-8-4)**; **[INT.8.5 `share/` secrets (VST-13)](integrations-and-payments.md#int-8-5)**; **[INT.8.6 HTTP clients & idempotency (VST-13)](integrations-and-payments.md#int-8-6)**
* [Epic 9: Deferred capstone modules & optional patterned shuttle](epic-9.md#sh-9-1) — Trace `Bus*` reference modules as **not** Vestroo bus service; **SH.9.1 gate** (recorded **go** / **no-go** at **`#sh-9-1`**); optional gated **corporate** runs/capacity/manifests in shuttle vocabulary
* [Epic 17: Ops Console Visual Redesign — SaaS-grade UX/UI for `/ops/*` (Wheelzie-inspired)](epic-17.md) — Comprehensive visual redesign of `/ops/*`: KPI scorecards with sparklines, split list/detail views, in-repo SVG charts, calendar primitives, status pills, refreshed sidebar/topbar; preserves Tailwind+Radix lock (ADR 0001), brand `vest.rust`, and existing auth/RLS
* [Epic 18: Account Portal Visual Redesign — `/account/*` SaaS-grade UX/UI (Wheelzie-inspired)](epic-18.md) — Persistent shell + sidebar + top bar for the customer portal, scorecard dashboard, upcoming-trips rail, refreshed bookings/invoices/members/preferences, new `/account/profile` and `/account/help`; shares primitives with Epic 17
* [Epic 19: Booking Funnel Simplification — Four-slide, low-friction trip request (FE)](epic-19.md) — Four-slide **`TripRequestBookingShell`** on one URL (trip → vehicle → passenger → confirmation); smart defaults; **required** vehicle on slide 2; inline business notice (no modal), inline PO field; funnel analytics (**FE.19.10**); [`design/booking-flow-simplified.md`](design/booking-flow-simplified.md)

### Visual redesign — design system (Epic 17 / 18 / 19)

* [Visual redesign — design tokens](design/visual-redesign-tokens.md) — Single source of truth for the new color, typography, spacing, motion, and Tailwind config additions used by Epic 17 / 18 / 19; preserves marketing/booking `:root` tokens unchanged
* [Visual redesign — Wheelzie reference image map](design/visual-redesign-references.md) — Canonical mapping of the 10 Wheelzie reference screenshots to specific Vestroo `/ops/*` and `/account/*` routes and stories; explicit list of patterns we **do not** copy
* [Booking flow — four-slide trip-request walkthrough](design/booking-flow-simplified.md) — Slide-by-slide behaviour, validation matrix, **FE.19.10** telemetry, links to **Epic 19** / **integrations-and-payments**

## Developer onboarding

* [Security policy — reporting vulnerabilities](../SECURITY.md) — private reporting (`security@vestroo.example` placeholder), scope (repo + hosted infra), coordinated disclosure; do not file undisclosed issues publicly
* [Contributing](../CONTRIBUTING.md) — branches from `main`, CI (**`CI`** workflow / **`build-test-lint`** job), migrations in PRs, pull request template
* [Local development runbook](local-development.md) — Node, env, **hosted** Supabase migrations (**`link`** / **`db push`**; **no Docker**), CI, stub booking
* [Repository conventions](repo-conventions.md) — Server Actions, features, components, lib, services, tests, layout
* [Environment variables](environment-vars.md) — client vs server-only names, Supabase and integrations
* [Staging, preview, and migration promotion](staging-and-promotion.md) — Supabase project split, host env mapping, promotion order, RLS review expectations
* [Hardening and go-live (VST-14)](hardening-and-go-live.md) — E2E scope (CI vs local), load smoke, monitoring, runbook index, go/no-go checklist, backup verification pointers; links staging, local dev, CONTRIBUTING
* [Field tools — chauffeur web (VST-8)](field-tools.md) — `/field/*`, maps deep links, contact policy, audit
* [Realtime and notifications (VST-9)](realtime-and-notifications.md) — vehicle tracking, ETA, Supabase Realtime, rate limits, privacy tiers
* [Tours and experiences (VST-10)](tours-and-experiences.md) — `experience_packages`, booking metadata, marketing `/tours`, ops list
* [Compliance and safety (VST-12)](compliance-and-safety.md) — POPIA-oriented engineering checklist, incidents, compliance documents, retention hooks, admin DSR actions
* [Integrations and payments (VST-13)](integrations-and-payments.md) — maps (Google), PayFast, webhooks, corporate invoicing hooks, env matrix; **[INT.8.1 — Email template parity](integrations-and-payments.md#int-8-1)**; **[INT.8.2 — SMS stub and policy parity](integrations-and-payments.md#int-8-2)**; **[INT.8.3 — Momo / PayOS vs PayFast](integrations-and-payments.md#int-8-3)**; **[INT.8.4 — Scheduled jobs and background work](integrations-and-payments.md#int-8-4)**; **[INT.8.5 — Secrets / `share/` patterns](integrations-and-payments.md#int-8-5)**; **[INT.8.6 — Third-party HTTP clients and idempotency](integrations-and-payments.md#int-8-6)**
* [Dependencies and lockfile](dependencies.md) — `package-lock.json` as source of truth, audits, scheduled `npm audit` workflow
* [Frontend API interaction](front-end-api-interaction.md) — Server Actions vs Route Handlers (when to use which)

## Architecture Documentation

* [Main Architecture Document](architecture.md) - Overall system architecture and design decisions
* [Frontend Architecture Document](frontend-architecture.md) - Frontend-specific technical architecture

### Architecture Decision Records (ADR)

* [ADR 0001: Ops / field UI stack — Tailwind + Radix (no Ant Design)](adr/0001-ops-field-ui-stack-tailwind-radix.md) — scope **`/ops/*`** and **authenticated `/field/*`**; rationale and consequences (**FE.5.2**)
* [ADR 0002: Patterned shuttle domain (SH.9.2)](adr/0002-patterned-shuttle-domain-sh9-2.md) — **run / assignment / service window / waypoint / manifest** mapping; **service route vs quote** collisions; links **[`#sh-9-1`](epic-9.md#sh-9-1)**
* [Ops / field design system — parity spec](ops-design-system-parity.md) — interaction mapping vs capstone reference, tokens, primitives, dependency inventory (**FE.5.2**)

### Core Architecture Components

* [API Reference](api-reference.md) - External APIs consumed by the system
* [Data Models](data-models.md) - Core database entities and schemas
* [Technology Stack](tech-stack.md) - Definitive technology selections and versions
* [Project structure](project-structure.md) — directory tree; **where to put code** (Server Actions, `src/features/`, tests): [Repository conventions](repo-conventions.md)
* [Repository conventions](repo-conventions.md) — shared UI, domain naming pointers, Vitest / Playwright locations
* [Component View](component-view.md) - Architectural components and design patterns
* [Infrastructure and Deployment](infra-deployment.md) - Cloud infrastructure and deployment strategy
* [Environment Variables](environment-vars.md) - Configuration and environment variable documentation
* [Operational Guidelines](operational-guidelines.md) — Security (links [dependencies](dependencies.md) for lockfile/audit), HTTP headers, testing, and coding standards

### Frontend Architecture Components

* [Frontend Project Structure](front-end-project-structure.md) - Detailed frontend directory structure
* [Frontend Style Guide](front-end-style-guide.md) - Styling approach and design philosophy
* [Frontend Component Guide](front-end-component-guide.md) - Component library and implementation details
* [Frontend Coding Standards](front-end-coding-standards.md) - Frontend-specific coding conventions
* [Frontend State Management](front-end-state-management.md) - State management strategy and implementation
* [Frontend API Interaction](front-end-api-interaction.md) - Server Actions and API interaction patterns
* [Frontend Routing Strategy](front-end-routing-strategy.md) - Route definitions and navigation structure
* [Frontend Testing Strategy](front-end-testing-strategy.md) - E2E and unit testing approach

## Additional Documentation

* [UI/UX Specification](ui-ux-specification.md) - User interface and user experience specifications
* [Project Brief](brief.md) - Initial project brief and context

