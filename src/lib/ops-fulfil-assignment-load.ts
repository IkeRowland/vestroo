import type { FulfilPanelBookingRow } from '@/features/ops/components/AssignBookingPanel'
import {
	matchesPaidBucket,
	type FulfilQueueBucket,
	tripRequestAcceptedAtFromMetadata,
} from '@/lib/fulfil-queue-buckets'
import { OPS_BOOKINGS_READY_TO_ASSIGN_STATUS } from '@/lib/ops-bookings-queue-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

export type FulfilAssignmentLoadResult = {
	queue: FulfilQueueBucket
	panelBookings: FulfilPanelBookingRow[]
	runOptions: { id: string; label: string }[]
	driverProfileOptions: { id: string; full_name: string }[]
	vehicleOptions: { id: string; name: string }[]
	bookingError: { message: string } | null
	runsError: { message: string } | null
}

export async function loadFulfilAssignmentPanelState(
	supabase: SupabaseClient,
	queue: FulfilQueueBucket,
): Promise<FulfilAssignmentLoadResult> {

	let bErr: { message: string } | null = null
	let rErr: { message: string } | null = null
	let panelBookings: FulfilPanelBookingRow[] = []
	let runOptions: { id: string; label: string }[] = []
	let driverProfileOptions: { id: string; full_name: string }[] = []
	let vehicleOptions: { id: string; name: string }[] = []

	if (queue === 'paid') {
		const [
			bookingsRes,
			linksRes,
			runsRes,
			driverProfilesRes,
			vehiclesRes,
		] = await Promise.all([
			supabase
				.from('bookings')
				.select(
					'id, payment_reference, pickup_datetime, status, payment_status, booking_intent',
				)
				.eq('status', OPS_BOOKINGS_READY_TO_ASSIGN_STATUS)
				.order('created_at', { ascending: false })
				.limit(100),
			supabase.from('booking_trips').select('booking_id'),
			supabase
				.from('service_runs')
				.select('id, service_date, trip_number, scheduled_start, scheduled_end')
				.order('service_date', { ascending: false })
				.limit(40),
			supabase
				.from('profiles')
				.select('id, full_name')
				.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)
				.eq('status', 'active')
				.order('full_name'),
			supabase.from('vehicles').select('id, name').order('name'),
		])

		if (bookingsRes.error) {
			bErr = bookingsRes.error
		}
		if (runsRes.error) {
			rErr = runsRes.error
		}

		const linked = new Set((linksRes.data ?? []).map((l) => l.booking_id as string))
		const raw = bookingsRes.data ?? []
		const queueRows = raw
			.filter((b) => !linked.has(b.id as string))
			.filter((b) =>
				matchesPaidBucket({
					booking_intent: (b.booking_intent as string | null) ?? null,
					status: (b.status as string | null) ?? null,
					payment_status: (b.payment_status as string | null) ?? null,
					hasBookingTripLink: false,
				}),
			)
			.slice(0, 50)

		panelBookings = queueRows.map((b) => ({
			id: b.id as string,
			payment_reference: (b.payment_reference as string | null) ?? null,
			pickup_datetime: (b.pickup_datetime as string | null) ?? null,
			booking_intent: (b.booking_intent as string | null) ?? null,
		}))

		runOptions =
			(runsRes.data ?? []).map((r) => ({
				id: r.id as string,
				label: `${String(r.service_date)} · run #${r.trip_number} · ${new Date(r.scheduled_start as string).toLocaleString()}`,
			})) ?? []

		driverProfileOptions =
			(driverProfilesRes.data ?? []).map((c) => ({
				id: c.id as string,
				full_name: (c.full_name as string) ?? '',
			})) ?? []

		vehicleOptions =
			(vehiclesRes.data ?? []).map((v) => ({
				id: v.id as string,
				name: (v.name as string) ?? '',
			})) ?? []
	} else if (queue === 'pending') {
		const bookingsRes = await supabase
			.from('bookings')
			.select(
				'id, payment_reference, pickup_datetime, status, payment_status, booking_intent',
			)
			.or('booking_intent.is.null,booking_intent.neq.trip_request')
			.neq('status', OPS_BOOKINGS_READY_TO_ASSIGN_STATUS)
			.or('status.neq.paid,payment_status.neq.paid')
			.order('created_at', { ascending: false })
			.limit(50)

		if (bookingsRes.error) {
			bErr = bookingsRes.error
		}
		const raw = bookingsRes.data ?? []
		panelBookings = raw.map((b) => ({
			id: b.id as string,
			payment_reference: (b.payment_reference as string | null) ?? null,
			pickup_datetime: (b.pickup_datetime as string | null) ?? null,
			status: (b.status as string | null) ?? null,
			payment_status: (b.payment_status as string | null) ?? null,
			booking_intent: (b.booking_intent as string | null) ?? null,
		}))
	} else {
		const [bookingsRes, linksRes] = await Promise.all([
			supabase
				.from('bookings')
				.select(
					'id, payment_reference, pickup_datetime, status, payment_status, booking_intent, booking_metadata',
				)
				.eq('booking_intent', 'trip_request')
				.order('created_at', { ascending: false })
				.limit(50),
			supabase.from('booking_trips').select('booking_id'),
		])

		if (bookingsRes.error) {
			bErr = bookingsRes.error
		}
		const linked = new Set((linksRes.data ?? []).map((l) => l.booking_id as string))
		const raw = bookingsRes.data ?? []
		panelBookings = raw
			.filter((b) => {
				const id = b.id as string
				return !matchesPaidBucket({
					booking_intent: (b.booking_intent as string | null) ?? null,
					status: (b.status as string | null) ?? null,
					payment_status: (b.payment_status as string | null) ?? null,
					hasBookingTripLink: linked.has(id),
				})
			})
			.map((b) => {
				const meta = b.booking_metadata as Record<string, unknown> | null
				return {
					id: b.id as string,
					payment_reference: (b.payment_reference as string | null) ?? null,
					pickup_datetime: (b.pickup_datetime as string | null) ?? null,
					status: (b.status as string | null) ?? null,
					payment_status: (b.payment_status as string | null) ?? null,
					booking_intent: (b.booking_intent as string | null) ?? null,
					trip_request_accepted_at: tripRequestAcceptedAtFromMetadata(meta),
				}
			})
	}

	return {
		queue,
		panelBookings,
		runOptions,
		driverProfileOptions,
		vehicleOptions,
		bookingError: bErr,
		runsError: rErr,
	}
}
