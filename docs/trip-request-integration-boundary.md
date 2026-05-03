# Public trip request — integration boundary (Epic 10)

This document states **where the browser funnel ends** and **where operations / follow-up systems begin**. It satisfies **AC18** in [`docs/stories/10.5.story.md`](stories/10.5.story.md) and the **integration-boundary** goal in [`docs/epic-10.md`](epic-10.md).

## Scope

- **In scope here:** The **single-page** trip request flow ([**FE.10.1**–**FE.10.5**](epic-10.md)), implemented at **`/book/trip-request`** (`src/app/(app)/book/trip-request/page.tsx`) with slides described in [`docs/stories/10.1.story.md`](stories/10.1.story.md) through [`docs/stories/10.4.story.md`](stories/10.4.story.md).

## (a) Where the funnel ends

- Successful submit creates a **durable server-side record** on `public.bookings` with **`booking_intent = trip_request`** (see migration `supabase/migrations/20260418200000_fe104_trip_request_booking_intent.sql` and Server Action **`submitTripRequest`** in [`src/actions/submitTripRequest.ts`](../src/actions/submitTripRequest.ts)).
- The traveler sees a **request received** outcome (not payment confirmation). **Operations** can use the row for pricing, fulfilment, and follow-up **outside** this page.

## (b) Out of band — not automated from the public UI (Epic 10)

The following are **explicitly not** implemented as **automated client-side behaviour** in the Epic 10 funnel:

- **Email quote** delivery to the traveler from the browser.
- **Payment-link** email or **PayFast** checkout **on** trip-request submit.
- **Instant rand** totals or **fare breakdown** as a gating step in the funnel.

Those workflows are **ops-led** or **future stories** (notifications, invoicing, PayFast from staff flows, etc.). See **Non-Goals** in [`docs/epic-10.md`](epic-10.md).

## (c) Follow-up ownership

| Area | Owned by |
| ---- | -------- |
| Ops console, dispatch, assignments | Separate ops / field stories — see [`docs/ops-console.md`](ops-console.md) |
| Automated quote / payment-link **email** from productised integrations | Follow-up stories; not Epic 10 public UI |
| PayFast / webhook **payment** flows | [`docs/integrations-and-payments.md`](integrations-and-payments.md), booking intents other than `trip_request` where applicable |

## Related docs

- [`docs/epic-10.md`](epic-10.md) — epic requirements and relationship to [`docs/epic-1.md`](epic-1.md).
- [`docs/front-end-api-interaction.md`](front-end-api-interaction.md) — Server Actions overview; **`submitTripRequest`** for trip request persistence.
- [`docs/trip-request-vehicle-offers.md`](trip-request-vehicle-offers.md) — **no-price** vehicle contract (Slide 2).
