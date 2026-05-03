import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
	OpsActionGroup,
	OpsPageHeader,
} from '@/features/ops/components/ops-primitives'
import { OpsVehiclesFleetPanel } from '@/features/ops/components/OpsVehiclesFleetPanel'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { opsVehiclesCopy } from '@/features/ops/copy/ops-vehicles-copy'
import {
	getRawOpsVehiclesSelectedId,
	OPS_VEHICLES_PATH,
	parseOpsVehiclesPageSelectedId,
	parseOpsVehiclesPageView,
} from '@/lib/ops-vehicles-url'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Category dropdown order on ops Add/Edit vehicle form. */
const FLEET_CATEGORY_ORDER = ['Sedan', 'SUV', 'MPV', 'Minibus'] as const

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpsVehiclesPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	const { data: vehicles, error: vErr } = await supabase
		.from('vehicles')
		.select(
			'id, name, license_plate, operation_status, vehicle_condition, category_id, make, model, model_year, mileage_km, color, seats, transmission, fuel_type, description, primary_image_url, gallery_image_urls',
		)
		.order('name')

	const { data: categories } = await supabase.from('vehicle_categories').select('id, name')

	const { data: trips } = await supabase
		.from('trips')
		.select('id, vehicle_id, status')
		.limit(200)

	if (vErr) {
		return (
			<div>
				<OpsPageHeader title={opsVehiclesCopy.pageTitle} description={opsVehiclesCopy.pageDescription} />
				<div className="mt-4">
					<OpsFetchErrorIsland title="Vehicles could not be loaded" message={vErr.message} />
				</div>
			</div>
		)
	}

	const tripRows = trips ?? []
	const activeTripCountByVehicleId: Record<string, number> = {}
	for (const v of vehicles ?? []) {
		const vid = v.id as string
		const active = tripRows.filter((t) => {
			if (t.vehicle_id !== vid) return false
			const st = String(t.status ?? '').toLowerCase()
			if (st === 'cancelled' || st === 'completed') return false
			return true
		})
		activeTripCountByVehicleId[vid] = active.length
	}

	const fleetRows = (vehicles ?? []).map((v) => ({
		id: v.id as string,
		name: v.name as string,
		license_plate: v.license_plate as string,
		category_id: v.category_id as string,
		operation_status: String(v.operation_status ?? ''),
		vehicle_condition: String(v.vehicle_condition ?? ''),
		make: (v.make as string | null) ?? null,
		model: (v.model as string | null) ?? null,
		model_year: (v.model_year as number | null) ?? null,
		mileage_km: (v.mileage_km as number | null) ?? null,
		color: (v.color as string | null) ?? null,
		seats: (v.seats as number | null) ?? null,
		transmission: (v.transmission as string | null) ?? null,
		fuel_type: (v.fuel_type as string | null) ?? null,
		description: (v.description as string | null) ?? null,
		primary_image_url: (v.primary_image_url as string | null) ?? null,
		gallery_image_urls: (v.gallery_image_urls as string[] | null) ?? [],
	}))

	const knownIds = new Set(fleetRows.map((v) => v.id))
	const rawId = getRawOpsVehiclesSelectedId(raw)
	if (rawId && !knownIds.has(rawId)) {
		redirect(OPS_VEHICLES_PATH)
	}
	const selectedVehicleId = parseOpsVehiclesPageSelectedId(raw, knownIds)
	const view = parseOpsVehiclesPageView(raw)

	const rawCats = (categories ?? []).map((c) => ({
		id: c.id as string,
		name: (c.name as string) ?? '',
	}))
	const orderSet = new Set<string>(FLEET_CATEGORY_ORDER)
	const ordered = FLEET_CATEGORY_ORDER.map((name) => rawCats.find((c) => c.name === name)).filter(
		(c): c is { id: string; name: string } => Boolean(c),
	)
	const extras = rawCats.filter((c) => !orderSet.has(c.name))
	const categoryOptions = [...ordered, ...extras]

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader title={opsVehiclesCopy.pageTitle} description={opsVehiclesCopy.pageDescription}>
				<OpsActionGroup>
					<Button
						variant="outline"
						size="sm"
						className="border-ops-border bg-transparent text-ops-foreground hover:bg-ops-surface-hover hover:text-ops-foreground focus-visible:ring-ops"
						asChild
					>
						<Link href="/ops/roster">Driver roster</Link>
					</Button>
				</OpsActionGroup>
			</OpsPageHeader>
			<OpsDataFreshnessBar className="mt-4" fetchedAtIso={fetchedAtIso} />

			<div className="mt-4">
				<OpsVehiclesFleetPanel
					vehicles={fleetRows}
					categories={categoryOptions}
					activeTripCountByVehicleId={activeTripCountByVehicleId}
					view={view}
					selectedVehicleId={selectedVehicleId}
				/>
			</div>
		</div>
	)
}
