import { createServerClient } from '@/lib/supabase/server'

/**
 * Rows used to build public trip-request “Choose your ride” options (Theme F / US-F3).
 * Source: `public.vehicles` + `vehicle_categories` (capacity + category name).
 * Image: `primary_image_url`, then `gallery_image_urls`, then legacy `image_urls`.
 * Reads use the service-role server client (same pattern as `fetchActiveVehicleTypes` in pricing-data).
 */
export type TripRequestCatalogVehicleRow = {
	id: string
	name: string
	categoryId: string
	/** `vehicle_categories.name` (e.g. Sedan, SUV) for public classification copy */
	categoryName: string | null
	passengerCapacity: number
	/** Primary / gallery / legacy `image_urls` — first non-empty wins */
	imageUrl: string | null
	vehicleCondition: string
	operationStatus: string
}

function isArchivedCondition(vehicleCondition: string, operationStatus: string): boolean {
	const c = vehicleCondition.toLowerCase()
	const o = operationStatus.toLowerCase()
	return c === 'archived' || o === 'archived' || o === 'retired'
}

/**
 * Active fleet vehicles suitable for the public trip-request slide.
 * Excludes archived/retired rows; requires capacity ≥ `minPassengers`.
 */
export async function fetchCatalogVehiclesForTripRequest(
	minPassengers: number,
): Promise<TripRequestCatalogVehicleRow[]> {
	const supabase = await createServerClient()

	const [{ data: vehicles, error: vErr }, { data: categories, error: cErr }] = await Promise.all([
		supabase
			.from('vehicles')
			.select(
				'id, name, category_id, image_urls, primary_image_url, gallery_image_urls, vehicle_condition, operation_status',
			)
			.order('name'),
		supabase.from('vehicle_categories').select('id, name, number_of_seat'),
	])

	if (vErr || cErr) {
		if (vErr) {
			console.warn('[trip-request-vehicle-catalog] vehicles:', vErr.message)
		}
		if (cErr) {
			console.warn('[trip-request-vehicle-catalog] vehicle_categories:', cErr.message)
		}
		return []
	}

	const seatByCategory = new Map<string, number>()
	const nameByCategory = new Map<string, string>()
	for (const row of categories ?? []) {
		const id = row.id as string
		const n = Number(row.number_of_seat)
		seatByCategory.set(id, Number.isFinite(n) ? n : 0)
		const nm = String(row.name ?? '').trim()
		if (nm) nameByCategory.set(id, nm)
	}

	function firstImageUrl(v: Record<string, unknown>): string | null {
		const primary = String(v.primary_image_url ?? '').trim()
		if (primary) return primary
		const gallery = v.gallery_image_urls as string[] | null | undefined
		if (Array.isArray(gallery)) {
			for (const u of gallery) {
				const s = String(u ?? '').trim()
				if (s) return s
			}
		}
		const urls = v.image_urls as string[] | null | undefined
		if (Array.isArray(urls)) {
			for (const u of urls) {
				const s = String(u ?? '').trim()
				if (s) return s
			}
		}
		return null
	}

	const min = Math.max(1, Math.min(50, Math.floor(minPassengers)))

	const out: TripRequestCatalogVehicleRow[] = []
	for (const v of vehicles ?? []) {
		const condition = String(v.vehicle_condition ?? '')
		const op = String(v.operation_status ?? '')
		if (isArchivedCondition(condition, op)) {
			continue
		}
		const catId = v.category_id as string
		const cap = seatByCategory.get(catId) ?? 0
		if (cap < min) {
			continue
		}
		const catName = nameByCategory.get(catId) ?? null
		out.push({
			id: v.id as string,
			name: String(v.name ?? ''),
			categoryId: catId,
			categoryName: catName,
			passengerCapacity: cap,
			imageUrl: firstImageUrl(v as Record<string, unknown>),
			vehicleCondition: condition,
			operationStatus: op,
		})
	}

	return out
}
