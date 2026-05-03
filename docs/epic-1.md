# Epic 1: Traveler Interface & Booking Flow (FE)

## Description

This epic encompasses all user-facing features for travelers to search, book, and pay for shuttle services through an intuitive, high-conversion booking interface.

**Epic 19 (trip-request funnel):** The **current** public **trip-request** experience is the **four-slide** flow (**trip → vehicle → passenger → confirmation**) described in **[`docs/epic-19.md`](epic-19.md)** (implementation details, funnel analytics, and related hardening stories).

**Note (Epic 10):** The **quote-deferred, trip-request** public funnel (**FE.10.1–FE.10.5**, see [`docs/epic-10.md`](epic-10.md)) supersedes the “instant quote + PayFast at booking” behaviour described below for **FE.1.1–FE.1.4** on the marketed path where product has shipped Epic 10. Instant quote, PayFast checkout, and payment-gated confirmation remain in scope for other flows (e.g. hourly quote, tours) per product configuration. Public surfaces share **[`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md)** with Epic 17 / 18 / 19 for brand consistency.

## Goals

* Provide an intuitive booking widget interface
* Enable high-conversion, multi-step checkout process (**scoped:** **instant quote → checkout → PayFast** flows apply where product still ships that path — **not** the public **quote-deferred trip-request** path; see **[Epic 10](epic-10.md)** / **[Epic 19](epic-19.md)**)
* Integrate secure payment processing (**scoped:** same as above — trip-request captures the request **without** PayFast at submit per **FE.10.5**)
* Automate booking confirmation communications (**scoped:** payment-gated confirmation vs **request-received** confirmation — depends on flow)

## User Stories / Requirements

### FE.1.1: Booking Search & Quote

The system MUST provide an intuitive interface (the core booking widget) allowing the user to select **Pick up and Drop off locations (including Flight Number if originating from an airport), Passenger Count, Date, and Time** to receive an instant, accurate, non-negotiable quote.

> **Public point-to-point trip-request** (**Epic 10** / **Epic 19**): search may **prefill** the funnel, but **no instant rand quote** is shown in-widget; see **FE.10.2–FE.10.5** and **FE.19.1**.

### FE.1.2: Checkout Process

The system MUST guide the user through a simple, high-conversion, multi-step checkout process (e.g., Quote Review → Contact Details → Payment → Confirmation).

> **Trip-request path:** **four in-page slides** on one URL (trip → vehicle → passenger → confirmation), **no** PayFast step at booking submit — **FE.10.1** / **Epic 19**.

### FE.1.3: Pricing & Payment

The system MUST clearly display the final price before payment submission and integrate with **PayFast** for secure online payment processing.

> **Trip-request path:** **no** final rand price or PayFast **in the funnel** at submit (**FE.10.5**); pricing and payment link are **ops-led** — **[integrations-and-payments.md](integrations-and-payments.md)**.

### FE.1.4: Booking Confirmation

The system MUST send an automatic confirmation email to the user upon successful booking and payment.

> **Trip-request path:** **confirmation** on **slide 4** is **request received** with booking reference (**FE.19.12**); email/comms timing follows ops workflows — **not** “paid confirmation” at submit.

## Related Non-Functional Requirements

* **NFR.1.1:** Web Performance - The website MUST achieve "Good" or "Excellent" status based on Google's Core Web Vitals (LCP under 2.5s).
* **NFR.3.1:** Security - All data transfer MUST utilize **HTTPS/TLS encryption**.
* **NFR.3.2:** SEO Compliance - The application MUST utilize **Incremental Static Regeneration (ISR)** for high performance and data freshness.

## Design Goals

* **Overall Vision:** Modern, friendly, corporate, professional, trustworthy, and efficient.
* **Key Interaction:** Quick, high-conversion, widget-style search — **either** legacy instant-quote paths **or**, for the **public trip-request** funnel, **slide-based** capture per **[Epic 10](epic-10.md)** / **[Epic 19](epic-19.md)** (**four-slide** UX including confirmation).
* **Critical Views:** Homepage / booking widget entry; **quote-deferred** funnel uses **one shell URL** with **request-received** confirmation (**slide 4**) rather than a separate PayFast checkout step at submit for that path.
* **Responsiveness:** **Mobile-first** approach is mandatory.

