import {
	AssignBookingPanel,
	type FulfilPanelBookingRow,
} from '@/features/ops/components/AssignBookingPanel'
import { FulfilQueueTabs } from '@/features/ops/components/FulfilQueueTabs'
import { OpsTripsSplitBrowser } from '@/features/ops/components/OpsTripsSplitBrowser'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import {
	OpsFilterRow,
	OpsPageHeader,
} from '@/features/ops/components/ops-primitives'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { opsTripsCopy } from '@/features/ops/copy/ops-trips-copy'
import { OPS_EMPTY_COPY } from '@/features/ops/ops-list-state-copy'
import { isDispatchSuggestionsEnabled } from '@/lib/dispatch-suggestions-env'
import type { FulfilQueueBucket } from '@/lib/fulfil-queue-buckets'
import { parseFulfilQueueParam } from '@/lib/fulfil-queue-buckets'
import { loadFulfilAssignmentPanelState } from '@/lib/ops-fulfil-assignment-load'
import { isUuidShaped } from '@/lib/ops-booking-grid-query'
import { getStaffSession } from '@/lib/ops-auth'
import {
	getRawOpsTripsSelectedId,
	OPS_TRIPS_PATH,
	parseOpsTripsPageSelectedId,
} from '@/lib/ops-trips-url'
import {
	TRIPS_OPS_LIST_SELECT_COLUMNS,
	TRIP_DRIVER_PROFILE_FK_COLUMN,
} from '@/lib/supabase-select-fragments'
import { createUserServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstStringParam(value: string | string[] | undefined): string | undefined {
	if (value === undefined) return undefined
	return Array.isArray(value) ? value[0] : value
}

export default async function OpsTripsPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	const queue: FulfilQueueBucket = parseFulfilQueueParam(raw.queue)
	const rawFocusId = firstStringParam(raw.bookingId)?.trim() ?? ''
	const focusBookingId =
		rawFocusId.length > 0 && isUuidShaped(rawFocusId) ? rawFocusId : null

	const staffSession = await getStaffSession()
	const viewerIsAdmin = staffSession?.role === 'admin'
	const dispatchSuggestionsEnabled = isDispatchSuggestionsEnabled()

	const fulfilState = await loadFulfilAssignmentPanelState(supabase, queue)

	const { data: trips, error } = await supabase
		.from('trips')
		.select(TRIPS_OPS_LIST_SELECT_COLUMNS)
		.order('time_start_estimate', { ascending: false })
		.limit(40)

	const { data: vehicles } = await supabase
		.from('vehicles')
		.select('id, name, primary_image_url')
		.order('name')

	if (error) {
		return (
			<div>
				<OpsPageHeader title={opsTripsCopy.pageTitle} description={opsTripsCopy.pageDescription} />
				<div className="mt-4">
					<OpsFetchErrorIsland title="Trips could not be loaded" message={error.message} />
				</div>
			</div>
		)
	}

	const rows = trips ?? []
	const knownIds = new Set(rows.map((t) => t.id as string))
	const rawId = getRawOpsTripsSelectedId(raw)
	if (rawId && !knownIds.has(rawId)) {
		const u = new URLSearchParams()
		u.set('queue', queue)
		if (focusBookingId) u.set('bookingId', focusBookingId)
		const qs = u.toString()
		redirect(qs ? `${OPS_TRIPS_PATH}?${qs}` : OPS_TRIPS_PATH)
	}
	const selectedTripId = parseOpsTripsPageSelectedId(raw, knownIds)

	const vehicleOpts =
		(vehicles ?? []).map((v) => ({
			id: v.id as string,
			name: (v.name as string) ?? '',
			primary_image_url: (v.primary_image_url as string | null) ?? null,
		})) ?? []

	const driverProfileIds = [
		...new Set(rows.map((t) => t[TRIP_DRIVER_PROFILE_FK_COLUMN] as string).filter(Boolean)),
	]

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

	const tripRows = rows.map((t) => ({
		id: t.id as string,
		status: String(t.status ?? ''),
		time_start_estimate: t.time_start_estimate as string,
		time_end_estimate: t.time_end_estimate as string,
		vehicle_id: t.vehicle_id as string,
		chauffeur_id: t[TRIP_DRIVER_PROFILE_FK_COLUMN] as string,
		service_run_id: (t.service_run_id as string | null) ?? null,
		ops_delay_note: (t.ops_delay_note as string | null) ?? null,
		ops_revised_time_end_estimate: (t.ops_revised_time_end_estimate as string | null) ?? null,
	}))

	const assignmentDescription =
		queue === 'paid' ? (
			<>
				Paid bookings ready to assign to a run, vehicle, and driver. Use the tabs for{' '}
				<strong className="font-medium text-ops-foreground">Pending payment</strong> or{' '}
				<strong className="font-medium text-ops-foreground">Trip requests</strong>.
			</>
		) : queue === 'pending' ? (
			<>
				Bookings that still need payment or further work before assignment. Record EFT or cash here once
				confirmed.
			</>
		) : (
			<>Public trip-request bookings awaiting acceptance before they enter the paid assignment queue.</>
		)

	return (
		<div className="min-w-0 max-w-full space-y-10">
			<OpsPageHeader
				title={opsTripsCopy.pageTitle}
				description={
					<>
						<strong className="font-medium text-ops-foreground">Assignment</strong> — booking queues and
						dispatch. <strong className="font-medium text-ops-foreground">Live trips</strong> —{' '}
						{opsTripsCopy.pageDescription}
					</>
				}
			/>

			<OpsDataFreshnessBar className="mt-0" fetchedAtIso={fetchedAtIso} />

			<section className="space-y-4" aria-labelledby="ops-trips-assignment-heading">
				<h2
					id="ops-trips-assignment-heading"
					className="text-lg font-semibold tracking-tight text-ops-foreground"
				>
					Booking assignment
				</h2>
				<p className="text-sm text-ops-muted">{assignmentDescription}</p>

				<OpsFilterRow className="mt-0" aria-label="Assignment queue tabs">
					<FulfilQueueTabs active={queue} focusBookingId={focusBookingId} />
				</OpsFilterRow>

				<div className="space-y-3">
					{fulfilState.bookingError ? (
						<OpsFetchErrorIsland
							title="Assignment queue could not be loaded"
							message={fulfilState.bookingError.message}
						/>
					) : null}
					{fulfilState.runsError ? (
						<OpsFetchErrorIsland
							title="Service runs could not be loaded"
							message={fulfilState.runsError.message}
						/>
					) : null}
				</div>

				<AssignBookingPanel
					queue={queue}
					bookings={fulfilState.panelBookings as FulfilPanelBookingRow[]}
					serviceRuns={fulfilState.runOptions}
					driverProfiles={fulfilState.driverProfileOptions}
					vehicles={fulfilState.vehicleOptions}
					viewerIsAdmin={viewerIsAdmin}
					initialBookingId={focusBookingId}
					dispatchSuggestionsEnabled={dispatchSuggestionsEnabled}
				/>
			</section>

			<section className="space-y-4 border-t border-ops-border pt-10" aria-labelledby="ops-trips-live-heading">
				<h2 id="ops-trips-live-heading" className="text-lg font-semibold tracking-tight text-ops-foreground">
					Live trips
				</h2>
				<p className="text-sm text-ops-muted">{opsTripsCopy.pageDescription}</p>

				{tripRows.length === 0 ? (
					<OpsEmptyState
						className="mt-2"
						title={OPS_EMPTY_COPY.trips.title}
						description={OPS_EMPTY_COPY.trips.description}
					/>
				) : (
					<div className="mt-2">
						<OpsTripsSplitBrowser
							trips={tripRows}
							vehicles={vehicleOpts}
							driverNameByProfileId={driverNameByProfileId}
							selectedTripId={selectedTripId}
						/>
					</div>
				)}
			</section>
		</div>
	)
}
