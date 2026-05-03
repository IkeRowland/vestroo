/**
 * Dispatch vehicle suggestions — **Theme E `15D.1`**, **Theme D US-D2** ([`docs/epic-15.md`](../../docs/epic-15.md)).
 *
 * **Q25 — Advisory:** Rankings are recommendations only; dispatchers retain full judgment.
 * **Q26 — Weights:** Live in `dispatch-suggestions-config.ts` (not a DB table).
 * **Tuning:** Full calibration / weight rationale is **`15D.6`** (out of scope here).
 *
 * **Ranking:** Sort by descending `score`; ties broken by **`vehicleId`** ascending (lexicographic).
 *
 * **Overlap vs assign flow:** Uses the same interval intersection as
 * `findVehicleWindowConflicts` → `rangesOverlap` in `ops-time-windows.ts`
 * (`a.startMs < b.endMs && a.endMs > b.startMs`), i.e. half-open-style
 * millisecond bounds consistent with **adjacent windows not conflicting**
 * (see `ops-time-windows` tests). Terminal trip statuses `cancelled` / `completed`
 * are ignored, matching **`assignBookingToRun`** validation.
 *
 * **Capacity:** When `remainingSeats` is a number on a candidate, strict mode
 * excludes the vehicle if `remainingSeats < booking.passengerCount` (aligned
 * with “no remaining seats” on a run snapshot). `null` / `undefined` means
 * unknown — no hard exclusion (see **Progress Notes** vs `reserve_service_run_capacity` RPC).
 */

import {
	WEIGHT_CAPACITY,
	WEIGHT_CHAUFFEUR,
	WEIGHT_COST,
	WEIGHT_SCHEDULE,
} from '@/lib/dispatch-suggestions-config'
import {
	findVehicleWindowConflicts,
	rangesOverlap,
	tripTimeWindow,
	type TimeWindow,
	type TripLike,
} from '@/lib/ops-time-windows'

export type DispatchBookingSnapshot = {
	id: string
	passengerCount: number
	window: {
		windowStartIso: string
		windowEndIso: string
	}
	/** Normalised tier 1–5; omit when unknown (neutral cost alignment). */
	costTier?: number
}

export type DispatchVehicleCandidate = {
	vehicleId: string
	/** Vehicle / class seat capacity — drives capacity-fit score. */
	maxPassengers?: number
	/**
	 * Remaining seats on the proposed run (or snapshot). `null` / `undefined` = unknown → no strict capacity exclusion.
	 */
	remainingSeats?: number | null
	costTier?: number
	/** Caller-supplied 0–100 familiarity proxy (e.g. prior trips with pairing). */
	chauffeurFamiliarity?: number
}

export type DispatchTripRow = TripLike

export type DispatchSuggestionsInput = {
	booking: DispatchBookingSnapshot
	candidates: DispatchVehicleCandidate[]
	trips: DispatchTripRow[]
}

export type SuggestionSignals = {
	capacityFit: number
	scheduleGap: number
	chauffeurFamiliarity: number
	costTierAlignment: number
}

export type Suggestion = {
	vehicleId: string
	/** Overall 0–100 integer: `round(clamp(sum(weight * sub), 0, 100))` — each sub normalised 0–100 first. */
	score: number
	/** 1-based order after sort (best = 1). */
	rank: number
	rationale: string
	signals?: SuggestionSignals
}

export type DispatchSuggestionsDeps = {
	getBooking: (bookingId: string) => Promise<DispatchBookingSnapshot | null>
	listCandidateVehicles: (bookingId: string) => Promise<DispatchVehicleCandidate[]>
	listTripsForWindow: (args: {
		bookingId: string
		windowStartIso: string
		windowEndIso: string
	}) => Promise<DispatchTripRow[]>
}

/** Maximum thin-data relaxation step (0 = strict … see `RELAX_INNER_SLACK_MS`). */
const MAX_RELAX_LEVEL = 3

/** Inner-window slack for overlap checks at relax levels 2+ (ms each side). */
const RELAX_INNER_SLACK_MS: readonly number[] = [0, 0, 15 * 60 * 1000, 30 * 60 * 1000]

function clampInt0to100(n: number): number {
	const r = Math.round(n)
	if (r < 0) return 0
	if (r > 100) return 100
	return r
}

function clampSub0to100(n: number): number {
	if (n < 0) return 0
	if (n > 100) return 100
	return n
}

function bookingFullWindow(booking: DispatchBookingSnapshot): TimeWindow {
	return tripTimeWindow({
		time_start_estimate: booking.window.windowStartIso,
		time_end_estimate: booking.window.windowEndIso,
	})
}

function overlapCandidateWindow(booking: DispatchBookingSnapshot, relaxLevel: number): TimeWindow {
	const full = bookingFullWindow(booking)
	const slack = RELAX_INNER_SLACK_MS[relaxLevel] ?? 0
	if (slack <= 0) {
		return full
	}
	const innerStart = full.startMs + slack
	const innerEnd = full.endMs - slack
	if (innerStart >= innerEnd) {
		return full
	}
	return { startMs: innerStart, endMs: innerEnd }
}

function passesCapacityAtLevel(
	candidate: DispatchVehicleCandidate,
	passengerCount: number,
	relaxLevel: number,
): boolean {
	if (relaxLevel >= 1) {
		return true
	}
	const rem = candidate.remainingSeats
	if (rem === null || rem === undefined) {
		return true
	}
	return rem >= passengerCount
}

function hasVehicleOverlapConflict(
	trips: DispatchTripRow[],
	vehicleId: string,
	candidateWindow: TimeWindow,
): boolean {
	return findVehicleWindowConflicts(trips, vehicleId, candidateWindow).length > 0
}

/**
 * Thin-data relaxation (documented order):
 * 0 — Strict: capacity + overlap on **full** booking window.
 * 1 — Ignore **capacity** snapshot; overlap still on full window.
 * 2 — Ignore capacity; overlap on **inner** window (booking ± 15m slack each side).
 * 3 — Ignore capacity; overlap on **inner** window (± 30m).
 *
 * Stops when `eligible.length >= 2`, `candidates.length < 2`, or level 3 exhausted.
 */
function resolveEligibleCandidates(
	input: DispatchSuggestionsInput,
): DispatchVehicleCandidate[] {
	const { booking, candidates, trips } = input
	let relaxLevel = 0
	let eligible: DispatchVehicleCandidate[] = []

	for (;;) {
		const overlapWindow = overlapCandidateWindow(booking, relaxLevel)
		eligible = candidates.filter(
			(c) =>
				passesCapacityAtLevel(c, booking.passengerCount, relaxLevel) &&
				!hasVehicleOverlapConflict(trips, c.vehicleId, overlapWindow),
		)
		if (eligible.length >= 2 || candidates.length < 2) {
			break
		}
		if (relaxLevel >= MAX_RELAX_LEVEL) {
			break
		}
		relaxLevel += 1
	}

	return eligible
}

function capacityFitScore(candidate: DispatchVehicleCandidate, passengerCount: number): number {
	const party = Math.max(1, passengerCount)
	const maxP = candidate.maxPassengers
	if (maxP === undefined || maxP <= 0) {
		return 70
	}
	if (maxP < party) {
		return clampSub0to100((maxP / party) * 40)
	}
	const headroom = maxP - party
	return clampSub0to100(75 + (25 * headroom) / maxP)
}

function scheduleGapScore(
	trips: DispatchTripRow[],
	vehicleId: string,
	bookingWindow: TimeWindow,
): number {
	const relevant = trips.filter((t) => t.vehicle_id === vehicleId)
	if (relevant.length === 0) {
		return 100
	}
	let bestGapMs = Number.POSITIVE_INFINITY
	for (const t of relevant) {
		const tw = tripTimeWindow(t)
		if (rangesOverlap(bookingWindow, tw)) {
			continue
		}
		let gapMs: number
		if (tw.endMs <= bookingWindow.startMs) {
			gapMs = bookingWindow.startMs - tw.endMs
		} else if (tw.startMs >= bookingWindow.endMs) {
			gapMs = tw.startMs - bookingWindow.endMs
		} else {
			gapMs = 0
		}
		if (gapMs < bestGapMs) {
			bestGapMs = gapMs
		}
	}
	if (!Number.isFinite(bestGapMs)) {
		return 100
	}
	const minutes = bestGapMs / 60_000
	return clampSub0to100(50 + Math.min(50, minutes * 2))
}

function chauffeurScore(candidate: DispatchVehicleCandidate): number {
	if (candidate.chauffeurFamiliarity === undefined) {
		return 60
	}
	return clampSub0to100(candidate.chauffeurFamiliarity)
}

function costTierScore(booking: DispatchBookingSnapshot, candidate: DispatchVehicleCandidate): number {
	const bt = booking.costTier ?? 3
	const vt = candidate.costTier ?? 3
	const delta = Math.abs(bt - vt)
	return clampSub0to100(100 - delta * 20)
}

function buildRationale(signals: SuggestionSignals): string {
	const parts: string[] = []
	if (signals.capacityFit >= 85) {
		parts.push('Strong capacity fit')
	} else if (signals.capacityFit >= 60) {
		parts.push('Adequate capacity fit')
	} else {
		parts.push('Tight capacity fit')
	}
	if (signals.scheduleGap >= 85) {
		parts.push('clear schedule window')
	} else if (signals.scheduleGap >= 60) {
		parts.push('reasonable schedule spacing')
	} else {
		parts.push('limited schedule spacing')
	}
	if (signals.chauffeurFamiliarity >= 75) {
		parts.push('high chauffeur familiarity')
	} else if (signals.chauffeurFamiliarity >= 55) {
		parts.push('moderate chauffeur familiarity')
	} else {
		parts.push('lower chauffeur familiarity')
	}
	if (signals.costTierAlignment >= 85) {
		parts.push('cost tier aligned')
	} else {
		parts.push('cost tier partial match')
	}
	return `${parts[0]}; ${parts[1]}; ${parts[2]}; ${parts[3]}.`
}

/**
 * Pure scoring + filtering. Sub-scores are each clamped to **0–100** before the weighted sum:
 * `WEIGHT_CAPACITY * capacityFit + WEIGHT_SCHEDULE * scheduleGap + WEIGHT_CHAUFFEUR * chauffeurFamiliarity + WEIGHT_COST * costTierAlignment`.
 * Overall `score` = `round(clamp(sum, 0, 100))` as an integer.
 */
export function computeDispatchSuggestions(input: DispatchSuggestionsInput): Suggestion[] {
	const eligible = resolveEligibleCandidates(input)
	const bookingWindow = bookingFullWindow(input.booking)

	const scored = eligible.map((candidate) => {
		const capacityFit = capacityFitScore(candidate, input.booking.passengerCount)
		const scheduleGap = scheduleGapScore(input.trips, candidate.vehicleId, bookingWindow)
		const chauffeurFamiliarity = chauffeurScore(candidate)
		const costTierAlignment = costTierScore(input.booking, candidate)
		const raw =
			WEIGHT_CAPACITY * capacityFit +
			WEIGHT_SCHEDULE * scheduleGap +
			WEIGHT_CHAUFFEUR * chauffeurFamiliarity +
			WEIGHT_COST * costTierAlignment
		const score = clampInt0to100(raw)
		const signals: SuggestionSignals = {
			capacityFit,
			scheduleGap,
			chauffeurFamiliarity,
			costTierAlignment,
		}
		return {
			vehicleId: candidate.vehicleId,
			score,
			rank: 0,
			rationale: buildRationale(signals),
			signals,
		}
	})

	scored.sort((a, b) => {
		if (b.score !== a.score) {
			return b.score - a.score
		}
		return a.vehicleId.localeCompare(b.vehicleId)
	})

	return scored.map((row, index) => ({
		...row,
		rank: index + 1,
	}))
}

/**
 * Async wrapper: resolves data via **injected** `deps`, then `computeDispatchSuggestions`.
 * If `deps` is omitted, returns **[]** (no implicit DB).
 */
export async function suggestVehiclesForBooking(
	bookingId: string,
	deps?: DispatchSuggestionsDeps,
): Promise<Suggestion[]> {
	if (!deps) {
		return []
	}
	const booking = await deps.getBooking(bookingId)
	if (!booking) {
		return []
	}
	const [candidates, trips] = await Promise.all([
		deps.listCandidateVehicles(bookingId),
		deps.listTripsForWindow({
			bookingId,
			windowStartIso: booking.window.windowStartIso,
			windowEndIso: booking.window.windowEndIso,
		}),
	])
	return computeDispatchSuggestions({ booking, candidates, trips })
}
