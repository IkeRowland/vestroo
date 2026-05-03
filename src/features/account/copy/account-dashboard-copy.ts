/**
 * Non-i18n dashboard strings (**Story 18.4** / **FE.18.3**).
 * Customer vocabulary: shuttle / chauffeur — no car-rental framing.
 */
export const accountDashboardCopy = {
	welcomeKicker: 'Organisation',
	lastSignInPrefix: 'Last sign-in:',
	lastSignInUnknown: '—',
	rolePillPrefix: 'Your role:',

	kpiTripsThisMonth: 'Trips this month',
	kpiTripsThisMonthHint: 'Pickups scheduled in the current calendar month.',
	kpiUpcomingTrips: 'Upcoming trips',
	kpiUpcomingTripsHint: 'Bookings with a future pickup that are still in progress.',
	kpiOpenInvoices: 'Open invoices',
	kpiOpenInvoicesHint: 'Bookings in the invoice queue (not yet fully paid).',
	kpiActiveMembers: 'Active members',
	kpiActiveMembersHint: 'People who can access this organisation in the portal.',

	sectionUpcoming: 'Upcoming trips',
	sectionInvoices: 'Recent invoices',
	railStatusPendingQuote: 'Pending quote',
	railStatusConfirmed: 'Confirmed',
	railStatusDriverAssigned: 'Driver assigned',
	railViewDetails: 'View details',
	railCardAriaLabel: (route: string) => `Upcoming trip: ${route}`,
	emptyRailTitle: 'No upcoming trips',
	emptyRailDescription: 'When you have confirmed or in-progress shuttles, they will appear here.',
	emptyRailCta: 'Book your next trip',

	invoiceColReference: 'Reference',
	invoiceColDate: 'Date',
	invoiceColAmount: 'Amount',
	invoiceColStatus: 'Status',
	invoiceColAction: 'Action',
	invoiceViewAll: 'View all',
	invoiceDownload: 'Download',
	invoicePay: 'Pay',
	invoiceActionUnavailable: '—',
	/** Generic — technical detail is server-logged only. */
	invoicePreviewFailedMessage:
		'Recent invoices could not be loaded. Open Invoices in the sidebar for the full list.',
} as const
