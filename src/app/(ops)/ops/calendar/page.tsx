import { redirect } from 'next/navigation'

import { OpsCalendarShell } from '@/features/ops/components/OpsCalendarShell'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { opsCalendarCopy } from '@/features/ops/copy/ops-calendar-copy'
import type { OpsCalendarTripSourceRow } from '@/features/ops/lib/map-ops-calendar-trips'
import { mapTripsToCalendarWeekData } from '@/features/ops/lib/map-ops-calendar-trips'
import {
	addDaysLocal,
	buildOpsCalendarHref,
	formatYmdLocal,
	getRawCalendarMonthParam,
	getRawCalendarWeekParam,
	getRawOpsCalendarEventId,
	OPS_CALENDAR_PATH,
	opsCalendarMonthGridUtcRange,
	parseOpsCalendarPageView,
	parseOpsCalendarSelectedEventId,
	parseWeekQueryYmd,
	parseYmToFirstDay,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'
import { formatMonthYmFromDate, parseMonthYm } from '@/lib/ops-fleet-drivers-url'
import { TRIPS_CALENDAR_SELECT_COLUMNS } from '@/lib/supabase-select-fragments'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpsCalendarPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const fetchedAtIso = new Date().toISOString()
	const view = parseOpsCalendarPageView(raw)

	let weekStartYmd: string
	let monthYm: string
	let startIso: string
	let endIso: string

	if (view === 'month') {
		const monthRaw = getRawCalendarMonthParam(raw)
		if (monthRaw && parseMonthYm(monthRaw) === null) {
			redirect(OPS_CALENDAR_PATH)
		}
		monthYm = parseMonthYm(monthRaw ?? '') ?? formatMonthYmFromDate(new Date())
		weekStartYmd = formatYmdLocal(startOfWeekMondayLocal(parseYmToFirstDay(monthYm)))
		const range = opsCalendarMonthGridUtcRange(monthYm)
		startIso = range.startIso
		endIso = range.endIso
	} else {
		const weekRaw = getRawCalendarWeekParam(raw)

		if (weekRaw && parseWeekQueryYmd(weekRaw) === null) {
			redirect(OPS_CALENDAR_PATH)
		}

		weekStartYmd = formatYmdLocal(startOfWeekMondayLocal(new Date()))
		if (weekRaw) {
			const v = parseWeekQueryYmd(weekRaw)!
			weekStartYmd = formatYmdLocal(startOfWeekMondayLocal(parseYmdToLocalDate(v)))
			if (weekStartYmd !== weekRaw) {
				redirect(
					buildOpsCalendarHref({
						weekStartYmd,
						monthYm: formatMonthYmFromDate(parseYmdToLocalDate(weekStartYmd)),
						eventId: getRawOpsCalendarEventId(raw),
						view,
					}),
				)
			}
		}

		const weekStart = parseYmdToLocalDate(weekStartYmd)
		const weekEndExclusive = addDaysLocal(weekStart, 7)
		monthYm = formatMonthYmFromDate(weekStart)
		startIso = new Date(
			weekStart.getFullYear(),
			weekStart.getMonth(),
			weekStart.getDate(),
			0,
			0,
			0,
			0,
		).toISOString()
		endIso = new Date(
			weekEndExclusive.getFullYear(),
			weekEndExclusive.getMonth(),
			weekEndExclusive.getDate(),
			0,
			0,
			0,
			0,
		).toISOString()
	}

	const supabase = await createUserServerClient()
	const { data: trips, error } = await supabase
		.from('trips')
		.select(TRIPS_CALENDAR_SELECT_COLUMNS)
		.gte('time_start_estimate', startIso)
		.lt('time_start_estimate', endIso)
		.order('time_start_estimate', { ascending: true })
		.limit(200)

	if (error) {
		return (
			<div className="min-w-0 max-w-full">
				<OpsPageHeader title={opsCalendarCopy.pageTitle} description={opsCalendarCopy.pageDescription} />
				<div className="mt-4">
					<OpsFetchErrorIsland title="Calendar could not be loaded" message={error.message} />
				</div>
			</div>
		)
	}

	const rows = (trips ?? []) as unknown as OpsCalendarTripSourceRow[]
	const knownIds = new Set(rows.map((r) => r.id as string))
	const rawId = getRawOpsCalendarEventId(raw)
	if (rawId && !knownIds.has(rawId)) {
		redirect(buildOpsCalendarHref({ weekStartYmd, monthYm, eventId: null, view }))
	}
	const selectedEventId = parseOpsCalendarSelectedEventId(raw, knownIds)

	const driverProfileIds = [...new Set(rows.map((t) => String(t.chauffeur_id ?? '')).filter(Boolean))]
	const driverNameByProfileId: Record<string, string> = {}
	if (driverProfileIds.length > 0) {
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, full_name')
			.in('id', driverProfileIds)
		for (const p of profiles ?? []) {
			driverNameByProfileId[p.id as string] = (p.full_name as string) ?? ''
		}
	}

	const { events, railByTripId } = mapTripsToCalendarWeekData(rows, driverNameByProfileId)

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader title={opsCalendarCopy.pageTitle} description={opsCalendarCopy.pageDescription} />
			<OpsDataFreshnessBar className="mt-4" fetchedAtIso={fetchedAtIso} />
			<div className="mt-6">
				<OpsCalendarShell
					weekStartYmd={weekStartYmd}
					monthYm={monthYm}
					view={view}
					selectedEventId={selectedEventId}
					events={events}
					railByTripId={railByTripId}
				/>
			</div>
		</div>
	)
}
