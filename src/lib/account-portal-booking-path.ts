/** Organisation bookings list + embedded new-booking form (`AccountBookingsPageShell`). */
export const ACCOUNT_BOOKINGS_PATH = '/account/bookings' as const

export function accountPortalBookingDetailPath(bookingId: string): string {
	return `${ACCOUNT_BOOKINGS_PATH}/${encodeURIComponent(bookingId)}`
}
