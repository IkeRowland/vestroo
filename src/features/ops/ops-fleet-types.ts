/** Shared types for ops fleet UI (`OpsVehiclesFleetPanel`, grid, browser — Story 17.12). */

export type OpsFleetCategoryOption = { id: string; name: string }

export type OpsFleetVehicleRow = {
	id: string
	name: string
	license_plate: string
	category_id: string
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
}
