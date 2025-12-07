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
  * **Speed to Quote:** Users must get a price within 30 seconds of landing.  
  * **Mobile Optimization:** The booking widget must be thumb-friendly and fully functional on mobile devices.  
  * **Trust Indicators:** Professional styling and clear pricing to reduce booking anxiety.  
* **Design Principles:**  
  * **Clarity over Cleverness:** Standard form patterns preferred over experimental UIs.  
  * **Progressive Disclosure:** Show the user only what they need for the current step (Wizard Pattern).  
  * **Trustworthy & Corporate:** Use a clean, professional color palette (Blues/Grays) with high-contrast calls to action.

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

### **Navigation Structure**

* **Public Header (Mobile):** Hamburger menu (Home, About, Contact), "Book Now" CTA (sticky).  
* **Public Header (Desktop):** Logo (Left), Nav Links (Center), "Book Now" Button (Right).  
* **Booking App Header:** Minimalist. Logo (Left), "Exit/Cancel" (Right). No distraction links.  
* **Admin Sidebar:** Dashboard, Routes, Pricing, Bookings, Settings, Logout.

## **User Flows**

### **Critical Flow: Guest User Booking**

* **Goal:** A new user lands on the site and successfully books a shuttle.  
* **Steps:**  
  1. **Landing:** User sees the Hero section with the **Booking Widget** prominently displayed.  
  2. **Search Input:** User enters "Origin" (Google Autocomplete), "Destination", "Date", "Time", "Pax".  
  3. **Quote Generation:** System validates inputs and displays available vehicle options with **Fixed Prices**.  
  4. **Selection:** User selects "Sedan" or "Van".  
  5. **Details:** User enters Name, Email, Mobile, Flight Number (optional).  
  6. **Review & Pay:** User reviews summary. Clicks "Pay Securely".  
  7. **Payment:** User completes 3DSecure payment via PayFast modal.  
  8. **Success:** User sees Confirmation Page with Booking Reference and receives Email.

## **Wireframes & Mockups**

### **1\. Homepage / Booking Widget (Mobile First)**

* **Layout:**  
  * **Hero:** High-quality background image of a shuttle/cityscape with a dark overlay.  
  * **Widget:** Floating white card centered on screen.  
    * Field 1: "From" (Map Icon) \- Autocomplete.  
    * Field 2: "To" (Map Marker Icon) \- Autocomplete.  
    * Row 3: Date Picker | Time Picker.  
    * Row 4: Passenger Counter (- 1 \+).  
    * CTA: Large "Get Quote" button (Primary Color, full width).  
  * **Trust Section:** "Why Vestroo?" icons below the fold.

### **2\. Quote Results Page**

* **Layout:**  
  * **Header:** "Select Your Vehicle".  
  * **List:** Vertical stack of cards.  
  * **Card Content:**  
    * Left: Vehicle Image (clean cutout).  
    * Center: Vehicle Name (e.g., "Premium Sedan"), Pax Capacity icon, Luggage Capacity icon.  
    * Right: **Price** (Large, bold font).  
  * **Interaction:** Tapping a card selects it and slides to the next step.

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
  * **Focus:** Booking Wizard steps must manage focus (move focus to top of form on step change).

## **Responsiveness**

* **Breakpoints:** Tailwind Defaults (sm: 640px, md: 768px, lg: 1024px).  
* **Strategy:** **Mobile-First**.  
  * The Booking Widget is a full-screen or large modal experience on mobile.  
  * On Desktop, the Widget becomes a horizontal bar or a side-panel on the Hero image.

