/**
 * Shared URL contract for the ops unified bookings queue (`/ops/bookings`).
 *
 * **Ops home (Story 12.2 US-B1):** use **`OPS_BOOKINGS_PATH`** only — no query params that narrow
 * the list. The “needs attention” count on the dashboard is a metric only.
 *
 * **Query contract** (Story 12.3 — multi-select, bookmarkable; OR within dimension, AND across):
 * - `status` → `bookings.status` — repeat key or comma list (e.g. `status=submitted&status=paid`)
 * - `payment` → `bookings.payment_status` — same repetition pattern
 * - `intent` → `bookings.booking_intent` — includes `_null` for empty intent
 * - `client` → `bookings.client_type` (`walk_in` | `account_client`)
 *
 * **`OPS_BOOKINGS_DEFAULT_HREF`** — optional slice for dashboards or deep links that should open a
 * pre-filtered view (e.g. trip requests); do not use as the primary 12.2 home card CTA.
 */

/** Base path for the unified bookings queue (nav + Story 12.2 home card use this without query). */
export const OPS_BOOKINGS_PATH = '/ops/bookings' as const

/** In-page anchor for assign-trip UI on **`/ops/bookings/[id]`** (queue CTAs + legacy `/assign` redirect). */
export const OPS_BOOKING_ASSIGN_ANCHOR_ID = 'ops-booking-assign' as const

export const OPS_BOOKING_ASSIGN_HREF_SUFFIX = `#${OPS_BOOKING_ASSIGN_ANCHOR_ID}` as const

/** Default query string for optional triage deep links (not the 12.2 primary CTA). */
export const OPS_BOOKINGS_DEFAULT_SEARCH = '?intent=trip_request' as const

/** Full href including default filters — optional; prefer `OPS_BOOKINGS_PATH` when US-B1 applies. */
export const OPS_BOOKINGS_DEFAULT_HREF =
	`${OPS_BOOKINGS_PATH}${OPS_BOOKINGS_DEFAULT_SEARCH}` as const
