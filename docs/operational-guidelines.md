# Operational Guidelines

## Security Best Practices

* **Authentication:** All Booking and Admin routes are protected via **Supabase Auth** middleware.
* **Input Validation:** All API inputs (Server Actions) validated using **Zod** schemas.
* **CMS Security:** Payload Access Control functions used to restrict Routes and Pricing to Admin-only.
* **Secrets:** Managed via Vercel Environment Variables.

## Testing Requirements

* **E2E Testing:** **Playwright** automated tests MUST cover the "Happy Path" Booking Flow (Search → Quote → Payment Success) on Mobile and Desktop.
* **Unit Testing:** **Vitest** or **Jest** MUST cover **100%** of the Pricing Calculation Logic.
* **Manual QA:** Admin Panel functionality will be validated via manual exploratory testing.

## Coding Standards

* **Type Safety:** All new code MUST be written in **TypeScript** (Strict mode enabled).
* **Framework:** Next.js 14.x (App Router) with Server Actions.
* **Component Architecture:** Atomic Design-inspired with Shadcn/UI primitives.

