import { findVehicleWindowConflicts, tripTimeWindow } from '@/lib/ops-time-windows'
import { createUserServerClient } from '@/lib/supabase/server'

export default async function OpsVehiclesPage() {
	const supabase = await createUserServerClient()

	const { data: vehicles, error: vErr } = await supabase
		.from('vehicles')
		.select('id, name, license_plate, operation_status, vehicle_condition, category_id')
		.order('name')

	const { data: categories } = await supabase
		.from('vehicle_categories')
		.select('id, name')

	const { data: pricings } = await supabase
		.from('vehicle_pricings')
		.select('id, vehicle_category_id')

	const { data: trips } = await supabase
		.from('trips')
		.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
		.limit(200)

	const catName = new Map(
		(categories ?? []).map((c) => [c.id as string, (c.name as string) ?? '']),
	)

	if (vErr) {
		return (
			<div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
				{vErr.message}
			</div>
		)
	}

	const tripRows = trips ?? []

	return (
		<div>
			<h1 className="text-2xl font-semibold text-white">Vehicle availability</h1>
			<p className="mt-1 max-w-3xl text-sm text-zinc-400">
				Fleet rows from <code className="text-zinc-300">public.vehicles</code> with category
				labels. Utilisation counts non-terminal trips whose time window overlaps each vehicle.
				Double-booking uses the same overlap rule as dispatch actions (
				<code className="text-zinc-300">src/lib/ops-time-windows.ts</code>).
			</p>
			<div className="mt-6 overflow-x-auto">
				<table className="w-full min-w-[40rem] border-collapse text-left text-sm">
					<thead>
						<tr className="border-b border-zinc-800 text-zinc-400">
							<th className="py-2 pr-4 font-medium">Vehicle</th>
							<th className="py-2 pr-4 font-medium">Plate</th>
							<th className="py-2 pr-4 font-medium">Category</th>
							<th className="py-2 pr-4 font-medium">Ops status</th>
							<th className="py-2 pr-4 font-medium">Active trips</th>
						</tr>
					</thead>
					<tbody>
						{(vehicles ?? []).map((v) => {
							const vid = v.id as string
							const active = tripRows.filter((t) => {
								if (t.vehicle_id !== vid) return false
								const st = String(t.status ?? '').toLowerCase()
								if (st === 'cancelled' || st === 'completed') return false
								return true
							})
							return (
								<tr key={vid} className="border-b border-zinc-800/80">
									<td className="py-3 pr-4 text-zinc-100">{v.name as string}</td>
									<td className="py-3 pr-4 font-mono text-zinc-400">
										{v.license_plate as string}
									</td>
									<td className="py-3 pr-4 text-zinc-400">
										{catName.get(v.category_id as string) ?? '—'}
									</td>
									<td className="py-3 pr-4 text-zinc-400">
										<span className="capitalize">{v.operation_status as string}</span> ·{' '}
										<span className="capitalize">{v.vehicle_condition as string}</span>
									</td>
									<td className="py-3 pr-4 text-zinc-300">{active.length}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
			<section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
				<h2 className="text-sm font-semibold text-white">Overlap self-check</h2>
				<p className="mt-1 text-xs text-zinc-500">
					Pick two trip windows on the same vehicle — if both are non-terminal and intervals
					overlap, fulfilment should block or show an error (see assign / swap actions).
				</p>
				<ul className="mt-3 space-y-1 text-xs text-zinc-400">
					{tripRows.slice(0, 5).map((a) => {
						try {
							const w = tripTimeWindow({
								time_start_estimate: a.time_start_estimate as string,
								time_end_estimate: a.time_end_estimate as string,
							})
							const conflicts = findVehicleWindowConflicts(
								tripRows,
								a.vehicle_id as string,
								w,
								a.id as string,
							)
							return (
								<li key={a.id as string}>
									Trip {String(a.id).slice(0, 8)}… → {conflicts.length} other overlapping
									active trips on same vehicle
								</li>
							)
						} catch {
							return null
						}
					})}
				</ul>
			</section>
			{(pricings ?? []).length > 0 ? (
				<p className="mt-4 text-xs text-zinc-600">
					{pricings!.length} vehicle pricing tier(s) in catalogue (labels via{' '}
					<code className="text-zinc-500">vehicle_pricings</code> / categories).
				</p>
			) : null}
		</div>
	)
}
