# Epic 19: Booking Funnel Simplification — Four-slide, low-friction trip request (FE)

## Description

This epic **simplifies and sharpens the public booking funnel** while **keeping a slide-based flow**: four clear steps with **visible progress**, **smooth transitions**, and **no surprise modals** or **mid-flow business gates that block submit**. The traveler completes **trip details → vehicle choice → passenger and contact details → confirmation**, with **vehicle selection required** before continuing past step 2.

It **refines** the slide funnel from [Epic 10](epic-10.md) and aligns the public path with [Epic 1](epic-1.md) into one coherent journey. It does **not** replace slides with a single endless scroll: the experience stays **step-shaped**, but each slide is **focused**, defaults are **smarter**, and **inline** patterns replace modal friction where possible.

**Operational model unchanged:** Vestroo remains a **quote-deferred, ops-led** booking model. The traveler does **not** see prices in the funnel and does **not** pay at submit. Ops receives the trip request, prices it, and sends a quote / payment link by email — as Epic 10 established. Epic 19 improves **per-slide clarity**, **defaults**, **field ergonomics**, and **confirmation** — not the post-submit ops workflow.

**Why now:** the live funnel still feels like multiple surfaces stitched together (marketing search → slide shell → conditional business gate → conditional PO field), with heavy field-by-field validation and a country combobox that adds friction for the South African majority. This epic keeps the **familiar slide rhythm** but reduces cognitive load per step, removes **blocking modals** in favour of **inline** notices, and makes **step order** obvious: trip → **required** vehicle → **contact-ready** passenger details → **booking reference** confirmation.

## Goals

1. Reduce **time-to-submit** for the median traveler from the current 90–150 seconds to **under 60 seconds** on mobile (same target; achieved via defaults + lean fields per slide, not by removing steps).
2. Reduce unnecessary interactions (defaults, lazy country picker, inline org/PO) so the **count of manual picks** drops versus the legacy funnel, while **Next** between slides remains intentional and fast.
3. Present the journey as **four slides** in one shell (no extra routes per step — preserves FE.10.1 single-page semantics): **(1) Trip details**, **(2) Vehicle selection (required)**, **(3) Passenger details including contact**, **(4) Confirmation with booking reference**.
4. Remove **mid-flow surprise modals** (business email gate, PO field) — handle as **light inline disclosures** that never block submit.
5. Default-pre-select intelligent values (date today, time +90min, passengers 1, country ZA based on locale + IP) so the traveler only **changes** what differs from the default.
6. Make **vehicle selection required on slide 2**: the traveler **must** pick a class before **Next** to slide 3; copy frames it as choosing the **right vehicle for the trip**, not an optional afterthought. Ops still sees the same payload shape; **no price** on cards (FE.10.3 reaffirmed).
7. Keep the **request-received** state on **slide 4** crisp: **booking reference** prominent, what happens next, expected timeline.
8. Preserve **all** functional requirements of [Epic 10](epic-10.md) (FE.10.1–FE.10.5) where not explicitly amended below — single-page slide shell, global phone, no instant quote in funnel.
9. Maintain **brand-aligned visual rhythm** from [Epic 17](epic-17.md) and [Epic 18](epic-18.md): progress indicator, slide titles, motion quality (with **prefers-reduced-motion** respected).
10. Ship **A/B-friendly** measurement (see [`FE.19.10`](#fe1910-instrumentation--ab-readiness)).

## Non-Goals

* **No** instant pricing in the funnel. (Reaffirms FE.10.5.)
* **No** PayFast checkout in the funnel.
* **No** auto-generated quotes from the client UI (ops owns).
* **No** account creation requirement to submit. (Booker / corporate identity is **inferred** server-side post-submit per [Epic 12](epic-12-client-type-inference.md), not gated in the UI.)
* **No** removal of legitimate constraints — flight number remains conditional on airport pickup; phone remains required.
* **No** change to the [Epic 1](epic-1.md) hourly / experience flows in this epic (they may adopt the same patterns as a follow-up).
* **No** new third-party dependencies in the booking surface beyond what Epic 17 / 18 introduces (Tailwind + Radix + framer-motion + libphonenumber-js + country-telephone-data).

## User Stories / Requirements

### FE.19.1: Four-slide funnel shell (progress, motion, no extra routes)

The system MUST present the public booking funnel as **four slides** inside **one page / one shell** (same URL throughout the request — amends [`FE.10.1`](epic-10.md#fe101-single-page-slide-based-funnel-no-extra-routes-for-steps) by **specifying** the step model rather than replacing it):

1. **Slide 1 — Trip details:** pickup, drop-off, date/time, passengers, optional flight, optional notes.
2. **Slide 2 — Vehicle selection (required):** image cards; class, capacity, bags; **no price** (FE.10.3). **Next** to slide 3 is disabled until a vehicle is selected (and step validation passes).
3. **Slide 3 — Passenger details (including contact):** given name, family name, email, phone (with country prefix), plus **inline** org notice (FE.19.8) and conditional PO (FE.19.9). **Submit** completes the request from this slide (there is no separate “review” slide before submit).
4. **Slide 4 — Confirmation:** shown **after successful submit**; **booking reference** is primary; “what happens next”; CTAs as in FE.19.12.

The shell MUST show **clear progress** (e.g. step labels or dots: Trip → Vehicle → Details → Done) and **Back** MUST be available without losing valid data already entered (same session state as today’s shell).

**Acceptance:**

* No separate routes per slide; browser **back** behaviour is defined (either confirm leave or restore last in-shell state — match product decision documented in implementation).
* **Next** on slide 1 runs trip validation only; **Next** on slide 2 requires `selectedVehicleId`; **Submit** on slide 3 runs full payload validation.
* Transitions between slides use motion consistent with Epic 17/18; **`prefers-reduced-motion: reduce`** skips non-essential animation.

---

### FE.19.2: Smart defaults — fewer empty fields on first paint

The system MUST pre-fill sensible defaults so the traveler only changes what differs from their need (applied when the funnel loads, primarily affecting **slide 1**):

* **Date:** today (or tomorrow if current time + 90min already exceeds 22:00 — avoid awkward “midnight today” defaults).
* **Time:** rounded up to next 15-minute mark, +90 minutes from now.
* **Passengers:** 1.
* **Country code (for phone):** inferred from `Accept-Language` + IP geolocation when available; fallback to `ZA`. The user can change on **slide 3**.
* **Pickup / drop-off:** empty (cannot be inferred safely).
* **Flight number:** hidden until pickup is detected as airport (existing FE.10.2 behaviour).
* **Notes:** empty (optional field).

Defaults MUST be **timezone-aware** in **`Africa/Johannesburg`** (primary market); user input remains authoritative after edit.

**Acceptance:**

* After completing slides 1–2 and entering name, email, phone on slide 3, submit succeeds when schema-valid.
* Defaults are visible but **clearly editable** — placeholder is not used as a label.

---

### FE.19.3: Address autocomplete refresh (slide 1)

The system MUST refresh pickup and drop-off inputs on **slide 1**:

* Existing `AddressAutocomplete` (Google Places Autocomplete via `@types/google.maps`) — no new dependency.
* Recent searches when the input is focused and empty (session-persistent only — no PII beyond session unless authenticated and opted in).
* Quick-select chips for **common pickup locations** (e.g. OR Tambo, Sandton CBD, Cape Town International) from `loadFeaturedPickupLocations` — not user-personalised.
* Desktop: combined “Origin & destination” group with **swap** control to invert pickup/drop-off in one click.

**Acceptance:**

* Quick chips on mobile (horizontal scroll if overflow).
* Swap control has `aria-label` and a short (e.g. 200ms) transition.

---

### FE.19.4: Date + time as one combined picker (slide 1, mobile-first)

The system MUST unify date and time on **slide 1**:

* Mobile: native `<input type="datetime-local">`.
* Desktop: Radix `Popover` with date grid + time picker (15-minute increments) — in-repo, no new calendar library (aligned with [`FE.17.9`](epic-17.md#fe179-calendar-week--month-view)).
* “Today / Tomorrow” quick chips above the picker where helpful.
* Validation: pickup date+time **at least 60 minutes in the future**; inline message “Pickup must be at least 1 hour from now” — no toast, no modal.

**Acceptance:**

* `rideDateTimeIsInPast` (or successor) enforces the 60-minute buffer on slide 1 **Next**.
* Mobile controls meet ≥ 44×44 touch targets.

---

### FE.19.5: Passenger count as a stepper (slide 1)

The system MUST replace freeform passenger count with a **stepper** (`-` 1 `+`) on **slide 1**:

* Min 1, max 20 (existing schema).
* Keyboard input still possible (`aria-valuenow`); +/- are primary.
* When passengers exceed a vehicle’s capacity (**slide 2**), dim that card with a soft note (e.g. “Capacity: 4 — pick a larger class”). **Warning only** — does not auto-clear a valid selection if the user later reduces passengers on slide 1 after picking a vehicle (implementation may re-validate on **Next** from slide 1).

**Acceptance:**

* Stepper controls ≥ 44×44 on mobile.
* At min/max, controls reflect `aria-disabled="true"` as appropriate.

---

### FE.19.6: Vehicle selection required on slide 2

The system MUST require a vehicle before leaving **slide 2**:

* Header copy reflects **required** choice (e.g. “Choose your vehicle” — not “optional”).
* Sub-copy may reassure: e.g. team can still adjust availability at quote time — but **UI progression** requires a selection.
* Cards: image + class + capacity + bags; **no price** anywhere.
* **Next** is disabled (or shows inline error on attempt) until `selectedVehicleId` is set and slide-2 validation passes.
* **Submit** on slide 3 MUST still send a valid vehicle id in the payload (server rules unchanged).

This **aligns with [`FE.10.3`](epic-10.md#fe103-slide-2--choose-your-ride)** (required vehicle on the vehicle slide) and supersedes any interim “optional vehicle / single-page” wording from earlier drafts of Epic 19.

**Acceptance:**

* Cannot reach **slide 3** without a selected vehicle.
* Toggling selection: choosing a card sets id; UX for change-selection is clear (e.g. tap another card).

---

### FE.19.7: Phone country code — sane default, lazy selector (slide 3)

The system MUST simplify phone entry on **slide 3**:

* Default country code from FE.19.2 inference — typically `+27`.
* **Flag + dial code** control opens a Radix `Popover` with the country list **only when needed**; combobox is not always expanded in the layout.
* `libphonenumber-js` validation as today; formatted national hint on `onBlur` where applicable.

This **refines [`FE.10.4`](epic-10.md#fe104-slide-3--add-passenger-details-global-phone)** — global access preserved, less chrome by default.

**Acceptance:**

* Country list loads lazily (`next/dynamic`) — first paint does not download the full country dataset until the user opens the popover.
* `tripRequestPassengerFieldsSchema` tests keep passing.

---

### FE.19.8: Business email gate — passive inline notice (slide 3)

The system MUST remove the **mid-flow modal** for corporate domain detection (`BookingAccountDomainGate`).

Replacement on **slide 3**:

* When the email domain matches a known corporate account, an **inline notice** below the email: “We recognise {domain} as {Org Name}…” with dismiss (“Book as a guest instead”) where product allows.
* Multiple orgs: **radio chips**; default first match.
* Notice **never** blocks **Submit**; server resolution per [Epic 12](epic-12-client-type-inference.md) stays authoritative.

**Acceptance:**

* Submit fires regardless of notice visibility.
* `clientTypeResolution` payload behaviour unchanged.

---

### FE.19.9: PO field — conditionally inline (slide 3)

The system MUST render the conditional PO field **inline below email** on **slide 3** when the org requires PO and the traveller has accepted the org association (FE.19.8).

Copy and validation reuse existing helpers (`accountRequiresPurchaseOrderMessage`, `tripPoOk`). On submit error: **no modal**; scroll/focus the field into view **within the slide**.

**Acceptance:**

* Same server validation as today; delivery-only UX change.

---

### FE.19.10: Instrumentation & A/B readiness

The system MUST instrument the funnel for ROI and experiments:

* Page / funnel view: e.g. `booking_funnel_view` with variant (`v_legacy_slides` vs `v_booking_slides_v2` or project-standard names).
* **Per-slide** events optional but recommended: `booking_funnel_slide_view` with `slide_index` 1–4 (4 only after success), and `booking_funnel_slide_complete` when **Next** or **Submit** succeeds from that slide.
* Submit success: `booking_funnel_submit_success` with **booking ref** (non-PII identifier), variant, `time_to_submit_ms`.
* Submit error: `booking_funnel_submit_error` with redacted category.
* Feature flag reuses existing project pattern for a controlled rollout.

**Privacy:** payloads MUST NOT include PII (email, phone, addresses) — field ids, timing, variant, booking ref only. POPIA-aligned (e.g. [VST-12](vst-12.story.md)).

---

### FE.19.11: Visual rhythm — match the brand

The system MUST style all four slides using Epic 17/18 tokens:

* Card surfaces, primary CTA (“Continue” / “Submit trip request”), section titles (`var(--font-montserrat)`), body (Poppins).
* Progress UI readable on mobile; inline errors `--account-danger`.
* **Slide 4** success block matches Epic 18 empty/success patterns.

**Acceptance:**

* Cohesive with marketing and account portal.
* Lighthouse mobile: performance ≥ 90, accessibility ≥ 95, best practices ≥ 95 (targets; document any known tradeoffs).

---

### FE.19.12: Slide 4 — Confirmation (booking reference)

After successful submit, **slide 4** MUST show:

* Headline: “Request received”.
* **Booking reference** prominently (copy-friendly if product supports it).
* “What happens next” (three steps): review / quote email (~30 min business hours) / payment link after acceptance.
* CTAs: “Submit another request” (embedded `onExit` preserved) and “Back to home”.
* If linked to an org: short note that admins can see the trip on the portal.

**Acceptance:**

* Region with `aria-live="polite"`; focus moves to headline (existing pattern).
* No PayFast / “pay now” language in confirmation (FE.10.5).

---

## Related Non-Functional Requirements

* **NFR.19.1 — Performance:** TTI under 2s on a mid-tier mobile device on 4G; LCP under 2.5s; CLS under 0.05; lazy-load heavy phone-country data.
* **NFR.19.2 — Accessibility:** WCAG 2.1 AA; visible labels; keyboard access to progress, **Back**, **Next**, and **Submit**; inline errors in `aria-live` where appropriate.
* **NFR.19.3 — Security:** HTTPS; no PII in analytics; existing CSRF / Server Action protections.
* **NFR.19.4 — Privacy / POPIA:** telemetry is names + timing + non-sensitive ids; session recent-search storage cleared on tab close.
* **NFR.19.5 — Browser support:** Same matrix as the rest of the app.
* **NFR.19.6 — Data integrity:** Server validation (`tripRequestSubmitPayloadSchema`, `validateRideDetailsStep`, etc.) **unchanged**; UI maps to the same payload. **Vehicle id** is always present for successful submit paths under this epic.

## Design Goals

* **Overall vision:** A clear, trustworthy four-step “request a private shuttle” flow that feels fast on mobile.
* **Tone:** Concise, warm, not pushy; no false urgency or upsell.
* **Slides:** One job per slide; **Next** only when that job’s required fields are valid; **Back** without punishment.
* **Don’t do:** surprise modals for org/PO, placeholder-only labels, instant price flashes, “create account first” walls, countdown timers, **gratuitous** extra steps beyond the four defined above.

## Suggested child stories (implementation sequence)

1. **19.1 — Four-slide shell** (FE.19.1) — progress UI, transitions, Back/Next/Submit wiring; map states to slides 1–4.
2. **19.2 — Smart defaults** (FE.19.2).
3. **19.3 — Address autocomplete + chips + swap** (FE.19.3) on slide 1.
4. **19.4 — Combined date+time picker** (FE.19.4) on slide 1.
5. **19.5 — Passenger stepper** (FE.19.5) on slide 1.
6. **19.6 — Required vehicle on slide 2** (FE.19.6) — gate **Next** until selected.
7. **19.7 — Lazy country popover for phone** (FE.19.7) on slide 3.
8. **19.8 — Inline org notice** (FE.19.8) — refactor `BookingAccountDomainGate`.
9. **19.9 — Inline PO** (FE.19.9) on slide 3.
10. **19.10 — Instrumentation + flag** (FE.19.10).
11. **19.11 — Visual rhythm** (FE.19.11).
12. **19.12 — Confirmation as slide 4** (FE.19.12).
13. **19.13 — Migration / cleanup** — remove superseded single-page-only code paths if any landed; tests; cross-links in Epic 1 / Epic 10.
14. **19.14 — Documentation** — `ui-ux-specification.md`, `epic-1.md`, `epic-10.md`, and [`design/booking-flow-simplified.md`](design/booking-flow-simplified.md) aligned with the **four-slide** model.

## Relationship to other epics

| Other epic | Relationship |
|------------|----------------|
| [Epic 1](epic-1.md) | Public funnel path amended for the four-slide journey; hourly / experience flows unchanged unless separately extended. |
| [Epic 10](epic-10.md) | **Direct predecessor:** same ops-led model (no instant quote, no PayFast in funnel). Epic 19 **tightens** UX: FE.10.1 slide shell **specified** as four steps; FE.10.3 **required vehicle** retained on vehicle slide; FE.10.4 refined (lazy country UI); FE.10.5 reaffirmed. |
| [Epic 12](epic-12-client-type-inference.md) | Inference unchanged; inline notice instead of modal. |
| [Epic 13](epic-13.md) | Ops quote / payment link unchanged. |
| [Epic 17](epic-17.md) | Shared visual tokens; motion and surfaces. |
| [Epic 18](epic-18.md) | Confirmation and portal cross-links. |
| [Epic 16](epic-16.md) | Same downstream pipeline; payload compatible. |

## Backward compatibility

* `submitTripRequest` and payload schema **unchanged**; vehicle remains required in payload for the happy path.
* Booking references and email templates unchanged.
* Feature-flagged rollout (FE.19.10) can keep a legacy variant during A/B.

## References

* [`design/booking-flow-simplified.md`](design/booking-flow-simplified.md) — should describe the four-slide journey (update in story 19.14 if it still describes a single scroll).
* [`epic-10.md`](epic-10.md) — slide funnel baseline and FE.10.x numbering.
* [`epic-1.md`](epic-1.md) — original public funnel context.
* [`design/visual-redesign-tokens.md`](design/visual-redesign-tokens.md) — brand tokens.
* [`integrations-and-payments.md`](integrations-and-payments.md) — downstream pipeline (no change).
