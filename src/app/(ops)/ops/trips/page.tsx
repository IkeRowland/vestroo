import Link from 'next/link'

import { TripOpsForms } from '@/features/ops/components/TripOpsForms'
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
			<div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
				{error.message}
			</div>
		)
	}

	const vehicleOpts =
		(vehicles ?? []).map((v) => ({
			id: v.id as string,
			name: (v.name as string) ?? '',
		})) ?? []

	return (
		<div>
			<h1 className="text-2xl font-semibold text-white">Trips & exceptions</h1>
			<p className="mt-1 max-w-3xl text-sm text-zinc-400">
				Status transitions, delay notes with revised end time, and vehicle swaps (updates{' '}
				<code className="text-zinc-300">trips.vehicle_id</code> and overlapping{' '}
				<code className="text-zinc-300">chauffeur_assignments</code> for the same chauffeur
				window).
			</p>
			<ul className="mt-6 space-y-4">
				{(trips ?? []).map((t) => (
					<li
						key={t.id as string}
						className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
					>
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<span className="font-mono text-sm text-zinc-400">{t.id as string}</span>
							<span className="rounded bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-200">
								{String(t.status ?? '').replace(/_/g, ' ')}
							</span>
						</div>
						<div className="mt-2 text-sm text-zinc-300">
							{new Date(t.time_start_estimate as string).toLocaleString()} →{' '}
							{new Date(t.time_end_estimate as string).toLocaleString()}
						</div>
						<div className="mt-1 text-xs text-zinc-500">
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
									<span className="block text-xs text-amber-200/90">
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
			{(trips ?? []).length === 0 ? (
				<p className="mt-6 text-sm text-zinc-500">No trips yet.</p>
			) : null}
		</div>
	)
}
