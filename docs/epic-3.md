# Epic 3: Core Technical Functions (CORE)

## Description

This epic encompasses the foundational technical infrastructure and services that power the entire platform, including data persistence, authentication, SEO capabilities, and external API integrations.

## Goals

* Ensure secure and reliable data storage
* Provide robust user authentication
* Enable SEO-optimized dynamic content generation
* Integrate with external services for route calculation

## User Stories / Requirements

### CORE.3.1: Data Persistence

The system MUST securely store all user, booking, route, and pricing data in the **Supabase (PostgreSQL)** database.

### CORE.3.2: User Authentication

The system MUST allow users and administrators to log in securely, leveraging **Supabase Auth**.

### CORE.3.3: SEO Landing Pages

The system MUST dynamically render SEO-friendly landing pages for each active route defined in the CMS (e.g., /shuttle-from-johannesburg-to-sandton).

### CORE.3.4: Route Calculation

The system MUST utilize the **Google Maps API** for autocomplete and route distance/time calculation.

## Related Non-Functional Requirements

* **NFR.1.2:** Scalability - The Vercel/Supabase serverless architecture MUST scale automatically to handle a 5x increase in quote request volume.
* **NFR.1.3:** Availability - The core website and booking engine MUST maintain a **99.9% uptime**.
* **NFR.3.1:** Security - All data transfer MUST utilize **HTTPS/TLS encryption**.
* **NFR.4.1:** Type Safety - All new code MUST be written in **TypeScript**.

## Technical Context

* **Database:** Supabase (PostgreSQL)
* **Authentication:** Supabase Auth
* **External APIs:** Google Maps API (Routes/Autocomplete)
* **Architecture:** Serverless / Event-Driven (via Vercel Functions)
* **Data Flow:** Next.js Server Actions → Payload Local API → Supabase (Postgres)

