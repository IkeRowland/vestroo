import { FULFIL_EMPTY_COPY } from '@/lib/fulfil-queue-buckets'

/**
 * Stable copy for ops list / data regions (NFR.5.4 — VST wording).
 * Keep in sync with `OpsEmptyState` usage on refactored pages.
 */
export const OPS_EMPTY_COPY = {
	fulfilQueue: FULFIL_EMPTY_COPY.paid,
	trips: {
		title: 'No trips in this list',
		description:
			'Trips appear after paid bookings are assigned to a driver and vehicle from the Assignment tab.',
	},
	incidents: {
		title: 'No compliance incidents logged',
		description:
			'Record safety or compliance events from the compliance workflow when they occur.',
	},
	documentsInWindow: {
		title: 'No documents in this window',
		description:
			'No vehicle or driver compliance documents expire in the selected horizon.',
	},
} as const

/** Hint shown under recoverable ops error surfaces (single “Try again” action). */
export function opsDataRetryHint(): string {
	return 'Use Try again to reload this data. If the problem continues, contact support.'
}
