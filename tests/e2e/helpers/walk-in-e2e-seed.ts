import type { SupabaseClient } from '@supabase/supabase-js'

import {
	initQuoteLinkSigningKeyAtStartup,
	quoteTokenExpiryMsFromExpiresAtIso,
	signQuoteToken,
} from '@/lib/quote-tokens'

export async function pickAnyVehicleId(svc: SupabaseClient): Promise<string> {
	const { data, error } = await svc.from('vehicles').select('id').limit(1).maybeSingle()
	if (error || !data?.id) {
		throw new Error(`E2E requires at least one vehicles row: ${error?.message ?? 'no id'}`)
	}
	return data.id as string
}

/**
 * Walk-in **hourly_hire** (non-trivial / Q13) in **`submitted`** for quote-first ops flow.
 */
export async function insertWalkInHourlyHireSubmittedBooking(
	svc: SupabaseClient,
	vehicleId: string,
): Promise<{ bookingId: string; paymentReference: string }> {
	const { data: inserted, error } = await svc
		.from('bookings')
		.insert({
			customer_id: null,
			status: 'submitted',
			payment_status: 'pending',
			client_type: 'walk_in',
			booking_intent: 'hourly_hire',
			total_amount: 1499.99,
			payment_reference: `VST-${Date.now().toString().slice(-8)}`,
			customer_name: 'E2E Walk-in Hourly',
			customer_email: 'e2e-walkin-hourly@example.test',
			customer_phone: '+27821234567',
			origin_place_id: 'e2e-origin',
			origin_address: '1 Test St, Sandton',
			origin_name: 'Sandton Pickup',
			origin_latitude: -26.1076,
			origin_longitude: 28.0567,
			destination_place_id: 'e2e-hourly-as-directed',
			destination_address: 'Hourly hire — as directed (1 Test St, Sandton)',
			destination_name: 'As directed (hourly hire)',
			destination_latitude: -26.1076,
			destination_longitude: 28.0567,
			pickup_datetime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
			trip_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
			passenger_count: 2,
			flight_number: null,
			vehicle_id: vehicleId,
			estimated_duration: null,
			distance_km: null,
			hourly_duration_hours: 4,
			hourly_service_area_notes: 'CBD loop — E2E',
			service_pattern_id: null,
			booking_metadata: { client_type_source: 'e2e_seed' },
			customer_account_id: null,
			account_snapshot: null,
			invoice_requested: false,
			purchase_order_ref: null,
			billing_entity_ref: null,
		})
		.select('id, payment_reference')
		.single()

	if (error || !inserted?.id) {
		throw new Error(`walk-in seed insert failed: ${error?.message ?? 'no row'}`)
	}

	return {
		bookingId: inserted.id as string,
		paymentReference: String(inserted.payment_reference ?? ''),
	}
}

export async function cleanupBookingCascade(svc: SupabaseClient, bookingId: string): Promise<void> {
	const { data: links } = await svc.from('booking_trips').select('trip_id').eq('booking_id', bookingId)
	await svc.from('booking_trips').delete().eq('booking_id', bookingId)
	for (const row of links ?? []) {
		const tid = row.trip_id as string | undefined
		if (tid) {
			await svc.from('trips').delete().eq('id', tid)
		}
	}
	await svc.from('booking_quotes').delete().eq('booking_id', bookingId)
	await svc.from('bookings').delete().eq('id', bookingId)
}

export function ensureQuoteLinkSigningKeyForTests(): void {
	const raw = process.env.QUOTE_LINK_SIGNING_KEY?.trim() ?? ''
	if (raw.length === 0) {
		throw new Error('QUOTE_LINK_SIGNING_KEY must be set (≥32 UTF-8 bytes) for quote token minting in E2E.')
	}
	initQuoteLinkSigningKeyAtStartup()
}

export function buildAcceptUrlTokenFromQuoteRow(input: {
	quoteId: string
	bookingId: string
	expiresAtIso: string
}): string {
	ensureQuoteLinkSigningKeyForTests()
	const exp = quoteTokenExpiryMsFromExpiresAtIso(input.expiresAtIso)
	return signQuoteToken({
		quoteId: input.quoteId,
		bookingId: input.bookingId,
		purpose: 'accept',
		exp,
	})
}

export function buildRejectUrlTokenFromQuoteRow(input: {
	quoteId: string
	bookingId: string
	expiresAtIso: string
}): string {
	ensureQuoteLinkSigningKeyForTests()
	const exp = quoteTokenExpiryMsFromExpiresAtIso(input.expiresAtIso)
	return signQuoteToken({
		quoteId: input.quoteId,
		bookingId: input.bookingId,
		purpose: 'reject',
		exp,
	})
}

/**
 * Walk-in **point_to_point** in **`pending`** — direct checkout path (Q13: not quote-first
 * when flag ON). Epic 16 / Theme N — settlement now happens via EFT marked by ops.
 */
export async function insertWalkInPointToPointPendingBooking(
	svc: SupabaseClient,
	vehicleId: string,
): Promise<{ bookingId: string; paymentReference: string }> {
	const { data: inserted, error } = await svc
		.from('bookings')
		.insert({
			customer_id: null,
			status: 'pending',
			payment_status: 'pending',
			client_type: 'walk_in',
			booking_intent: 'point_to_point',
			total_amount: 899.5,
			payment_reference: `VST-${Date.now().toString().slice(-8)}`,
			customer_name: 'E2E Walk-in P2P',
			customer_email: 'e2e-walkin-p2p@example.test',
			customer_phone: '+27829876543',
			origin_place_id: 'e2e-p2p-origin',
			origin_address: '10 From Rd, Rosebank',
			origin_name: 'Rosebank',
			origin_latitude: -26.1465,
			origin_longitude: 28.0436,
			destination_place_id: 'e2e-p2p-dest',
			destination_address: '20 To Ave, Sandton',
			destination_name: 'Sandton City',
			destination_latitude: -26.1076,
			destination_longitude: 28.0567,
			pickup_datetime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
			trip_date: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
			passenger_count: 2,
			flight_number: null,
			vehicle_id: vehicleId,
			estimated_duration: 25,
			distance_km: 8.2,
			hourly_duration_hours: null,
			hourly_service_area_notes: null,
			service_pattern_id: null,
			booking_metadata: { client_type_source: 'e2e_seed_p2p' },
			customer_account_id: null,
			account_snapshot: null,
			invoice_requested: false,
			purchase_order_ref: null,
			billing_entity_ref: null,
		})
		.select('id, payment_reference')
		.single()

	if (error || !inserted?.id) {
		throw new Error(`walk-in p2p seed insert failed: ${error?.message ?? 'no row'}`)
	}

	return {
		bookingId: inserted.id as string,
		paymentReference: String(inserted.payment_reference ?? ''),
	}
}
