# Documentation Index

This index provides a comprehensive catalog of all project documentation for easy reference and context injection.

## Product Requirements

* [Product Requirements Document (PRD)](prd.md) - Complete product requirements and specifications

## Epics

* [Vestroo platform (company-aligned)](epic-4.md) - Premium shuttle, corporate, VIP, tours & operations — product epics vs. [company profile](Overview%20Vestroo-Pty-Ltd.pdf)
* [Capstone reference layout](capstone-reference-path-map.md) - Optional third-party code import paths (excluded from app build)
* [Epic 1: Traveler Interface & Booking Flow (FE)](epic-1.md) - User-facing booking interface and checkout process
* [Epic 2: Admin Interface & CMS (ADM)](epic-2.md) - Administrative interface and content management system
* [Epic 3: Core Technical Functions (CORE)](epic-3.md) - Foundational technical infrastructure and services
* [Epic 5: Ops console & field vs capstone reference UX](epic-5.md) — Align `/ops` and `/field` shells with `docs/capstone-reference`; **Tailwind + Radix** (optional shadcn-style) for ops/field UI; feature mapping (admin, manager, driver)
* [Epic 6: Backend & data parity vs reference NestJS](epic-6.md) — Supabase schema/RLS, Server Actions vs Nest REST, module-by-module matrix; OpenAPI parity optional
* [Epic 7: Real-time, tracking & messaging](epic-7.md) — Realtime policies, tracking/notifications/conversation/shared itinerary vs reference sockets; techContext targets
* [Epic 8: Integrations & platform](epic-8.md) — Email/SMS, PayFast vs reference payments, cron/jobs, secrets/config, outbound HTTP idempotency
* [Epic 9: Deferred capstone modules & optional patterned shuttle](epic-9.md) — Trace `Bus*` reference modules as **not** Vestroo bus service; **no-go default**; optional gated **corporate** runs/capacity/manifests in shuttle vocabulary

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
* [Close protection engagements (VST-11)](close-protection-engagements.md) — `close_protection_engagements`, staff-only ops UI, PII boundaries; handoff to VST-12
* [Compliance and safety (VST-12)](compliance-and-safety.md) — POPIA-oriented engineering checklist, incidents, compliance documents, retention hooks, admin DSR actions
* [Integrations and payments (VST-13)](integrations-and-payments.md) — maps (Google), PayFast, webhooks, corporate invoicing hooks, env matrix
* [Dependencies and lockfile](dependencies.md) — `package-lock.json` as source of truth, audits, scheduled `npm audit` workflow
* [Frontend API interaction](front-end-api-interaction.md) — Server Actions vs Route Handlers (when to use which)

## Architecture Documentation

* [Main Architecture Document](architecture.md) - Overall system architecture and design decisions
* [Frontend Architecture Document](frontend-architecture.md) - Frontend-specific technical architecture

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

