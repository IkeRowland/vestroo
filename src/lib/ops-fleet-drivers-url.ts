/**
 * URL contract for fleet **Drivers** tab at **`/ops/fleet/drivers`** (Story 17.15 / FE.17.9, FE.17.12 rollout item 8).
 * **`week`:** **`YYYY-MM-DD`** (any day in week → server normalizes to **Monday** local) — used when **`view=week`** (default).
 * **`month`:** **`YYYY-MM`** — calendar month anchor when **`view=month`**.
 * **`view`:** **`month`** | **`week`** (default) — calendar range.
 * **`driversView`:** **`grid`** shows driver cards; absent / other → **list** (table), like **`/ops/fleet/vehicles`**.
 * **`driver`:** optional **`profiles.id`** (ops driver) for rail focus.
 * **`id`:** optional selected **`trips.id`** (same query key as **`/ops/calendar`**).
 * **`driverEdit`:** optional **`1`** — open the edit form once.
 * **`driverArchive`:** optional **`1`** — open the archive confirmation once.
 */
import {
	firstSearchParam,
	formatYmdLocal,
	parseWeekQueryYmd,
	parseYmToFirstDay,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'

export const OPS_FLEET_DRIVERS_PATH = '/ops/fleet/drivers' as const

export type OpsFleetDriversPageView = 'week' | 'month'

export type OpsFleetDriversLayout = 'list' | 'grid'

export function parseOpsFleetDriversPageView(
	raw: Record<string, string | string[] | undefined>,
): OpsFleetDriversPageView {
	return firstSearchParam(raw, 'view') === 'month' ? 'month' : 'week'
}

export function parseOpsFleetDriversLayout(
	raw: Record<string, string | string[] | undefined>,
): OpsFleetDriversLayout {
	return firstSearchParam(raw, 'driversView') === 'grid' ? 'grid' : 'list'
}

/** `YYYY-MM` or **`null`** if missing/invalid. */
export function parseMonthYm(raw: string | undefined): string | null {
	if (!raw) return null
	if (!/^\d{4}-\d{2}$/.test(raw)) return null
	const [y, m] = raw.split('-').map(Number)
	if (m < 1 || m > 12) return null
	const d = new Date(y, m - 1, 1)
	if (d.getFullYear() !== y || d.getMonth() !== m - 1) return null
	return `${y}-${String(m).padStart(2, '0')}`
}

export function formatMonthYmFromDate(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Re-export for **`parseYmToFirstDay`** consumers that import from **`ops-fleet-drivers-url`**. */
export { parseYmToFirstDay } from '@/lib/ops-calendar-url'

/** Exclusive end of month (first of next month). */
export function endOfMonthExclusive(ym: string): Date {
	const d = parseYmToFirstDay(ym)
	return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0)
}

export function addMonthsYm(ym: string, delta: number): string {
	const d = parseYmToFirstDay(ym)
	return formatMonthYmFromDate(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

export function getRawFleetDriversWeekParam(
	raw: Record<string, string | string[] | undefined>,
): string | undefined {
	return firstSearchParam(raw, 'week')
}

export function getRawFleetDriversMonthParam(
	raw: Record<string, string | string[] | undefined>,
): string | undefined {
	return firstSearchParam(raw, 'month')
}

export function getRawFleetDriversDriverId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const d = firstSearchParam(raw, 'driver')
	return d ?? null
}

/** Selected **`trips.id`** (same param as **`/ops/calendar`** **`?id=`**). */
export function getRawFleetDriversTripId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const s = firstSearchParam(raw, 'id')
	return s ?? null
}

/** @deprecated Legacy **`?shift=`** (**`chauffeur_schedules`**) — stripped by drivers page redirect. */
export function getRawFleetDriversShiftId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const s = firstSearchParam(raw, 'shift')
	return s ?? null
}

export function parseFleetDriversDriverEditFlag(
	raw: Record<string, string | string[] | undefined>,
): boolean {
	return firstSearchParam(raw, 'driverEdit') === '1'
}

export function parseFleetDriversDriverArchiveFlag(
	raw: Record<string, string | string[] | undefined>,
): boolean {
	return firstSearchParam(raw, 'driverArchive') === '1'
}

export function buildOpsFleetDriversHref(state: {
	view: OpsFleetDriversPageView
	weekStartYmd: string
	monthYm: string
	driverId: string | null
	tripId: string | null
	driversView?: OpsFleetDriversLayout
	/** When true and **`driverId`** is set, adds **`driverEdit=1`**. */
	driverEdit?: boolean
	/** When true and **`driverId`** is set, adds **`driverArchive=1`**. */
	driverArchive?: boolean
}): string {
	const params = new URLSearchParams()
	params.set('view', state.view)
	if (state.view === 'month') {
		params.set('month', state.monthYm)
	} else {
		params.set('week', state.weekStartYmd)
	}
	const driversLayout = state.driversView ?? 'list'
	if (driversLayout === 'grid') {
		params.set('driversView', 'grid')
	}
	if (state.driverId) {
		params.set('driver', state.driverId)
		if (state.driverEdit) {
			params.set('driverEdit', '1')
		}
		if (state.driverArchive) {
			params.set('driverArchive', '1')
		}
	}
	if (state.tripId) {
		params.set('id', state.tripId)
	}
	const q = params.toString()
	return q ? `${OPS_FLEET_DRIVERS_PATH}?${q}` : OPS_FLEET_DRIVERS_PATH
}

/** Canonical **`week`** Monday from query or **`null`** if absent. */
export function fleetDriversWeekStartYmdFromRaw(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const w = getRawFleetDriversWeekParam(raw)
	if (!w) return null
	return parseWeekQueryYmd(w)
}

/**
 * Resolves **`weekStartYmd`** for fleet drivers week view: **`week`** query (normalized Monday) or **this week**.
 */
export function resolveFleetDriversWeekStartYmd(
	raw: Record<string, string | string[] | undefined>,
): string {
	const parsed = fleetDriversWeekStartYmdFromRaw(raw)
	if (!parsed) {
		return formatYmdLocal(startOfWeekMondayLocal(new Date()))
	}
	return formatYmdLocal(startOfWeekMondayLocal(parseYmdToLocalDate(parsed)))
}

export function resolveFleetDriversMonthYm(
	raw: Record<string, string | string[] | undefined>,
): string {
	const m = parseMonthYm(getRawFleetDriversMonthParam(raw) ?? '')
	if (m) return m
	return formatMonthYmFromDate(new Date())
}
