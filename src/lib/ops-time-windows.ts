export type TimeWindow = {
	startMs: number
	endMs: number
}

export function parseIsoToMs(iso: string): number {
	const t = Date.parse(iso)
	if (Number.isNaN(t)) {
		throw new Error('Invalid ISO timestamp')
	}
	return t
}

export function rangesOverlap(a: TimeWindow, b: TimeWindow): boolean {
	return a.startMs < b.endMs && a.endMs > b.startMs
}

export type TripLike = {
	id: string
	vehicle_id: string
	time_start_estimate: string
	time_end_estimate: string
	status: string | null
}

const TERMINAL_TRIP_STATUSES = new Set(['cancelled', 'completed'])

export function tripTimeWindow(row: Pick<TripLike, 'time_start_estimate' | 'time_end_estimate'>): TimeWindow {
	return {
		startMs: parseIsoToMs(row.time_start_estimate),
		endMs: parseIsoToMs(row.time_end_estimate),
	}
}

export function findVehicleWindowConflicts<T extends TripLike>(
	trips: T[],
	vehicleId: string,
	candidate: TimeWindow,
	excludeTripId?: string,
): T[] {
	return trips.filter((row) => {
		if (row.vehicle_id !== vehicleId) return false
		if (excludeTripId && row.id === excludeTripId) return false
		const st = (row.status ?? '').toLowerCase()
		if (TERMINAL_TRIP_STATUSES.has(st)) return false
		return rangesOverlap(candidate, tripTimeWindow(row))
	})
}
