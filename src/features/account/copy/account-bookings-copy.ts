/** User-visible strings for **`/account/bookings`** — **Story 18.5** / **FE.18.4** (B2B shuttle / chauffeur; not rental vocabulary). */

export const accountBookingsPageCopy = {
	pageTitle: 'Bookings',
	pageSubtitle: 'Trips linked to this organisation.',
	backToAccount: '← Account home',
	loadError: (msg: string) => `Could not load bookings (${msg}).`,
}

export const accountBookingsCopy = {
	filtersDateRange: 'Date range',
	filtersFrom: 'From',
	filtersTo: 'To',
	filtersApplyDates: 'Apply dates',
	filtersClearDates: 'Clear dates',
	filtersTimeWindow: 'Quick window',
	/** Preset pickup windows (replaces chip row). */
	filtersWindowAll: 'All dates',
	filtersWindowNext7: 'Next 7 days',
	filtersWindowNext30: 'Next 30 days',
	filtersWindowPast90: 'Past 90 days',
	/** Multi-select dropdown trigger when nothing is filtered. */
	filtersAllStages: 'All stages',
	filtersAllTripTypes: 'All trip types',
	filtersAllProductTags: 'All tags',
	/** Dashboard deep link: `?status=upcoming` */
	filtersUpcomingTrips: 'Upcoming trips',
	filtersSelectedCount: (n: number) => `${n} selected`,
	filtersStatus: 'Status',
	filtersStatusHint: 'Select one or more pipeline stages.',
	filtersStatusClear: 'Clear status',
	filtersTripType: 'Trip type',
	filtersTripTypeHint: 'Filter by how the trip was sold (not vehicle category).',
	filtersTripP2p: 'Point to point',
	filtersTripHourly: 'Hourly / as-directed',
	filtersTripTour: 'Tour / experience',
	filtersTripCorporatePattern: 'Corporate pattern',
	filtersSearch: 'Search',
	filtersSearchButton: 'Search',
	filtersSearchPlaceholder: 'Ref, origin, or destination',
	filtersSearchClear: 'Clear search',
	filtersIntentLegacy: 'Product tags (legacy URL)',
	/** Short label on the filter trigger (full title is {@link filtersIntentLegacy}). */
	filtersIntentShort: 'Tags',
	filtersIntentClear: 'Clear tags',

	tableCaption: 'Organisation bookings',
	/** List + rail — account portal submissions awaiting ops (`pending_confirmation`). */
	listStatusPendingConfirmation: 'Pending Confirmation',
	/** List + rail — ops confirmed trip + quote (`assigned` / `in_progress`). */
	listStatusBookingConfirmed: 'Booking Confirmed',
	tableRef: 'Ref',
	tablePickup: 'Date & time',
	tableRoute: 'Route',
	tableVehicleClass: 'Class',
	tableStatus: 'Status',
	tableAmount: 'Amount',
	tableActions: 'Actions',
	tableRowOpen: 'Open details',
	tableEmpty: 'No bookings match these filters.',
	tableSortPickup: (asc: boolean) => (asc ? 'Pickup: soonest first' : 'Pickup: latest first'),
	tableNewTrip: 'New trip',

	bookingFormAsideTitle: 'New booking',
	bookingFormAsideSubtitle: 'Request a trip for this organisation — same flow as the public site.',

	paginationLabel: 'Bookings list pages',

	detailSheetTitle: 'Trip details',
	/** Booking detail rail — `pending_confirmation` */
	detailPendingConfirmationBanner:
		'This booking is awaiting confirmation from our operations team. Driver and quote details will appear here once confirmed.',
	detailClose: 'Close details',
	detailItinerary: 'Itinerary',
	detailMapAlt: 'Map preview for pickup and drop-off',
	detailMapPlaceholder: 'Map preview unavailable for this trip.',
	detailTrip: 'Trip',
	detailDate: 'Date & time',
	detailPassengers: 'Passengers',
	detailSpecialInstructions: 'Special instructions',
	detailVehicle: 'Vehicle',
	detailVehicleFleet: 'Assigned vehicle',
	detailQuote: 'Quote',
	detailDriver: 'Driver',
	detailDriverUnassigned: 'Not assigned yet',
	detailDriverMaskName: 'Assigned driver',
	detailDriverNote:
		'Name and contact are shared in your trip confirmation and by your account team as the run approaches.',
	detailComms: 'Activity',
	detailCommsEmpty: 'No quote or payment events are recorded for this trip yet.',
	detailAmount: 'Total',

	timelineCreated: 'Booking created' as const,
	timelineQuoteSent: (v: number) => `Quote v${v} sent`,
	timelineQuoteAccepted: (v: number) => `Quote v${v} accepted`,
	timelineQuoteRejected: (v: number) => `Quote v${v} rejected`,

	actionsModify: 'Modify trip',
	actionsCancel: 'Cancel trip',
	actionsRebook: 'Re-book',
	actionsReceipt: 'View quote / receipt',
	actionsReceiptUnavailable: 'No quote on file yet',

	cancelDialogTitle: 'Cancel this trip?',
	cancelDialogBody: (ref: string) =>
		`This will mark booking ${ref} as cancelled. Paid trips may require our team to adjust invoices — you can still request cancellation and we will follow up.`,
	cancelDialogConfirm: 'Confirm cancellation',
	cancelDialogBack: 'Keep trip',
	cancelSuccess: 'Trip cancelled',
	cancelErrorGeneric: 'Could not cancel this trip. Try again or contact your account team.',

	modifyNotAllowed: 'Changes are limited for this booking. Contact your account team.',
}
