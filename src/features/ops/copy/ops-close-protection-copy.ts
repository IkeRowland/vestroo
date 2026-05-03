/**
 * Copy for `/ops/close-protection` — NFR.17.8 (Story 17.17).
 */

export const opsCloseProtectionCopy = {
	pageTitle: 'Close protection',
	pageDescription: 'Staff-only engagements linked to bookings and optional trips.',
	filterContextAria: 'Close protection filters',

	filterSummaryBooking: 'Filtered by booking',
	filterSummaryTrip: 'Filtered by trip',
	filterSummaryDefault: 'Showing recent updates',
	clearFilter: 'Clear',

	noEngagementForBooking: 'No engagement for this booking yet.',
	noEngagements: 'No engagements yet.',
	engagementsLoadErrorTitle: 'Engagements could not be loaded',

	invalidBookingFilter: 'The booking filter is invalid and was ignored.',
	invalidTripFilter: 'The trip filter is invalid and was ignored.',

	listItemAria: (shortId: string) => `Close protection engagement ${shortId}`,
	bookingPrefix: 'booking',
	tripPrefix: 'trip',
	noTrip: 'no trip',
	updatedPrefix: 'updated',
} as const
