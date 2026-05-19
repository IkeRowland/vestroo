import { classificationFromFleetCategoryName } from '@/features/booking/components/trip-request/trip-offer-vehicle'

export function normalizeOpsVehicleClassificationLabel(s: string): string {
	return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Same labelling as trip-request Slide 2 / ops booking detail “Category”. */
export function fleetVehicleClassificationLabel(
	categoryName: string | null | undefined,
	seats: number | null | undefined,
): string {
	const cap = typeof seats === 'number' && seats > 0 ? seats : 4
	return classificationFromFleetCategoryName(categoryName ?? null, cap)
}

/**
 * When the booking has no requested class, any fleet vehicle is accepted.
 * Otherwise the driver’s default vehicle class must match (normalised string compare).
 */
export function fleetVehicleMatchesBookingVehicleClass(
	requestedClassification: string | null | undefined,
	vehicleCategoryName: string | null | undefined,
	vehicleSeats: number | null | undefined,
): boolean {
	const req = (requestedClassification ?? '').trim()
	if (!req) return true
	const a = normalizeOpsVehicleClassificationLabel(req)
	const b = normalizeOpsVehicleClassificationLabel(
		fleetVehicleClassificationLabel(vehicleCategoryName, vehicleSeats),
	)
	return a === b
}
