# **Vestroo Shuttle Platform \- UI/UX Specification**

## **Introduction**

This document defines the user experience goals, information architecture, user flows, and visual design specifications for the **Vestroo Shuttle Platform**. It serves as the definitive guide for frontend developers to implement the UI using the designated tech stack (Next.js, Tailwind, Shadcn/UI).

* **Link to PRD:** docs/prd.md  
* **Link to Frontend Architecture:** docs/frontend-architecture.md  
* **Reference Site:** ezshuttle.co.za (Functional benchmark)

## **Overall UX Goals & Principles**

* **Target User Personas:**  
  * **The Anxious Traveler:** Needs reassurance, instant confirmation, and clarity on pickup details.  
  * **The Corporate Booker:** Needs efficiency, reliability, and quick receipts.  
  * **The Vestroo Admin:** Needs a no-nonsense, data-dense interface to manage routes and pricing quickly.  
* **Usability Goals:**  
  * **Speed to quote / speed to request:** On flows that still expose **instant rand pricing**, users should reach a quote quickly. On the **quote-deferred trip-request funnel** (**[Epic 10](epic-10.md)** / **[Epic 19](epic-19.md)**), success means **clear capture** and **request-received** confirmation (**slide 4**) — **no** mandatory price before submit (**FE.10.5**).  
  * **Mobile Optimization:** The booking widget must be thumb-friendly and fully functional on mobile devices.  
  * **Trust Indicators:** Professional styling; where pricing exists, present it clearly — trip-request builds trust without in-funnel rand totals (**[`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)** for brand surfaces).  
* **Design Principles:**  
  * **Clarity over Cleverness:** Standard form patterns preferred over experimental UIs.  
  * **Progressive Disclosure:** Show the user only what they need for the **current slide** (trip-request uses **four slides** on one URL — **[Epic 19](epic-19.md)**).  
  * **Trustworthy & Corporate:** Use a clean, professional palette with high-contrast calls to action; **[`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)** defines current marketing/account/booking tokens.

## **Information Architecture (IA)**

### **Site Map**

Code snippet

graph TD  
    Home\[Homepage / Booking Widget\] \--\>|Search| Quote\[Quote Results\]  
    Quote \--\>|Select Vehicle| Details\[Passenger Details\]  
    Details \--\>|Confirm| Pay\[Payment Gateway\]  
    Pay \--\>|Success| Success\[Confirmation Page\]  
      
    Home \--\> About\[About Us\]  
    Home \--\> Contact\[Contact\]  
    Home \--\> RoutePages\[Dynamic Route Landing Pages\]  
      
    subgraph Admin Area  
        Login \--\> Dashboard  
        Dashboard \--\> RouteMgmt\[Route Management\]  
        Dashboard \--\> PricingMgmt\[Pricing Management\]  
        Dashboard \--\> Bookings\[Booking List\]  
    end

**Shipped public trip-request (Epic 10 / Epic 19):** The diagram above reflects a **classic quote → pay** progression still useful for reference flows. The **live** quote-deferred funnel is **four in-page slides** on **one URL** (trip → vehicle → passenger → **request-received** confirmation) — see **[Epic 19](epic-19.md)** and **[`design/booking-flow-simplified.md`](design/booking-flow-simplified.md)**. No separate **Quote Results** route with rand totals for that path; ops-led quote and payment link follow **outside** the funnel (**[`integrations-and-payments.md`](integrations-and-payments.md)**).

### **Navigation Structure**

* **Public Header (Mobile):** Hamburger menu (Home, About, Contact), "Book Now" CTA (sticky).  
* **Public Header (Desktop):** Logo (Left), Nav Links (Center), "Book Now" Button (Right).  
* **Booking App Header:** Minimalist. Logo (Left), "Exit/Cancel" (Right). No distraction links.  
* **Admin Sidebar:** Dashboard, Routes, Pricing, Bookings, Settings, Logout.

## **User Flows**

### **Critical Flow: Guest User Booking**

* **Goal:** A new user lands on the site and completes the booking journey appropriate to the **product path** (instant quote + PayFast where still shipped **vs** quote-deferred trip-request).

* **Path A — Instant quote + checkout (reference / legacy-style UX):**  
  1. **Landing:** Hero + **Booking Widget**.  
  2. **Search:** Origin, destination, date, time, pax.  
  3. **Quote:** Vehicle options with **fixed prices** (where implemented).  
  4. **Selection:** Choose vehicle class.  
  5. **Details:** Name, email, mobile, flight (optional).  
  6. **Review & Pay:** Summary → PayFast / payment step.  
  7. **Success:** Confirmation + email.

* **Path B — Quote-deferred trip-request (Epic 10 / Epic 19 — shipped public funnel):**  
  1. **Entry:** Widget or **`/book/trip-request`** opens **`TripRequestBookingShell`** (embedded or standalone).  
  2. **Slide 1 — Trip details:** Pickup/drop-off, schedule, passengers, optional notes (**FE.10.2**).  
  3. **Slide 2 — Vehicle:** Select **one** class card (**required**); **no rand price** (**FE.10.3**, **FE.19.6**).  
  4. **Slide 3 — Passenger:** Contact + phone + inline org/PO as needed (**FE.10.4**); **Submit trip request** — **no PayFast** here (**FE.10.5**).  
  5. **Slide 4 — Confirmation:** Booking reference, “what happens next”, CTAs (**FE.19.12**). Ops sends quote / payment link **outside** the widget — **[`integrations-and-payments.md`](integrations-and-payments.md)**.

## **Wireframes & Mockups**

### **1\. Homepage / Booking Widget (Mobile First)**

* **Layout:**  
  * **Hero:** High-quality background image of a shuttle/cityscape with a dark overlay.  
  * **Widget:** Floating white card centered on screen.  
    * Field 1: "From" (Map Icon) \- Autocomplete.  
    * Field 2: "To" (Map Marker Icon) \- Autocomplete.  
    * Row 3: Date Picker | Time Picker.  
    * Row 4: Passenger Counter (- 1 \+).  
    * CTA: Large primary action (e.g. **Get Quote** or **Request a trip** — product copy); **Request a trip** opens the **four-slide** shell per **[Epic 19](epic-19.md)** without leaving the page.  
  * **Trust Section:** "Why Vestroo?" icons below the fold.

### **2\. Quote Results Page**

* **Layout (paths that still show priced quote lists):**  
  * **Header:** "Select Your Vehicle".  
  * **List:** Vertical stack of cards.  
  * **Card Content:**  
    * Left: Vehicle Image (clean cutout).  
    * Center: Vehicle Name (e.g., "Premium Sedan"), Pax Capacity icon, Luggage Capacity icon.  
    * Right: **Price** (Large, bold font) — **omit** for **Epic 10 / 19** trip-request (**no-price** cards).  
  * **Interaction:** Tapping a card selects it and advances the flow.

> **Trip-request path:** There is **no** separate “quote results” **route** with rand totals — vehicle choice is **slide 2** inside **`TripRequestBookingShell`**. See **[`design/booking-flow-simplified.md`](design/booking-flow-simplified.md)**.

### **3\. Admin Dashboard (Desktop Focus)**

* **Layout:** Sidebar navigation (PayloadCMS default styling customized).  
* **Dashboard View:**  
  * **Stats Cards:** "Today's Bookings", "Revenue This Month", "Active Routes".  
  * **Recent Table:** List of latest 5 bookings with Status badges (Paid/Pending).

## **Branding & Style Guide Reference**

### **Color Palette**

* **Primary (Brand):** Navy Blue (\#0F172A) \- Used for Headers, Text, Primary UI elements. *(Trust, Corporate)*  
* **Secondary (Action):** Vibrant Orange or Emerald Green (\#10B981) \- Used specifically for "Book Now" and "Pay" buttons. *(Conversion)*  
* **Backgrounds:** Slate-50 to White \- Clean, clinical look.

### **Typography**

* **Font Family:** Inter or Geist Sans (Variable font).  
* **Headings:** Bold, tight tracking.  
* **Body:** Readable, comfortable line height (1.6).

### **Iconography**

* **Set:** Lucide React (Standard in Shadcn/UI).  
* **Style:** Stroke width 2px, rounded corners.

### **Spacing & Grid**

* **System:** Tailwind default spacing scale (p-4, m-8, gap-4).  
* **Container:** max-w-7xl for desktop, px-4 for mobile.

## **Accessibility (AX) Requirements**

* **Compliance:** WCAG 2.1 AA.  
* **Specifics:**  
  * **Contrast:** All text on colored buttons must pass 4.5:1 contrast ratio.  
  * **Forms:** All inputs must have visible labels (no placeholder-only labels).  
  * **Focus:** Booking funnel steps must manage focus — **trip-request:** programmatic focus on the slide **`h2`** on entry / success (**Epic 19**); reduce unnecessary motion when **`prefers-reduced-motion`** is set.  

<span id="operations-console-ops-visual-language"></span>

## **Operations console (`/ops/*`) — visual language (post–Epic 17)**

> **Scope:** This subsection applies **only** to staff-facing routes under **`/ops/*`** (dispatcher / admin console). It **does not** override marketing, booking wizard, or **`/account/*`** sections above; those remain authoritative for customer flows. Where both surfaces share tokens (e.g. vest.rust accent), behaviour is aligned via **[`docs/design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)** — not by copying marketing layout patterns into ops.

> **Wheelzie (reference-only):** Screenshots under **[`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md)** inform **density**, **table row treatments**, **split layouts**, and **calendar** composition. **NFR.17.7:** Do **not** ship Wheelzie rental vocabulary (“rentals”, “rate per day”, etc.) in Vestroo UI — use **corporate shuttle** / **Vestroo** language. Full route ↔ image map: **[`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md)**; story-level traceability: **[`docs/design/epic-17-story-to-artifacts-matrix.md`](design/epic-17-story-to-artifacts-matrix.md)**.

### **Shell & theme**

* **Authenticated ops:** Root layout applies **`data-ops-theme="dark"`** with semantic **`ops-*`** colours (see **[`docs/ops-design-system-parity.md`](ops-design-system-parity.md) § Token scope** and **§ 17**).
* **Public ops sign-in:** **`/ops/login`** uses **`data-ops-theme="light"`** on **`(public-ops)`** only — see **`#parity-17-19`** in parity doc.
* **Top bar:** Search (popover / sheet), breadcrumbs strip, settings link, notifications placeholder, profile menu (**Story 17.2**).
* **Sidebar:** Grouped navigation (**Fulfilment**, **Fleet & People**, **Finance & Compliance**, **Configuration**), optional badges, collapsible rail (**Story 17.3**).

### **Patterns**

* **Page framing:** Prefer **`OpsPageHeader`**, **`OpsFilterRow`**, **`OpsTableShell`**, **`OpsPagination`** per route parity (**§ 17**).
* **Scorecards & charts:** **`OpsKpiCard`**, SVG primitives (**`OpsSparkline`**, **`OpsAreaChart`**, **`OpsDonutChart`**, **`OpsBarChart`**) — lazy-load heavy chart libs only when a story adds them (**NFR.17.2**).
* **Density:** Wheelzie-like compact tables; row hover **`bg-ops-accent-soft`** where specified in parity.
* **Split & detail:** **`OpsSplitView`** + **`OpsDetailRail`**; mobile sheet **`transition-transform duration-200`** (**~200ms**, CSS-only) per epic Design Goals.
* **Calendar / roster:** **`OpsCalendarWeek`**, **`OpsCalendarMonth`**; keyboard roving + **`Esc`** closes rails where implemented.

### **Motion**

* Default **~200ms** transitions on rail/sheet and chart shells — **no** reliance on large animation libraries for MVP (**Epic 17 Design Goals**).

### **Accessibility (ops)**

* Target **WCAG 2.1 AA** on **`/ops/*`**: visible labels, **`sr-only`** table captions, focus rings on **`ring-ops-*`**, **`aria-current`** on pagination, **`role="alert"`** for async errors — see **[`docs/ops-design-system-parity.md`](ops-design-system-parity.md) § 17** per primitive.

<span id="account-portal-visual-language-epic-18"></span>

## **Account portal (`/account/*`) — visual language (Epic 18)**

> **Scope:** This subsection applies **only** to the customer **account portal** — authenticated routes under **`/account/*`** for **organisation admins** and **bookers** — plus **account-themed** public auth (**`/account/login`**, invite signup, **`/account/unauthorized`**) via **`(public-account)`**. It **does not** override the marketing site, the booking funnel, or **`/ops/*`**. Visual tokens align via **[`docs/design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)** and implementation traceability via **[`docs/ops-design-system-parity.md`](ops-design-system-parity.md#parity-18-master-index)** (**§ 18** master index and **`#parity-18-1`** … **`#parity-18-12`**).

> **Wheelzie (reference-only):** PNGs in **[`docs/design/wheelzie-reference/README.md`](design/wheelzie-reference/README.md)** and the route map **[`docs/design/visual-redesign-references.md`](design/visual-redesign-references.md)** inform **density** and **layout** only — **[Epic 18](epic-18.md)** product copy is **B2B shuttle / corporate client** vocabulary, **not** rental or consumer car-hire language.

### **Shell & theme**

* **Portal chrome:** **`data-account-theme="light"`**, **`AccountShell`** / sidebar / top bar — parity **`#parity-18-1`**, **`#parity-18-2`**.
* **Public auth (no shell):** **`(public-account)`** layout applies account tokens without portal chrome — parity **`#parity-18-11`** (**NFR.18.4** — theme must not leak to **`/ops/*`** or marketing).
* **IA (key routes):** **`/account`** (dashboard), **`/account/bookings`**, **`/account/invoices`** (admin), **`/account/members`** (admin), **`/account/preferences`**, **`/account/profile`**, **`/account/help`** — see **[Epic 18](epic-18.md)**.

### **Patterns**

* **Shared primitives:** **`src/components/saas/`** with **`theme="account"`** where applicable — parity **`#parity-18-3`** / **FE.18.13** (implementation **Story 18.3**; documentation obligation **Story 18.13**).
* **Density & tone:** **Trusted concierge** — slightly softer than **`/ops/*`**, more whitespace (**Epic 18 Design Goals**); same SVG/chart posture as ops (**NFR.18.2**).

### **Mobile**

* Breakpoints, stacked tables, full-screen detail drawers — parity **`#parity-18-12`** (**FE.18.12** / **Story 18.12**); aligns with mobile-first booking guidance (**FE.5.7**).

### **Accessibility (account)**

* Target **WCAG 2.1 AA** on redesigned **`/account/*`** surfaces — **NFR.18.5**; detailed expectations per subsection in **[`docs/ops-design-system-parity.md`](ops-design-system-parity.md)** § **18**.

## **Responsiveness**

* **Breakpoints:** Tailwind Defaults (sm: 640px, md: 768px, lg: 1024px).  
* **Strategy:** **Mobile-First**.  
  * The Booking Widget is a full-screen or large modal experience on mobile.  
  * On Desktop, the Widget becomes a horizontal bar or a side-panel on the Hero image.

