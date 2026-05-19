import { redirect } from 'next/navigation'

import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsVehiclesFleetPanel } from '@/features/ops/components/OpsVehiclesFleetPanel'
import {
	getRawOpsVehiclesSelectedId,
	OPS_FLEET_PATH,
	parseOpsVehiclesPageSelectedId,
	parseOpsVehiclesPageView,
} from '@/lib/ops-vehicles-url'
import { normalizeOpsDriverAvatarObjectPosition } from '@/features/ops/lib/ops-driver-avatar-display'
import { createUserServerClient } from '@/lib/supabase/server'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

export const dynamic = 'force-dynamic'

/** Category dropdown order on ops Add/Edit vehicle form. */
const FLEET_CATEGORY_ORDER = ['Sedan', 'SUV', 'MPV', 'Minibus'] as const

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OpsFleetVehiclesTabPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	const { data: vehicles, error: vErr } = await supabase
		.from('vehicles')
		.select(
			'id, name, license_plate, is_fleet_active, operation_status, vehicle_condition, category_id, make, model, model_year, mileage_km, color, seats, transmission, fuel_type, description, primary_image_url, gallery_image_urls',
		)
		.order('name')

	const { data: categories } = await supabase.from('vehicle_categories').select('id, name')

	const { data: driverProfiles } = await supabase
		.from('profiles')
		.select('id, full_name, default_vehicle_id, avatar_url, avatar_object_position')
		.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)

	if (vErr) {
		return (
			<div className="mt-4">
				<OpsFetchErrorIsland title="Vehicles could not be loaded" message={vErr.message} />
			</div>
		)
	}

	const assignedDriverByVehicleId: Record<
		string,
		{
			id: string
			full_name: string
			avatar_url: string | null
			avatar_object_position: string
		}
	> = {}
	for (const p of driverProfiles ?? []) {
		const vid = p.default_vehicle_id as string | null | undefined
		if (!vid || typeof vid !== 'string') continue
		if (assignedDriverByVehicleId[vid]) continue
		const fullName = String((p as { full_name?: string }).full_name ?? '').trim()
		const avatarUrl =
			typeof p.avatar_url === 'string' && p.avatar_url.trim().length > 0 ? p.avatar_url.trim() : null
		assignedDriverByVehicleId[vid] = {
			id: p.id as string,
			full_name: fullName || 'Driver',
			avatar_url: avatarUrl,
			avatar_object_position: normalizeOpsDriverAvatarObjectPosition(
				typeof p.avatar_object_position === 'string' ? p.avatar_object_position : null,
			),
		}
	}

	const driverOptions = (driverProfiles ?? []).map((p) => ({
		id: p.id as string,
		full_name: String((p as { full_name?: string }).full_name ?? '').trim() || 'Driver',
	}))

	const fleetRows = (vehicles ?? []).map((v) => ({
		id: v.id as string,
		name: v.name as string,
		license_plate: v.license_plate as string,
		category_id: v.category_id as string,
		is_fleet_active: v.is_fleet_active !== false,
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
		assigned_driver: assignedDriverByVehicleId[v.id as string] ?? null,
	}))

	const knownIds = new Set(fleetRows.map((v) => v.id))
	const rawId = getRawOpsVehiclesSelectedId(raw)
	if (rawId && !knownIds.has(rawId)) {
		redirect(OPS_FLEET_PATH)
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
		<div className="mt-4 min-w-0 max-w-full">
			<OpsDataFreshnessBar className="mt-0" fetchedAtIso={fetchedAtIso} />

			<div className="mt-4">
				<OpsVehiclesFleetPanel
					vehicles={fleetRows}
					categories={categoryOptions}
					driverOptions={driverOptions}
					view={view}
					selectedVehicleId={selectedVehicleId}
				/>
			</div>
		</div>
	)
}
