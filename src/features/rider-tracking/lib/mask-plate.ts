/**
 * Epic 15 / 15B.3 — rider-facing plate display (no full plate on public track).
 */
export function maskVehiclePlateForRiderDisplay(plate: string | null | undefined): string | null {
	if (plate == null || plate.trim() === '') {
		return null
	}
	const normalized = plate.trim().toUpperCase().replace(/\s+/g, '')
	if (normalized.length < 2) {
		return '***'
	}
	return `${normalized.slice(0, 2)}***`
}
