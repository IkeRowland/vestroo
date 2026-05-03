# Trip request — vehicle offers (FE.10.3, no-price contract)

## Boundary

| Layer | Responsibility |
| ----- | --------------- |
| **Server** | `getTripRequestVehicleOffers` (`src/actions/getTripRequestVehicleOffers.ts`) reads fleet categories via `fetchActiveVehicleTypes` and maps rows with **`mapRowToTripOffer` only** — it never forwards `price_multiplier`, `base_price`, or other monetary columns. |
| **Types** | `TripOfferVehicle` + `tripOfferVehicleSchema` in `src/features/booking/components/trip-request/trip-offer-vehicle.ts` — **no** `price`, `amount`, `quote`, `fare`, `total`, `estimate`, `cents`, `ZAR`, `PayFast`, etc. |
| **Defence-in-depth** | `parseTripOfferVehicleFromUnknown` rejects objects that contain **forbidden** top-level keys listed in `FORBIDDEN_TRIP_OFFER_KEYS` (see same file). Use when wiring a new HTTP JSON source. |
| **UI** | `TripRequestVehicleSlide` only receives `TripOfferVehicle[]` — never raw API DTOs. |

## Forbidden fields (must not reach Slide 2 props)

`price`, `amount`, `total`, `quote`, `fare`, `estimate`, `subtotal`, `tax`, `zar`, `cents`, `payfast`, `payment` (extend the list in code if a new monetary key appears in upstream DTOs).

## Placeholder images

If `imageUrl` is missing, the UI shows a neutral gray tile with a car icon (no stock photo). No pricing copy appears in that state.

## Timezone / pricing

Slide 2 does **not** compute or display fares. Fleet rows may still carry multipliers server-side for **other** flows; those fields are **not** exposed to the trip-request funnel.
