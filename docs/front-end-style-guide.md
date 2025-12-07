# Front-End Style Guide

## Styling Approach

**Tailwind CSS** - Utility-first styling approach.

* **Utility-First:** All styling is done via utility classes.
* **Configuration:** `tailwind.config.ts` will define the corporate color palette (Primary, Secondary, Accent) to match the "Trustworthy/Professional" design goal.
* **Animation:** framer-motion for smooth transitions in the Booking Wizard (e.g., sliding between steps).

## Overall Frontend Philosophy & Patterns

* **Framework:** **Next.js 14.x (App Router)**.
  * We will leverage **React Server Components (RSC)** for all Marketing/SEO pages ((marketing) group) to ensure maximum performance and zero client-side JavaScript for static content.
  * We will use **Client Components** ("use client") strictly for interactive elements: The Booking Wizard, Mobile Navigation, and Admin Dashboard interactions.

* **Component Architecture:**
  * **Atomic Design-inspired:** Primitives in `src/components/ui` (Atoms/Molecules), Feature-specific business components in `src/features/...` (Organisms).
  * **Library:** **Shadcn/UI** (built on Radix Primitives) is the definitive component library. It provides accessible, unstyled primitives that we style with Tailwind.

## Design Goals

* **Overall Vision:** Modern, friendly, corporate, professional, trustworthy, and efficient.
* **Key Interaction:** Quick, high-conversion, widget-style search and quote flow (mimicking ezshuttle.co.za).
* **Critical Views:** Homepage/Booking Widget, Quote Review Page, Booking Confirmation Page.
* **Responsiveness:** **Mobile-first** approach is mandatory.

