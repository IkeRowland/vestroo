import type { SupabaseClient } from '@supabase/supabase-js'

import { cleanupBookingCascade, pickAnyVehicleId } from './walk-in-e2e-seed'

export type CommsRetrySeed = {
	bookingId: string
}

/**
 * Minimal **walk_in** booking for Epic 13 Theme C — `createBookingQuote` only needs an existing row.
 */
export async function seedCommsRetryBooking(
	svc: SupabaseClient,
	_profileId: string,
	_staffEmail: string,
): Promise<CommsRetrySeed> {
	const vehicleId = await pickAnyVehicleId(svc)
	const { data, error } = await svc
		.from('bookings')
		.insert({
			customer_id: null,
			status: 'pending',
			payment_status: 'pending',
			client_type: 'walk_in',
			booking_intent: 'point_to_point',
			total_amount: 500,
			payment_reference: `VST-${Date.now().toString().slice(-8)}`,
			customer_name: 'E2E Comms Retry Seed',
			customer_email: 'e2e-comms-retry-seed@example.test',
			customer_phone: '+27820000000',
			origin_place_id: 'e2e-cr-origin',
			origin_address: 'Seed St',
			origin_name: 'Seed pickup',
			origin_latitude: -26.0,
			origin_longitude: 28.0,
			destination_place_id: 'e2e-cr-dest',
			destination_address: 'Seed Ave',
			destination_name: 'Seed drop-off',
			destination_latitude: -26.02,
			destination_longitude: 28.02,
			pickup_datetime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			trip_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
			passenger_count: 1,
			flight_number: null,
			vehicle_id: vehicleId,
			estimated_duration: 30,
			distance_km: 10,
			hourly_duration_hours: null,
			hourly_service_area_notes: null,
			service_pattern_id: null,
			booking_metadata: {},
			customer_account_id: null,
			account_snapshot: null,
			invoice_requested: false,
			purchase_order_ref: null,
			billing_entity_ref: null,
		})
		.select('id')
		.single()

	if (error || !data?.id) {
		throw new Error(`seedCommsRetryBooking failed: ${error?.message ?? 'no id'}`)
	}
	return { bookingId: data.id as string }
}

export async function cleanupCommsRetryBooking(svc: SupabaseClient, seed: CommsRetrySeed): Promise<void> {
	await cleanupBookingCascade(svc, seed.bookingId)
}
