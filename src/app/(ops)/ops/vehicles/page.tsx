import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
	OpsActionGroup,
	OpsFilterRow,
	OpsPageHeader,
	OpsTableShell,
} from '@/features/ops/components/ops-primitives'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
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
			<div>
				<OpsPageHeader title="Vehicle availability" description="Fleet utilisation and overlap checks." />
				<div className="mt-4">
					<OpsErrorState title="Vehicles could not be loaded" message={vErr.message} />
				</div>
			</div>
		)
	}

	const tripRows = trips ?? []

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader
				title="Vehicle availability"
				description={
					<>
						Fleet rows from <code className="text-ops-foreground/90">public.vehicles</code>{' '}
						with category labels. Utilisation counts non-terminal trips whose time window
						overlaps each vehicle. Double-booking uses the same overlap rule as dispatch
						actions (
						<code className="text-ops-foreground/90">src/lib/ops-time-windows.ts</code>).
					</>
				}
			>
				<OpsActionGroup>
					<Button
						variant="outline"
						size="sm"
						className="border-ops-border bg-transparent text-ops-foreground hover:bg-ops-surface-hover hover:text-ops-foreground focus-visible:ring-ops"
						asChild
					>
						<Link href="/ops/roster">Chauffeur roster</Link>
					</Button>
				</OpsActionGroup>
			</OpsPageHeader>

			<OpsFilterRow className="mt-4" aria-label="Fleet filters">
				<span className="text-ops-dense text-ops-muted">
					Fleet snapshot — filter controls can attach here in a later story.
				</span>
			</OpsFilterRow>

			<OpsTableShell
				className="mt-4"
				caption="Vehicles, categories, operational status, and active trip counts"
			>
				<thead>
					<tr className="border-b border-ops-border text-ops-table-header text-ops-muted">
						<th className="py-2 pr-4 font-semibold">Vehicle</th>
						<th className="py-2 pr-4 font-semibold">Plate</th>
						<th className="py-2 pr-4 font-semibold">Category</th>
						<th className="py-2 pr-4 font-semibold">Ops status</th>
						<th className="py-2 pr-4 font-semibold">Active trips</th>
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
							<tr key={vid} className="border-b border-ops-border/80">
								<td className="py-3 pr-4 text-ops-foreground">{v.name as string}</td>
								<td className="py-3 pr-4 font-mono text-ops-muted">
									{v.license_plate as string}
								</td>
								<td className="py-3 pr-4 text-ops-muted">
									{catName.get(v.category_id as string) ?? '—'}
								</td>
								<td className="py-3 pr-4 text-ops-muted">
									<span className="capitalize">{v.operation_status as string}</span> ·{' '}
									<span className="capitalize">{v.vehicle_condition as string}</span>
								</td>
								<td className="py-3 pr-4 text-ops-foreground/90">{active.length}</td>
							</tr>
						)
					})}
				</tbody>
			</OpsTableShell>
			<section className="mt-8 rounded-lg border border-ops-border bg-ops-surface/40 p-4">
				<h2 className="text-sm font-semibold text-ops-foreground">Overlap self-check</h2>
				<p className="mt-1 text-xs text-ops-muted">
					Pick two trip windows on the same vehicle — if both are non-terminal and intervals
					overlap, fulfilment should block or show an error (see assign / swap actions).
				</p>
				<ul className="mt-3 space-y-1 text-xs text-ops-muted">
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
				<p className="mt-4 text-xs text-ops-muted/80">
					{pricings!.length} vehicle pricing tier(s) in catalogue (labels via{' '}
					<code className="text-ops-muted">vehicle_pricings</code> / categories).
				</p>
			) : null}
		</div>
	)
}
