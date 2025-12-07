# **Project Brief: Vestroo Shuttle Platform**

## **Introduction / Problem Statement**

The client, Vestroo, requires a complete redesign and rebuild of their shuttle service website, replacing their existing site (vestroo.co.za). The goal is to move to a modern, high-performance, and SEO-optimized platform to increase bookings and improve operational efficiency. The current pain points are centered around the need for a modern booking experience and a robust content management system. The client specifically requested the new UI/UX to match the look and feel of a competitor's site (ezshuttle.co.za).

## **Vision & Goals**

* **Vision:** To launch the leading digital platform for shuttle service bookings in the client's operational area, known for its speed, reliability, and ease of content management.  
* **Primary Goals:**  
  * Goal 1: Successfully launch the Minimum Viable Product (MVP) within the agreed-upon timeline (TBD by PM).  
  * Goal 2: Implement a high-conversion, user-friendly booking flow for Simple Point-to-Point Transfers.  
  * Goal 3: Achieve 'Excellent' SEO performance scores via Next.js and Incremental Static Regeneration (ISR).  
  * Goal 4: Deliver a feature-rich, self-hosted Content Management System (CMS) that provides a "WordPress-like" administrative experience for the client's team.  
* **Success Metrics (Initial Ideas):**  
  * Increase in successful online bookings (Conversion Rate).  
  * Average Page Load Speed (Core Web Vitals).  
  * Search engine ranking for key service routes/areas.  
  * Time required for Admin to publish new content/update pricing.

## **Target Audience / Users**

* **Travelers/Customers:** Individuals or groups needing reliable, pre-booked transportation. Key need: Easy, fast, transparent booking process.  
* **Admin/Business Owner (Internal User):** Needs to efficiently manage content, marketing materials, shuttle routes, pricing structure, and view booking data. Key need: A powerful, intuitive, and familiar admin interface (like WordPress).

## **Key Features / Scope (High-Level Ideas for MVP)**

* Frontend website following the UI/UX pattern of the provided reference site (ezshuttle.co.za).  
* Core booking widget for Single **Point-to-Point Transfers** (Date, Time, Pickup, Drop-off, Passenger Count).  
* **SEO-optimized Landing Pages** dynamically generated for service routes (e.g., 'Shuttle from A to B').  
* **Custom Admin Interface** built on PayloadCMS for managing dynamic content, routes, and pricing.  
* Basic User/Authentication system (leveraging Supabase for user management).

## **Post MVP Features / Scope and Ideas**

* **Multi-Stop Journey Booking:** Ability for users to add multiple legs to a single journey.  
* **Hourly Hire/Charter Booking:** Dedicated flow for chartering a vehicle for a set duration.  
* **Supporting Content Section:** Implementation of a blog or articles managed via the CMS for general SEO authority and brand building.  
* **Real-Time Vehicle Tracking** (if data available).

## **Known Technical Constraints or Preferences**

* **Constraints:** High performance, high SEO score, and a "WordPress-like" admin experience are mandatory.  
* **Initial Architectural Preferences (if any):**  
  * **Language/Frameworks:** Next.js (TypeScript), Tailwind CSS.  
  * **Database/Auth:** Supabase (PostgreSQL).  
  * **Content Management:** PayloadCMS (self-hosted, TypeScript-first, Next.js Native).  
  * **Deployment:** Vercel (compatible with the chosen stack).  
  * **Rendering Strategy:** Incremental Static Regeneration (ISR) for high performance and data freshness.  
* **Risks:** The custom development of the "WordPress-like" admin UI using PayloadCMS requires careful planning to manage scope and meet expectations.  
* **User Preferences:** Strong preference for modern, scalable, and high-performance serverless architecture.

## **Relevant Research (Optional)**

* Comparison of Headless CMS solutions favored PayloadCMS due to its superior Next.js/TypeScript integration and developer-first, highly customizable nature, making it ideal for the "WordPress-like functionality" requirement.  
* The ISR rendering strategy was selected to balance SEO performance with the necessity for data freshness (e.g., pricing updates).