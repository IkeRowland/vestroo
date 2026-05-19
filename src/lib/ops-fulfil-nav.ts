import { isUuidShaped } from '@/lib/ops-booking-grid-query'
import type { FulfilQueueBucket } from '@/lib/fulfil-queue-buckets'
import {
	OPS_BOOKINGS_DEFAULT_HREF,
	OPS_BOOKINGS_PATH,
	OPS_BOOKING_ASSIGN_HREF_SUFFIX,
} from '@/features/ops/ops-bookings-url'
import {
	OPS_BOOKINGS_NEEDS_ATTENTION_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
} from '@/lib/ops-bookings-queue-query'

type OpsFulfilQueueHrefOptions = {
	/**
	 * Optional booking to open from the queue (paid → assign anchor on detail;
	 * other queues → booking detail without assign hash).
	 */
	focusBookingId?: string | null
	/** Retained for URL compatibility; assignment UI is on booking detail, so this is not applied. */
	focusDriverProfileId?: string | null
}

/**
 * Legacy fulfil queue entry points now land on **`/ops/bookings`** filtered views
 * (or booking detail with assign anchor when **`focusBookingId`** is set on the paid queue).
 */
export function opsFulfilQueueHref(
	queue: FulfilQueueBucket,
	options?: OpsFulfilQueueHrefOptions,
): string {
	const id = (options?.focusBookingId ?? '').trim()
	if (id.length > 0 && isUuidShaped(id)) {
		if (queue === 'paid') {
			return opsFulfilAssignBookingHref(id)
		}
		return `${OPS_BOOKINGS_PATH}/${encodeURIComponent(id)}`
	}

	switch (queue) {
		case 'pending':
			return OPS_BOOKINGS_NEEDS_ATTENTION_HREF
		case 'trip_request':
			return OPS_BOOKINGS_DEFAULT_HREF
		case 'paid':
		default:
			return OPS_BOOKINGS_READY_TO_ASSIGN_HREF
	}
}

/**
 * **Assign trip** — booking detail with in-page assign panel (`/ops/bookings/[id]#ops-booking-assign`).
 */
export function opsFulfilAssignBookingHref(bookingId: string): string {
	const id = bookingId.trim()
	if (id.length > 0 && isUuidShaped(id)) {
		return `${OPS_BOOKINGS_PATH}/${encodeURIComponent(id)}${OPS_BOOKING_ASSIGN_HREF_SUFFIX}`
	}
	return OPS_BOOKINGS_PATH
}
