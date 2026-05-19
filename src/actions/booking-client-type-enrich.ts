import type { WebBookingPayload, WebClientTypeResolution } from '@/actions/booking-schemas'
import {
	assertClientResolutionForSubmit,
	resolveBookingClientTypeInsert,
} from '@/actions/client-type-resolution'
import {
	resolvePortalVerifiedAccountClientInsert,
	tryResolvePortalVerifiedAccountClientInsert,
} from '@/actions/resolvePortalVerifiedAccountClient'
import { loadDomainCandidatesForCustomerEmail } from '@/actions/loadDomainCandidatesForCustomerEmail'

type Jsonish = Record<string, unknown>

/**
 * Story 12.5 — RLS-safe domain candidates + Q6 validation + `bookings` client columns / metadata.
 *
 * **Account portal:** Q6 can persist `user_confirmed_domain_match` while the booker is actually
 * signed into `/account/*`. When `resolveBookingClientTypeInsert` yields `account_client`, we
 * call {@link tryResolvePortalVerifiedAccountClientInsert}; on success we upgrade to
 * `portal_active_account_session` so `createBooking` / `submitTripRequest` set `pending_confirmation`.
 */
export async function enrichWebBookingWithClientType(
	validatedData: WebBookingPayload,
	bookingMetadataBase: Jsonish,
): Promise<{
	client_type: 'walk_in' | 'account_client'
	customer_account_id: string | null
	account_snapshot: Jsonish | null
	booking_metadata: Jsonish
}> {
	const portalRes = validatedData.clientTypeResolution
	if (
		portalRes?.clientType === 'account_client' &&
		portalRes.customerAccountId &&
		portalRes.clientTypeSource === 'portal_active_account_session'
	) {
		const ct = await resolvePortalVerifiedAccountClientInsert(portalRes.customerAccountId)
		return {
			client_type: ct.client_type,
			customer_account_id: ct.customer_account_id,
			account_snapshot: ct.account_snapshot as Jsonish,
			booking_metadata: {
				...bookingMetadataBase,
				client_type_source: ct.client_type_source,
			},
		}
	}

	const candidates = await loadDomainCandidatesForCustomerEmail(validatedData.customer.email)
	const validatedResolution = assertClientResolutionForSubmit(
		candidates,
		validatedData.clientTypeResolution,
	)
	const ct = resolveBookingClientTypeInsert(validatedResolution, candidates)
	if (ct.client_type === 'account_client' && ct.customer_account_id) {
		const upgraded = await tryResolvePortalVerifiedAccountClientInsert(ct.customer_account_id)
		if (upgraded) {
			return {
				client_type: upgraded.client_type,
				customer_account_id: upgraded.customer_account_id,
				account_snapshot: upgraded.account_snapshot as Jsonish,
				booking_metadata: {
					...bookingMetadataBase,
					client_type_source: upgraded.client_type_source,
				},
			}
		}
	}
	return {
		client_type: ct.client_type,
		customer_account_id: ct.customer_account_id,
		account_snapshot: (ct.account_snapshot ?? null) as Jsonish | null,
		booking_metadata: {
			...bookingMetadataBase,
			client_type_source: ct.client_type_source,
		},
	}
}

export async function enrichTripRequestBookingWithClientType(
	customerEmail: string,
	clientTypeResolution: WebClientTypeResolution | undefined,
	bookingMetadataBase: Jsonish,
): Promise<{
	client_type: 'walk_in' | 'account_client'
	customer_account_id: string | null
	account_snapshot: Jsonish | null
	booking_metadata: Jsonish
}> {
	if (
		clientTypeResolution?.clientType === 'account_client' &&
		clientTypeResolution.customerAccountId &&
		clientTypeResolution.clientTypeSource === 'portal_active_account_session'
	) {
		const ct = await resolvePortalVerifiedAccountClientInsert(clientTypeResolution.customerAccountId)
		return {
			client_type: ct.client_type,
			customer_account_id: ct.customer_account_id,
			account_snapshot: ct.account_snapshot as Jsonish,
			booking_metadata: {
				...bookingMetadataBase,
				client_type_source: ct.client_type_source,
			},
		}
	}

	const candidates = await loadDomainCandidatesForCustomerEmail(customerEmail)
	const validatedResolution = assertClientResolutionForSubmit(candidates, clientTypeResolution)
	const ct = resolveBookingClientTypeInsert(validatedResolution, candidates)
	if (ct.client_type === 'account_client' && ct.customer_account_id) {
		const upgraded = await tryResolvePortalVerifiedAccountClientInsert(ct.customer_account_id)
		if (upgraded) {
			return {
				client_type: upgraded.client_type,
				customer_account_id: upgraded.customer_account_id,
				account_snapshot: upgraded.account_snapshot as Jsonish,
				booking_metadata: {
					...bookingMetadataBase,
					client_type_source: upgraded.client_type_source,
				},
			}
		}
	}
	return {
		client_type: ct.client_type,
		customer_account_id: ct.customer_account_id,
		account_snapshot: (ct.account_snapshot ?? null) as Jsonish | null,
		booking_metadata: {
			...bookingMetadataBase,
			client_type_source: ct.client_type_source,
		},
	}
}
