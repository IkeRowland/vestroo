import type { TripFulfilmentStatusDb } from '@/types/database.types'

/**
 * Chauffeur field app may only perform these single-step transitions (dispatcher handles the rest).
 * @see docs/field-tools.md
 */
const CHAUFFEUR_ALLOWED: ReadonlyArray<readonly [TripFulfilmentStatusDb, TripFulfilmentStatusDb]> = [
	['assigned', 'en_route'],
	['en_route', 'completed'],
]

export function isChauffeurTripTransitionAllowed(
	from: TripFulfilmentStatusDb,
	to: TripFulfilmentStatusDb,
): boolean {
	return CHAUFFEUR_ALLOWED.some(([a, b]) => a === from && b === to)
}

export function assertChauffeurTripTransition(
	from: TripFulfilmentStatusDb,
	to: TripFulfilmentStatusDb,
): { ok: true } | { ok: false; message: string } {
	if (isChauffeurTripTransitionAllowed(from, to)) {
		return { ok: true }
	}
	return {
		ok: false,
		message: `Invalid transition for chauffeur: ${from} → ${to}`,
	}
}
