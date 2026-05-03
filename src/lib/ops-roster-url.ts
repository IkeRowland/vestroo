/**
 * URL contract for **`/ops/roster`** (Story 17.15 / FE.17.9, FE.17.12 rollout item 8).
 * **`week`:** **`YYYY-MM-DD`** (any day in week → server normalizes to **Monday** local) — used when **`view=week`** (default).
 * **`month`:** **`YYYY-MM`** — calendar month anchor when **`view=month`**.
 * **`view`:** **`month`** | **`week`** (default).
 * **`driver`:** optional **`profiles.id`** (ops driver) for rail focus.
 * **`shift`:** optional **`chauffeur_schedules.id`** — disambiguated from **`driver`** (**NFR.17.6** / clarity vs **`/ops/calendar`** **`?id=`** trip).
 */
import {
	firstSearchParam,
	formatYmdLocal,
	parseWeekQueryYmd,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'

export const OPS_ROSTER_PATH = '/ops/roster' as const

export type OpsRosterPageView = 'week' | 'month'

export function parseOpsRosterPageView(
	raw: Record<string, string | string[] | undefined>,
): OpsRosterPageView {
	return firstSearchParam(raw, 'view') === 'month' ? 'month' : 'week'
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

/** First local day of **`YYYY-MM`**. */
export function parseYmToFirstDay(ym: string): Date {
	const [ys, ms] = ym.split('-').map(Number)
	return new Date(ys, ms - 1, 1, 0, 0, 0, 0)
}

/** Exclusive end of month (first of next month). */
export function endOfMonthExclusive(ym: string): Date {
	const d = parseYmToFirstDay(ym)
	return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0)
}

export function addMonthsYm(ym: string, delta: number): string {
	const d = parseYmToFirstDay(ym)
	return formatMonthYmFromDate(new Date(d.getFullYear(), d.getMonth() + delta, 1))
}

export function getRawRosterWeekParam(
	raw: Record<string, string | string[] | undefined>,
): string | undefined {
	return firstSearchParam(raw, 'week')
}

export function getRawRosterMonthParam(
	raw: Record<string, string | string[] | undefined>,
): string | undefined {
	return firstSearchParam(raw, 'month')
}

export function getRawRosterDriverId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const d = firstSearchParam(raw, 'driver')
	return d ?? null
}

export function getRawRosterShiftId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const s = firstSearchParam(raw, 'shift')
	return s ?? null
}

export function buildOpsRosterHref(state: {
	view: OpsRosterPageView
	weekStartYmd: string
	monthYm: string
	driverId: string | null
	shiftId: string | null
}): string {
	const params = new URLSearchParams()
	params.set('view', state.view)
	if (state.view === 'month') {
		params.set('month', state.monthYm)
	} else {
		params.set('week', state.weekStartYmd)
	}
	if (state.driverId) {
		params.set('driver', state.driverId)
	}
	if (state.shiftId) {
		params.set('shift', state.shiftId)
	}
	const q = params.toString()
	return q ? `${OPS_ROSTER_PATH}?${q}` : OPS_ROSTER_PATH
}

/** Canonical **`week`** Monday from query or **`null`** if absent. */
export function rosterWeekStartYmdFromRaw(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const w = getRawRosterWeekParam(raw)
	if (!w) return null
	return parseWeekQueryYmd(w)
}

/**
 * Resolves **`weekStartYmd`** for roster week view: **`week`** query (normalized Monday) or **this week**.
 */
export function resolveRosterWeekStartYmd(raw: Record<string, string | string[] | undefined>): string {
	const parsed = rosterWeekStartYmdFromRaw(raw)
	if (!parsed) {
		return formatYmdLocal(startOfWeekMondayLocal(new Date()))
	}
	return formatYmdLocal(startOfWeekMondayLocal(parseYmdToLocalDate(parsed)))
}

export function resolveRosterMonthYm(raw: Record<string, string | string[] | undefined>): string {
	const m = parseMonthYm(getRawRosterMonthParam(raw) ?? '')
	if (m) return m
	return formatMonthYmFromDate(new Date())
}
