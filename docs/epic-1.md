# Epic 1: Traveler Interface & Booking Flow (FE)

## Description

This epic encompasses all user-facing features for travelers to search, book, and pay for shuttle services through an intuitive, high-conversion booking interface.

## Goals

* Provide an intuitive booking widget interface
* Enable high-conversion, multi-step checkout process
* Integrate secure payment processing
* Automate booking confirmation communications

## User Stories / Requirements

### FE.1.1: Booking Search & Quote

The system MUST provide an intuitive interface (the core booking widget) allowing the user to select **Pick up and Drop off locations (including Flight Number if originating from an airport), Passenger Count, Date, and Time** to receive an instant, accurate, non-negotiable quote.

### FE.1.2: Checkout Process

The system MUST guide the user through a simple, high-conversion, multi-step checkout process (e.g., Quote Review → Contact Details → Payment → Confirmation).

### FE.1.3: Pricing & Payment

The system MUST clearly display the final price before payment submission and integrate with **PayFast** for secure online payment processing.

### FE.1.4: Booking Confirmation

The system MUST send an automatic confirmation email to the user upon successful booking and payment.

## Related Non-Functional Requirements

* **NFR.1.1:** Web Performance - The website MUST achieve "Good" or "Excellent" status based on Google's Core Web Vitals (LCP under 2.5s).
* **NFR.3.1:** Security - All data transfer MUST utilize **HTTPS/TLS encryption**.
* **NFR.3.2:** SEO Compliance - The application MUST utilize **Incremental Static Regeneration (ISR)** for high performance and data freshness.

## Design Goals

* **Overall Vision:** Modern, friendly, corporate, professional, trustworthy, and efficient.
* **Key Interaction:** Quick, high-conversion, widget-style search and quote flow (mimicking ezshuttle.co.za).
* **Critical Views:** Homepage/Booking Widget, Quote Review Page, Booking Confirmation Page.
* **Responsiveness:** **Mobile-first** approach is mandatory.

