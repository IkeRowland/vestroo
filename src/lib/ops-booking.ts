export function isBookingDispatchable(booking: {
	status: string | null
	payment_status: string | null
}): boolean {
	return booking.status === 'paid' && booking.payment_status === 'paid'
}
