/**
 * Copy for **`/ops/trips`** (Story 17.13, **NFR.17.8**). Shuttle / corporate ops vocabulary only (**NFR.17.7**).
 */
export const opsTripsCopy = {
	pageTitle: 'Trips',
	pageDescription:
		'Status transitions, delay notes with revised end time, and vehicle swaps for assigned trips.',
	tableCaption: 'Trips — select a row to open assignment details',
	rowOpenDetailAria: (tripIdShort: string) => `Open trip details for ${tripIdShort}`,
	detailRailTitle: (tripId: string) => `Trip ${tripId}`,
	assignmentSummaryHeading: 'Assignment summary',
	mapSectionHeading: 'Route map',
	mapPlaceholderAriaLabel:
		'Route map preview is not available yet; a live map will appear here in a future release.',
	mapPlaceholderHint:
		'Live route map is not enabled yet. This area reserves space for a future map view.',
	vehicleHeading: 'Vehicle',
	commsHeading: 'Staff messages and activity',
	commsStubBody: 'No messages or activity logged for this trip yet.',
	closeProtectionLink: 'Close protection (this trip)',
	delayLabel: 'Delay',
	revisedEndLabel: 'Revised end',
	scheduleFromTo: (start: string, end: string) => `${start} → ${end}`,
	metaDriver: 'Driver',
	metaRun: 'Service run',
	runValueShort: (idPrefix: string) => `${idPrefix}…`,
} as const

/** Human-readable trip fulfilment status for pills and labels (DB uses snake_case). */
export function tripStatusDisplayLabel(raw: string): string {
	const t = raw.trim()
	if (!t) return '—'
	return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
