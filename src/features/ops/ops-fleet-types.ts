/** Shared types for ops fleet UI (`OpsVehiclesFleetPanel`, grid, browser — Story 17.12). */

export type OpsFleetCategoryOption = { id: string; name: string }

/** Ops driver profile (**`profiles.role`** chauffeur) shown in vehicle pickers. */
export type OpsFleetVehicleDriverOption = {
	id: string
	full_name: string
}

/** Driver whose **`profiles.default_vehicle_id`** points at this vehicle, if any. */
export type OpsFleetVehicleAssignedDriver = {
	id: string
	full_name: string
	avatar_url: string | null
	avatar_object_position: string
}

export type OpsFleetVehicleRow = {
	id: string
	name: string
	license_plate: string
	category_id: string
	/** When false, excluded from assignment and availability suggestions; still editable here. */
	is_fleet_active: boolean
	operation_status: string
	vehicle_condition: string
	make: string | null
	model: string | null
	model_year: number | null
	mileage_km: number | null
	color: string | null
	seats: number | null
	transmission: string | null
	fuel_type: string | null
	description: string | null
	primary_image_url: string | null
	gallery_image_urls: string[]
	assigned_driver: OpsFleetVehicleAssignedDriver | null
}
