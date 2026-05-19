/**
 * URL contract for **`/ops/calendar`** (Story 17.14 / FE.17.9, FE.17.12 rollout item 7).
 * **`week`:** ISO **`YYYY-MM-DD`** for **any** day in the week — normalized server-side to **Monday** (local) week start (**`view=week`** default, **`view=list`**).
 * **`month`:** **`YYYY-MM`** — calendar month when **`view=month`**.
 * **`id`:** optional selected trip / event UUID (**`trips.id`**).
 * **`view`:** **`list`** agenda · **`month`** month grid · absent / other → **week** grid.
 */
export const OPS_CALENDAR_PATH = '/ops/calendar' as const

export type OpsCalendarPageView = 'week' | 'list' | 'month'

export function firstSearchParam(
	raw: Record<string, string | string[] | undefined>,
	key: string,
): string | undefined {
	const v = raw[key]
	const s = Array.isArray(v) ? v[0] : v
	const t = (s ?? '').trim()
	return t.length > 0 ? t : undefined
}

/** Parse **`YYYY-MM-DD`** as **local** midnight (caller must validate format first). */
export function parseYmdToLocalDate(ymd: string): Date {
	const [ys, ms, ds] = ymd.split('-').map(Number)
	return new Date(ys, ms - 1, ds)
}

/** Local civil date → `YYYY-MM-DD` (no UTC shift). */
export function formatYmdLocal(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}

/**
 * Monday 00:00 local for the ISO week containing **`from`** (FE.17.9: week starts Monday).
 */
export function startOfWeekMondayLocal(from: Date): Date {
	const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
	const offset = (d.getDay() + 6) % 7
	d.setDate(d.getDate() - offset)
	d.setHours(0, 0, 0, 0)
	return d
}

/** Add whole days in local civil calendar. */
export function addDaysLocal(d: Date, days: number): Date {
	const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days)
	x.setHours(0, 0, 0, 0)
	return x
}

/**
 * Parse **`week`** query (`YYYY-MM-DD`). Returns **`null`** if missing.
 * Invalid calendar strings return **`null`** (caller may redirect).
 */
export function parseWeekQueryYmd(raw: string | undefined): string | null {
	if (!raw) return null
	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
	const [ys, ms, ds] = raw.split('-').map(Number)
	const d = new Date(ys, ms - 1, ds)
	if (d.getFullYear() !== ys || d.getMonth() !== ms - 1 || d.getDate() !== ds) return null
	return formatYmdLocal(d)
}

/** Week start Monday **`YYYY-MM-DD`** from URL (or **`null`**). */
export function getWeekStartYmdFromSearchParams(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const w = firstSearchParam(raw, 'week')
	return parseWeekQueryYmd(w)
}

/** First local day of **`YYYY-MM`** (validated **`monthYm`**). */
export function parseYmToFirstDay(ym: string): Date {
	const [ys, ms] = ym.split('-').map(Number)
	return new Date(ys, ms - 1, 1, 0, 0, 0, 0)
}

/** Monday on or before **`monthFirst`** (local), for **FE.17.9** month grids. */
export function monthGridStartMondayLocal(monthFirst: Date): Date {
	const offset = (monthFirst.getDay() + 6) % 7
	const d = new Date(monthFirst.getFullYear(), monthFirst.getMonth(), monthFirst.getDate())
	d.setDate(d.getDate() - offset)
	d.setHours(0, 0, 0, 0)
	return d
}

/** Local **42-day** month grid → UTC **ISO** range for **`time_start_estimate`** windowing. */
export function opsCalendarMonthGridUtcRange(monthYm: string): { startIso: string; endIso: string } {
	const monthFirst = parseYmToFirstDay(monthYm)
	const gridStart = monthGridStartMondayLocal(monthFirst)
	const gridEndExclusive = addDaysLocal(gridStart, 42)
	const startIso = new Date(
		gridStart.getFullYear(),
		gridStart.getMonth(),
		gridStart.getDate(),
		0,
		0,
		0,
		0,
	).toISOString()
	const endIso = new Date(
		gridEndExclusive.getFullYear(),
		gridEndExclusive.getMonth(),
		gridEndExclusive.getDate(),
		0,
		0,
		0,
		0,
	).toISOString()
	return { startIso, endIso }
}

export function getRawCalendarWeekParam(
	raw: Record<string, string | string[] | undefined>,
): string | undefined {
	return firstSearchParam(raw, 'week')
}

export function getRawCalendarMonthParam(
	raw: Record<string, string | string[] | undefined>,
): string | undefined {
	return firstSearchParam(raw, 'month')
}

export function getRawOpsCalendarEventId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const id = firstSearchParam(raw, 'id')
	return id ?? null
}

export function parseOpsCalendarPageView(
	raw: Record<string, string | string[] | undefined>,
): OpsCalendarPageView {
	const v = firstSearchParam(raw, 'view')
	if (v === 'list') return 'list'
	if (v === 'month') return 'month'
	return 'week'
}

export function parseOpsCalendarSelectedEventId(
	raw: Record<string, string | string[] | undefined>,
	knownTripIds: ReadonlySet<string>,
): string | null {
	const rawId = getRawOpsCalendarEventId(raw)
	if (!rawId) return null
	return knownTripIds.has(rawId) ? rawId : null
}

export function buildOpsCalendarHref(state: {
	weekStartYmd: string
	monthYm: string
	eventId: string | null
	view: OpsCalendarPageView
}): string {
	const params = new URLSearchParams()
	if (state.view === 'month') {
		params.set('view', 'month')
		params.set('month', state.monthYm)
	} else {
		params.set('week', state.weekStartYmd)
		if (state.view === 'list') {
			params.set('view', 'list')
		}
	}
	if (state.eventId) {
		params.set('id', state.eventId)
	}
	const q = params.toString()
	return q ? `${OPS_CALENDAR_PATH}?${q}` : OPS_CALENDAR_PATH
}
