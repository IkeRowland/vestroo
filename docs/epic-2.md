# Epic 2: Admin Interface & CMS (ADM)

## Description

This epic covers the administrative interface and content management system that allows Vestroo staff to manage routes, pricing, bookings, and marketing content through a "WordPress-like" self-hosted CMS experience.

## Goals

* Enable route management (create, edit, activate/deactivate)
* Provide dynamic pricing management capabilities
* Allow comprehensive booking review and management
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

