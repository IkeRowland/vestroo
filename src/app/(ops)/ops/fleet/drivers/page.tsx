import { redirect } from 'next/navigation'

import { OpsAddDriverButton } from '@/features/ops/components/OpsAddDriverButton'
import type { OpsFleetDriverRow } from '@/features/ops/components/OpsFleetDriversShell'
import { OpsFleetDriversShell } from '@/features/ops/components/OpsFleetDriversShell'
import { OpsActionGroup } from '@/features/ops/components/ops-primitives'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import type { OpsCalendarTripSourceRow } from '@/features/ops/lib/map-ops-calendar-trips'
import { mapTripsToCalendarWeekData } from '@/features/ops/lib/map-ops-calendar-trips'
import type {
	FleetDriverShiftStatus,
	FleetDriverTripStatus,
	FleetDriverTripStatusSourceRow,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import {
	fleetDriverInTripWindowById,
	fleetDriverShiftFromProfile,
	fleetDriverTripStatus,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import { normalizeOpsDriverAvatarObjectPosition } from '@/features/ops/lib/ops-driver-avatar-display'
import {
	addDaysLocal,
	formatYmdLocal,
	opsCalendarMonthGridUtcRange,
	parseOpsCalendarSelectedEventId,
	parseWeekQueryYmd,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'
import {
	buildOpsFleetDriversHref,
	getRawFleetDriversDriverId,
	getRawFleetDriversMonthParam,
	getRawFleetDriversShiftId,
	getRawFleetDriversTripId,
	getRawFleetDriversWeekParam,
	OPS_FLEET_DRIVERS_PATH,
	parseMonthYm,
	parseOpsFleetDriversLayout,
	parseOpsFleetDriversPageView,
	parseFleetDriversDriverArchiveFlag,
	parseFleetDriversDriverEditFlag,
	resolveFleetDriversMonthYm,
	resolveFleetDriversWeekStartYmd,
} from '@/lib/ops-fleet-drivers-url'
import {
	TRIP_DRIVER_PROFILE_FK_COLUMN,
	TRIPS_CALENDAR_SELECT_COLUMNS,
	TRIPS_FLEET_DRIVERS_STATUS_COLUMNS,
} from '@/lib/supabase-select-fragments'
import { createUserServerClient } from '@/lib/supabase/server'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpsFleetDriversTabPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const view = parseOpsFleetDriversPageView(raw)
	const driversLayout = parseOpsFleetDriversLayout(raw)

	/** Strip legacy **`?shift=`** (**`chauffeur_schedules`**) URLs. */
	if (getRawFleetDriversShiftId(raw)) {
		redirect(
			buildOpsFleetDriversHref({
				view,
				weekStartYmd: resolveFleetDriversWeekStartYmd(raw),
				monthYm: resolveFleetDriversMonthYm(raw),
				driverId: getRawFleetDriversDriverId(raw),
				tripId: getRawFleetDriversTripId(raw),
				driversView: driversLayout,
				driverEdit: Boolean(getRawFleetDriversDriverId(raw) && parseFleetDriversDriverEditFlag(raw)),
				driverArchive: Boolean(getRawFleetDriversDriverId(raw) && parseFleetDriversDriverArchiveFlag(raw)),
			}),
		)
	}

	const weekRaw = getRawFleetDriversWeekParam(raw)
	if (weekRaw && parseWeekQueryYmd(weekRaw) === null) {
		redirect(OPS_FLEET_DRIVERS_PATH)
	}
	let weekStartYmd = resolveFleetDriversWeekStartYmd(raw)
	if (weekRaw) {
		const v = parseWeekQueryYmd(weekRaw)!
		const canon = formatYmdLocal(startOfWeekMondayLocal(parseYmdToLocalDate(v)))
		if (canon !== weekRaw) {
			const canonDriverId = getRawFleetDriversDriverId(raw)
			redirect(
				buildOpsFleetDriversHref({
					view,
					weekStartYmd: canon,
					monthYm: resolveFleetDriversMonthYm(raw),
					driverId: canonDriverId,
					tripId: getRawFleetDriversTripId(raw),
					driversView: driversLayout,
					driverEdit: Boolean(canonDriverId && parseFleetDriversDriverEditFlag(raw)),
					driverArchive: Boolean(canonDriverId && parseFleetDriversDriverArchiveFlag(raw)),
				}),
			)
		}
		weekStartYmd = canon
	}

	const monthRaw = getRawFleetDriversMonthParam(raw)
	if (monthRaw && parseMonthYm(monthRaw) === null) {
		redirect(OPS_FLEET_DRIVERS_PATH)
	}
	const monthYm = resolveFleetDriversMonthYm(raw)

	const supabase = await createUserServerClient()
	const fetchedAtIso = new Date().toISOString()

	let startIso: string
	let endIso: string
	if (view === 'week') {
		const weekStart = parseYmdToLocalDate(weekStartYmd)
		const weekEndExclusive = addDaysLocal(weekStart, 7)
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
	} else {
		const range = opsCalendarMonthGridUtcRange(monthYm)
		startIso = range.startIso
		endIso = range.endIso
	}

	const [
		{ data: driverProfiles, error: pErr },
		{ data: fleetVehiclesData },
		{ data: tripsForStatus },
		{ data: tripsForCalendar, error: tripsErr },
	] = await Promise.all([
		supabase
			.from('profiles')
			.select('id, full_name, status, phone, email, default_vehicle_id, avatar_url, avatar_object_position')
			.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)
			.order('full_name'),
		supabase.from('vehicles').select('id, name').eq('is_fleet_active', true).order('name'),
		supabase.from('trips').select(TRIPS_FLEET_DRIVERS_STATUS_COLUMNS).limit(500),
		supabase
			.from('trips')
			.select(TRIPS_CALENDAR_SELECT_COLUMNS)
			.gte('time_start_estimate', startIso)
			.lt('time_start_estimate', endIso)
			.order('time_start_estimate', { ascending: true })
			.limit(200),
	])

	if (pErr) {
		return (
			<div className="mt-4">
				<OpsFetchErrorIsland title="Profiles could not be loaded" message={pErr.message} />
			</div>
		)
	}

	const driverRows: OpsFleetDriverRow[] = (driverProfiles ?? []).map((p) => ({
		id: p.id as string,
		full_name: (p.full_name as string) ?? '',
		status: (p.status as string) ?? '',
		phone: (p.phone as string | null) ?? null,
		email: (p.email as string) ?? '',
		default_vehicle_id: (p.default_vehicle_id as string | null) ?? null,
		avatar_url:
			typeof p.avatar_url === 'string' && p.avatar_url.trim().length > 0 ? p.avatar_url.trim() : null,
		avatar_object_position: normalizeOpsDriverAvatarObjectPosition(
			typeof p.avatar_object_position === 'string' ? p.avatar_object_position : null,
		),
	}))

	const tripRows = (tripsForStatus ?? []) as Array<Record<string, unknown>>
	const fk = TRIP_DRIVER_PROFILE_FK_COLUMN
	const activeTripCountByDriverId: Record<string, number> = {}
	for (const d of driverRows) {
		const did = d.id
		const active = tripRows.filter((t) => {
			if (t[fk] !== did) return false
			const st = String(t.status ?? '').toLowerCase()
			if (st === 'cancelled' || st === 'completed') return false
			return true
		})
		activeTripCountByDriverId[did] = active.length
	}

	const statusRows = tripRows as unknown as FleetDriverTripStatusSourceRow[]
	const inTripWindowByDriverId = fleetDriverInTripWindowById(statusRows, Date.now())
	const driverShiftStatusById: Record<string, FleetDriverShiftStatus> = {}
	const driverTripStatusById: Record<string, FleetDriverTripStatus> = {}
	for (const d of driverRows) {
		const sh = fleetDriverShiftFromProfile(d.status)
		driverShiftStatusById[d.id] = sh
		driverTripStatusById[d.id] = fleetDriverTripStatus(sh, Boolean(inTripWindowByDriverId[d.id]))
	}

	const calRows = (tripsForCalendar ?? []) as unknown as OpsCalendarTripSourceRow[]
	const knownDriverIds = new Set(driverRows.map((d) => d.id))
	const knownTripIds = new Set(calRows.map((t) => t.id as string))

	const rawDriver = getRawFleetDriversDriverId(raw)
	if (rawDriver && !knownDriverIds.has(rawDriver)) {
		redirect(
			buildOpsFleetDriversHref({
				view,
				weekStartYmd,
				monthYm,
				driverId: null,
				tripId: getRawFleetDriversTripId(raw),
				driversView: driversLayout,
			}),
		)
	}

	const rawTripId = getRawFleetDriversTripId(raw)
	if (rawTripId && !knownTripIds.has(rawTripId)) {
		redirect(
			buildOpsFleetDriversHref({
				view,
				weekStartYmd,
				monthYm,
				driverId: getRawFleetDriversDriverId(raw),
				tripId: null,
				driversView: driversLayout,
			}),
		)
	}

	const selectedDriverId = rawDriver && knownDriverIds.has(rawDriver) ? rawDriver : null
	const selectedTripId = parseOpsCalendarSelectedEventId(raw, knownTripIds)
	const fleetDriversDriverEditOpen = Boolean(selectedDriverId && parseFleetDriversDriverEditFlag(raw))
	const fleetDriversDriverArchiveOpen = Boolean(selectedDriverId && parseFleetDriversDriverArchiveFlag(raw))

	const driverNameById: Record<string, string> = {}
	for (const d of driverRows) {
		driverNameById[d.id] = d.full_name?.trim() || 'Unnamed'
	}

	const { events, railByTripId } = mapTripsToCalendarWeekData(calRows, driverNameById)

	const fleetVehicleOptions =
		(fleetVehiclesData ?? []).map((v) => ({
			id: v.id as string,
			name: ((v.name as string) ?? '').trim() || '—',
		})) ?? []
	const fleetVehicleNameById: Record<string, string> = {}
	for (const v of fleetVehicleOptions) {
		fleetVehicleNameById[v.id] = v.name
	}
	const defaultVehicleDisplayByDriverId: Record<string, string> = {}
	for (const d of driverRows) {
		if (!d.default_vehicle_id) continue
		const nm = fleetVehicleNameById[d.default_vehicle_id]
		if (nm) defaultVehicleDisplayByDriverId[d.id] = nm
	}

	return (
		<div className="mt-4 min-w-0 max-w-full">
			<div className="flex flex-wrap justify-end gap-3">
				<OpsActionGroup>
					<OpsAddDriverButton />
				</OpsActionGroup>
			</div>
			<OpsDataFreshnessBar className="mt-4" fetchedAtIso={fetchedAtIso} />
			{tripsErr ? (
				<div className="mt-4">
					<OpsFetchErrorIsland title="Trips could not be loaded" message={tripsErr.message} />
				</div>
			) : null}
			<div className="mt-6">
				<OpsFleetDriversShell
					view={view}
					driversLayout={driversLayout}
					weekStartYmd={weekStartYmd}
					monthYm={monthYm}
					selectedDriverId={selectedDriverId}
					selectedTripId={selectedTripId}
					events={events}
					drivers={driverRows}
					railByTripId={railByTripId}
					fleetVehicleOptions={fleetVehicleOptions}
					defaultVehicleDisplayByDriverId={defaultVehicleDisplayByDriverId}
					activeTripCountByDriverId={activeTripCountByDriverId}
					driverTripStatusById={driverTripStatusById}
					driverShiftStatusById={driverShiftStatusById}
					fleetDriversDriverEditOpen={fleetDriversDriverEditOpen}
					fleetDriversDriverArchiveOpen={fleetDriversDriverArchiveOpen}
				/>
			</div>
		</div>
	)
}
