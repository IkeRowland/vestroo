import type { SupabaseClient } from '@supabase/supabase-js'

import type { TripRequestSubmitPayload } from '@/features/booking/components/trip-request/trip-request-submit-schema'
import {
	passengerPhoneToE164,
	tripRequestRiderToDbColumns,
} from '@/features/booking/components/trip-request/trip-request-submit-schema'
import { isQuoteFirstForNonTrivialIntentsEnabled } from '@/lib/quote-first-non-trivial-intents'
import { isPortalActiveAccountBookingInsert } from '@/lib/account-portal-booking-insert'

type TripRequestClientTyped = {
	client_type: 'walk_in' | 'account_client' | 'referral'
	customer_account_id: string | null
	account_snapshot: Record<string, unknown> | null
	booking_metadata: Record<string, unknown>
}

export type TripRequestBookingInsertOptions = {
	referrerId?: string | null
}

export function buildTripRequestBookingInsertRow(
	parsed: TripRequestSubmitPayload,
	clientTyped: TripRequestClientTyped,
	options?: TripRequestBookingInsertOptions,
) {
	const { slide1, slide3 } = parsed
	const e164 = passengerPhoneToE164(slide3.countryIso2, slide3.phoneNational)
	if (!e164) {
		throw new Error('Invalid phone')
	}

	const pickupDatetime = new Date(`${slide1.rideDate}T${slide1.rideTime}:00`)
	const bookingReference = `VST-${Date.now().toString().slice(-8)}`
	const customerName = `${slide3.firstName} ${slide3.lastName}`.trim()
	const useQuoteFirst = isQuoteFirstForNonTrivialIntentsEnabled()
	const riderCols = tripRequestRiderToDbColumns(parsed.rider, slide3.countryIso2)

	const portalAccountBooking =
		clientTyped.client_type === 'account_client' &&
		isPortalActiveAccountBookingInsert(clientTyped.booking_metadata)

	return {
		origin_place_id: slide1.pickup.placeId,
		origin_address: slide1.pickup.formattedAddress,
		origin_name: slide1.pickup.name,
		origin_latitude: slide1.pickup.latitude,
		origin_longitude: slide1.pickup.longitude,
		destination_place_id: slide1.destination.placeId,
		destination_address: slide1.destination.formattedAddress,
		destination_name: slide1.destination.name,
		destination_latitude: slide1.destination.latitude,
		destination_longitude: slide1.destination.longitude,
		pickup_datetime: pickupDatetime.toISOString(),
		trip_date: pickupDatetime.toISOString(),
		passenger_count: slide1.passengers,
		flight_number: slide1.flightNumber?.trim() ? slide1.flightNumber.trim() : null,
		vehicle_id: null,
		total_amount: 0,
		estimated_duration: null as number | null,
		distance_km: null as number | null,
		customer_name: customerName,
		customer_email: slide3.email,
		customer_phone: e164,
		rider_name: riderCols.rider_name,
		rider_email: riderCols.rider_email,
		rider_phone: riderCols.rider_phone,
		status: portalAccountBooking
			? 'pending_confirmation'
			: useQuoteFirst
				? 'submitted'
				: 'pending',
		payment_status: 'pending',
		payment_reference: bookingReference,
		booking_intent: 'trip_request',
		hourly_duration_hours: null as number | null,
		hourly_service_area_notes: null as string | null,
		service_pattern_id: null as string | null,
		booking_metadata: clientTyped.booking_metadata,
		client_type: clientTyped.client_type,
		customer_account_id: clientTyped.customer_account_id,
		account_snapshot: clientTyped.account_snapshot,
		invoice_requested: false,
		purchase_order_ref: parsed.purchaseOrderRef?.trim() || null,
		billing_entity_ref: null as string | null,
		referrer_id: options?.referrerId ?? null,
		created_at: new Date().toISOString(),
		bookingReference,
	}
}

export async function insertTripRequestBooking(
	supabase: SupabaseClient,
	parsed: TripRequestSubmitPayload,
	clientTyped: TripRequestClientTyped,
	options?: TripRequestBookingInsertOptions,
) {
	const { bookingReference, ...bookingData } = buildTripRequestBookingInsertRow(
		parsed,
		clientTyped,
		options,
	)

	const { data: booking, error: bookingError } = await supabase
		.from('bookings')
		.insert(bookingData)
		.select('id, payment_reference')
		.single()

	if (bookingError || !booking) {
		return { ok: false as const, error: bookingError }
	}

	return {
		ok: true as const,
		bookingId: booking.id as string,
		bookingReference: (booking.payment_reference as string | null) ?? bookingReference,
	}
}
