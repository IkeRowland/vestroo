/**
 * URL contract for **`/ops/trips`** (Story 17.13 / FE.17.5, FE.17.12 rollout item 4).
 * **`id`:** optional selected **`trips.id`** UUID for **`OpsSplitView`** detail rail.
 * **`page` / `per`** — **deferred** (Story 17.8); when added, merge additively with **`id`** (preserve both).
 */
export const OPS_TRIPS_PATH = '/ops/trips' as const

function firstParam(
	raw: Record<string, string | string[] | undefined>,
	key: string,
): string | undefined {
	const v = raw[key]
	const s = Array.isArray(v) ? v[0] : v
	const t = (s ?? '').trim()
	return t.length > 0 ? t : undefined
}

export function getRawOpsTripsSelectedId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const id = firstParam(raw, 'id')
	return id ?? null
}

/** Returns **`null`** when absent or not in **`knownTripIds`**. */
export function parseOpsTripsPageSelectedId(
	raw: Record<string, string | string[] | undefined>,
	knownTripIds: ReadonlySet<string>,
): string | null {
	const rawId = getRawOpsTripsSelectedId(raw)
	if (!rawId) return null
	return knownTripIds.has(rawId) ? rawId : null
}

export function buildOpsTripsHref(state: { id: string | null }): string {
	const params = new URLSearchParams()
	if (state.id) {
		params.set('id', state.id)
	}
	const q = params.toString()
	return q ? `${OPS_TRIPS_PATH}?${q}` : OPS_TRIPS_PATH
}
