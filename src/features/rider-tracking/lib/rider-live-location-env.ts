/**
 * Global deploy switch for public live rider map (Epic 15 / 15B.5).
 * Same truthy parsing spirit as {@link isSmsEnabled} in `src/services/sms.ts`.
 */
export function isRiderLiveLocationEnvEnabled(): boolean {
	const v = process.env.RIDER_LIVE_LOCATION_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}
