import type { Suggestion } from '@/lib/dispatch-suggestions'

/**
 * Optional hints from the Fulfil suggestions panel (**15D.2** / **15D.3**).
 * **`score` / `rank` from the client are not used for audit** — the server re-fetches
 * suggestions and binds **`score`** and **`rank`** from the matching top-3 row.
 */
export type AssignFromSuggestionHints = {
	vehicleId: string
	score: number
	rank?: 1 | 2 | 3
}

export type AssignmentCalibrationAudit =
	| { action: 'assignment_from_suggestion'; payload: Record<string, unknown> }
	| { action: 'assignment_free_pick'; payload: Record<string, unknown> }

type BasePayload = {
	booking_id: string
	trip_id: string
	service_run_id: string
	vehicle_id: string
	chauffeur_id: string
}

/**
 * Epic 15 / **15D.3** — choose **`assignment_from_suggestion`** vs **`assignment_free_pick`**
 * for ops calibration reports (**`15D.4`**). Pure; DB and feature-flag wiring live in
 * {@link assignBookingToRun}.
 */
export function resolveAssignmentCalibrationAudit(input: {
	dispatchSuggestionsEnabled: boolean
	fromSuggestion: AssignFromSuggestionHints | undefined
	/**
	 * Vehicle id on the created trip / assign payload — same field as `assignBookingToRun`’s
	 * **`vehicleId`** (not `serviceRunId` / not driver profile id).
	 */
	assignedVehicleId: string
	bookingId: string
	tripId: string
	serviceRunId: string
	driverProfileId: string
	/** Full ranked list from `suggestVehiclesForBooking` (sorted); only the first three are considered. */
	suggestionsAtAssign: Suggestion[]
}): AssignmentCalibrationAudit {
	const base: BasePayload = {
		booking_id: input.bookingId,
		trip_id: input.tripId,
		service_run_id: input.serviceRunId,
		vehicle_id: input.assignedVehicleId,
		chauffeur_id: input.driverProfileId,
	}

	if (!input.dispatchSuggestionsEnabled) {
		return { action: 'assignment_free_pick', payload: base }
	}

	const hint = input.fromSuggestion
	if (!hint) {
		return { action: 'assignment_free_pick', payload: base }
	}

	if (hint.vehicleId !== input.assignedVehicleId) {
		return { action: 'assignment_free_pick', payload: base }
	}

	const top3 = input.suggestionsAtAssign.slice(0, 3)
	const bound = top3.find((s) => s.vehicleId === input.assignedVehicleId)
	if (!bound) {
		return { action: 'assignment_free_pick', payload: base }
	}

	return {
		action: 'assignment_from_suggestion',
		payload: {
			...base,
			score: bound.score,
			rank: bound.rank,
		},
	}
}
