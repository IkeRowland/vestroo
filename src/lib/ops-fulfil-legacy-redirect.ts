/**
 * Legacy **`/ops/fulfil`** URLs redirect to **`/ops/bookings`** (queue presets and assign deep links).
 */

import {
	OPS_BOOKINGS_DEFAULT_HREF,
	OPS_BOOKINGS_PATH,
	OPS_BOOKING_ASSIGN_HREF_SUFFIX,
} from '@/features/ops/ops-bookings-url'
import {
	OPS_BOOKINGS_NEEDS_ATTENTION_HREF,
	OPS_BOOKINGS_READY_TO_ASSIGN_HREF,
} from '@/lib/ops-bookings-queue-query'
import { isUuidShaped } from '@/lib/ops-booking-grid-query'

/** Non-empty **`bookingId`** on legacy **`/ops/fulfil`** URLs targets the assign anchor on booking detail. */
export function isOpsFulfilAssignPanelDeepLink(url: Pick<URL, 'searchParams'>): boolean {
	const raw = url.searchParams.get('bookingId')
	return typeof raw === 'string' && raw.trim().length > 0
}

/**
 * Maps **`/ops/fulfil?queue=…`** to **`/ops/bookings`** queue views.
 * Preserves **`bookingId`** as **`/ops/bookings/[id]#ops-booking-assign`** when it is UUID-shaped.
 */
export function buildOpsFulfilLegacyRedirectToBookingsUrl(requestUrl: URL): URL {
	const origin = requestUrl.origin
	const bidRaw = requestUrl.searchParams.get('bookingId')
	const bid = bidRaw?.trim() ?? ''
	if (bid.length > 0 && isUuidShaped(bid)) {
		return new URL(
			`${OPS_BOOKINGS_PATH}/${encodeURIComponent(bid)}${OPS_BOOKING_ASSIGN_HREF_SUFFIX}`,
			origin,
		)
	}

	const raw = requestUrl.searchParams.get('queue')
	const q = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
	if (q === 'pending') {
		return new URL(OPS_BOOKINGS_NEEDS_ATTENTION_HREF, origin)
	}
	if (q === 'trip_request' || q === 'trip-request') {
		return new URL(OPS_BOOKINGS_DEFAULT_HREF, origin)
	}
	return new URL(OPS_BOOKINGS_READY_TO_ASSIGN_HREF, origin)
}
