# **Vestroo Shuttle Platform \- Product Requirements Document (PRD)**

## **1\. Goal, Objective and Context**

**Core Objective:** To launch a highly performant, SEO-optimized shuttle service booking website for Vestroo, featuring a high-conversion, single point-to-point transfer flow (MVP), and a customizable, self-hosted, "WordPress-like" content management system (CMS) for the admin team.

**Context:** The client requires a complete redesign to replace their existing legacy site (vestroo.co.za) to match the modern UX standards of competitors (e.g., ezshuttle.co.za) while gaining full control over their content and pricing via a custom admin panel.

## **2\. Functional Requirements (MVP)**

### **1\. Traveler Interface & Booking Flow (FE)**

* **FE.1.1: Booking Search & Quote:** The system MUST provide an intuitive interface (the core booking widget) allowing the user to select **Pick up and Drop off locations (including Flight Number if originating from an airport), Passenger Count, Date, and Time** to receive an instant, accurate, non-negotiable quote.  
* **FE.1.2: Checkout Process:** The system MUST guide the user through a simple, high-conversion, multi-step checkout process (e.g., Quote Review $\\rightarrow$ Contact Details $\\rightarrow$ Payment $\\rightarrow$ Confirmation).  
* **FE.1.3: Pricing & Payment:** The system MUST clearly display the final price before payment submission and integrate with **PayFast** for secure online payment processing.  
* **FE.1.4: Booking Confirmation:** The system MUST send an automatic confirmation email to the user upon successful booking and payment.

### **2\. Admin Interface & CMS (ADM)**

* **ADM.2.1: Route Management:** The system MUST allow administrators (via PayloadCMS) to create, edit, activate, and deactivate predefined shuttle routes (origin/destination pairs).  
* **ADM.2.2: Pricing Management:** The system MUST allow administrators to set and adjust pricing dynamically based on route, vehicle type, and potential date/time factors.  
* **ADM.2.3: Booking Review:** The system MUST allow administrators to view, search, filter, and manage all incoming bookings.  
* **ADM.2.4: Content Editing:** The system MUST allow administrators to update all static marketing content (e.g., About Us, Contact, Landing Page text) via the PayloadCMS interface.

### **3\. Core Technical Functions (CORE)**

* **CORE.3.1: Data Persistence:** The system MUST securely store all user, booking, route, and pricing data in the **Supabase (PostgreSQL)** database.  
* **CORE.3.2: User Authentication:** The system MUST allow users and administrators to log in securely, leveraging **Supabase Auth**.  
* **CORE.3.3: SEO Landing Pages:** The system MUST dynamically render SEO-friendly landing pages for each active route defined in the CMS (e.g., /shuttle-from-johannesburg-to-sandton).  
* **CORE.3.4: Route Calculation:** The system MUST utilize the **Google Maps API** for autocomplete and route distance/time calculation.

## **3\. Non-Functional Requirements (MVP)**

| ID | Requirement | Detail |
| :---- | :---- | :---- |
| **NFR.1.1** | **Web Performance** | The website MUST achieve "Good" or "Excellent" status based on Google's Core Web Vitals (LCP under 2.5s). |
| **NFR.1.2** | **Scalability** | The Vercel/Supabase serverless architecture MUST scale automatically to handle a 5x increase in quote request volume. |
| **NFR.1.3** | **Availability** | The core website and booking engine MUST maintain a **99.9% uptime**. |
| **NFR.2.1** | **Admin Experience** | The PayloadCMS Admin interface MUST provide a stable, low-latency editing experience. |
| **NFR.3.1** | **Security** | All data transfer MUST utilize **HTTPS/TLS encryption**. |
| **NFR.3.2** | **SEO Compliance** | The application MUST utilize **Incremental Static Regeneration (ISR)** for high performance and data freshness. |
| **NFR.4.1** | **Type Safety** | All new code MUST be written in **TypeScript**. |

## **4\. User Interaction and Design Goals**

* **Overall Vision:** Modern, friendly, corporate, professional, trustworthy, and efficient.  
* **Key Interaction:** Quick, high-conversion, widget-style search and quote flow (mimicking ezshuttle.co.za).  
* **Critical Views:** Homepage/Booking Widget, Quote Review Page, Booking Confirmation Page.  
* **Responsiveness:** **Mobile-first** approach is mandatory.

## **5\. Technical Assumptions**

* **Repository Structure:** **Monorepo** containing Next.js (Frontend) and PayloadCMS (Admin/API).  
* **Primary Stack:** Next.js (TypeScript), Tailwind CSS.  
* **Database:** Supabase (PostgreSQL).  
* **CMS:** PayloadCMS (Self-hosted on Vercel).  
* **Deployment:** Vercel (Serverless).  
* **External APIs:** Google Maps API (Routes/Autocomplete), PayFast (Payments).

## **6\. Testing Requirements**

* **E2E Testing:** **Playwright** automated tests MUST cover the "Happy Path" Booking Flow (Search $\\rightarrow$ Quote $\\rightarrow$ Payment Success) on Mobile and Desktop.  
* **Unit Testing:** **Vitest** or **Jest** MUST cover **100%** of the Pricing Calculation Logic.  
* **Manual QA:** Admin Panel functionality will be validated via manual exploratory testing.

---

## **Architect Prompt**

* **Repository:** Monorepo (Next.js \+ PayloadCMS).  
* **Hosting:** Vercel (Serverless).  
* **Database:** Supabase (PostgreSQL).  
* **Frontend:** Next.js (App Router), Tailwind CSS.  
* **CMS:** PayloadCMS (Next.js Native).  
* **Critical Integrations:** Google Maps API, PayFast.  
* **Testing:** Playwright (E2E), Vitest (Unit).  
* **Key Constraint:** "WordPress-like" admin experience using PayloadCMS; High SEO scores via ISR.