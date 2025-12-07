# **Vestroo Shuttle Platform Architecture Document**

## **Introduction / Preamble**

This document outlines the overall project architecture for the **Vestroo Shuttle Platform**. It serves as the guiding blueprint for the development of a high-performance, SEO-optimized shuttle booking website and a robust, "WordPress-like" Content Management System (CMS).

Relationship to Frontend Architecture:

A separate Frontend Architecture Document (docs/frontend-architecture.md) will detail the UI-specific design, including the component library and strict Tailwind CSS conventions. This document defines the core technology stack, backend services, data models, and infrastructure.

## **Technical Summary**

The Vestroo Shuttle Platform is a **Serverless Monorepo** application built on **Next.js** (App Router). It integrates **PayloadCMS** directly as a "Next.js Native" plugin, allowing the Marketing Website, Booking Application, and Admin Panel to coexist in a single deployable unit on **Vercel**. Data persistence is managed by **Supabase (PostgreSQL)**, ensuring relational data integrity for bookings and routes. The architecture prioritizes **Incremental Static Regeneration (ISR)** for high-performance SEO on marketing pages, while utilizing dynamic server-side logic for the booking flow.

## **High-Level Overview**

* **Architectural Style:** Serverless / Event-Driven (via Vercel Functions).  
* **Repository Structure:** **Monorepo**.  
* **Primary User Interaction:**  
  * **Travelers:** Interact with ISR-cached marketing pages and a dynamic, wizard-style booking widget (Client-Side React with Server Actions).  
  * **Admins:** Interact with the secure PayloadCMS Dashboard (/admin) for content and business management.  
* **Data Flow:** Next.js Server Actions $\\rightarrow$ Payload Local API $\\rightarrow$ Supabase (Postgres).

Code snippet

graph TD  
    User(Traveler) \--\>|HTTPS| CDN\[Vercel Edge Network\]  
    CDN \--\>|Static Content (ISR)| Marketing\[Marketing Pages (Next.js)\]  
    CDN \--\>|Dynamic Req| App\[Booking App (Next.js)\]  
      
    subgraph Vercel Serverless Function  
        Marketing  
        App  
        API\[Next.js API Routes\]  
        Payload\[PayloadCMS Core\]  
    end

    Admin(Vestroo Staff) \--\>|HTTPS| Payload  
      
    App \--\>|Route Calc| GMap\[Google Maps API\]  
    App \--\>|Payment| PayFast\[PayFast Onsite\]  
      
    Payload \--\>|Auth/Data| DB\[(Supabase PostgreSQL)\]  
    App \--\>|Auth/Data| DB

## **Architectural / Design Patterns Adopted**

* **Pattern 1: Next.js Native CMS (Embedded Headless):** We run PayloadCMS *inside* the Next.js app. *Rationale:* Eliminates the need for a separate API server, reduces latency via "Local API" calls during ISR builds, and simplifies Vercel deployment.  
* **Pattern 2: Incremental Static Regeneration (ISR):** *Rationale:* Allows route landing pages (e.g., /shuttle-jnb-to-sandton) to be statically generated for 100ms load times (SEO critical) but updated automatically when pricing changes in the CMS.  
* **Pattern 3: Route Groups ((marketing) vs (app)):** *Rationale:* logically separates the static/marketing concerns (High SEO, ISR) from the dynamic application concerns (Auth, Protected Routes, No Caching).

## **Component View**

* **Marketing & SEO Engine (src/app/(marketing)):** Handles the Homepage, About Us, and dynamically generated Service Route pages. Renders content fetched from Payload.  
* **Booking Engine (src/app/(app)):** Handles the Wizard State, Quote Calculation, User Auth (via Supabase), and Payment Processing.  
* **Admin Panel (src/app/(payload)/admin):** The generated PayloadCMS interface for managing Routes, Users, and Content.  
* **Core Service Layer (src/services):** Encapsulates business logic (e.g., PriceCalculator, EmailService) to be shared between Payload Hooks and Next.js Server Actions.

## **Project Structure**

Plaintext

vestroo-platform/  
├── .github/                    \# CI/CD (GitHub Actions)  
├── src/  
│   ├── app/                    \# Next.js App Router Root  
│   │   ├── (marketing)/        \# Route Group: Public, ISR-heavy pages  
│   │   │   ├── page.tsx        \# Homepage  
│   │   │   ├── \[routeSlug\]/    \# Dynamic SEO Landing Pages  
│   │   │   └── layout.tsx  
│   │   ├── (app)/              \# Route Group: Dynamic Booking App  
│   │   │   ├── book/           \# Booking Wizard  
│   │   │   ├── profile/        \# User Dashboard  
│   │   │   └── layout.tsx  
│   │   ├── (payload)/          \# PayloadCMS Admin Routes  
│   │   │   └── admin/  
│   │   └── api/                \# Next.js API Routes (Webhooks, Cron)  
│   ├── collections/            \# PayloadCMS Collection Definitions  
│   │   ├── Routes.ts  
│   │   ├── Bookings.ts  
│   │   └── ...  
│   ├── components/             \# React Components (UI Library)  
│   │   ├── ui/                 \# Shadcn/Tailwind Atoms  
│   │   └── booking/            \# Booking-specific widgets  
│   ├── lib/                    \# Shared Utilities  
│   │   └── calculations.ts     \# Pricing Logic  
│   ├── migrations/             \# Database Migrations  
│   └── payload.config.ts       \# PayloadCMS Main Config  
├── .env.example  
├── next.config.js  
├── package.json  
└── tsconfig.json

## **API Reference**

### **External APIs Consumed**

#### **Google Maps Platform**

* **Purpose:** Autocomplete for pickup/drop-off locations and Distance Matrix for quote validation.  
* **Authentication:** API Key (Server-side restricted).  
* **Key Endpoints:** Places Autocomplete, Distance Matrix.

#### **PayFast (Onsite)**

* **Purpose:** Processing payments without full redirection.  
* **Authentication:** Merchant ID \+ Signature (Server-side generation).  
* **Flow:** Application generates a signature $\\rightarrow$ Frontend triggers PayFast Modal $\\rightarrow$ Webhook confirms payment.

## **Data Models**

### **Core Entities**

#### **1\. Route (Point-to-Point)**

* **Purpose:** Defines a sellable shuttle service between two points.  
* **Schema (Payload Collection):**  
* TypeScript

export interface Route {  
  id: string;  
  origin\_name: string;      // e.g., "OR Tambo Airport"  
  destination\_name: string; // e.g., "Sandton City"  
  base\_price: number;  
  is\_active: boolean;  
  slug: string;             // Auto-generated for SEO: "or-tambo-to-sandton"  
  seo\_content: RichText;    // Custom content for the landing page  
}

*   
* 

#### **2\. Booking**

* **Purpose:** Records a traveler's reservation.  
* **Schema:**  
* TypeScript

export interface Booking {  
  id: string;  
  user\_id: string (Relation to Users);  
  route\_id: string (Relation to Routes);  
  status: 'pending' | 'paid' | 'confirmed' | 'completed' | 'cancelled';  
  passenger\_count: number;  
  pickup\_datetime: Date;  
  flight\_number?: string;  
  total\_amount: number;  
  payment\_reference: string;  
}

*   
* 

## **Definitive Tech Stack Selections**

| Category | Technology | Version | Description |
| :---- | :---- | :---- | :---- |
| **Language** | TypeScript | 5.x | Strict mode enabled. |
| **Framework** | Next.js | 14.x | App Router, Server Actions. |
| **CMS** | PayloadCMS | 3.0 (Beta/Stable) | Next.js Native version. |
| **Database** | Supabase (PostgreSQL) | Latest | Managed Postgres \+ Auth. |
| **Styling** | Tailwind CSS | 3.x | Utility-first styling. |
| **UI Library** | Shadcn/UI (Radix) | Latest | Accessible component primitives. |
| **Testing** | Playwright | Latest | E2E Testing. |
| **Testing** | Vitest | Latest | Unit Testing (Pricing Logic). |
| **Hosting** | Vercel | N/A | Serverless deployment. |

## **Infrastructure and Deployment Overview**

* **Cloud Provider:** Vercel (Frontend/API/CMS) \+ Supabase (Database).  
* **Infrastructure as Code:** Vercel Project Config (vercel.json where needed) \+ Payload Config.  
* **Deployment Strategy:**  
  * **Push to Main:** Triggers Vercel Production Build.  
  * **Pull Request:** Triggers Vercel Preview Deployment (Ephemeral environments).  
* **Environment Promotion:** Automated via Git flow (dev branch \-\> Preview, main branch \-\> Prod).

## **Security Best Practices**

* **Authentication:** All Booking and Admin routes are protected via **Supabase Auth** middleware.  
* **Input Validation:** All API inputs (Server Actions) validated using **Zod** schemas.  
* **CMS Security:** Payload Access Control functions used to restrict Routes and Pricing to Admin-only.  
* **Secrets:** Managed via Vercel Environment Variables.