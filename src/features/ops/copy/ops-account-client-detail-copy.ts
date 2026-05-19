export const opsAccountClientDetailCopy = {
	backToClients: '← All account clients',
	bookingsHeading: 'Bookings',
	bookingsDescription:
		'Bookings for this account client. Filters match the ops bookings queue. Select ready-to-invoice rows to send one consolidated invoice.',
	bookingsTableCaption: 'Account client bookings',
	selectAllBookingsAria: 'Select all invoice-eligible bookings on this page',
	rowCheckboxAria: (ref: string) => `Select booking ${ref} for bulk invoice`,
	bookingsSelectionCount: (n: number) => `${n} selected for invoice`,
	sendInvoiceButton: 'Send invoice',
	sendingInvoice: 'Sending…',
	noBookingsTitle: 'No bookings match',
	noBookingsDescription: 'Adjust filters or wait for trips to complete and move to ready to invoice.',
} as const
