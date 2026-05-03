import { describe, expect, it, vi } from 'vitest'

import {
	WEIGHT_CAPACITY,
	WEIGHT_CHAUFFEUR,
	WEIGHT_COST,
	WEIGHT_SCHEDULE,
} from '@/lib/dispatch-suggestions-config'
import {
	computeDispatchSuggestions,
	suggestVehiclesForBooking,
	type DispatchBookingSnapshot,
	type DispatchSuggestionsInput,
	type DispatchVehicleCandidate,
	type DispatchTripRow,
} from '@/lib/dispatch-suggestions'

const baseWindow = {
	windowStartIso: '2026-04-10T12:00:00.000Z',
	windowEndIso: '2026-04-10T14:00:00.000Z',
}

const baseBooking: DispatchBookingSnapshot = {
	id: 'b1',
	passengerCount: 2,
	window: baseWindow,
	costTier: 3,
}

function trip(
	overrides: Partial<DispatchTripRow> & Pick<DispatchTripRow, 'id' | 'vehicle_id'>,
): DispatchTripRow {
	return {
		time_start_estimate: '2026-04-10T11:00:00.000Z',
		time_end_estimate: '2026-04-10T11:30:00.000Z',
		status: 'assigned',
		...overrides,
	}
}

describe('computeDispatchSuggestions', () => {
	it('(a) obvious best-fit vehicle ranks #1', () => {
		const candidates: DispatchVehicleCandidate[] = [
			{
				vehicleId: 'v-average',
				maxPassengers: 7,
				remainingSeats: 4,
				costTier: 3,
				chauffeurFamiliarity: 55,
			},
			{
				vehicleId: 'v-star',
				maxPassengers: 8,
				remainingSeats: 6,
				costTier: 3,
				chauffeurFamiliarity: 95,
			},
		]
		const input: DispatchSuggestionsInput = {
			booking: baseBooking,
			candidates,
			trips: [],
		}
		const out = computeDispatchSuggestions(input)
		expect(out[0]?.vehicleId).toBe('v-star')
		expect(out[0]?.rank).toBe(1)
		expect(out[0]?.score).toBeGreaterThan(out[1]?.score ?? 0)
		const s0 = out[0]?.signals
		expect(s0?.chauffeurFamiliarity).toBe(95)
	})

	it('(b) vehicle with overlapping non-terminal trip is excluded', () => {
		const candidates: DispatchVehicleCandidate[] = [
			{ vehicleId: 'v-clear', maxPassengers: 7, remainingSeats: 5, costTier: 3 },
			{ vehicleId: 'v-busy', maxPassengers: 7, remainingSeats: 5, costTier: 3 },
		]
		const trips: DispatchTripRow[] = [
			trip({
				id: 't1',
				vehicle_id: 'v-busy',
				time_start_estimate: '2026-04-10T13:00:00.000Z',
				time_end_estimate: '2026-04-10T13:45:00.000Z',
				status: 'assigned',
			}),
		]
		const out = computeDispatchSuggestions({
			booking: baseBooking,
			candidates,
			trips,
		})
		expect(out.map((r) => r.vehicleId)).toEqual(['v-clear'])
		expect(out.find((r) => r.vehicleId === 'v-busy')).toBeUndefined()
	})

	it('(c) at-capacity vehicle (remainingSeats < party) is excluded in strict mode', () => {
		/** Three candidates so strict pool still has ≥2 eligible — thin-data relaxation does not re-open capacity. */
		const candidates: DispatchVehicleCandidate[] = [
			{ vehicleId: 'v-full', maxPassengers: 7, remainingSeats: 1, costTier: 3 },
			{ vehicleId: 'v-ok-a', maxPassengers: 7, remainingSeats: 4, costTier: 3 },
			{ vehicleId: 'v-ok-b', maxPassengers: 7, remainingSeats: 5, costTier: 3 },
		]
		const out = computeDispatchSuggestions({
			booking: { ...baseBooking, passengerCount: 3 },
			candidates,
			trips: [],
		})
		expect(out.map((r) => r.vehicleId)).toContain('v-ok-a')
		expect(out.map((r) => r.vehicleId)).toContain('v-ok-b')
		expect(out.find((r) => r.vehicleId === 'v-full')).toBeUndefined()
	})

	it('(d) thin data: ≥2 suggestions when ≥2 vehicles after relaxing capacity', () => {
		const candidates: DispatchVehicleCandidate[] = [
			{ vehicleId: 'm-aa', maxPassengers: 6, remainingSeats: 0, costTier: 3 },
			{ vehicleId: 'm-bb', maxPassengers: 6, remainingSeats: 0, costTier: 3 },
		]
		const out = computeDispatchSuggestions({
			booking: baseBooking,
			candidates,
			trips: [],
		})
		expect(out.length).toBeGreaterThanOrEqual(2)
		expect(out.map((r) => r.vehicleId).sort()).toEqual(['m-aa', 'm-bb'])
	})

	it('tie-break: same score sorts vehicleId lexicographic ascending', () => {
		const candidates: DispatchVehicleCandidate[] = [
			{ vehicleId: 'v-z', maxPassengers: 7, remainingSeats: 5, costTier: 3, chauffeurFamiliarity: 60 },
			{ vehicleId: 'v-a', maxPassengers: 7, remainingSeats: 5, costTier: 3, chauffeurFamiliarity: 60 },
		]
		const out = computeDispatchSuggestions({
			booking: baseBooking,
			candidates,
			trips: [],
		})
		expect(out[0]?.vehicleId).toBe('v-a')
		expect(out[1]?.vehicleId).toBe('v-z')
		expect(out[0]?.score).toBe(out[1]?.score)
	})

	it('weights sum to 1 and match Q26 config exports', () => {
		expect(WEIGHT_CAPACITY + WEIGHT_SCHEDULE + WEIGHT_CHAUFFEUR + WEIGHT_COST).toBe(1)
		expect(WEIGHT_CAPACITY).toBe(0.4)
		expect(WEIGHT_SCHEDULE).toBe(0.2)
		expect(WEIGHT_CHAUFFEUR).toBe(0.2)
		expect(WEIGHT_COST).toBe(0.2)
	})
})

describe('suggestVehiclesForBooking', () => {
	it('returns [] when deps omitted', async () => {
		await expect(suggestVehiclesForBooking('b1')).resolves.toEqual([])
	})

	it('uses injected fetchers then computeDispatchSuggestions', async () => {
		const booking: DispatchBookingSnapshot = {
			id: 'b99',
			passengerCount: 2,
			window: baseWindow,
			costTier: 2,
		}
		const candidates: DispatchVehicleCandidate[] = [
			{ vehicleId: 'vx', maxPassengers: 8, remainingSeats: 6, costTier: 2 },
		]
		const getBooking = vi.fn().mockResolvedValue(booking)
		const listCandidateVehicles = vi.fn().mockResolvedValue(candidates)
		const listTripsForWindow = vi.fn().mockResolvedValue([])

		const out = await suggestVehiclesForBooking('b99', {
			getBooking,
			listCandidateVehicles,
			listTripsForWindow,
		})

		expect(getBooking).toHaveBeenCalledWith('b99')
		expect(listCandidateVehicles).toHaveBeenCalledWith('b99')
		expect(listTripsForWindow).toHaveBeenCalledWith({
			bookingId: 'b99',
			windowStartIso: baseWindow.windowStartIso,
			windowEndIso: baseWindow.windowEndIso,
		})
		expect(out).toHaveLength(1)
		expect(out[0]?.vehicleId).toBe('vx')
		expect(out[0]?.rank).toBe(1)
	})
})
