# Fulfil queue buckets (`/ops/fulfil`)

Normative definitions for **`searchParams.queue`**: `paid` | `pending` | `trip_request` (default **`paid`**). Implementation: `src/lib/fulfil-queue-buckets.ts` (keep this doc and that module in sync).

**Q18 (Epic 14):** **`/ops/fulfil?queue=paid`** and the **“Ready to assign”** chip on **`/ops/bookings`** both key off **`bookings.status = 'ready_to_assign'`**. The **fulfil** paid tab additionally applies the **no `booking_trips` link** rule and (for **`booking_intent = 'trip_request'`** only) requires **`payment_status = 'paid'`** so paid public trip requests can be assigned here. Bookmark **`?queue=paid`** is retained.

## Exclusivity

**Classification** (`classifyFulfilBookingBucket` in `fulfil-queue-buckets.ts`) is **ordered**: **`paid`** first, then **`trip_request`**, then **`pending`**. So a row can satisfy both the raw **`trip_request`** intent predicate and the **`paid`** predicate (e.g. **`ready_to_assign` + `payment_status = 'paid'` + unlinked**); it is shown **only** on the **Assignment (paid)** tab, not on **Trip requests**.

Rows that are **`ready_to_assign`** but **already** linked in `booking_trips` match **none** of these — they are out of the fulfil queues (assigned elsewhere).

## `trip_request`

- **Tab list predicate:** `booking_intent = 'trip_request'` **and** the row is **not** in the **`paid`** bucket above (so trip-request rows that are ready for assignment appear only under **Assignment (paid)**).
- **Empty copy:** See `FULFIL_EMPTY_COPY.trip_request` in `fulfil-queue-buckets.ts`.

### Acceptance (ops)

- **v1:** Ops may record acceptance by setting `bookings.booking_metadata->>'trip_request_ops_accepted_at'` to an ISO timestamp (no migration). This does **not** change `booking_intent`; it is a **review** signal on the Trip requests tab.
- Server action: `acceptTripRequestBookingAction` in `src/actions/opsFulfil.ts`.

## `paid` (assignment queue)

- **Predicate:**  
  `status = 'ready_to_assign'`  
  **AND** **no** row in `booking_trips` with `booking_id = bookings.id`  
  **AND** either **`booking_intent IS DISTINCT FROM 'trip_request'`** (standard / walk-in path per Epic 14.1) **or** (**`booking_intent = 'trip_request'`** **AND** **`payment_status = 'paid'`**)
- **Empty copy:** `FULFIL_EMPTY_COPY.paid`
- **Notes:** URL remains `?queue=paid`. Assign service run, driver, vehicle via `assignBookingToRun`. Legacy rows that stayed `status = 'paid'` / `payment_status = 'paid'` without `ready_to_assign` **do not** appear here — use `/ops/bookings` or staff workflows to reconcile until they reach `ready_to_assign`.

## `pending` (payment / pre-assign triage)

- **Predicate:**  
  `booking_intent IS DISTINCT FROM 'trip_request'`  
  **AND** `status IS DISTINCT FROM 'ready_to_assign'`  
  **AND** `(status <> 'paid' OR payment_status <> 'paid')`
- **Empty copy:** `FULFIL_EMPTY_COPY.pending`
- **Record payment (v1):** Manual/offline confirmation only — staff sets `status` and `payment_status` to `paid` (and `payment_timestamp`) via `recordBookingPaymentReceivedAction`. This **does not** simulate PayFast card flows; it is for cash, EFT, or other offline settlement recorded in ops.

## Related

- [`docs/ops-data-freshness.md`](ops-data-freshness.md) — refresh behaviour for `/ops/fulfil`.
