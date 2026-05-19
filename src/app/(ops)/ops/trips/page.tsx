import { OpsTripsSplitBrowser } from '@/features/ops/components/OpsTripsSplitBrowser'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { opsTripsCopy } from '@/features/ops/copy/ops-trips-copy'
import { OPS_EMPTY_COPY } from '@/features/ops/ops-list-state-copy'
import {
	getRawOpsTripsSelectedId,
	OPS_TRIPS_PATH,
	parseOpsTripsPageSelectedId,
} from '@/lib/ops-trips-url'
import { opsTripListRefLabel, parseOpsTripListBookingEmbed } from '@/lib/ops-trip-list-booking-embed'
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

export default async function OpsTripsPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

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
		redirect(OPS_TRIPS_PATH)
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

	const tripRows = rows.map((t) => {
		const tripId = t.id as string
		const bk = parseOpsTripListBookingEmbed(t as Record<string, unknown>)
		return {
			id: tripId,
			status: String(t.status ?? ''),
			time_start_estimate: t.time_start_estimate as string,
			time_end_estimate: t.time_end_estimate as string,
			vehicle_id: t.vehicle_id as string,
			chauffeur_id: t[TRIP_DRIVER_PROFILE_FK_COLUMN] as string,
			ops_delay_note: (t.ops_delay_note as string | null) ?? null,
			ops_revised_time_end_estimate: (t.ops_revised_time_end_estimate as string | null) ?? null,
			ref_label: opsTripListRefLabel(tripId, bk),
			pickup_datetime: bk.pickup_datetime,
			customer_name: bk.customer_name,
			customer_email: bk.customer_email,
			linked_account_name: bk.linked_account_name,
			client_type: bk.client_type,
			origin_name: bk.origin_name,
			destination_name: bk.destination_name,
		}
	})

	return (
		<div className="min-w-0 max-w-full space-y-10">
			<OpsPageHeader title={opsTripsCopy.pageTitle} description={opsTripsCopy.pageDescription} />

			<OpsDataFreshnessBar className="mt-0" fetchedAtIso={fetchedAtIso} />

			<section className="space-y-4" aria-labelledby="ops-trips-live-heading">
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
