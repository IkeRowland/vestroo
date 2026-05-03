import type { CommsRecipientResolutionBooking } from '@/lib/comms/recipient-resolve'
import { absoluteUrl } from '@/lib/site-url'
import type { CommsDispatchRecipientRole } from '@/types/comms'
import type { ClientTypeDb } from '@/types/database.types'

/**
 * **15.23** canonical: `/account/preferences?category=<informational|marketing|transactional>` — this helper only emits
 * **informational** / **marketing** for email CTAs (not **transactional** in unsubscribe copy).
 */
export function buildAccountPreferencesAbsoluteUrl(
	category: 'informational' | 'marketing',
): string {
	return absoluteUrl(`/account/preferences?category=${encodeURIComponent(category)}`)
}

/**
 * **AC4 / AC6** — only **booker** / **customer** on an **account** booking are treated as **portal** preference-link eligible
 * (they align with `customer_account_members` resolution for comms to that address). **Rider** / **ops** / **walk_in**:
 * do not emit a fake `/account/preferences` link; use public **mailto** / **privacy** in the footer instead.
 */
export function isEmailPortalPreferenceLinkEligible(
	role: CommsDispatchRecipientRole,
	booking: CommsRecipientResolutionBooking,
): boolean {
	if (role !== 'booker' && role !== 'customer') {
		return false
	}
	return isAccountClientMemberContext(booking)
}

function isAccountClientMemberContext(booking: CommsRecipientResolutionBooking): boolean {
	if (booking.client_type !== 'account_client') {
		return false
	}
	return (
		typeof booking.customer_account_id === 'string' &&
		booking.customer_account_id.length > 0 &&
		typeof booking.customer_id === 'string' &&
		booking.customer_id.length > 0
	)
}

/** @internal test hook */
export function isAccountClientBookingForTests(
	clientType: ClientTypeDb,
	customerAccountId: string | null,
	customerId: string | null,
): boolean {
	return isAccountClientMemberContext({
		client_type: clientType,
		customer_email: null,
		customer_id: customerId,
		customer_account_id: customerAccountId,
		account_snapshot: null,
	})
}
