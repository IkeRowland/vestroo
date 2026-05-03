import type { SupabaseClient } from '@supabase/supabase-js'

import { absoluteUrl } from '@/lib/site-url'
import {
	riderTrackTokenExpMsFromTripEndEstimateIso,
	signRiderTrackToken,
} from '@/lib/tracking-tokens'
import type { AccountTripConfirmationProps } from '@/lib/email/templates/account-trip-confirmation'
import {
	ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
	resolveSupportContactLine,
} from '@/lib/email/email-copy'
import type { AccountSnapshotJsonDb } from '@/types/database.types'
import { parseBookingQuoteLineItems, type BookingQuoteLineItem } from '@/types/booking-quote'

const DEFAULT_CREDIT_TERMS_DAYS = 30

const EM_DASH = '—'

function formatZarLabel(amount: number): string {
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(amount)
}

function formatPickupLabel(iso: string | null | undefined): string {
	if (iso == null || iso === '') return EM_DASH
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return EM_DASH
	return new Intl.DateTimeFormat('en-ZA', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(d)
}

type TripLink = {
	sort_order: number | null
	trips: TripNested | TripNested[] | null
}

type TripNested = {
	id?: string
	time_start_estimate?: string | null
	time_end_estimate?: string | null
	chauffeur_id?: string | null
	vehicles?: VehicleNested | VehicleNested[] | null
}

type VehicleNested = {
	name?: string | null
	vehicle_categories?: { name?: string | null } | { name?: string | null }[] | null
}

function asArray<T>(v: T | T[] | null | undefined): T[] {
	if (v == null) return []
	return Array.isArray(v) ? v : [v]
}

function firstTripFromBooking(booking: { booking_trips?: unknown }): TripNested | null {
	const raw = booking.booking_trips
	const links = asArray<TripLink>(raw as TripLink[] | TripLink | null)
	if (links.length === 0) return null
	const sorted = [...links].sort((a, b) => {
		const sa = typeof a.sort_order === 'number' ? a.sort_order : 0
		const sb = typeof b.sort_order === 'number' ? b.sort_order : 0
		return sa - sb
	})
	for (const link of sorted) {
		const t = link.trips
		const trip = Array.isArray(t) ? t[0] : t
		if (trip && typeof trip === 'object') {
			return trip as TripNested
		}
	}
	return null
}

function vehicleNameFromTrip(trip: TripNested | null): string {
	if (!trip) return EM_DASH
	const vRaw = trip.vehicles
	const v = Array.isArray(vRaw) ? vRaw[0] : vRaw
	if (!v || typeof v !== 'object') return EM_DASH
	const n = (v as VehicleNested).name
	return typeof n === 'string' && n.trim() !== '' ? n.trim() : EM_DASH
}

function tryMintRiderTrackingAbsoluteUrl(trip: TripNested | null): string | null {
	const tid = trip && typeof trip.id === 'string' && trip.id.length > 0 ? trip.id : null
	const end =
		trip &&
		typeof trip.time_end_estimate === 'string' &&
		trip.time_end_estimate.trim() !== '' &&
		!Number.isNaN(new Date(trip.time_end_estimate).getTime())
			? trip.time_end_estimate
			: null
	if (!tid || !end) {
		return null
	}
	try {
		const exp = riderTrackTokenExpMsFromTripEndEstimateIso(end)
		const token = signRiderTrackToken({ trip_id: tid, purpose: 'rider_track', exp })
		return absoluteUrl(`/track/${token}`)
	} catch {
		return null
	}
}

function vehicleCategoryFromTrip(trip: TripNested | null): string {
	if (!trip) return EM_DASH
	const vRaw = trip.vehicles
	const v = Array.isArray(vRaw) ? vRaw[0] : vRaw
	if (!v || typeof v !== 'object') return EM_DASH
	const cRaw = (v as VehicleNested).vehicle_categories
	const c = Array.isArray(cRaw) ? cRaw[0] : cRaw
	if (!c || typeof c !== 'object') return EM_DASH
	const n = (c as { name?: string | null }).name
	return typeof n === 'string' && n.trim() !== '' ? n.trim() : EM_DASH
}

function resolveCreditTermsDays(
	accountSnapshot: unknown,
	accountRow: { credit_terms_days?: number } | null,
): number {
	const snap = accountSnapshot as AccountSnapshotJsonDb | null
	if (snap && typeof snap.credit_terms_days === 'number' && Number.isFinite(snap.credit_terms_days)) {
		return Math.max(0, Math.floor(snap.credit_terms_days))
	}
	if (
		accountRow &&
		typeof accountRow.credit_terms_days === 'number' &&
		Number.isFinite(accountRow.credit_terms_days)
	) {
		return Math.max(0, Math.floor(accountRow.credit_terms_days))
	}
	return DEFAULT_CREDIT_TERMS_DAYS
}

export type BookingForTripConfirmationEmail = {
	id: string
	payment_reference: string | number | null
	pickup_datetime: string | null
	origin_name: string | null
	destination_name: string | null
	customer_name: string | null
	rider_name?: string | null
	rider_email?: string | null
	rider_phone?: string | null
	account_snapshot: unknown | null
	customer_account_id: string | null
	booking_trips?: unknown
}

/** Supabase embed row for `sendBookingQuote` template assembly (+ recipient resolution fields). */
export type BookingTripConfirmationSendRow = BookingForTripConfirmationEmail & {
	client_type: unknown
	customer_email: string | null
	customer_id: string | null
}

/**
 * Loads chauffeur display name from the primary linked trip (by `booking_trips.sort_order`).
 */
export async function loadChauffeurNameForBookingTrips(
	supabase: SupabaseClient,
	booking: BookingForTripConfirmationEmail,
): Promise<string> {
	const trip = firstTripFromBooking(booking)
	const cid =
		trip && typeof trip.chauffeur_id === 'string' && trip.chauffeur_id.length > 0
			? trip.chauffeur_id
			: null
	if (!cid) return EM_DASH
	const { data: profile, error } = await supabase
		.from('profiles')
		.select('full_name')
		.eq('id', cid)
		.maybeSingle()
	if (error || !profile) return EM_DASH
	const name = typeof profile.full_name === 'string' ? profile.full_name.trim() : ''
	return name !== '' ? name : EM_DASH
}

export async function buildAccountTripConfirmationProps(params: {
	supabase: SupabaseClient
	booking: BookingForTripConfirmationEmail
	lineItemsRaw: unknown
	totalZar: number
	accountRow: { credit_terms_days?: number } | null
}): Promise<AccountTripConfirmationProps> {
	const { supabase, booking, lineItemsRaw, totalZar, accountRow } = params
	const parsedItems = parseBookingQuoteLineItems(lineItemsRaw)
	const lineItems: BookingQuoteLineItem[] = parsedItems ?? []

	const trip = firstTripFromBooking(booking)
	const driverFullNameResolved = await loadChauffeurNameForBookingTrips(supabase, booking)

	const snapName =
		booking.account_snapshot &&
		typeof booking.account_snapshot === 'object' &&
		!Array.isArray(booking.account_snapshot)
			? (booking.account_snapshot as AccountSnapshotJsonDb).name
			: undefined

	const customerNameRaw =
		(typeof booking.customer_name === 'string' && booking.customer_name.trim() !== ''
			? booking.customer_name.trim()
			: null) ??
		(typeof snapName === 'string' && snapName.trim() !== '' ? snapName.trim() : null)

	const customerName = customerNameRaw ?? 'Customer'

	let bookingReference = ''
	if (booking.payment_reference != null && String(booking.payment_reference).trim() !== '') {
		bookingReference = String(booking.payment_reference).trim()
	} else {
		bookingReference = booking.id
	}

	const pickupIso =
		(booking.pickup_datetime && booking.pickup_datetime !== ''
			? booking.pickup_datetime
			: null) ??
		(trip && typeof trip.time_start_estimate === 'string' ? trip.time_start_estimate : null)

	const pickupDateTimeLabel = formatPickupLabel(pickupIso)

	const originLabel =
		typeof booking.origin_name === 'string' && booking.origin_name.trim() !== ''
			? booking.origin_name.trim()
			: EM_DASH
	const destinationLabel =
		typeof booking.destination_name === 'string' && booking.destination_name.trim() !== ''
			? booking.destination_name.trim()
			: EM_DASH

	const creditTermsDays = resolveCreditTermsDays(booking.account_snapshot, accountRow)

	const riderTrackingUrl = tryMintRiderTrackingAbsoluteUrl(trip)
	const riderEmailForCopy =
		typeof booking.rider_email === 'string' && booking.rider_email.trim() !== ''
			? booking.rider_email.trim()
			: null

	const base: AccountTripConfirmationProps = {
		customerName,
		bookingReference,
		pickupDateTimeLabel,
		originLabel,
		destinationLabel,
		vehicleName: vehicleNameFromTrip(trip),
		vehicleCategoryLabel: vehicleCategoryFromTrip(trip),
		driverFullName: driverFullNameResolved,
		totalZarLabel: formatZarLabel(totalZar),
		lineItems,
		creditTermsDays,
		cancellationSnippet: ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
		supportContactLine: resolveSupportContactLine(),
	}
	if (!riderTrackingUrl) {
		return base
	}
	return {
		...base,
		riderTrackingUrl,
		...(riderEmailForCopy ? { riderEmailForCopy } : {}),
	}
}
