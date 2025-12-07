# Component View

## Architectural Components

* **Marketing & SEO Engine (src/app/(marketing)):** Handles the Homepage, About Us, and dynamically generated Service Route pages. Renders content fetched from Payload.

* **Booking Engine (src/app/(app)):** Handles the Wizard State, Quote Calculation, User Auth (via Supabase), and Payment Processing.

* **Admin Panel (src/app/(payload)/admin):** The generated PayloadCMS interface for managing Routes, Users, and Content.

* **Core Service Layer (src/services):** Encapsulates business logic (e.g., PriceCalculator, EmailService) to be shared between Payload Hooks and Next.js Server Actions.

## Architectural / Design Patterns Adopted

* **Pattern 1: Next.js Native CMS (Embedded Headless):** We run PayloadCMS *inside* the Next.js app. *Rationale:* Eliminates the need for a separate API server, reduces latency via "Local API" calls during ISR builds, and simplifies Vercel deployment.

* **Pattern 2: Incremental Static Regeneration (ISR):** *Rationale:* Allows route landing pages (e.g., /shuttle-jnb-to-sandton) to be statically generated for 100ms load times (SEO critical) but updated automatically when pricing changes in the CMS.

* **Pattern 3: Route Groups ((marketing) vs (app)):** *Rationale:* logically separates the static/marketing concerns (High SEO, ISR) from the dynamic application concerns (Auth, Protected Routes, No Caching).

