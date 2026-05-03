/**
 * Copy for **`/ops/bookings`** queue (Story 17.10 / FE.17.12) — NFR.17.8.
 * Overview band: Story 17.21 (Wheelzie layout parity).
 */
export const opsBookingsQueueCopy = {
	pageTitle: 'Bookings',
	pageDescription:
		'Unified bookings queue (newest first). Use the filters below to narrow by status, payment, intent or client type.',
	tableCaption: 'Bookings queue',
	ignoredParamsStatus:
		'Some filter values in the URL were not recognised and have been ignored.',
	overviewSectionHeading: 'Queue overview',
	overviewKpisLandmark: 'Bookings queue key metrics',
	kpiInViewLabel: 'In this view',
	kpiInViewDefinition: 'Total bookings matching the filters below (all pages).',
	kpiReadyToAssignLabel: 'Ready to assign',
	kpiReadyToAssignDefinition: 'Walk-in work queue: paid, not yet on a trip.',
	kpiCompleted7dLabel: 'Completed (7d)',
	kpiCompleted7dDefinition: 'Bookings set to completed in the last seven days (UTC).',
	kpiCompleted7dPeriodLabel: 'rolling 7d · UTC',
	overviewChartTitle: 'Booking outcomes',
	overviewChartSummary:
		'Completed vs cancelled bookings by day for the last seven days (UTC). Aligned to the ops queue, not financial reporting.',
	overviewChartAria: (args: { label: string; values: { x: string; up: number; down: number }[] }) => {
		const body = args.values
			.map(
				(v) =>
					`${v.x}: ${v.up} completed, ${v.down} cancelled`,
			)
			.join('; ')
		return body ? `${args.label}. ${body}` : args.label
	},
} as const
