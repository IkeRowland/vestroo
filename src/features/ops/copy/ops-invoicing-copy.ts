/**
 * Copy for `/ops/invoicing` — NFR.17.8 (Story 17.16).
 * Shuttle vocabulary only — no rental/car domain (**NFR.17.7**).
 */

export const opsInvoicingCopy = {
	pageTitle: 'Invoicing',
	pageDescriptionLead: 'Account-client finance queue:',
	pageDescriptionSegments: {
		ready: 'Ready to invoice',
		invoiced: 'Invoiced (awaiting payment)',
		hooks: 'corporate hook overrides',
	},
	pageDescriptionFootnote: 'No PDF generation on this screen.',

	kpiSectionHeading: 'Finance snapshot',
	kpiLandmarkLabel: 'Invoicing KPI scorecards',

	/** Wheelzie Payments strip alignment — epic wording vs queue semantics (see parity §17.16). */
	kpiCompletedLabel: 'Completed',
	kpiCompletedShortDefinition:
		'Account bookings ready to invoice (pipeline status ready_to_invoice). Aligned with Ready tab.',
	kpiAwaitingLabel: 'Awaiting',
	kpiAwaitingShortDefinition:
		'Invoiced bookings still awaiting payment (pipeline status invoiced). Aligned with Invoiced tab.',
	kpiOverdueLabel: 'Overdue',
	kpiOverdueShortDefinition:
		'Invoiced bookings whose invoice due date (trip completion + credit terms, UTC calendar) is before today.',

	completedDrillAria: 'Open Ready to invoice queue',
	awaitingDrillAria: 'Open Invoiced awaiting payment queue',
	overdueDrillAria: 'Open Invoiced queue to review overdue rows',

	tableCaption: 'Invoicing queue',
	sortToolbarHint: (sortLabel: string, sortDir: string) =>
		`Export uses the current sort order (${sortLabel} ${sortDir}).`,

	emptyReadyTitle: 'No rows in this queue',
	emptyReadyBody:
		'Only account-client bookings with status ready_to_invoice appear here. That status is set when a linked trip is marked completed (Epic 13.9). Walk-in bookings and account bookings in other statuses are excluded.',

	emptyInvoicedTitle: 'No rows in this queue',
	emptyInvoicedBody:
		'No bookings are currently invoiced awaiting payment. Use Mark invoiced from the Ready tab first.',

	fetchErrorTitle: 'Could not load invoicing queue',

	copyCsvAria: 'Copy invoicing table as CSV',
	exportCsvAria: 'Export visible invoicing rows as CSV',

	rowBookingAria: (reference: string) => `Booking ${reference}`,

	statusReadyLabel: 'Ready to invoice',
	statusInvoicedLabel: 'Invoiced',
	statusOverdueLabel: 'Overdue',

	sparklineAria: (metric: string) => `${metric} trend preview (anchored to current count, not historical ledger).`,
} as const
