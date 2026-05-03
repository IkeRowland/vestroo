# **Vestroo Shuttle Platform \- Frontend Architecture Document**

## **Table of Contents**

* [Introduction](https://www.google.com/search?q=%23introduction)  
* [Overall Frontend Philosophy & Patterns](https://www.google.com/search?q=%23overall-frontend-philosophy--patterns)  
* [Detailed Frontend Directory Structure](https://www.google.com/search?q=%23detailed-frontend-directory-structure)  
* [Component Breakdown & Implementation Details](https://www.google.com/search?q=%23component-breakdown--implementation-details)  
* [State Management In-Depth](https://www.google.com/search?q=%23state-management-in-depth)  
* [API Interaction Layer](https://www.google.com/search?q=%23api-interaction-layer)  
* [Routing Strategy](https://www.google.com/search?q=%23routing-strategy)  
* [Build, Bundling, and Deployment](https://www.google.com/search?q=%23build-bundling-and-deployment)  
* [Frontend Testing Strategy](https://www.google.com/search?q=%23frontend-testing-strategy)  
* [Accessibility (AX) Implementation Details](https://www.google.com/search?q=%23accessibility-ax-implementation-details)  
* [Performance Considerations](https://www.google.com/search?q=%23performance-considerations)  
* [Frontend Security Considerations](https://www.google.com/search?q=%23frontend-security-considerations)  
* [Browser Support](https://www.google.com/search?q=%23browser-support)

## **Introduction**

This document details the technical architecture specifically for the frontend of the **Vestroo Shuttle Platform**. It builds upon the decisions made in the main docs/architecture.md (Monorepo, Next.js, Vercel) and details the implementation of the specific UI/UX goals defined in the PRD (High-conversion Booking Wizard, "Mobile-First" design).

* **Link to Main Architecture Document:** docs/architecture.md  
* **Link to UI/UX Specification:** (To be created) docs/ui-ux-spec.md

## **Overall Frontend Philosophy & Patterns**

* **Framework:** **Next.js 14.x (App Router)**.  
  * We will leverage **React Server Components (RSC)** for all Marketing/SEO pages ((marketing) group) to ensure maximum performance and zero client-side JavaScript for static content.  
  * We will use **Client Components** ("use client") strictly for interactive elements: The Booking Wizard, Mobile Navigation, and Admin Dashboard interactions.  
* **Component Architecture:**  
  * **Atomic Design-inspired:** Primitives in src/components/ui (Atoms/Molecules), Feature-specific business components in src/features/... (Organisms).  
  * **Library:** **Shadcn/UI** (built on Radix Primitives) is the definitive component library. It provides accessible, unstyled primitives that we style with Tailwind.  
* **State Management Strategy:**  
  * **Global/Session State:** **Zustand**. Used specifically for the **Booking Wizard** to persist user inputs (Pick up, Drop off, Date, Passenger count) across the multi-step flow without URL clutter.  
  * **Server State:** **React Query** (optional) or native Next.js cache/revalidatePath for fetching data. Given the "Server Actions" architecture, we will primarily rely on **Server Actions** for data mutation and fetching, reducing the need for a heavy client-side fetcher like React Query for the MVP.  
* **Styling Approach:** **Tailwind CSS**.  
  * **Utility-First:** All styling is done via utility classes.  
  * **Configuration:** tailwind.config.ts will define the corporate color palette (Primary, Secondary, Accent) to match the "Trustworthy/Professional" design goal.  
  * **Internal ops / field consoles:** **`/ops/*`** and **authenticated `/field/*`** follow **[ADR 0001](adr/0001-ops-field-ui-stack-tailwind-radix.md)** and **[ops-design-system-parity.md](ops-design-system-parity.md)** (scoped **`data-ops-theme`** tokens + shared **`Ops*`** primitives under **`src/features/ops/`**).  
  * **Animation:** framer-motion for smooth transitions in the Booking Wizard (e.g., sliding between steps).

## **Detailed Frontend Directory Structure**

Plaintext

src/  
├── app/                        \# Next.js App Router  
│   ├── (marketing)/            \# Public Marketing Pages (ISR enabled)  
│   │   ├── globals.css         \# Global Styles (Tailwind directives)  
│   │   ├── layout.tsx          \# Marketing Layout (Header/Footer)  
│   │   ├── page.tsx            \# Homepage (contains \<BookingWidgetHero /\>)  
│   │   └── \[routeSlug\]/        \# Dynamic SEO Landing Pages  
│   │       └── page.tsx        \# e.g., /shuttle-jnb-to-sandton  
│   ├── (app)/                  \# Dynamic Booking Application  
│   │   ├── layout.tsx          \# App Layout (Minimal Header, Focus on Task)  
│   │   └── book/               \# The Booking Wizard Route  
│   │       ├── page.tsx        \# Redirects to /book/search  
│   │       ├── search/         \# Step 1: Search Inputs  
│   │       ├── quote/          \# Step 2: Select Vehicle/Quote  
│   │       ├── details/        \# Step 3: Passenger Details  
│   │       └── payment/        \# Step 4: PayFast Integration  
│   ├── (payload)/              \# PayloadCMS Admin Routes (Managed by Payload)  
│   │   └── admin/  
│   └── api/                    \# API Routes (Webhooks, etc.)  
│  
├── actions/                    \# Next.js Server Actions (The "API Layer")  
│   ├── calculateQuote.ts       \# Server-side pricing logic  
│   ├── createBooking.ts        \# Writes to Supabase  
│   └── processPayment.ts       \# Handles PayFast signature generation  
│  
├── components/  
│   ├── ui/                     \# Shadcn Primitives (Button, Input, Select, Card)  
│   │   ├── button.tsx  
│   │   └── ...  
│   ├── layout/                 \# Shared Layouts  
│   │   ├── Header.tsx  
│   │   └── Footer.tsx  
│   └── booking/                \# Reusable Booking Components  
│       ├── RouteSummaryCard.tsx  
│       └── VehicleOptionCard.tsx  
│  
├── features/                   \# Feature-based Modules  
│   └── booking/  
│       ├── hooks/              \# e.g., useBookingStore.ts  
│       ├── components/         \# Complex organisms (e.g., BookingWizardStepper)  
│       └── utils/              \# Booking-specific helpers  
│  
├── lib/  
│   ├── utils.ts                \# Shadcn cn() helper  
│   └── maps.ts                 \# Google Maps API wrapper  
│  
└── styles/  
    └── fonts.ts                \# Next.js Font Optimization config

## **Component Breakdown & Implementation Details**

### **Component Naming & Organization**

* **PascalCase** for component files (BookingWidget.tsx).  
* Co-locate feature-specific components in src/features/{feature}/components.

### **Key Component: BookingWizard**

* **Purpose:** The core revenue driver. Orchestrates the multi-step booking flow.  
* **Source:** src/features/booking/components/BookingWizard.tsx  
* **State:** Connects to useBookingStore (Zustand).  
* **Structure:**  
  * Renders a **Stepper** (Visual progress indicator).  
  * Renders the current **Step Component** (Search, Quote, Details, Payment) based on the route or internal state.  
  * Manages transitions using framer-motion.

### **Key Component: AddressAutocomplete**

* **Purpose:** Google Maps Places Autocomplete input for Origin/Destination.  
* **Source:** src/components/ui/AddressAutocomplete.tsx  
* **Props:** onSelect: (place: PlaceResult) \=\> void, label: string.  
* **Implementation:** Wraps use-places-autocomplete library (or native Google Maps Script) to provide a controlled input that returns geocoded data.

## **State Management In-Depth**

### **Global Store: useBookingStore (Zustand)**

We need to persist the "Draft Booking" as the user moves between pages.

TypeScript

interface BookingState {  
  // Step 1: Search  
  origin: Location | null;  
  destination: Location | null;  
  date: Date | null;  
  passengers: number;  
    
  // Step 2: Quote  
  selectedVehicleId: string | null;  
  quoteAmount: number | null;  
    
  // Step 3: Details  
  customer: { name: string; email: string; phone: string; flightNumber?: string };  
    
  // Actions  
  setTripDetails: (details: Partial\<BookingState\>) \=\> void;  
  selectVehicle: (vehicleId: string, amount: number) \=\> void;  
  reset: () \=\> void;  
}

## **API Interaction Layer**

### **Server Actions**

Instead of a traditional apiClient.ts calling REST endpoints, we use **Next.js Server Actions** for type-safe, direct backend logic invocation.

* **calculateQuote(data: SearchParams)**  
  * **Input:** Origin/Dest Coordinates, Pax.  
  * **Logic:** Calls Google Distance Matrix API $\\rightarrow$ Queries PayloadCMS for Base Rates $\\rightarrow$ Returns Price.  
  * **Output:** Promise\<QuoteResult | Error\>  
* **createBooking(data: BookingState)**  
  * **Input:** Full booking state from Zustand.  
  * **Logic:** Validates data $\\rightarrow$ Creates record in Supabase (status: 'pending') $\\rightarrow$ Generates PayFast Signature.  
  * **Output:** Promise\<{ bookingId: string, payFastData: any }\>

## **Routing Strategy**

### **Route Definitions**

| Path | Component | Type | Notes |
| :---- | :---- | :---- | :---- |
| / | (marketing)/page.tsx | Server | Homepage. High SEO. |
| /book | (app)/book/page.tsx | Client | Redirects to /book/search. |
| /book/search | (app)/book/search/page.tsx | Client | Step 1 inputs. |
| /book/quote | (app)/book/quote/page.tsx | Client | Display calculated options. Protected: Requires origin set. |
| /book/details | (app)/book/details/page.tsx | Client | User info form. Protected: Requires selectedVehicle. |
| /book/payment | (app)/book/payment/page.tsx | Client | PayFast modal trigger. |
| /confirmation | (app)/confirmation/page.tsx | Server | Success state. Fetches booking via ID param. |

## **Build, Bundling, and Deployment**

* **Build:** next build (Standard).  
* **Environment Vars:** Managed via Vercel Project Settings.  
  * NEXT\_PUBLIC\_GOOGLE\_MAPS\_KEY (Exposed to client).  
  * PAYFAST\_MERCHANT\_ID (Exposed to client).  
  * PAYFAST\_PASSPHRASE (Server only).  
  * SUPABASE\_SERVICE\_ROLE\_KEY (Server only).  
* **Fonts:** next/font (Google Fonts) \- Preloaded at build time.

## **Frontend Testing Strategy**

* **E2E (Playwright):**  
  * **Critical Flow:** "Guest User Booking".  
  * Steps: Landing Page $\\rightarrow$ Enter "Sandton" to "OR Tambo" $\\rightarrow$ Select Date $\\rightarrow$ Click "Get Quote" $\\rightarrow$ Select "Sedan" $\\rightarrow$ Enter Details $\\rightarrow$ Click "Pay".  
* **Unit (Vitest):**  
  * Test calculateQuote logic (mocking Google Maps).  
  * Test Form Validation schemas (Zod).

## **Accessibility (AX) Implementation**

* **Forms:** All inputs must have associated \<label\> elements (handled by Shadcn FormItem).  
* **Keyboard Nav:** The Booking Wizard must be fully navigable via Tab.  
* **Focus Management:** When moving between Wizard steps, focus should reset to the top of the new form container.

## **Frontend Security Considerations**

* **Input Validation:** **Zod** schemas used on both Client (React Hook Form) and Server (Server Actions) to validate all user input.  
* **XSS:** Next.js automatically escapes data. dangerouslySetInnerHTML is forbidden.  
* **PayFast:** Payment credentials (Passphrase) NEVER exposed to client. Signature generation happens strictly in processPayment.ts (Server Action).