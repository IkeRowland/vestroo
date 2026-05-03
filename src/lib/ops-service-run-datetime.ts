/** Parse `HH:MM` / `H:MM` from `service_patterns.daily_*` columns. */
export function parseDailyHm(raw: string | null | undefined): { h: number; m: number } | null {
	if (raw == null || String(raw).trim() === '') {
		return null
	}
	const m = /^(\d{1,2}):(\d{2})$/.exec(String(raw).trim())
	if (!m) {
		return null
	}
	const h = Number(m[1])
	const min = Number(m[2])
	if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
		return null
	}
	return { h, m: min }
}

/** ISO calendar date `YYYY-MM-DD` plus whole UTC days (for service_date sequencing). */
export function addCalendarDaysUtc(ymd: string, deltaDays: number): string | null {
	const parts = ymd.split('-').map((x) => Number(x))
	if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
		return null
	}
	const [y, mo, d] = parts
	const dt = new Date(Date.UTC(y, mo - 1, d + deltaDays))
	if (Number.isNaN(dt.getTime())) {
		return null
	}
	return dt.toISOString().slice(0, 10)
}

/** Wall time on a **UTC calendar** `service_date` (matches seeded `timestamptz` convention). */
export function isoTimestampUtcOnServiceDate(serviceDateYmd: string, hm: string): string | null {
	const hmParts = parseDailyHm(hm)
	if (!hmParts) {
		return null
	}
	const dateParts = serviceDateYmd.split('-').map((x) => Number(x))
	if (dateParts.length !== 3 || dateParts.some((n) => !Number.isFinite(n))) {
		return null
	}
	const [y, mo, d] = dateParts
	const dt = new Date(Date.UTC(y, mo - 1, d, hmParts.h, hmParts.m, 0, 0))
	if (Number.isNaN(dt.getTime())) {
		return null
	}
	return dt.toISOString()
}

/**
 * Builds `[scheduled_start, scheduled_end]` for a run day. If end is not strictly after start
 * (bad pattern data), extends end by **10 hours** from start.
 */
export function scheduledWindowForPatternDay(
	serviceDateYmd: string,
	dailyStartHm: string,
	dailyEndHm: string,
): { scheduled_start: string; scheduled_end: string } | null {
	const start = isoTimestampUtcOnServiceDate(serviceDateYmd, dailyStartHm)
	let end = isoTimestampUtcOnServiceDate(serviceDateYmd, dailyEndHm)
	if (!start) {
		return null
	}
	if (!end) {
		end = new Date(new Date(start).getTime() + 8 * 60 * 60 * 1000).toISOString()
	}
	if (new Date(end).getTime() <= new Date(start).getTime()) {
		end = new Date(new Date(start).getTime() + 10 * 60 * 60 * 1000).toISOString()
	}
	return { scheduled_start: start, scheduled_end: end }
}
