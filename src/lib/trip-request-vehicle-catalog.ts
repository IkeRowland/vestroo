import { createServerClient } from '@/lib/supabase/server'

/**
 * Rows used to build public trip-request “Choose your vehicle” options (Theme F / US-F3).
 * Source: `public.vehicle_categories` (one card per active class that fits the party size).
 * Image: `vehicle_categories.image_url` when set.
 * Reads use the service-role server client (same pattern as `fetchActiveVehicleTypes` in pricing-data).
 */
export type TripRequestCatalogCategoryRow = {
	id: string
	name: string
	description: string
	passengerCapacity: number
	imageUrl: string | null
}

/** @deprecated Alias for {@link TripRequestCatalogCategoryRow} — kept for incremental refactors. */
export type TripRequestCatalogVehicleRow = TripRequestCatalogCategoryRow

/**
 * Active vehicle categories suitable for the public trip-request slide.
 * Excludes inactive rows; requires capacity ≥ `minPassengers`.
 */
export async function fetchCatalogVehiclesForTripRequest(
	minPassengers: number,
): Promise<TripRequestCatalogCategoryRow[]> {
	const supabase = await createServerClient()

	const { data: categories, error: cErr } = await supabase
		.from('vehicle_categories')
		.select('id, name, description, number_of_seat, image_url, is_active')
		.order('name')

	if (cErr) {
		console.warn('[trip-request-vehicle-catalog] vehicle_categories:', cErr.message)
		return []
	}

	const min = Math.max(1, Math.min(50, Math.floor(minPassengers)))

	const out: TripRequestCatalogCategoryRow[] = []
	for (const row of categories ?? []) {
		if (row.is_active === false) {
			continue
		}
		const cap = Number(row.number_of_seat)
		const seats = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : 0
		if (seats < min) {
			continue
		}
		const imageRaw = String(row.image_url ?? '').trim()
		out.push({
			id: row.id as string,
			name: String(row.name ?? '').trim() || 'Vehicle class',
			description: String(row.description ?? '').trim(),
			passengerCapacity: seats,
			imageUrl: imageRaw || null,
		})
	}

	return out
}
