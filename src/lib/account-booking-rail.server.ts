import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import {
	extractTripServiceTypeForDetail,
	type AccountPortalBookingDetailRow,
	loadAccountPortalBookingDetail,
} from '@/lib/account-booking-detail'
import type { AccountBookingRailDetail, AccountBookingTimelineItem } from '@/lib/account-booking-rail-types'
import { buildAccountBookingStaticMapUrl, type AccountBookingMapPoints } from '@/lib/google-static-map-url.server'

export type { AccountBookingRailDetail, AccountBookingTimelineItem } from '@/lib/account-booking-rail-types'

function hasFiniteLatLng(
	a: number | null | undefined,
	b: number | null | undefined,
): a is number {
	return a != null && b != null && Number.isFinite(a) && Number.isFinite(b)
}

function buildMapPoints(b: AccountPortalBookingDetailRow): AccountBookingMapPoints | null {
	if (!hasFiniteLatLng(b.origin_latitude, b.origin_longitude)) return null
	if (!hasFiniteLatLng(b.destination_latitude, b.destination_longitude)) return null
	return {
		origin: { lat: b.origin_latitude as number, lng: b.origin_longitude as number },
		destination: { lat: b.destination_latitude as number, lng: b.destination_longitude as number },
	}
}

function firstTripChauffeur(
	booking_trips: unknown,
): { assigned: boolean; chauffeurId: string | null } {
	type Row = { sort_order?: number | null; trips?: { chauffeur_id?: string | null; status?: string | null } | null }
	const raw = booking_trips
	const rows: Row[] = Array.isArray(raw) ? (raw as Row[]) : raw ? [raw as Row] : []
	const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
	const t = sorted[0]?.trips
	const id = t && typeof t === 'object' && t ? (t.chauffeur_id ?? null) : null
	return { assigned: typeof id === 'string' && id.length > 0, chauffeurId: id }
}

export async function loadAccountBookingDetailForRail(
	supabase: SupabaseClient,
	bookingId: string,
	activeAccountId: string,
): Promise<AccountBookingRailDetail | null> {
	const loaded = await loadAccountPortalBookingDetail(supabase, bookingId, activeAccountId)
	if (!loaded) return null

	const { booking, quote } = loaded
	const serviceType = extractTripServiceTypeForDetail(booking.booking_trips)
	const tripState = firstTripChauffeur(booking.booking_trips)
	const mapPts = buildMapPoints(booking)
	const staticMapUrl = mapPts ? buildAccountBookingStaticMapUrl(mapPts) : null

	const timeline: AccountBookingTimelineItem[] = []

	timeline.push({
		at: booking.created_at,
		kind: 'created',
		label: accountBookingsCopy.timelineCreated,
	})

	const { data: quoteRows } = await supabase
		.from('booking_quotes')
		.select('id, version, status, sent_at, accepted_at, rejected_at, superseded_at, created_at')
		.eq('booking_id', bookingId)
		.order('version', { ascending: true })

	for (const q of quoteRows ?? []) {
		const row = q as {
			version: number
			sent_at: string | null
			accepted_at: string | null
			rejected_at: string | null
			superseded_at: string | null
			status: string
			created_at: string
		}
		if (row.sent_at) {
			timeline.push({
				at: row.sent_at,
				kind: 'quote_sent',
				label: accountBookingsCopy.timelineQuoteSent(row.version ?? 0),
			})
		}
		if (row.accepted_at) {
			timeline.push({
				at: row.accepted_at,
				kind: 'quote_accepted',
				label: accountBookingsCopy.timelineQuoteAccepted(row.version ?? 0),
			})
		}
		if (row.rejected_at) {
			timeline.push({
				at: row.rejected_at,
				kind: 'quote_rejected',
				label: accountBookingsCopy.timelineQuoteRejected(row.version ?? 0),
			})
		}
	}

	timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

	const driver = {
		assigned: tripState.assigned,
		displayName: tripState.assigned ? accountBookingsCopy.detailDriverMaskName : null,
		avatarUrl: null,
	}

	const receiptQuoteId = quote?.id ?? booking.current_quote_id

	return {
		booking,
		quote,
		staticMapUrl,
		timeline,
		trip: {
			serviceType,
			chauffeurAssigned: tripState.assigned,
			vehicleClassLabel: serviceType,
		},
		driver,
		receiptQuoteId: typeof receiptQuoteId === 'string' && receiptQuoteId ? receiptQuoteId : null,
	}
}
