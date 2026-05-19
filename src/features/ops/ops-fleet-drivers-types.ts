/** Row shape for drivers on **`/ops/fleet/drivers`** — from `profiles` (ops chauffeur role). */
export type OpsFleetDriverRow = {
	id: string
	full_name: string
	status: string
	phone: string | null
	email: string
	default_vehicle_id: string | null
	/** Public URL from Supabase Storage (optional headshot). */
	avatar_url: string | null
	/** CSS **`object-position`** when rendering **`avatar_url`** as cover (circle). */
	avatar_object_position: string
}
