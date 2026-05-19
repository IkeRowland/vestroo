'use server'

/**
 * Epic 16 / US-L3 — grep-friendly aliases for field trip actions.
 * Implementation remains in `./fieldChauffeur` until Epic 17 / US-L4 module rename.
 */
import {
	confirmChauffeurAssignmentAction,
	logChauffeurContactIntentAction,
	updateChauffeurTripStatusAction,
} from './fieldChauffeur'

export async function confirmDriverTripAssignmentAction(
	...args: Parameters<typeof confirmChauffeurAssignmentAction>
) {
	return confirmChauffeurAssignmentAction(...args)
}

export async function logDriverTripContactIntentAction(
	...args: Parameters<typeof logChauffeurContactIntentAction>
) {
	return logChauffeurContactIntentAction(...args)
}

export async function updateDriverTripStatusAction(
	...args: Parameters<typeof updateChauffeurTripStatusAction>
) {
	return updateChauffeurTripStatusAction(...args)
}
