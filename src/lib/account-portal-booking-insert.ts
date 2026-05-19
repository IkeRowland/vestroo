/**
 * True when the booking was created under an **active account portal session**
 * (`resolvePortalVerifiedAccountClientInsert` — Story 15.8).
 */
export function isPortalActiveAccountBookingInsert(
	bookingMetadata: Record<string, unknown> | null | undefined,
): boolean {
	return bookingMetadata?.client_type_source === 'portal_active_account_session'
}
