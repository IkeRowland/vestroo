# Epic 2: Admin Interface & CMS (ADM)

## Description

This epic covers the **content management system** and **admin-style** tooling where implemented via **PayloadCMS** (or equivalent): marketing pages, and **certain** structured content (e.g. route-like or pricing-like records **if** maintained in the CMS).

**Day-to-day staff operations**—**user/role management**, **corporate clients**, **fleet and categories**, **service routes/areas**, **booking operations** in the live **`/ops/*` Next.js console**—are specified under **[Epic 5 — FE.5.11](epic-5.md)** with **data and RLS** under **[Epic 6 — BE.6.7](epic-6.md)**. This epic and those epics MUST stay aligned (no duplicate contradictory sources of truth).

## Goals

* Enable route management (create, edit, activate/deactivate) **where owned by PayloadCMS**; otherwise **operational route/service-area** authoring lives under **Epic 5 / 6**
* Provide dynamic pricing management capabilities **where owned by CMS**; **ops** pricing config aligns with **Epic 5 FE.5.11** / **Epic 6** as product splits responsibility
* Allow comprehensive booking review and management **via CMS only if** product keeps that path; **primary** staff booking ops → **Epic 5 FE.5.11**
* Enable content editing for all static marketing pages

## User Stories / Requirements

### ADM.2.1: Route Management

The system MUST allow administrators (via PayloadCMS) to create, edit, activate, and deactivate predefined shuttle routes (origin/destination pairs).

### ADM.2.2: Pricing Management

The system MUST allow administrators to set and adjust pricing dynamically based on route, vehicle type, and potential date/time factors.

### ADM.2.3: Booking Review

The system MUST allow administrators to view, search, filter, and manage all incoming bookings.

### ADM.2.4: Content Editing

The system MUST allow administrators to update all static marketing content (e.g., About Us, Contact, Landing Page text) via the PayloadCMS interface.

## Related Non-Functional Requirements

* **NFR.2.1:** Admin Experience - The PayloadCMS Admin interface MUST provide a stable, low-latency editing experience.

## Technical Context

* **CMS Platform:** PayloadCMS (Self-hosted on Vercel)
* **Access Control:** Payload Access Control functions used to restrict Routes and Pricing to Admin-only
* **Authentication:** All Admin routes are protected via **Supabase Auth** middleware

