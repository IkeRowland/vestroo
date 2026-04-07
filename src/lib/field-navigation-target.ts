import type { SupabaseClient } from '@supabase/supabase-js'

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
 * DB resolution for service run is attempted when `serviceRunId` is set.
 *
 * Precedence (documented in docs/field-tools.md):
 * 1. Booking destination coordinates, else destination address
 * 2. Booking origin coordinates, else origin address
 * 3. First ordered service point on the run’s route (service_run → service_route_points)
 */
export async function resolveFieldMapsTarget(
	supabase: SupabaseClient,
	args: {
		serviceRunId: string | null
		booking: BookingNavFields | null
	},
): Promise<MapsTarget | null> {
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

	if (!args.serviceRunId) {
		return null
	}

	const { data: run, error: runErr } = await supabase
		.from('service_runs')
		.select('service_route_id')
		.eq('id', args.serviceRunId)
		.maybeSingle()

	if (runErr || !run?.service_route_id) {
		return null
	}

	const routeId = run.service_route_id as string

	const { data: points, error: ptErr } = await supabase
		.from('service_route_points')
		.select('order_index, service_point_id')
		.eq('service_route_id', routeId)
		.order('order_index', { ascending: true })
		.limit(1)

	if (ptErr || !points?.length) {
		return null
	}

	const spId = points[0].service_point_id as string
	const { data: sp, error: spErr } = await supabase
		.from('service_points')
		.select('lat, lng, name, address')
		.eq('id', spId)
		.maybeSingle()

	if (spErr || !sp) {
		return null
	}

	const lat = sp.lat as number
	const lng = sp.lng as number
	if (Number.isFinite(lat) && Number.isFinite(lng)) {
		return {
			kind: 'coords',
			lat,
			lng,
			label: (sp.name as string) || (sp.address as string) || undefined,
		}
	}

	const addr = (sp.address as string | null)?.trim()
	if (addr) {
		return { kind: 'query', query: addr }
	}

	return null
}
