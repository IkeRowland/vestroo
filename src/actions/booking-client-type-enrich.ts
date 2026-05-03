import type { WebBookingPayload, WebClientTypeResolution } from '@/actions/booking-schemas'
import {
	assertClientResolutionForSubmit,
	resolveBookingClientTypeInsert,
} from '@/actions/client-type-resolution'
import { resolvePortalVerifiedAccountClientInsert } from '@/actions/resolvePortalVerifiedAccountClient'
import { loadDomainCandidatesForCustomerEmail } from '@/actions/loadDomainCandidatesForCustomerEmail'

type Jsonish = Record<string, unknown>

/**
 * Story 12.5 — RLS-safe domain candidates + Q6 validation + `bookings` client columns / metadata.
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
