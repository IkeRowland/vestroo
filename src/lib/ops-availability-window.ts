/**
 * Epic 16 / Theme B / **US-B2** — availability strip default window math.
 *
 * Strategy (epic Reconciliation row "Timezone"):
 * - Pickup is stored as `timestamptz` (UTC instant). All math runs against UTC ms.
 * - Default window = pickup **−2h .. pickup +2h** (or pickup .. pickup + max(estimated_duration, 2h)
 *   when provided, plus a 2h trailing pad — whichever is wider).
 * - Display formatting (Africa/Johannesburg) is the consumer's concern; this module returns
 *   ISO + ms only so server + client share an identical anchor.
 */

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

export type AvailabilityWindow = {
	startMs: number
	endMs: number
	startIso: string
	endIso: string
}

export type AvailabilityWindowInput = {
	pickup_datetime: string | null
	estimated_duration: number | null
}

export function availabilityWindowFromBooking(
	row: AvailabilityWindowInput,
): AvailabilityWindow | null {
	const pickup = row.pickup_datetime
	if (pickup == null || pickup.trim() === '') return null
	const pickupMs = Date.parse(pickup)
	if (Number.isNaN(pickupMs)) return null
	const startMs = pickupMs - TWO_HOURS_MS
	const durationMin = row.estimated_duration
	const durationMs =
		typeof durationMin === 'number' && Number.isFinite(durationMin) && durationMin > 0
			? durationMin * 60_000
			: 0
	const endMs = pickupMs + Math.max(durationMs, 0) + TWO_HOURS_MS
	return {
		startMs,
		endMs,
		startIso: new Date(startMs).toISOString(),
		endIso: new Date(endMs).toISOString(),
	}
}
