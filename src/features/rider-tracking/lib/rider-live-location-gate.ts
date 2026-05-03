/** Seconds since `updatedAtIso` (floor, non-negative). */
export function riderTrackPositionAgeSeconds(updatedAtIso: string, nowMs: number): number {
	const t = Date.parse(updatedAtIso)
	if (Number.isNaN(t)) return 0
	return Math.max(0, Math.floor((nowMs - t) / 1000))
}

const STALE_POSITION_THRESHOLD_SEC = 90

/**
 * When the latest server `updated_at` is older than 90s, show accessible staleness copy.
 * Returns `null` when fresh enough (no extra line).
 */
export function riderTrackLastUpdatedStaleLabel(updatedAtIso: string, nowMs: number): string | null {
	const ageSec = riderTrackPositionAgeSeconds(updatedAtIso, nowMs)
	if (ageSec <= STALE_POSITION_THRESHOLD_SEC) return null

	const rtf = new Intl.RelativeTimeFormat('en', { style: 'long', numeric: 'auto' })
	const minutes = Math.floor(ageSec / 60)
	if (minutes < 60) {
		return `Last updated ${rtf.format(-minutes, 'minute')}`
	}
	const hours = Math.floor(minutes / 60)
	if (hours < 48) {
		return `Last updated ${rtf.format(-hours, 'hour')}`
	}
	const days = Math.floor(hours / 24)
	return `Last updated ${rtf.format(-days, 'day')}`
}

/** Server should load `vehicle_trackings` only when this is true (POPIA + Q22). */
export function shouldFetchRiderTrackLivePosition(args: {
	envEnabled: boolean
	accountLiveRiderTracking: boolean
	/** Raw `trips.status` — only `en_route` loads live position for the map. */
	tripStatusRaw: string
}): boolean {
	return args.envEnabled && args.accountLiveRiderTracking && args.tripStatusRaw === 'en_route'
}

/** Client: render live map iframe only when a narrow position DTO exists (no “coming soon” placeholder). */
export function shouldRenderLiveLocationMap(position: { lat: number; lng: number } | null | undefined): boolean {
	return position != null && Number.isFinite(position.lat) && Number.isFinite(position.lng)
}
