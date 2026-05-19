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

const ACCOUNT_BOOKING_CONFIRMED_STATUSES = new Set([
	'assigned',
	'in_progress',
	'completed',
	'ready_to_invoice',
	'invoiced',
	'paid',
	'paid_invoice',
])

function firstTripChauffeur(
	booking_trips: unknown,
): { assigned: boolean; chauffeurId: string | null; vehicleId: string | null } {
	type Row = {
		sort_order?: number | null
		trips?: {
			chauffeur_id?: string | null
			status?: string | null
			vehicle_id?: string | null
		} | null
	}
	const raw = booking_trips
	const rows: Row[] = Array.isArray(raw) ? (raw as Row[]) : raw ? [raw as Row] : []
	const sorted = [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
	const t = sorted[0]?.trips
	const id = t && typeof t === 'object' && t ? (t.chauffeur_id ?? null) : null
	const vid = t && typeof t === 'object' && t ? (t.vehicle_id ?? null) : null
	return {
		assigned: typeof id === 'string' && id.length > 0,
		chauffeurId: id,
		vehicleId: typeof vid === 'string' && vid.length > 0 ? vid : null,
	}
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
	const statusKey = String(booking.status ?? '').trim()
	/** Until ops confirms, do not show driver / fleet names even if a trip is pre-linked. */
	const portalAwaitingOpsConfirmation = statusKey === 'pending_confirmation'
	const showAssigneeDetails = ACCOUNT_BOOKING_CONFIRMED_STATUSES.has(statusKey) && tripState.assigned

	let chauffeurDisplayName: string | null = null
	let fleetVehicleName: string | null = null
	if (showAssigneeDetails && tripState.chauffeurId) {
		const [{ data: prof }, { data: veh }] = await Promise.all([
			supabase.from('profiles').select('full_name').eq('id', tripState.chauffeurId).maybeSingle(),
			tripState.vehicleId
				? supabase.from('vehicles').select('name').eq('id', tripState.vehicleId).maybeSingle()
				: Promise.resolve({ data: null } as const),
		])
		const fn = prof && typeof prof === 'object' && 'full_name' in prof ? String(prof.full_name ?? '').trim() : ''
		chauffeurDisplayName = fn.length > 0 ? fn : null
		const vn = veh && typeof veh === 'object' && 'name' in veh ? String(veh.name ?? '').trim() : ''
		fleetVehicleName = vn.length > 0 ? vn : null
	}

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

	const timelineForPortal = portalAwaitingOpsConfirmation
		? timeline.filter((t) => t.kind === 'created')
		: timeline

	const driver = {
		assigned: !portalAwaitingOpsConfirmation && showAssigneeDetails,
		displayName: portalAwaitingOpsConfirmation
			? null
			: showAssigneeDetails
				? chauffeurDisplayName ?? accountBookingsCopy.detailDriverMaskName
				: tripState.assigned
					? accountBookingsCopy.detailDriverMaskName
					: null,
		avatarUrl: null,
	}

	const baseReceiptId = quote?.id ?? booking.current_quote_id
	const receiptQuoteId =
		portalAwaitingOpsConfirmation || typeof baseReceiptId !== 'string' || !baseReceiptId ? null : baseReceiptId

	return {
		booking,
		quote,
		staticMapUrl,
		timeline: timelineForPortal,
		trip: {
			serviceType,
			chauffeurAssigned: tripState.assigned && !portalAwaitingOpsConfirmation,
			vehicleClassLabel: serviceType,
			assignedFleetVehicleName: fleetVehicleName,
		},
		driver,
		receiptQuoteId,
	}
}
