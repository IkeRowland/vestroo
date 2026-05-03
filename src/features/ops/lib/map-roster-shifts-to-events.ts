import type { OpsCalendarWeekEvent } from '@/features/ops/lib/map-ops-calendar-trips'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { parseYmdToLocalDate } from '@/lib/ops-calendar-url'

export type RosterScheduleSourceRow = {
	id: string
	chauffeur_id: string
	work_date: string
	shift: string | null
	vehicle_id: string | null
	status: string | null
	total_working_hours: number | null
}

/**
 * Maps **`shift`** label to a **local same-day** time band for calendar positioning (**Task 0**).
 * DB has **no** clock times — bands are **operational placeholders**, not payroll truth.
 */
export function rosterShiftDayBandLocal(
	workDateYmd: string,
	shiftLabel: string | null,
): { start: Date; end: Date } {
	const d = parseYmdToLocalDate(workDateYmd)
	const key = (shiftLabel ?? '').trim().toLowerCase()
	let h0 = 6
	let h1 = 22
	if (key === 'a' || key === 'morning' || key.includes('am')) {
		h0 = 6
		h1 = 14
	} else if (key === 'b' || key === 'afternoon' || key.includes('pm')) {
		h0 = 14
		h1 = 22
	} else if (key === 'c' || key === 'night' || key.includes('night')) {
		h0 = 22
		h1 = 24
	}
	const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h0, 0, 0, 0)
	const endH = h1 >= 24 ? 0 : h1
	const endDayOffset = h1 >= 24 ? 1 : 0
	const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + endDayOffset, endH, 0, 0, 0)
	if (end.getTime() <= start.getTime()) {
		return {
			start,
			end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 22, 0, 0, 0),
		}
	}
	return { start, end }
}

function shiftSubtitle(row: RosterScheduleSourceRow, vehicleLabel: string): string {
	const parts = [
		row.shift ? String(row.shift) : null,
		row.total_working_hours != null ? `${row.total_working_hours}h` : null,
		row.status ? String(row.status) : null,
		vehicleLabel !== '—' ? vehicleLabel : null,
	].filter(Boolean)
	return parts.join(' · ') || 'Shift'
}

/**
 * Maps **`chauffeur_schedules`** rows to **`OpsCalendarWeek`** / **`OpsCalendarMonth`** **`events`** (**17.14** contract).
 */
export function mapRosterSchedulesToCalendarEvents(
	rows: RosterScheduleSourceRow[],
	driverNameById: Readonly<Record<string, string>>,
	vehicleNameById: Readonly<Record<string, string>>,
): OpsCalendarWeekEvent[] {
	const out: OpsCalendarWeekEvent[] = []
	for (const row of rows) {
		const workYmd = String(row.work_date).slice(0, 10)
		const { start, end } = rosterShiftDayBandLocal(workYmd, row.shift)
		const driverName =
			driverNameById[row.chauffeur_id]?.trim() || `${String(row.chauffeur_id).slice(0, 8)}…`
		const vid = row.vehicle_id ?? ''
		const vehicleLabel = vid ? (vehicleNameById[vid]?.trim() || `${vid.slice(0, 8)}…`) : '—'
		const st = String(row.status ?? '')
		out.push({
			id: row.id,
			startsAt: start.toISOString(),
			endsAt: end.toISOString(),
			title: driverName,
			subtitle: shiftSubtitle(row, vehicleLabel),
			tone: getOpsStatusPillTone(st),
		})
	}
	out.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
	return out
}
