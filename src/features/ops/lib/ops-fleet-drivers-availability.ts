import { normalizeOpsStatusKey } from '@/features/ops/ops-status-pill-tones'

/** Driver profile active vs inactive — maps to **Shift status** on fleet drivers UI. */
export type FleetDriverShiftStatus = 'active' | 'inactive'

/** Trip column: in-window busy vs idle, or unavailable when shift is inactive. */
export type FleetDriverTripStatus = 'idle' | 'busy' | 'unavailable'

const TERMINAL_TRIP = new Set(['cancelled', 'completed'])

export function fleetDriverShiftFromProfile(profileStatus: string): FleetDriverShiftStatus {
	return normalizeOpsStatusKey(profileStatus) === 'active' ? 'active' : 'inactive'
}

export function fleetDriverTripStatus(
	shift: FleetDriverShiftStatus,
	inAssignedTripWindow: boolean,
): FleetDriverTripStatus {
	if (shift === 'inactive') return 'unavailable'
	if (inAssignedTripWindow) return 'busy'
	return 'idle'
}

/** Keys on **`getOpsStatusPillTone`** for fleet drivers **Trip status** column. */
export function fleetDriverTripStatusPillKey(status: FleetDriverTripStatus): string {
	switch (status) {
		case 'idle':
			return 'fleet_drivers_trip_idle'
		case 'busy':
			return 'fleet_drivers_trip_busy'
		case 'unavailable':
			return 'fleet_drivers_trip_unavailable'
	}
}

/** Keys on **`getOpsStatusPillTone`** for fleet drivers **Shift status** column. */
export function fleetDriverShiftStatusPillKey(status: FleetDriverShiftStatus): string {
	return status === 'active' ? 'fleet_drivers_shift_active' : 'fleet_drivers_shift_inactive'
}

export type FleetDriverTripStatusSourceRow = {
	status: string | null
	chauffeur_id: string | null
	time_start_estimate: string | null
	time_end_estimate: string | null
	ops_revised_time_end_estimate?: string | null
}

function effectiveTripEndIso(row: FleetDriverTripStatusSourceRow): string | null {
	const revised = row.ops_revised_time_end_estimate
	if (typeof revised === 'string' && revised.trim().length > 0) return revised
	const end = row.time_end_estimate
	if (typeof end === 'string' && end.trim().length > 0) return end
	return null
}

/**
 * Whether **`nowMs`** falls in **[start, end)** for a non-terminal trip assigned to a driver.
 * Rows without parseable window are ignored.
 */
export function fleetTripRowCoversNow(row: FleetDriverTripStatusSourceRow, nowMs: number): boolean {
	const cid = row.chauffeur_id
	if (!cid) return false
	const st = String(row.status ?? '').toLowerCase()
	if (TERMINAL_TRIP.has(st)) return false
	const startIso = row.time_start_estimate
	if (!startIso || !startIso.trim()) return false
	const endIso = effectiveTripEndIso(row)
	if (!endIso) return false
	const start = new Date(startIso).getTime()
	const end = new Date(endIso).getTime()
	if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false
	return nowMs >= start && nowMs < end
}

/** Per-driver: **true** if any qualifying trip window covers **`nowMs`**. */
export function fleetDriverInTripWindowById(
	rows: readonly FleetDriverTripStatusSourceRow[],
	nowMs: number,
): Record<string, boolean> {
	const out: Record<string, boolean> = {}
	for (const row of rows) {
		const id = row.chauffeur_id
		if (!id || !fleetTripRowCoversNow(row, nowMs)) continue
		out[id] = true
	}
	return out
}
