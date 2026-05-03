import 'server-only'

const STATIC_BASE = 'https://maps.googleapis.com/maps/api/staticmap'

export type AccountBookingMapPoints = {
	origin: { lat: number; lng: number }
	destination: { lat: number; lng: number }
}

/**
 * Google Static Maps URL for account booking detail (**Story 18.5** / **NFR.18.2**).
 * Uses **server** key only; never import this module in client components.
 */
export function buildAccountBookingStaticMapUrl(
	points: AccountBookingMapPoints,
	options?: { width?: number; height?: number; scale?: 1 | 2 },
): string | null {
	const key = (process.env.GOOGLE_MAPS_SERVER_KEY ?? '').trim()
	if (!key) return null

	const w = options?.width ?? 400
	const h = options?.height ?? 200
	const scale = options?.scale ?? 2

	const { origin, destination } = points
	const path = `color:0x1a56b4ff|weight:4|${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`

	const params = new URLSearchParams({
		size: `${w}x${h}`,
		scale: String(scale),
		maptype: 'roadmap',
		key,
		markers: `color:0x0d9488|${origin.lat},${origin.lng}`,
	})
	params.append('markers', `color:0xbe123c|${destination.lat},${destination.lng}`)
	params.set('path', path)

	return `${STATIC_BASE}?${params.toString()}`
}
