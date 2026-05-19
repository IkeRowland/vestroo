import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import type { AccountBookingTimelineItem } from '@/lib/account-booking-rail-types'
import { tripCompletedAtIsoFromBookingTripsEmbed } from '@/lib/ops-invoicing-queue'

const BOOKING_CONFIRMED_TO_STATUSES = new Set([
	'assigned',
	'in_progress',
	'completed',
	'ready_to_invoice',
	'invoiced',
	'paid',
	'paid_invoice',
	'ready_to_assign',
])

type StatusHistoryEntry = { at: string; from: string; to: string }

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null
}

function parseStatusHistory(raw: unknown): StatusHistoryEntry[] {
	if (!Array.isArray(raw)) return []
	const out: StatusHistoryEntry[] = []
	for (const entry of raw) {
		if (!isRecord(entry)) continue
		const at = entry.at
		const from = entry.from
		const to = entry.to
		if (typeof at !== 'string' || typeof from !== 'string' || typeof to !== 'string') continue
		out.push({ at, from, to })
	}
	return out
}

function firstHistoryAt(
	history: StatusHistoryEntry[],
	pred: (e: StatusHistoryEntry) => boolean,
): string | null {
	for (const e of history) {
		if (pred(e)) return e.at
	}
	return null
}

/** Earliest linked trip `en_route` transition from `trips.status_history`. */
export function tripStartedAtIsoFromBookingTripsEmbed(bookingTrips: unknown): string | null {
	if (!Array.isArray(bookingTrips) || bookingTrips.length === 0) {
		return null
	}
	let bestMs = Infinity
	let bestIso: string | null = null

	for (const link of bookingTrips) {
		if (!isRecord(link)) continue
		const rawTrips = link.trips
		const tripObj = Array.isArray(rawTrips) ? rawTrips[0] : rawTrips
		if (!isRecord(tripObj)) continue

		const hist = tripObj.status_history
		if (Array.isArray(hist)) {
			for (const entry of hist) {
				if (!isRecord(entry)) continue
				if (entry.to !== 'en_route') continue
				const at = entry.at
				if (typeof at !== 'string') continue
				const ms = Date.parse(at)
				if (!Number.isNaN(ms) && ms < bestMs) {
					bestMs = ms
					bestIso = at
				}
			}
		}
	}

	return bestIso
}

export function buildAccountPortalLifecycleTimelineItems(args: {
	createdAt: string
	statusHistory: unknown
	bookingTrips: unknown
}): AccountBookingTimelineItem[] {
	const items: AccountBookingTimelineItem[] = []

	items.push({
		at: args.createdAt,
		kind: 'created',
		label: accountBookingsCopy.timelineCreated,
	})

	const bookingHist = parseStatusHistory(args.statusHistory)
	const confirmedAt =
		firstHistoryAt(
			bookingHist,
			(e) => e.from === 'pending_confirmation' && BOOKING_CONFIRMED_TO_STATUSES.has(e.to),
		) ?? firstHistoryAt(bookingHist, (e) => e.to === 'assigned')

	if (confirmedAt) {
		items.push({
			at: confirmedAt,
			kind: 'booking_confirmed',
			label: accountBookingsCopy.timelineBookingConfirmed,
		})
	}

	const startedAt = tripStartedAtIsoFromBookingTripsEmbed(args.bookingTrips)
	if (startedAt) {
		items.push({
			at: startedAt,
			kind: 'trip_started',
			label: accountBookingsCopy.timelineTripStarted,
		})
	}

	const completedAt = tripCompletedAtIsoFromBookingTripsEmbed(args.bookingTrips)
	if (completedAt) {
		items.push({
			at: completedAt,
			kind: 'trip_completed',
			label: accountBookingsCopy.timelineTripCompleted,
		})
	}

	return items
}
