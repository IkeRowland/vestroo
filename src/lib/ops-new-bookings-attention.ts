/**
 * Epic 12 **US-B2** — “needs attention” subset for the ops home **New Bookings** card count only.
 *
 * **Does not** scope the **`/ops/bookings`** list (US-B1 / Q7): the destination remains the full
 * unified queue with no pre-applied filters. Keep this predicate in sync with analytics if you
 * report the same metric elsewhere.
 *
 * Predicate: `bookings.status IN (…)` — RLS-respecting staff reads via `createUserServerClient()`.
 */
export const OPS_NEW_BOOKINGS_ATTENTION_STATUSES = [
	'submitted',
	'triaged',
	'quote_sent',
	'awaiting_payment',
] as const

export type OpsNewBookingsAttentionStatus =
	(typeof OPS_NEW_BOOKINGS_ATTENTION_STATUSES)[number]
