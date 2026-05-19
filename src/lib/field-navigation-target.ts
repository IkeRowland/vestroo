import type { MapsTarget } from '@/lib/maps'

type BookingNavFields = {
	destination_latitude: number | null
	destination_longitude: number | null
	destination_address: string | null
	origin_latitude: number | null
	origin_longitude: number | null
	origin_address: string | null
}

/**
 * Resolve navigation target for a trip + optional booking row.
 *
 * Precedence:
 * 1. Booking destination coordinates, else destination address
 * 2. Booking origin coordinates, else origin address
 */
export function resolveFieldMapsTarget(args: { booking: BookingNavFields | null }): MapsTarget | null {
	const b = args.booking
	if (b) {
		if (
			b.destination_latitude != null &&
			b.destination_longitude != null &&
			Number.isFinite(b.destination_latitude) &&
			Number.isFinite(b.destination_longitude)
		) {
			return {
				kind: 'coords',
				lat: b.destination_latitude,
				lng: b.destination_longitude,
				label: b.destination_address ?? undefined,
			}
		}
		if (b.destination_address && b.destination_address.trim().length > 0) {
			return { kind: 'query', query: b.destination_address.trim() }
		}
		if (
			b.origin_latitude != null &&
			b.origin_longitude != null &&
			Number.isFinite(b.origin_latitude) &&
			Number.isFinite(b.origin_longitude)
		) {
			return {
				kind: 'coords',
				lat: b.origin_latitude,
				lng: b.origin_longitude,
				label: b.origin_address ?? undefined,
			}
		}
		if (b.origin_address && b.origin_address.trim().length > 0) {
			return { kind: 'query', query: b.origin_address.trim() }
		}
	}

	return null
}
