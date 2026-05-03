/**
 * Legacy **`/ops/fulfil`** URLs redirect to **`/ops/trips`** (assignment + live trips).
 */

/** Non-empty **`bookingId`** means assignment panel deep link — still rewritten to **`/ops/trips`**. */
export function isOpsFulfilAssignPanelDeepLink(url: Pick<URL, 'searchParams'>): boolean {
	const raw = url.searchParams.get('bookingId')
	return typeof raw === 'string' && raw.trim().length > 0
}

/**
 * Maps **`/ops/fulfil?queue=…`** to **`/ops/trips`**. Preserves **`bookingId`** when present.
 * Unknown **`queue`** defaults to **`paid`** (assignment queue).
 */
export function buildOpsFulfilLegacyRedirectToTripsUrl(requestUrl: URL): URL {
	const raw = requestUrl.searchParams.get('queue')
	const q = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
	const out = new URL('/ops/trips', requestUrl.origin)
	if (q === 'pending') {
		out.searchParams.set('queue', 'pending')
	} else if (q === 'trip_request' || q === 'trip-request') {
		out.searchParams.set('queue', 'trip_request')
	} else {
		out.searchParams.set('queue', 'paid')
	}
	const bid = requestUrl.searchParams.get('bookingId')
	if (bid?.trim()) {
		out.searchParams.set('bookingId', bid.trim())
	}
	return out
}
