import Link from 'next/link'
import { notFound } from 'next/navigation'

import { FieldLiveTrackingOnIndicator } from '@/features/field/components/FieldLiveTrackingOnIndicator'
import { FieldLocationPublisher } from '@/features/field/components/FieldLocationPublisher'
import { FieldTripDetailActions } from '@/features/field/components/FieldTripDetailActions'
import { buildFieldLiveTrackingIndicatorModel } from '@/features/field/lib/field-live-tracking-indicator'
import { loadCustomerAccountLiveRiderTrackingFlag } from '@/features/field/lib/load-customer-account-live-rider-tracking.server'
import { isRiderLiveLocationEnvEnabled } from '@/features/rider-tracking/lib/rider-live-location-env'
import {
	buildTelHref,
	maskCustomerPhoneForDisplay,
	tripStatusAllowsCustomerContact,
} from '@/lib/field-customer-contact'
import { requireFieldDriverPage } from '@/lib/field-auth'
import { resolveFieldMapsTarget } from '@/lib/field-navigation-target'
import { buildAppleMapsUrl, buildGoogleMapsUrl } from '@/lib/maps'
import {
	FIELD_TRIP_DETAIL_SELECT_COLUMNS,
	TRIP_DRIVER_PROFILE_FK_COLUMN,
} from '@/lib/supabase-select-fragments'
import { createUserServerClient } from '@/lib/supabase/server'

type PageParams = Promise<{ tripId: string }>

export default async function FieldTripDetailPage({ params }: { params: PageParams }) {
	const { tripId } = await params
	const session = await requireFieldDriverPage()
	const supabase = await createUserServerClient()

	const { data: trip, error: tErr } = await supabase
		.from('trips')
		.select(FIELD_TRIP_DETAIL_SELECT_COLUMNS)
		.eq('id', tripId)
		.maybeSingle()

	if (tErr || !trip) {
		notFound()
	}
	if ((trip[TRIP_DRIVER_PROFILE_FK_COLUMN] as string) !== session.userId) {
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
		customer_account_id: string | null
	} | null = null

	if (link?.booking_id) {
		const { data: b } = await supabase
			.from('bookings')
			.select(
				'destination_latitude, destination_longitude, destination_address, origin_latitude, origin_longitude, origin_address, customer_phone, payment_reference, customer_account_id',
			)
			.eq('id', link.booking_id as string)
			.maybeSingle()
		booking = b ?? null
	}

	const customerAccountId = booking?.customer_account_id ?? null
	let accountLiveRiderTracking = false
	if (customerAccountId) {
		accountLiveRiderTracking = await loadCustomerAccountLiveRiderTrackingFlag(customerAccountId)
	}
	const liveTrackingIndicator = buildFieldLiveTrackingIndicatorModel({
		customerAccountId,
		accountLiveRiderTracking,
		envEnabled: isRiderLiveLocationEnvEnabled(),
	})

	const mapsTarget = resolveFieldMapsTarget({ booking })

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
		<div className="min-w-0 max-w-full space-y-6 pb-[min(42vh,18rem)] sm:pb-40">
			<p>
				<Link
					href="/field"
					className="inline-flex min-h-11 items-center text-sm font-medium text-amber-400 hover:text-amber-300"
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
				{status === 'assigned' ? (
					<p className="mt-3 text-sm text-slate-400">
						When you are ready to drive, use <strong className="text-slate-200">Confirm assignment</strong>{' '}
						below (moves to <strong className="text-slate-200">en route</strong>).
					</p>
				) : null}
				{status === 'en_route' ? (
					<p className="mt-3 text-sm text-slate-400">
						After the service ends, tap <strong className="text-slate-200">Mark completed</strong> below.
					</p>
				) : null}
			</div>

			<FieldLiveTrackingOnIndicator
				show={liveTrackingIndicator.show}
				showEnvDisabledSubcopy={liveTrackingIndicator.showEnvDisabledSubcopy}
			/>

			<FieldLocationPublisher tripId={tripId} enabled={publishLive} />

			{!mapsTarget ? (
				<p className="text-xs text-slate-500">
					No navigation target yet. Add pickup and destination on the booking so maps can open here.
				</p>
			) : null}

			<FieldTripDetailActions
				tripId={tripId}
				status={status}
				canConfirm={status === 'assigned'}
				canComplete={status === 'en_route'}
				telHref={showContact ? telHref : null}
				maskedPhone={showContact ? maskedPhone : null}
				googleMapsUrl={googleMapsUrl}
				appleMapsUrl={appleMapsUrl}
				stickyFooter
			/>
		</div>
	)
}
