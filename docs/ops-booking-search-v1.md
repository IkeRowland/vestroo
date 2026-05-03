# Ops booking search grid (v1)

Normative contract for **`/ops/search`** (Epic 11 / Theme D / story 11.4). Staff discovery is **table-first**; this doc locks filter semantics, timezone rules, pagination caps, and intent display mapping.

## GET parameters

| Param | Meaning |
| ----- | ------- |
| `q` | **Reference search:** `ILIKE` on `payment_reference` **or**, when the trimmed value is **UUID-shaped**, an additional **exact** match on `bookings.id` (combined with `OR` so either hit returns the row). `%` / `_` in the reference portion are escaped for `ILIKE`. |
| `contact` | `ILIKE` on `customer_phone` **or** `customer_email` (combined with `OR`). Metacharacters escaped. |
| `date_from` | Optional start of **`pickup_datetime`** range. Must be `YYYY-MM-DD` or ignored. |
| `date_to` | Optional end of **`pickup_datetime`** range. Must be `YYYY-MM-DD` or ignored. |
| `status` | Optional exact match on `bookings.status` (subset in UI). |
| `payment_status` | Optional exact match on `bookings.payment_status` (subset in UI). |
| `booking_intent` | Optional filter on `bookings.booking_intent`. Use `_null` in the query string for **`IS NULL`** (legacy rows). Empty = any intent. |
| `sort` | Whitelist only: `created_desc` (default), `pickup_asc`, `pickup_desc`, `ref_asc`. Unknown values fall back to `created_desc`. |
| `page` | 1-based page index. Page size is fixed at **25**. |

## Timezone: pickup date range

`date_from` / `date_to` are interpreted as **UTC calendar dates** (not browser-local):

- `date_from` → lower bound `date_from` **`T00:00:00.000Z`**
- `date_to` → upper bound `date_to` **`T23:59:59.999Z`**

If only one bound is set, the other side of the range is left open.

## Query guard (no unbounded scans)

The grid runs a server query **only when at least one** of `q`, `contact`, `date_from`, `date_to`, `status`, `payment_status`, or `booking_intent` is present. Sort and pagination apply **after** a filter set exists (pagination links always re-send the active filters).

## Pagination and offset cap

- **Page size:** 25 (fixed).
- **Max page:** 200 → maximum offset **4975** ( \((200 - 1) \times 25\) ).
- **Stable ordering:** every sort includes a tie-breaker on **`id`** (see `opsBookingGridSortOrders` in `src/lib/ops-booking-grid-query.ts`).

## `booking_intent` display (canonical + null)

Values are read from **`bookings.booking_intent`** (Postgres). The shared formatter is **`formatBookingIntentLabel`** in `src/features/ops/booking-intent-labels.ts`.

**Documented derivation:** `NULL` or empty string is shown as **Standard** (treated as a standard web booking for staff labelling).

Known DB values (from migrations): `point_to_point`, `hourly_hire`, `corporate_pattern`, `experience_package`, `trip_request`.

## Row actions (existing routes only)

- **View confirmation:** `/confirmation?id={booking_uuid}`
- **Close protection:** `/ops/close-protection?bookingId={booking_uuid}`
- **Customer lookup:** `/book/search?tab=login` — staff copy **reference** or **phone** from the row before opening the customer flow.

## Legacy flow

**`BookingSearchForm`** remains available under **“Legacy booking lookup”** (collapsed `<details>`), not as the primary discovery path.
