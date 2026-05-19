import type { SupabaseClient } from '@supabase/supabase-js'

import {
	extractOpsBookingVehicleCategoryNameForDetail,
	loadOpsBookingDetail,
	type OpsBookingDetailRow,
} from '@/lib/ops-booking-detail'
import {
	fleetVehicleClassificationLabel,
	fleetVehicleMatchesBookingVehicleClass,
} from '@/lib/ops-booking-vehicle-class-match'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

export type OpsBookingAssignableDriverRow = {
	id: string
	full_name: string
	default_vehicle_id: string
	vehicle_name: string
	vehicle_classification_label: string
	matches_requested_class: boolean
}

export type OpsBookingAssignLoadResult = {
	booking: OpsBookingDetailRow | null
	bookingError: string | null
	requested_vehicle_class: string | null
	drivers: OpsBookingAssignableDriverRow[]
	driversError: string | null
}

export async function loadOpsBookingAssignPageState(
	supabase: SupabaseClient,
	bookingId: string,
): Promise<OpsBookingAssignLoadResult> {
	const [booking, driversRes] = await Promise.all([
		loadOpsBookingDetail(supabase, bookingId),
		supabase
			.from('profiles')
			.select('id, full_name, default_vehicle_id')
			.eq('role', PROFILE_ROLE_OPS_DRIVER_DB)
			.not('status', 'eq', 'inactive')
			.not('status', 'eq', 'unavailable')
			.not('default_vehicle_id', 'is', null)
			.order('full_name'),
	])

	const driversError = driversRes.error?.message ?? null
	const driverRows = driversRes.data ?? []
	const vehicleIds = [
		...new Set(
			driverRows
				.map((d) => d.default_vehicle_id as string | null)
				.filter((id): id is string => typeof id === 'string' && id.length > 0),
		),
	]

	const vehicleById = new Map<
		string,
		{ name: string; seats: number | null; categoryName: string | null; is_fleet_active: boolean }
	>()
	if (vehicleIds.length > 0) {
		const { data: vehRows, error: vErr } = await supabase
			.from('vehicles')
			.select('id, name, seats, is_fleet_active, vehicle_categories ( name )')
			.in('id', vehicleIds)
		if (vErr) {
			return {
				booking,
				bookingError: null,
				requested_vehicle_class: booking
					? extractOpsBookingVehicleCategoryNameForDetail(booking)
					: null,
				drivers: [],
				driversError: vErr.message,
			}
		}
		for (const v of vehRows ?? []) {
			const id = v.id as string
			const catRaw = (v as { vehicle_categories?: unknown }).vehicle_categories
			const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw
			const categoryName =
				cat && typeof cat === 'object' && 'name' in cat
					? String((cat as { name: unknown }).name ?? '').trim() || null
					: null
			vehicleById.set(id, {
				name: String((v as { name?: string }).name ?? '').trim() || 'Vehicle',
				seats: typeof v.seats === 'number' ? v.seats : null,
				categoryName,
				is_fleet_active: Boolean((v as { is_fleet_active?: boolean }).is_fleet_active),
			})
		}
	}

	const requested_vehicle_class = booking
		? extractOpsBookingVehicleCategoryNameForDetail(booking)
		: null

	const drivers: OpsBookingAssignableDriverRow[] = []
	for (const d of driverRows) {
		const vid = d.default_vehicle_id as string | null
		if (!vid) continue
		const veh = vehicleById.get(vid)
		if (!veh || !veh.is_fleet_active) continue
		const vehicle_classification_label = fleetVehicleClassificationLabel(
			veh.categoryName,
			veh.seats,
		)
		const matches_requested_class = fleetVehicleMatchesBookingVehicleClass(
			requested_vehicle_class,
			veh.categoryName,
			veh.seats,
		)
		drivers.push({
			id: d.id as string,
			full_name: String((d as { full_name?: string }).full_name ?? '').trim() || 'Driver',
			default_vehicle_id: vid,
			vehicle_name: veh.name,
			vehicle_classification_label,
			matches_requested_class,
		})
	}

	drivers.sort((a, b) => {
		if (a.matches_requested_class !== b.matches_requested_class) {
			return a.matches_requested_class ? -1 : 1
		}
		return a.full_name.localeCompare(b.full_name)
	})

	return {
		booking,
		bookingError: null,
		requested_vehicle_class,
		drivers,
		driversError,
	}
}
