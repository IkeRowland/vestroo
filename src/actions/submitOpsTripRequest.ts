'use server'

import { z } from 'zod'

import { enrichTripRequestBookingWithClientType } from '@/actions/booking-client-type-enrich'
import { resolveOpsReferrerClientTypeInsert } from '@/actions/client-type-resolution'
import {
	passengerPhoneToE164,
	tripRequestSubmitPayloadSchema,
} from '@/features/booking/components/trip-request/trip-request-submit-schema'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { assertPurchaseOrderForAccountBookingInsert } from '@/lib/account-po-policy'
import { insertTripRequestBooking } from '@/lib/trip-request-booking-insert'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const opsTripRequestInputSchema = tripRequestSubmitPayloadSchema.and(
	z.object({
		referrerId: z.string().uuid().nullable().optional(),
	}),
)

export type SubmitOpsTripRequestInput = z.infer<typeof opsTripRequestInputSchema>

/**
 * Ops staff trip-request create — same payload as public {@link submitTripRequest} plus optional referrer.
 */
export async function submitOpsTripRequest(raw: unknown) {
	const staffGate = await getOpsStaffForAction()
	if (!staffGate.ok) {
		return { success: false as const, error: staffGate.message }
	}

	try {
		const parsed = opsTripRequestInputSchema.safeParse(raw)
		if (!parsed.success) {
			return {
				success: false as const,
				error: 'Please check your details and try again.',
			}
		}

		const { referrerId, ...tripPayload } = parsed.data
		const { slide1, slide2, slide3, clientTypeResolution } = tripPayload
		const supabase = await createServerClient()

		let resolvedReferrerId: string | null = null
		if (referrerId) {
			const { data: refRow, error: refErr } = await supabase
				.from('referrers')
				.select('id, status')
				.eq('id', referrerId)
				.maybeSingle()
			if (refErr || !refRow || refRow.status !== 'active') {
				return {
					success: false as const,
					error: 'Selected referrer is not available.',
				}
			}
			resolvedReferrerId = refRow.id as string
		}

		const e164 = passengerPhoneToE164(slide3.countryIso2, slide3.phoneNational)
		if (!e164) {
			return {
				success: false as const,
				error: 'Please enter a valid phone number for the selected country.',
			}
		}

		const bookingMetadata = {
			trip_request: {
				version: 1 as const,
				slide1,
				slide2,
				slide3: {
					firstName: slide3.firstName,
					lastName: slide3.lastName,
					email: slide3.email,
					countryIso2: slide3.countryIso2,
					customerPhoneE164: e164,
				},
			},
		}

		let clientTyped
		try {
			clientTyped = await enrichTripRequestBookingWithClientType(
				slide3.email.trim(),
				clientTypeResolution,
				bookingMetadata,
			)
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Could not validate account selection.'
			return { success: false as const, error: msg }
		}

		if (resolvedReferrerId) {
			clientTyped = resolveOpsReferrerClientTypeInsert(bookingMetadata)
		}

		const poCheck = await assertPurchaseOrderForAccountBookingInsert(supabase, {
			clientType: clientTyped.client_type,
			customerAccountId: clientTyped.customer_account_id,
			purchaseOrderRef: tripPayload.purchaseOrderRef,
		})
		if (!poCheck.ok) {
			return { success: false as const, error: poCheck.message }
		}

		const inserted = await insertTripRequestBooking(supabase, tripPayload, clientTyped, {
			referrerId: resolvedReferrerId,
		})

		if (!inserted.ok) {
			console.error('submitOpsTripRequest insert error:', inserted.error)
			return {
				success: false as const,
				error: 'We could not save this booking. Please try again shortly.',
			}
		}

		revalidatePath('/ops/bookings')
		revalidatePath('/ops/finance/referrals')

		return {
			success: true as const,
			bookingId: inserted.bookingId,
			bookingReference: inserted.bookingReference,
		}
	} catch (error) {
		console.error('submitOpsTripRequest:', error)
		if (error instanceof z.ZodError) {
			return {
				success: false as const,
				error: 'Please check your details and try again.',
			}
		}
		return {
			success: false as const,
			error: 'Something went wrong. Please try again.',
		}
	}
}
