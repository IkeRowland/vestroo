/**
 * Stable copy for ops list / data regions (NFR.5.4 — VST wording).
 * Keep in sync with `OpsEmptyState` usage on refactored pages.
 */
export const OPS_EMPTY_COPY = {
	fulfilQueue: {
		title: 'No bookings waiting for assignment',
		description:
			'Paid bookings without a linked trip appear here. After customers pay on the web booking flow, assign a service run, chauffeur, and vehicle to create the trip.',
	},
	trips: {
		title: 'No trips in this list',
		description:
			'Trips appear after paid bookings are assigned to a service run, vehicle, and chauffeur from Fulfil.',
	},
	incidents: {
		title: 'No compliance incidents logged',
		description:
			'Record safety or compliance events from the compliance workflow when they occur. See docs/compliance-and-safety.md for retention and audit expectations.',
	},
	documentsInWindow: {
		title: 'No documents in this window',
		description:
			'No vehicle or chauffeur compliance documents expire in the selected horizon. Adjust the horizon or add document rows in Supabase if needed.',
	},
} as const

/** Hint shown when server-side recovery is “refresh”. */
export function opsDataRetryHint(): string {
	return 'Refresh this page to retry. If the problem continues, check Supabase status and staff session.'
}
