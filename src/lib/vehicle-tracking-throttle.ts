/**
 * Server-side cap for `vehicle_trackings` writes per chauffeur assignment.
 * Documented limit: {@link VEHICLE_TRACKING_MAX_UPDATES_PER_MINUTE} per minute — see `docs/realtime-and-notifications.md`.
 */
export const VEHICLE_TRACKING_MAX_UPDATES_PER_MINUTE = 12

export const VEHICLE_TRACKING_MIN_INTERVAL_MS = Math.ceil(
	60_000 / VEHICLE_TRACKING_MAX_UPDATES_PER_MINUTE,
)

export function isVehicleTrackingThrottled(
	lastUpdatedAtIso: string | null | undefined,
	nowMs: number,
): boolean {
	if (!lastUpdatedAtIso) {
		return false
	}
	const last = Date.parse(lastUpdatedAtIso)
	if (Number.isNaN(last)) {
		return false
	}
	return nowMs - last < VEHICLE_TRACKING_MIN_INTERVAL_MS
}
