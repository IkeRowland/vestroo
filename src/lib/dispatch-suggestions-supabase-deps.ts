import type { SupabaseClient } from '@supabase/supabase-js'

import type {
	DispatchBookingSnapshot,
	DispatchSuggestionsDeps,
	DispatchTripRow,
} from '@/lib/dispatch-suggestions'

function parseCostTierFromBookingVehicleId(raw: string | null | undefined): number | undefined {
	if (raw === null || raw === undefined) return undefined
	const t = raw.trim()
	if (t.length === 0) return undefined
	const n = Number.parseInt(t, 10)
	if (Number.isFinite(n) && n >= 1 && n <= 5) {
		return n
	}
	const m = t.match(/(?:^|[^0-9])([1-5])(?:[^0-9]|$)/)
	if (m?.[1]) {
		return Number.parseInt(m[1], 10)
	}
	return undefined
}

/**
 * Production **`DispatchSuggestionsDeps`** for **`suggestVehiclesForBooking`**
 * (Epic 15 / **15D.1** / **15D.2**). Uses the same cookie **user** Supabase client as other ops actions.
 *
 * **Booking window:** `pickup_datetime` → end = pickup + `estimated_duration` minutes when set and
 * positive; otherwise **+120 minutes** (assign flow often has a service run for end — we do not
 * here; see story Progress Notes).
 */
export function createDispatchSuggestionsDeps(
	supabase: SupabaseClient,
): DispatchSuggestionsDeps {
	return {
		getBooking: async (bookingId: string) => {
			const { data: row, error } = await supabase
				.from('bookings')
				.select('id, passenger_count, pickup_datetime, estimated_duration, vehicle_id')
				.eq('id', bookingId)
				.maybeSingle()
			if (error || !row) {
				return null
			}
			const pickup = row.pickup_datetime as string | null
			if (pickup === null || pickup.trim() === '') {
				return null
			}
			const pax = row.passenger_count as number | null | undefined
			const passengerCount =
				typeof pax === 'number' && Number.isFinite(pax) ? Math.max(1, Math.floor(pax)) : 1
			const durationMin = row.estimated_duration as number | null | undefined
			const durationMs =
				typeof durationMin === 'number' &&
				Number.isFinite(durationMin) &&
				durationMin > 0
					? durationMin * 60_000
					: 120 * 60_000
			const startMs = Date.parse(pickup)
			if (Number.isNaN(startMs)) {
				return null
			}
			const windowStartIso = new Date(startMs).toISOString()
			const windowEndIso = new Date(startMs + durationMs).toISOString()
			const costTier = parseCostTierFromBookingVehicleId(row.vehicle_id as string | null)
			const snapshot: DispatchBookingSnapshot = {
				id: row.id as string,
				passengerCount,
				window: { windowStartIso, windowEndIso },
			}
			if (costTier !== undefined) {
				snapshot.costTier = costTier
			}
			return snapshot
		},
		listCandidateVehicles: async (bookingId: string) => {
			void bookingId
			const [{ data: vehicles, error: vErr }, { data: categories, error: cErr }] =
				await Promise.all([
					supabase.from('vehicles').select('id, category_id').order('name'),
					supabase.from('vehicle_categories').select('id, number_of_seat'),
				])
			if (vErr || cErr) {
				return []
			}
			const seatByCategory = new Map<string, number>()
			for (const c of categories ?? []) {
				const id = c.id as string
				const n = Number(c.number_of_seat)
				seatByCategory.set(id, Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)
			}
			return (vehicles ?? []).map((v) => {
				const catId = v.category_id as string
				const maxP = seatByCategory.get(catId) ?? 0
				return {
					vehicleId: v.id as string,
					...(maxP > 0 ? { maxPassengers: maxP } : {}),
				}
			})
		},
		listTripsForWindow: async ({
			windowStartIso,
			windowEndIso,
		}: {
			bookingId: string
			windowStartIso: string
			windowEndIso: string
		}) => {
			const { data, error } = await supabase
				.from('trips')
				.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
				.lt('time_start_estimate', windowEndIso)
				.gt('time_end_estimate', windowStartIso)
			if (error || !data) {
				return []
			}
			return data as DispatchTripRow[]
		},
	}
}
