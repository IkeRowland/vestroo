import { redirect } from 'next/navigation'

import { OpsAddDriverButton } from '@/features/ops/components/OpsAddDriverButton'
import type {
	OpsRosterDriverRow,
	RosterShiftListItem,
	RosterShiftRailPayload,
} from '@/features/ops/components/OpsRosterShell'
import { OpsRosterShell } from '@/features/ops/components/OpsRosterShell'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { opsRosterCopy } from '@/features/ops/copy/ops-roster-copy'
import type { RosterScheduleSourceRow } from '@/features/ops/lib/map-roster-shifts-to-events'
import { mapRosterSchedulesToCalendarEvents } from '@/features/ops/lib/map-roster-shifts-to-events'
import {
	addDaysLocal,
	formatYmdLocal,
	parseWeekQueryYmd,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'
import {
	buildOpsRosterHref,
	endOfMonthExclusive,
	getRawRosterDriverId,
	getRawRosterMonthParam,
	getRawRosterShiftId,
	getRawRosterWeekParam,
	OPS_ROSTER_PATH,
	parseMonthYm,
	parseOpsRosterPageView,
	parseYmToFirstDay,
	resolveRosterMonthYm,
	resolveRosterWeekStartYmd,
} from '@/lib/ops-roster-url'
import {
	DRIVER_SHIFT_SCHEDULE_SELECT_COLUMNS,
	DRIVER_SHIFT_SCHEDULE_TABLE,
	TRIP_DRIVER_PROFILE_FK_COLUMN,
} from '@/lib/supabase-select-fragments'
import { createUserServerClient } from '@/lib/supabase/server'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpsRosterPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const view = parseOpsRosterPageView(raw)
	const weekRaw = getRawRosterWeekParam(raw)
	if (weekRaw && parseWeekQueryYmd(weekRaw) === null) {
		redirect(OPS_ROSTER_PATH)
	}
	let weekStartYmd = resolveRosterWeekStartYmd(raw)
	if (weekRaw) {
		const v = parseWeekQueryYmd(weekRaw)!
		const canon = formatYmdLocal(startOfWeekMondayLocal(parseYmdToLocalDate(v)))
		if (canon !== weekRaw) {
			redirect(
				buildOpsRosterHref({
					view,
					weekStartYmd: canon,
					monthYm: resolveRosterMonthYm(raw),
					driverId: getRawRosterDriverId(raw),
					shiftId: getRawRosterShiftId(raw),
				}),
			)
		}
		weekStartYmd = canon
	}

	const monthRaw = getRawRosterMonthParam(raw)
	if (monthRaw && parseMonthYm(monthRaw) === null) {
		redirect(OPS_ROSTER_PATH)
	}
	const monthYm = resolveRosterMonthYm(raw)

	const supabase = await createUserServerClient()
	const fetchedAtIso = new Date().toISOString()

	let rangeStartYmd: string
	let rangeEndExclusiveYmd: string
	if (view === 'week') {
		const ws = parseYmdToLocalDate(weekStartYmd)
		rangeStartYmd = formatYmdLocal(ws)
		rangeEndExclusiveYmd = formatYmdLocal(addDaysLocal(ws, 7))
	} else {
		const first = parseYmToFirstDay(monthYm)
		rangeStartYmd = formatYmdLocal(first)
		rangeEndExclusiveYmd = formatYmdLocal(endOfMonthExclusive(monthYm))
	}

	const { data: driverProfiles, error: pErr } = await supabase
		.from('profiles')
		.select('id, full_name, status, phone')
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)
		.order('full_name')

	const { data: schedules, error: sErr } = await supabase
		.from(DRIVER_SHIFT_SCHEDULE_TABLE)
		.select(DRIVER_SHIFT_SCHEDULE_SELECT_COLUMNS)
		.gte('work_date', rangeStartYmd)
		.lt('work_date', rangeEndExclusiveYmd)
		.order('work_date', { ascending: true })
		.limit(500)

	if (pErr) {
		return (
			<div className="min-w-0 max-w-full">
				<OpsPageHeader title={opsRosterCopy.pageTitle} description={opsRosterCopy.pageDescription} />
				<div className="mt-4">
					<OpsFetchErrorIsland title="Profiles could not be loaded" message={pErr.message} />
				</div>
			</div>
		)
	}

	const schedRows = (schedules ?? []) as unknown as RosterScheduleSourceRow[]
	const driverRows = (driverProfiles ?? []) as OpsRosterDriverRow[]
	const knownDriverIds = new Set(driverRows.map((d) => d.id))
	const knownShiftIds = new Set(schedRows.map((s) => s.id as string))

	const rawDriver = getRawRosterDriverId(raw)
	if (rawDriver && !knownDriverIds.has(rawDriver)) {
		redirect(
			buildOpsRosterHref({
				view,
				weekStartYmd,
				monthYm,
				driverId: null,
				shiftId: getRawRosterShiftId(raw),
			}),
		)
	}
	const rawShift = getRawRosterShiftId(raw)
	if (rawShift && !knownShiftIds.has(rawShift)) {
		redirect(
			buildOpsRosterHref({
				view,
				weekStartYmd,
				monthYm,
				driverId: getRawRosterDriverId(raw),
				shiftId: null,
			}),
		)
	}

	const selectedDriverId = rawDriver && knownDriverIds.has(rawDriver) ? rawDriver : null
	const selectedShiftId = rawShift && knownShiftIds.has(rawShift) ? rawShift : null

	const driverNameById: Record<string, string> = {}
	for (const d of driverRows) {
		driverNameById[d.id] = d.full_name?.trim() || 'Unnamed'
	}

	const vehicleIds = [...new Set(schedRows.map((s) => s.vehicle_id).filter(Boolean))] as string[]
	const vehicleNameById: Record<string, string> = {}
	if (vehicleIds.length > 0) {
		const { data: vehicles } = await supabase.from('vehicles').select('id, name').in('id', vehicleIds)
		for (const v of vehicles ?? []) {
			vehicleNameById[v.id as string] = ((v.name as string) ?? '').trim() || '—'
		}
	}

	const events = mapRosterSchedulesToCalendarEvents(schedRows, driverNameById, vehicleNameById)

	const shiftDetailById: Record<string, RosterShiftRailPayload> = {}
	const shiftsByDriverId: Record<string, RosterShiftListItem[]> = {}
	for (const s of schedRows) {
		const sid = s.id as string
		const did = s[TRIP_DRIVER_PROFILE_FK_COLUMN] as string
		const vid = s.vehicle_id as string | null
		const vehicleLabel = vid
			? (vehicleNameById[vid]?.trim() || `${vid.slice(0, 8)}…`)
			: '—'
		const prof = driverRows.find((d) => d.id === did)
		shiftDetailById[sid] = {
			shiftId: sid,
			driverId: did,
			driverName: driverNameById[did] ?? '—',
			phone: prof?.phone ?? null,
			profileStatus: prof?.status ?? '—',
			workDate: String(s.work_date).slice(0, 10),
			shift: s.shift as string | null,
			hours: s.total_working_hours as number | null,
			scheduleStatus: s.status as string | null,
			vehicleLabel,
		}
		if (!shiftsByDriverId[did]) shiftsByDriverId[did] = []
		shiftsByDriverId[did]!.push({
			id: sid,
			work_date: String(s.work_date),
			shift: s.shift as string | null,
			status: s.status as string | null,
			total_working_hours: s.total_working_hours as number | null,
		})
	}
	for (const k of Object.keys(shiftsByDriverId)) {
		shiftsByDriverId[k]!.sort((a, b) => String(a.work_date).localeCompare(String(b.work_date)))
	}

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader title={opsRosterCopy.pageTitle} description={opsRosterCopy.pageDescription}>
				<OpsAddDriverButton />
			</OpsPageHeader>
			<OpsDataFreshnessBar className="mt-4" fetchedAtIso={fetchedAtIso} />
			{sErr ? (
				<div className="mt-4">
					<OpsFetchErrorIsland title="Schedules could not be loaded" message={sErr.message} />
				</div>
			) : null}
			<div className="mt-6">
				<OpsRosterShell
					view={view}
					weekStartYmd={weekStartYmd}
					monthYm={monthYm}
					selectedDriverId={selectedDriverId}
					selectedShiftId={selectedShiftId}
					events={events}
					drivers={driverRows}
					shiftDetailById={shiftDetailById}
					shiftsByDriverId={shiftsByDriverId}
				/>
			</div>
			{driverRows.length === 0 ? (
				<p className="mt-6 text-sm text-ops-muted">No driver profiles.</p>
			) : null}
		</div>
	)
}
