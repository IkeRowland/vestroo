import { OPS_BOOKINGS_READY_TO_ASSIGN_HREF } from '@/lib/ops-bookings-queue-query'

/**
 * Fulfil console queue buckets — predicates must stay aligned with
 * `docs/fulfil-queue-buckets.md` and `/ops/bookings` queue filters.
 */
export type FulfilQueueBucket = 'paid' | 'pending' | 'trip_request'

export const FULFIL_QUEUE_BUCKETS: readonly FulfilQueueBucket[] = [
	'paid',
	'pending',
	'trip_request',
] as const

/** Deep link for the **Assignment (paid)** queue — same view as the “Ready to assign” bookings preset. */
export const OPS_FULFIL_ASSIGNMENT_PAID_HREF = OPS_BOOKINGS_READY_TO_ASSIGN_HREF

export const FULFIL_QUEUE_TABS: ReadonlyArray<{
	id: FulfilQueueBucket
	label: string
}> = [
	{ id: 'paid', label: 'Assignment (paid)' },
	{ id: 'pending', label: 'Pending payment' },
	{ id: 'trip_request', label: 'Trip requests' },
] as const

/** Metadata key written by ops when a trip request is marked accepted (no migration). */
export const TRIP_REQUEST_OPS_ACCEPTED_AT_KEY = 'trip_request_ops_accepted_at' as const

export type FulfilBookingBucketInput = {
	booking_intent: string | null
	status: string | null
	payment_status: string | null
	/** True when a `booking_trips` row exists for this booking. */
	hasBookingTripLink: boolean
}

export function parseFulfilQueueParam(raw: string | string[] | undefined): FulfilQueueBucket {
	const s = Array.isArray(raw) ? raw[0] : raw
	if (s === 'pending' || s === 'trip_request' || s === 'paid') {
		return s
	}
	return 'paid'
}

/** `booking_intent IS DISTINCT FROM 'trip_request'` */
export function intentIsDistinctFromTripRequest(intent: string | null | undefined): boolean {
	return intent !== 'trip_request'
}

export function isTripRequestIntent(intent: string | null | undefined): boolean {
	return intent === 'trip_request'
}

/**
 * Assignment (`queue=paid`) bucket: **`ready_to_assign`**, no **`booking_trips`** link yet.
 * - **Standard intents:** same as Epic 14.1 / Q18 (walk-in paid → RTA).
 * **Public trip requests:** once **`payment_status = 'paid'`** and **`status = 'ready_to_assign'`**,
 * they join this tab so ops can assign a driver and vehicle (same as other paid RTA rows).
 */
export function matchesPaidBucket(row: FulfilBookingBucketInput): boolean {
	if (row.status !== 'ready_to_assign') {
		return false
	}
	if (row.hasBookingTripLink) {
		return false
	}
	if (isTripRequestIntent(row.booking_intent)) {
		return row.payment_status === 'paid'
	}
	return true
}

/**
 * Pending triage: non–trip-request bookings that still need payment work (not RTA assignment queue).
 * Predicate: intent IS DISTINCT FROM 'trip_request' AND status IS DISTINCT FROM 'ready_to_assign'
 * AND (status <> 'paid' OR payment_status <> 'paid').
 */
export function matchesPendingBucket(row: FulfilBookingBucketInput): boolean {
	if (!intentIsDistinctFromTripRequest(row.booking_intent)) {
		return false
	}
	if (row.status === 'ready_to_assign') {
		return false
	}
	return row.status !== 'paid' || row.payment_status !== 'paid'
}

/** Predicate: `booking_intent = 'trip_request'`. */
export function matchesTripRequestBucket(row: FulfilBookingBucketInput): boolean {
	return isTripRequestIntent(row.booking_intent)
}

/**
 * Classify a row into at most one bucket (mutually exclusive predicates).
 * Returns `null` when the row matches no bucket (e.g. paid+paid+already linked).
 */
export function classifyFulfilBookingBucket(row: FulfilBookingBucketInput): FulfilQueueBucket | null {
	if (matchesPaidBucket(row)) {
		return 'paid'
	}
	if (matchesTripRequestBucket(row)) {
		return 'trip_request'
	}
	if (matchesPendingBucket(row)) {
		return 'pending'
	}
	return null
}

export type FulfilEmptyCopy = { title: string; description: string }

export const FULFIL_EMPTY_COPY: Record<FulfilQueueBucket, FulfilEmptyCopy> = {
	paid: {
		title: 'No bookings waiting for assignment',
		description:
			'This queue lists bookings in ready_to_assign with no linked trip yet — including walk-ins (Epic 14.1) and paid public trip requests. After payment clears — or staff moves a row to ready_to_assign — assign a driver and vehicle from the booking detail assign panel.',
	},
	pending: {
		title: 'No bookings need payment or pre-assign triage',
		description:
			'Pending lists non–trip-request bookings where status or payment is not fully paid yet (cash, EFT, or other manual steps). Walk-ins move to ready_to_assign on the Bookings queue (Ready to assign) once ops records the payment.',
	},
	trip_request: {
		title: 'No public trip requests in the queue',
		description:
			'Trip requests use booking_intent = trip_request. Review and mark accepted when ops is ready; once payment is recorded and the booking reaches ready_to_assign, it appears in the Bookings Ready to assign view for vehicle and driver assignment.',
	},
}

export function getFulfilEmptyCopy(bucket: FulfilQueueBucket): FulfilEmptyCopy {
	return FULFIL_EMPTY_COPY[bucket]
}

/** Short predicate blurbs for docs and debugging. */
export const FULFIL_BUCKET_PREDICATE_LABEL: Record<FulfilQueueBucket, string> = {
	paid: "status = 'ready_to_assign' ∧ no booking_trips ∧ (intent ≠ trip_request ∨ payment_status = 'paid')",
	pending:
		"intent ≠ 'trip_request' ∧ status ≠ 'ready_to_assign' ∧ (status ≠ 'paid' ∨ payment_status ≠ 'paid')",
	trip_request: "booking_intent = 'trip_request'",
}

export function tripRequestAcceptedAtFromMetadata(
	metadata: Record<string, unknown> | null | undefined,
): string | null {
	if (!metadata || typeof metadata !== 'object') return null
	const v = metadata[TRIP_REQUEST_OPS_ACCEPTED_AT_KEY]
	return typeof v === 'string' && v.length > 0 ? v : null
}
