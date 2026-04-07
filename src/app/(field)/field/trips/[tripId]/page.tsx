import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FieldLocationPublisher } from '@/features/field/components/FieldLocationPublisher'
import { FieldTripDetailActions } from '@/features/field/components/FieldTripDetailActions'
import {
	buildTelHref,
	maskCustomerPhoneForDisplay,
	tripStatusAllowsCustomerContact,
} from '@/lib/field-customer-contact'
import { requireChauffeurPage } from '@/lib/field-auth'
import { resolveFieldMapsTarget } from '@/lib/field-navigation-target'
import { buildAppleMapsUrl, buildGoogleMapsUrl } from '@/lib/maps'
import { createUserServerClient } from '@/lib/supabase/server'

type PageParams = Promise<{ tripId: string }>

export default async function FieldTripDetailPage({ params }: { params: PageParams }) {
	const { tripId } = await params
	const session = await requireChauffeurPage()
	const supabase = await createUserServerClient()

	const { data: trip, error: tErr } = await supabase
		.from('trips')
		.select(
			'id, status, chauffeur_id, time_start_estimate, time_end_estimate, service_run_id, service_type, vehicle_id',
		)
		.eq('id', tripId)
		.maybeSingle()

	if (tErr || !trip) {
		notFound()
	}
	if ((trip.chauffeur_id as string) !== session.userId) {
		notFound()
	}

	const { data: link } = await supabase
		.from('booking_trips')
		.select('booking_id')
		.eq('trip_id', tripId)
		.maybeSingle()

	let booking: {
		destination_latitude: number | null
		destination_longitude: number | null
		destination_address: string | null
		origin_latitude: number | null
		origin_longitude: number | null
		origin_address: string | null
		customer_phone: string | null
		payment_reference: string | null
	} | null = null

	if (link?.booking_id) {
		const { data: b } = await supabase
			.from('bookings')
			.select(
				'destination_latitude, destination_longitude, destination_address, origin_latitude, origin_longitude, origin_address, customer_phone, payment_reference',
			)
			.eq('id', link.booking_id as string)
			.maybeSingle()
		booking = b ?? null
	}

	const mapsTarget = await resolveFieldMapsTarget(supabase, {
		serviceRunId: (trip.service_run_id as string | null) ?? null,
		booking,
	})

	const googleMapsUrl = mapsTarget ? buildGoogleMapsUrl(mapsTarget) : null
	const appleMapsUrl = mapsTarget ? buildAppleMapsUrl(mapsTarget) : null

	const status = trip.status as string
	const allowContact = tripStatusAllowsCustomerContact(status)
	const rawPhone = booking?.customer_phone ?? null
	const maskedPhone = allowContact ? maskCustomerPhoneForDisplay(rawPhone) : null
	const telHref = allowContact ? buildTelHref(rawPhone) : null
	const showContact = Boolean(telHref && maskedPhone)
	const publishLive = status === 'assigned' || status === 'en_route'

	return (
		<div className="space-y-6">
			<p>
				<Link
					href="/field"
					className="text-sm font-medium text-amber-400 hover:text-amber-300"
				>
					← All assignments
				</Link>
			</p>

			<div>
				<h1 className="text-2xl font-bold capitalize text-white">{status}</h1>
				<p className="mt-1 text-sm text-slate-400">
					{(trip.service_type as string) ?? 'Trip'} · Ref{' '}
					{booking?.payment_reference ?? '—'}
				</p>
				<p className="mt-2 text-sm text-slate-300">
					{trip.time_start_estimate ? String(trip.time_start_estimate) : '—'} →{' '}
					{trip.time_end_estimate ? String(trip.time_end_estimate) : '—'}
				</p>
			</div>

			<FieldLocationPublisher tripId={tripId} enabled={publishLive} />

			<FieldTripDetailActions
				tripId={tripId}
				status={status}
				canConfirm={status === 'assigned'}
				canComplete={status === 'en_route'}
				telHref={showContact ? telHref : null}
				maskedPhone={showContact ? maskedPhone : null}
				googleMapsUrl={googleMapsUrl}
				appleMapsUrl={appleMapsUrl}
			/>

			{!mapsTarget ? (
				<p className="text-xs text-slate-500">
					No navigation target yet. Add booking addresses or tie the trip to a service run with
					route points (see docs/field-tools.md).
				</p>
			) : null}
		</div>
	)
}
