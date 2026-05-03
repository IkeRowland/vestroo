import type { TripFulfilmentStatusDb } from '@/types/database.types'

export type RiderTrackMilestoneUi = {
	key: string
	title: string
	state: 'past' | 'current' | 'future' | 'cancelled'
	timestampLabel: string | null
	subline: string | null
}

const MILESTONE_DEFS = [
	{ key: 'booking_confirmed', title: 'Booking confirmed' },
	{ key: 'driver_assigned', title: 'Driver assigned' },
	{ key: 'driver_en_route', title: 'Driver en route' },
	{ key: 'driver_arrived', title: 'Driver arrived' },
	{ key: 'trip_completed', title: 'Trip completed' },
] as const

function formatEnZaShort(iso: string | null | undefined): string | null {
	if (iso == null || iso === '') return null
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return null
	return new Intl.DateTimeFormat('en-ZA', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(d)
}

function normalizeStatus(raw: string): TripFulfilmentStatusDb {
	if (
		raw === 'booking' ||
		raw === 'assigned' ||
		raw === 'en_route' ||
		raw === 'completed' ||
		raw === 'cancelled'
	) {
		return raw
	}
	return 'booking'
}

/**
 * Maps DB fulfilment status to a five-step rider timeline.
 * **`arrived`** is not a DB column — “Driver arrived” is satisfied when the trip is **completed**, using **`time_end_estimate`** as the rider-visible timestamp (see story Progress Notes).
 */
export function deriveRiderTrackMilestones(input: {
	status: string
	createdAtIso: string | null | undefined
	timeStartEstimateIso: string | null | undefined
	timeEndEstimateIso: string | null | undefined
}): RiderTrackMilestoneUi[] {
	const status = normalizeStatus(input.status)
	const created = formatEnZaShort(input.createdAtIso)
	const start = formatEnZaShort(input.timeStartEstimateIso)
	const end = formatEnZaShort(input.timeEndEstimateIso)

	if (status === 'cancelled') {
		return MILESTONE_DEFS.map((d, i) => ({
			key: d.key,
			title: d.title,
			state: 'cancelled' as const,
			timestampLabel: i === 0 ? created : null,
			subline: i === 0 ? 'This trip was cancelled.' : null,
		}))
	}

	let activeIndex: number
	const allPast = status === 'completed'
	if (status === 'booking') activeIndex = 0
	else if (status === 'assigned') activeIndex = 1
	else if (status === 'en_route') activeIndex = 2
	else if (status === 'completed') activeIndex = 4
	else activeIndex = 0

	return MILESTONE_DEFS.map((d, i) => {
		let state: RiderTrackMilestoneUi['state']
		if (allPast) {
			state = 'past'
		} else if (i < activeIndex) {
			state = 'past'
		} else if (i === activeIndex) {
			state = 'current'
		} else {
			state = 'future'
		}

		let timestampLabel: string | null = null
		let subline: string | null = null

		if (i === 0) timestampLabel = created
		if (i === 1 && state !== 'future') {
			timestampLabel = status === 'booking' ? null : created
		}
		if (i === 2) {
			if (input.timeStartEstimateIso && (state === 'current' || state === 'past')) {
				timestampLabel = start
			}
			if (status === 'en_route' && state === 'current' && start) {
				subline = `Pickup from approximately ${start}`
			}
		}
		if (i === 3 && status === 'completed') {
			timestampLabel = end
		}
		if (i === 4 && status === 'completed') {
			timestampLabel = end
		}

		return {
			key: d.key,
			title: d.title,
			state,
			timestampLabel,
			subline,
		}
	})
}
