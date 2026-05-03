# Epic 10: Public Booking Funnel — Quote-Deferred, Slide-Based Trip Request (FE)

## Description

This epic defines the **public traveler booking experience** for requesting a trip **without** instant rand pricing, **without** PayFast checkout at submission, and **without** a separate “quote results” step in the funnel. After the traveler completes **three data-collection slides** on **one page** — trip details → vehicle → passenger/contact — plus a **fourth confirmation step** (“request received”) after successful submit (**FE.19.12**, **[Epic 19](epic-19.md)**), the request is suitable for **operations** to price and fulfil **out of band** (for example, quote and **payment link** delivered by email when staff send the quote).

This epic **supersedes or amends** the booking-stage behaviour described for **FE.1.1–FE.1.4** in [`docs/epic-1.md`](epic-1.md) (instant quote, multi-step checkout ending in PayFast at booking, confirmation after payment).

## Goals

* Replace “quote-at-booking” with **trip request capture** followed by **ops-led** quoting and payment-link delivery.
* Keep the traveler on **one page** using **in-page slides** (not separate routes) for Ride Details → Choose Your Ride → Passenger Details; **[Epic 19](epic-19.md)** adds **slide 4 — confirmation** after submit on the same URL (progress UX + booking reference).
* Support **global** travellers via **country code + phone** UX (not South Africa–only).
* Present **vehicle choice** using **image, classification, and attributes** with **no fee or quote calculation** in the funnel.
* Clearly document **integration boundaries** with operations workflows (email quote, payment link generation) for follow-up stories.

## User Stories / Requirements

### FE.10.1: Single-page, slide-based funnel (no extra routes for steps)

The system MUST present **three sequential data slides** (Ride Details → Choose Your Ride → Add Passenger Details) inside **one form section** on **one page**, followed by a **confirmation state** on the **same page** after successful submit (**FE.19.12** / **[Epic 19](epic-19.md)** — “slide 4”). The traveler MUST NOT navigate to **separate application pages** (distinct routes) to move between those data slides. Slide transitions MAY use client-side state (for example, carousel or stepper) while preserving **unified form** semantics appropriate to implementation (**single submit** from slide 3 unless technical design specifies otherwise).

### FE.10.2: Slide 1 — Ride Details

The system MUST capture:

* **Pickup address** (required).
* **Airport pickup:** If pickup is identified as an **airport** (per product rules and detection UX), the system MUST show a **Flight Number** field (required when airport pickup applies; hidden when pickup is not an airport).
* **Drop-off** service point / address (required).
* **Date and time** (required).
* **Number of passengers** (required).
* **Special instructions** (optional).

### FE.10.3: Slide 2 — Choose Your Ride

The system MUST allow the traveler to **select exactly one vehicle** from the offered list for the request. For each option the system MUST display:

* **Vehicle image**
* **Classification** (for example, class or category label)
* **Attributes** relevant to choice (for example, passenger capacity, luggage capacity — as defined by product and data model)

The system MUST **NOT** calculate, display, or imply **rand pricing**, **quotes**, or **totals** at this booking stage. Selection is **vehicle choice only**, aligned with **FE.10.5**.

### FE.10.4: Slide 3 — Add Passenger Details (global phone)

The system MUST capture the following fields; all are **required**:

* **First Name**
* **Last Name**
* **Email Address**
* **Country Code** — a **dropdown of all countries** with **search**; the selected country sets the **international dial code** used as the **prefix** for the phone number.
* **Phone Number** — captured together with country code so the full number is **internationally dialable** (not restricted to South Africa formats).

The system MUST **NOT** restrict phone entry to South Africa–only numbers or mask in a ZA-only way.

### FE.10.5: Submission behaviour — no instant quote, no payment at booking

On **submission** of the completed booking request, the system MUST **NOT**:

* Calculate or present **quote options** or **instant rand pricing** in the funnel as a gating step; or
* Require **payment** or integrate **PayFast** (or equivalent) **at this stage**.

The successful outcome of this flow is a **recorded trip or booking request** (exact persistence and status names are implementation details) that **operations** can use to **send a quote** and, when applicable, trigger or associate a **payment link** **outside** this epic’s client UI. **Auto-generation of the payment link** and **email send from operations** are **integration points**: track as **follow-up stories** (ops console, notifications, payment-link provider). Cross-reference **[`integrations-and-payments.md`](integrations-and-payments.md)** for payment architecture — **no** PayFast checkout **inside** this funnel at submit (**FE.10.5**).

### FE.10.6: Design alignment with UI references

Product-provided **screenshots and mockups** (for example, current marketing booking UI and target “Choose your ride” / “Add passenger details” references) SHOULD inform **layout, spacing, and component patterns** while meeting the functional requirements above.

## Related Non-Functional Requirements

* **NFR.1.1:** Web Performance — The booking funnel SHOULD remain within the project’s performance targets (for example, Core Web Vitals); slide-based UI SHOULD avoid unnecessary layout shift and heavy blocking scripts on first paint.
* **NFR.3.1:** Security — All submission and personal data MUST use **HTTPS/TLS**.
* **NFR.3.2:** SEO — Where the booking entry lives on a marketing page, existing **ISR** or routing patterns SHOULD be preserved as applicable.

## Design Goals

* **Overall vision:** Trustworthy, calm, corporate-friendly booking that does not pressure the user with price before operations validation.
* **Key interaction:** Three clear **data** slides on **one page** plus **confirmation after submit** (**Epic 19**); progressive disclosure (airport flight field, vehicle attributes), **accessible** country search for phone.
* **Critical views:** Single booking page containing the **full** funnel (including **request-received** confirmation); no separate “quote review” page with rand totals in the public funnel for this epic.
* **Responsiveness:** **Mobile-first**; slide controls usable on small viewports.
* **Content:** Vehicle cards emphasise **imagery and facts** (capacity, bags), not price.

## Relationship to [`docs/epic-1.md`](epic-1.md) (dependency / conflict)

| Epic 1 (current) | Conflict / change |
|------------------|-------------------|
| **FE.1.1** Instant, non-negotiable quote in the widget | Replaced for the **public funnel** by **trip request without instant pricing** (**FE.10.2–FE.10.5**). |
| **FE.1.2** Checkout Quote Review → Contact → Payment → Confirmation | Replaced by **slides on one page**; **no** payment step at booking; “confirmation” means **request received** unless product defines otherwise in a follow-up. |
| **FE.1.3** Final price before PayFast | **Not in funnel** at booking; PayFast at submit is **out of scope** for this epic’s client flow. |
| **FE.1.4** Confirmation after **payment** | Conflicts unless redefined as **confirmation of request submission**; payment confirmation is **deferred** to ops and payment-link flow. |

**Epic 19:** **[`docs/epic-19.md`](epic-19.md)** tracks the **shipped** **four-slide** trip-request shell (**three data slides** per **FE.10.2–FE.10.4**, plus **FE.19.12** confirmation / request received) and **FE.19.10** funnel instrumentation; use it alongside this epic for **UX and analytics** specifics.

**Recommendation:** Treat **`docs/epic-10.md`** as the **authoritative scope for the public booking funnel** going forward. Run a **documentation follow-up** to either **(a)** revise [`docs/epic-1.md`](epic-1.md) to narrow or deprecate **FE.1.1–FE.1.4** for the public site and point to Epic 10, or **(b)** replace the booking-related bullets in Epic 1 with a one-line **superseded-by Epic 10** note. Prefer **(a)** if other work still references Epic 1 historically. Related parity docs (for example [`docs/core-traveller-flow-parity.md`](core-traveller-flow-parity.md)) SHOULD be updated in the same pass so **search → quote → PayFast** language does not contradict this epic.

## Non-Goals

* **PayFast** (or other) **checkout on booking submit**.
* **Instant rand pricing**, **quote totals**, or **fare breakdown** in the public funnel at this stage.
* **Automated** quote or payment-link email **from the client booking UI** (ops and backend follow-ups own that behaviour).
* **Guaranteed** vehicle availability or **dynamic inventory pricing** in the funnel.
* **Separate routes** per slide for the **data** steps (explicitly excluded by **FE.10.1**); confirmation remains on the **same** URL (**Epic 19**).

## Suggested child stories (implementation sprints)

1. **Booking funnel shell:** single page, slide state, form section, accessibility and mobile layout.
2. **Slide 1 — Ride details:** pickup and drop-off, date and time, passengers, instructions, conditional flight number for airport pickup.
3. **Slide 2 — Vehicle selection:** cards with image, classification, attributes; explicit **no-price** UI contract with API and data layer.
4. **Slide 3 — Passenger details:** searchable country dropdown, dial prefix and phone validation for international use; submit payload from this slide.
5. **Slide 4 — Confirmation:** **[Epic 19](epic-19.md)** / **FE.19.12**: booking reference, “what happens next”, CTAs — **after** successful **`submitTripRequest`** on the same URL (no new route).
