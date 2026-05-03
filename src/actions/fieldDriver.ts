'use server'

/**
 * Epic 16 / US-L3 — grep-friendly re-exports for field trip actions.
 * Implementation remains in `./fieldChauffeur` until Epic 17 / US-L4 module rename.
 */
export {
	confirmChauffeurAssignmentAction as confirmDriverTripAssignmentAction,
	logChauffeurContactIntentAction as logDriverTripContactIntentAction,
	updateChauffeurTripStatusAction as updateDriverTripStatusAction,
} from './fieldChauffeur'
