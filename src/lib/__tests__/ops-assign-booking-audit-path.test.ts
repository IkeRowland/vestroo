import { describe, it, expect } from 'vitest'

import { resolveAssignmentCalibrationAudit } from '@/lib/ops-assign-booking-audit-path'
import type { Suggestion } from '@/lib/dispatch-suggestions'

const bookingId = 'b1111111-1111-4111-8111-111111111111'
const tripId = 't1111111-1111-4111-8111-111111111111'
const driverProfileId = 'h1111111-1111-4111-8111-111111111111'
const vehicleA = 'a1111111-1111-4111-8111-111111111111'
const vehicleB = 'b2222222-2222-4222-8222-222222222222'

function sug(vehicleId: string, score: number, rank: number): Suggestion {
	return {
		vehicleId,
		score,
		rank,
		rationale: 'test',
	}
}

describe('resolveAssignmentCalibrationAudit', () => {
	const baseInput = {
		bookingId,
		tripId,
		driverProfileId,
		assignedVehicleId: vehicleA,
	}

	it('returns free_pick when dispatch suggestions flag is off', () => {
		const out = resolveAssignmentCalibrationAudit({
			...baseInput,
			dispatchSuggestionsEnabled: false,
			fromSuggestion: { vehicleId: vehicleA, score: 99, rank: 1 },
			suggestionsAtAssign: [sug(vehicleA, 80, 1)],
		})
		expect(out.action).toBe('assignment_free_pick')
		expect(out.payload).toMatchObject({
			booking_id: bookingId,
			vehicle_id: vehicleA,
			trip_id: tripId,
		})
		expect(out.payload).not.toHaveProperty('score')
	})

	it('returns free_pick when no fromSuggestion', () => {
		const out = resolveAssignmentCalibrationAudit({
			...baseInput,
			dispatchSuggestionsEnabled: true,
			fromSuggestion: undefined,
			suggestionsAtAssign: [sug(vehicleA, 80, 1)],
		})
		expect(out.action).toBe('assignment_free_pick')
	})

	it('returns free_pick when hint vehicle does not match assigned vehicle', () => {
		const out = resolveAssignmentCalibrationAudit({
			...baseInput,
			dispatchSuggestionsEnabled: true,
			fromSuggestion: { vehicleId: vehicleB, score: 90, rank: 1 },
			suggestionsAtAssign: [sug(vehicleA, 80, 1), sug(vehicleB, 70, 2)],
		})
		expect(out.action).toBe('assignment_free_pick')
	})

	it('returns free_pick when assigned vehicle is not in server top-3', () => {
		const out = resolveAssignmentCalibrationAudit({
			...baseInput,
			assignedVehicleId: vehicleA,
			dispatchSuggestionsEnabled: true,
			fromSuggestion: { vehicleId: vehicleA, score: 99, rank: 1 },
			suggestionsAtAssign: [
				sug(vehicleB, 90, 1),
				sug('c3333333-3333-4333-8333-333333333333', 85, 2),
				sug('d4444444-4444-4444-8444-444444444444', 84, 3),
				sug(vehicleA, 10, 4),
			],
		})
		expect(out.action).toBe('assignment_free_pick')
	})

	it('returns from_suggestion with server-bound score and rank', () => {
		const out = resolveAssignmentCalibrationAudit({
			...baseInput,
			dispatchSuggestionsEnabled: true,
			fromSuggestion: { vehicleId: vehicleA, score: 12, rank: 3 },
			suggestionsAtAssign: [sug(vehicleB, 90, 1), sug(vehicleA, 88, 2)],
		})
		expect(out.action).toBe('assignment_from_suggestion')
		expect(out.payload).toMatchObject({
			vehicle_id: vehicleA,
			score: 88,
			rank: 2,
			booking_id: bookingId,
			trip_id: tripId,
			chauffeur_id: driverProfileId,
		})
	})
})
