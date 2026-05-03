import { isUuidShaped } from '@/lib/ops-booking-grid-query'
import type { FulfilQueueBucket } from '@/lib/fulfil-queue-buckets'
import { OPS_TRIPS_PATH } from '@/lib/ops-trips-url'

type OpsFulfilQueueHrefOptions = {
	/**
	 * Optional booking to pre-select on the assignment panel (paid queue);
	 * ignored if not a UUID shape.
	 */
	focusBookingId?: string | null
}

/**
 * Assignment queues live on **`/ops/trips`** — tabs, bookings row deep-link (Story 14.8), etc.
 */
export function opsFulfilQueueHref(
	queue: FulfilQueueBucket,
	options?: OpsFulfilQueueHrefOptions,
): string {
	const p = new URLSearchParams()
	p.set('queue', queue)
	const id = (options?.focusBookingId ?? '').trim()
	if (id.length > 0 && isUuidShaped(id)) {
		p.set('bookingId', id)
	}
	const qs = p.toString()
	return qs ? `${OPS_TRIPS_PATH}?${qs}` : OPS_TRIPS_PATH
}

/**
 * Fulfil **Assignment (paid)** — same surface as the paid-queue dispatch form in `AssignBookingPanel` (story 14.8 row parity).
 */
export function opsFulfilAssignBookingHref(bookingId: string): string {
	return opsFulfilQueueHref('paid', { focusBookingId: bookingId })
}
