/**
 * URL contract for fleet **vehicles** tab at **`/ops/fleet/vehicles`** (Story 17.12 / FE.17.6, FE.17.5).
 * **`/ops/fleet`** redirects to **`/ops/fleet/drivers`** (default hub); vehicles stay at this path.
 * **`view`:** `grid` shows card grid; any other / absent value → **list** (default).
 * **`id`:** optional selected vehicle UUID for the detail rail.
 * Future **`page` / `per`** merge additively — preserve **`view`** + **`id`** when adding pagination.
 */
export const OPS_FLEET_PATH = '/ops/fleet/vehicles' as const

export type OpsVehiclesPageView = 'list' | 'grid'

function firstParam(
	raw: Record<string, string | string[] | undefined>,
	key: string,
): string | undefined {
	const v = raw[key]
	const s = Array.isArray(v) ? v[0] : v
	const t = (s ?? '').trim()
	return t.length > 0 ? t : undefined
}

export function getRawOpsVehiclesSelectedId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const id = firstParam(raw, 'id')
	return id ?? null
}

export function parseOpsVehiclesPageView(
	raw: Record<string, string | string[] | undefined>,
): OpsVehiclesPageView {
	return firstParam(raw, 'view') === 'grid' ? 'grid' : 'list'
}

/** Returns **`null`** when absent or not in **`knownVehicleIds`**. */
export function parseOpsVehiclesPageSelectedId(
	raw: Record<string, string | string[] | undefined>,
	knownVehicleIds: ReadonlySet<string>,
): string | null {
	const rawId = getRawOpsVehiclesSelectedId(raw)
	if (!rawId) return null
	return knownVehicleIds.has(rawId) ? rawId : null
}

export function buildOpsVehiclesHref(state: {
	view: OpsVehiclesPageView
	id: string | null
}): string {
	const params = new URLSearchParams()
	if (state.view === 'grid') {
		params.set('view', 'grid')
	}
	if (state.id) {
		params.set('id', state.id)
	}
	const q = params.toString()
	return q ? `${OPS_FLEET_PATH}?${q}` : OPS_FLEET_PATH
}
