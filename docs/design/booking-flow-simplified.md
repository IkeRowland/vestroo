# Booking flow — four-slide trip-request walkthrough

This document walks through the **public trip-request funnel** shipped under [Epic 19](../epic-19.md): four **in-page slides** on **one URL** (`TripRequestBookingShell`), field-by-field rationale, validation, and telemetry. Engineers, QA, ops, and product should treat **[Epic 19](../epic-19.md)** as the functional source of truth alongside [Epic 10](../epic-10.md) (quote-deferred behaviour).

**Audience:** Frontend engineers, QA, ops reviewers, product.

**Pre-requisite reading:** [Epic 10](../epic-10.md), [Epic 19](../epic-19.md), [`design/visual-redesign-tokens.md`](visual-redesign-tokens.md), [`integrations-and-payments.md`](../integrations-and-payments.md) (downstream quote / payment-link behaviour).

---

## 1. Operating principles (recap)

1. **One page / one shell.** The traveller stays on a **single route** for the whole request (`/book/trip-request` standalone, or embedded trip-request region inside [`BookingSearchForm`](../../src/features/booking/components/BookingSearchForm.tsx)). **No** separate app routes per slide — only **`funnelStep`** **0 \| 1 \| 2** plus **`submitState === 'success'`** for confirmation (**slide 4**).
2. **Four slides.** **(1)** Trip details → **(2)** Choose vehicle → **(3)** Passenger / contact → **(4)** Confirmation (**after** successful submit). Progress is visible (**TripRequestFunnelProgress**); **Back** / **Next** / **Submit trip request** drive navigation (**FE.19.1**).
3. **Vehicle is required** (**FE.19.6**). The traveller **must** select exactly one offered vehicle before **Next** unlocks slide 3. Cards show **no rand price** (**FE.10.3** / **FE.10.5**).
4. **Smart defaults > empty fields** where safe (date/time, passengers, phone country hint). Pickup/drop-off stay user-selected (**FE.19.2**).
5. **No price, no payment in-funnel.** The shell produces a **trip request** for ops — **no** PayFast or instant rand quote (**FE.10.5**). Payment links are **outside** this UI — see [`integrations-and-payments.md`](../integrations-and-payments.md).
6. **Inline org / PO** replaces blocking modals (**FE.19.8** / **FE.19.9**).
7. **Brand alignment** with Epic 17 / 18 surfaces and [`visual-redesign-tokens.md`](visual-redesign-tokens.md).

---

## 2. Page anatomy (single shell)

Marketing search may precede the shell (prefill). Inside the shell:

```
┌────────────────────────────────────────────────────────────────────┐
│  Trip → Vehicle → Details → Done   (progress / stepper — readable   │
│                                     at 320px; keyboard-accessible)   │
├────────────────────────────────────────────────────────────────────┤
│  h2: Slide title ("Trip details" | "Choose your vehicle" | … |       │
│      "Request received" after success)                              │
│  [optional sub-copy under title on slide 2 — FE.19.6 intro]          │
├────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  Scrollable slide body (one slide visible; motion between      │ │
│  │   slides — respects prefers-reduced-motion)                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  Footer nav (hidden on confirmation):                              │
│    [ Back ]              [ Next ]  or  [ Submit trip request ]       │
└────────────────────────────────────────────────────────────────────┘
```

**Standalone** `/book/trip-request`: full-page muted background; shell centred.

**Embedded**: shell lives inside the booking card; **`onExit`** may close the embedded funnel after success (**FE.19.12** CTAs).

Sticky/mobile footer patterns follow implementation — primary actions remain reachable on small viewports.

---

## 3. Slide 1 — Trip details

Maps **FE.10.2** / **FE.19.3–FE.19.5**.

### 3.1 Pickup & drop-off

* **Component:** `AddressAutocomplete` (Google Places).
* **Layout:** stacked mobile; side-by-side **`md+`** with swap control (**FE.19.3**).
* **Quick-pick chips** (optional; curated locations).
* **Validation:** both required; valid Place results.

### 3.2 Date + time (**FE.19.4**)

* Combined picker (mobile `datetime-local`; desktop popover + grid).
* **Validation:** ≥ **60 minutes** future (**not** the older “in the past” naming alone).

### 3.3 Passengers (**FE.19.5**)

* Stepper **1–20**; affects vehicle list fetch (**minPassengers**).

### 3.4 Flight number

* Shown when pickup is airport; validation per schema.

### 3.5 Notes

* Optional; collapsible.

### 3.6 Next

* Validates slide 1 only; **`booking_funnel_slide_complete`** with **`slide_index` 1** on success.

---

## 4. Slide 2 — Choose vehicle (**required**)

Maps **FE.10.3**, **FE.19.6**.

### 4.1 Loading

* After slide 1 validates, **`getTripRequestVehicleOffers`** loads offers.
* Skeleton placeholders while loading.

### 4.2 Cards

* Image, classification, capacity/luggage; **no price**.
* **Exactly one** vehicle must be selected (**radio** semantics); **Next** stays disabled until **`selectedVehicleId`** is set.

### 4.3 Empty / error

* Friendly empty/error copy; traveller cannot advance without a selection when vehicles exist — product copy frames ops follow-up if inventory is empty.

### 4.4 Next

* **`booking_funnel_slide_complete`** with **`slide_index` 2** when advancing.

---

## 5. Slide 3 — Passenger details + submit

Maps **FE.10.4**, inline org (**FE.19.8**), PO (**FE.19.9**), phone (**FE.19.7**).

* Name, email, global phone (country combobox + national number).
* **`BookingAccountDomainGate`** inline — domain match notice; optional PO when **`account_client`** + org requires PO.
* **Submit trip request** validates full payload; **`submitTripRequest`** server action.

On submit success → **`booking_funnel_slide_complete`** **`slide_index` 3** (complete passenger slide); success handling sets **`submitState === 'success'`** and shows slide **4**.

---

## 6. Slide 4 — Confirmation (**after submit**)

Maps **FE.19.12** (copy / IA). Not a separate route — **`showConfirmation`** replaces slides **1–3** body with the success panel inside the same shell.

* **`h2`:** “Request received”.
* **Booking reference** prominent; optional copy control (**FE.19.12**).
* **What happens next** — three calm steps; **no** PayFast / “pay now” (**FE.10.5**).
* **CTAs:** **Submit another request** when **`onExit`** provided (embedded); **Back to home** when standalone — see story **19.12**.
* **`role="status"`**, **`aria-live="polite"`**; focus moves to **`#trip-request-slide-heading`** (**NFR.19.2**).

**Analytics:** **`booking_funnel_slide_view`** with **`slide_index` 4** when confirmation is shown (**FE.19.10**).

---

## 7. What changed vs earlier drafts (hidden complexity)

| Older assumption (superseded doc drafts) | Shipped behaviour (Epic 19) |
|------------------------------------------|-----------------------------|
| “No slides” / single scroll replaces step UI | **Four slides** with explicit progress and **Next** / **Back** |
| Vehicle optional | **Required** selection before slide 3 (**FE.19.6**) |
| One primary **Submit** only | **Next** ×2 then **Submit trip request** from slide 3 |
| Mid-flow modal for business email | **Inline** notice + optional PO (**FE.19.8** / **19.9**) |
| Telemetry **`v_simplified_single_page`** only | **Variant** string via **`getBookingFunnelVariant()`** (default **`v_booking_slides_v2`**); **analytics-only** — see §9–10 |

---

## 8. Validation matrix (required vs optional)

| Field | Required? | Notes |
|-------|-----------|--------|
| Pickup / drop-off | ✅ | Valid Places |
| Date/time | ✅ | ≥ 60 min future |
| Passengers | ✅ | 1–20 |
| Flight number | Conditional | Airport pickup |
| Notes | ❌ | |
| **Vehicle** | ✅ **must select one card** before slide 3 | **FE.19.6** |
| First / last name, email | ✅ | |
| Phone | ✅ | libphonenumber-valid |
| PO | Conditional | Org + policy (**FE.19.9**) |

---

## 9. Telemetry (**FE.19.10**)

Implementation: [`src/lib/booking-funnel-analytics.ts`](../../src/lib/booking-funnel-analytics.ts).

**Kill-switch:** `NEXT_PUBLIC_BOOKING_FUNNEL_ANALYTICS_ENABLED` (`1` / `true` / `yes` / `on`).

**Variant:** `NEXT_PUBLIC_BOOKING_FUNNEL_VARIANT` — if unset/empty, defaults to **`v_booking_slides_v2`**. The **UI** is a single four-slide implementation; the variant labels analytics payloads for experiments (**Story 19.13** reconciliation).

**Transport:** optional `window.__VESTROO_TRACK_BOOKING_FUNNEL__`; tests use `__setBookingFunnelAnalyticsSinkForTests`.

| Event | When | Payload (high level — **no PII**) |
|-------|------|-------------------------------------|
| `booking_funnel_view` | Funnel ready | `{ variant, embedded? }` |
| `booking_funnel_slide_view` | Land on slide **1–4** | `{ slide_index: 1\|2\|3\|4, variant, embedded? }` |
| `booking_funnel_slide_complete` | **Next** from 1–2, or successful **Submit** from 3 | `{ slide_index: 1\|2\|3, variant, embedded? }` |
| `booking_funnel_submit_success` | **`submitTripRequest`** success | `{ variant, booking_reference, time_to_submit_ms }` |
| `booking_funnel_submit_error` | Submit failure | `{ variant, embedded?, error_category }` — closed categories only |

**Privacy:** no email, phone, names, or addresses in payloads (**VST-12** / **NFR.19.3**).

**Debug:** `NEXT_PUBLIC_BOOKING_FUNNEL_ANALYTICS_DEBUG=1` logs events in development.

---

## 10. Rollout / variant (**analytics**, not a second shell)

At time of writing (**Story 19.13**): **one** production **`TripRequestBookingShell`** implementation. **`NEXT_PUBLIC_BOOKING_FUNNEL_VARIANT`** exists so **`booking_funnel_*`** events carry an experiment label (e.g. PO-defined **`v_legacy_slides`** vs **`v_booking_slides_v2`**) **without** implying a separate unmaintained UI fork — confirm with product before retiring env handling.

---

## 11. Open questions / future work

* **Recurring / multi-stop** — out of scope for Epic 19; see [`brief.md`](../brief.md) post-MVP.
* **Hourly / experience flows** — may adopt similar patterns later.
* **Logged-in prefills** — portal session may seed passenger fields where applicable.

---

## Cross-references

* [Epic 19](../epic-19.md) — parent epic (four-slide model, FE.19.x)
* [Epic 10](../epic-10.md) — quote-deferred public funnel (**FE.10.1–FE.10.5**)
* [Epic 1](../epic-1.md) — traveller epic (**scoped** supersession for public trip-request vs other flows)
* [`design/visual-redesign-tokens.md`](visual-redesign-tokens.md) — tokens / typography
* [`design/visual-redesign-references.md`](visual-redesign-references.md) — reference imagery map
* [`integrations-and-payments.md`](../integrations-and-payments.md) — ops quote / payment-link integration (no client PayFast at trip-request submit)
* [`epic-12-client-type-inference.md`](../epic-12-client-type-inference.md) — org / client-type inference
