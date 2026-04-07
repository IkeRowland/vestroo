import Link from 'next/link'

import { TripOpsForms } from '@/features/ops/components/TripOpsForms'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { OPS_EMPTY_COPY } from '@/features/ops/ops-list-state-copy'
import { createUserServerClient } from '@/lib/supabase/server'

export default async function OpsTripsPage() {
	const supabase = await createUserServerClient()

	const { data: trips, error } = await supabase
		.from('trips')
		.select(
			'id, status, time_start_estimate, time_end_estimate, vehicle_id, chauffeur_id, service_run_id, ops_delay_note, ops_revised_time_end_estimate',
		)
		.order('time_start_estimate', { ascending: false })
		.limit(40)

	const { data: vehicles } = await supabase.from('vehicles').select('id, name').order('name')

	if (error) {
		return (
			<div>
				<OpsPageHeader
					title="Trips"
					description="Status, delays, and vehicle swaps for assigned trips."
				/>
				<div className="mt-4">
					<OpsErrorState title="Trips could not be loaded" message={error.message} />
				</div>
			</div>
		)
	}

	const vehicleOpts =
		(vehicles ?? []).map((v) => ({
			id: v.id as string,
			name: (v.name as string) ?? '',
		})) ?? []

	const rows = trips ?? []

	return (
		<div>
			<OpsPageHeader
				title="Trips"
				description={
					<>
						Status transitions, delay notes with revised end time, and vehicle swaps (updates{' '}
						<code className="text-ops-foreground/90">trips.vehicle_id</code> and overlapping{' '}
						<code className="text-ops-foreground/90">chauffeur_assignments</code> for the same chauffeur
						window).
					</>
				}
			/>

			{rows.length === 0 ? (
				<OpsEmptyState
					className="mt-6"
					title={OPS_EMPTY_COPY.trips.title}
					description={OPS_EMPTY_COPY.trips.description}
				/>
			) : (
				<ul className="mt-6 space-y-4" role="list">
					{rows.map((t) => (
						<li
							key={t.id as string}
							className="rounded-lg border border-ops-border bg-ops-surface/50 p-4"
							role="listitem"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<span className="font-mono text-sm text-ops-muted">{t.id as string}</span>
								<span className="rounded bg-ops-surface-hover px-2 py-0.5 text-xs capitalize text-ops-foreground">
									{String(t.status ?? '').replace(/_/g, ' ')}
								</span>
							</div>
							<div className="mt-2 text-sm text-ops-foreground/90">
								{new Date(t.time_start_estimate as string).toLocaleString()} →{' '}
								{new Date(t.time_end_estimate as string).toLocaleString()}
							</div>
							<div className="mt-1 text-xs text-ops-muted">
								Vehicle {String(t.vehicle_id).slice(0, 8)}… · Chauffeur{' '}
								{String(t.chauffeur_id).slice(0, 8)}…
								{t.service_run_id ? (
									<> · Run {String(t.service_run_id).slice(0, 8)}…</>
								) : null}
							</div>
							{t.ops_delay_note ? (
								<p className="mt-2 text-sm text-amber-100">
									Delay: {t.ops_delay_note as string}
									{t.ops_revised_time_end_estimate ? (
										<span className="mt-1 block text-xs text-amber-200/90">
											Revised end:{' '}
											{new Date(t.ops_revised_time_end_estimate as string).toLocaleString()}
										</span>
									) : null}
								</p>
							) : null}
							<p className="mt-2 text-xs">
								<Link
									href={`/ops/close-protection?tripId=${encodeURIComponent(t.id as string)}`}
									className="text-emerald-400 underline-offset-2 hover:underline"
								>
									Close protection (this trip)
								</Link>
							</p>
							<TripOpsForms
								tripId={t.id as string}
								currentStatus={String(t.status ?? 'booking')}
								vehicles={vehicleOpts}
								currentVehicleId={t.vehicle_id as string}
							/>
						</li>
					))}
				</ul>
			)}
		</div>
	)
}
