import type { SupabaseClient } from '@supabase/supabase-js'

import { initQuoteLinkSigningKeyAtStartup } from '@/lib/quote-tokens'
import { signRiderTrackToken } from '@/lib/tracking-tokens'

/**
 * Mint a signed **`rider_track`** deep link for Playwright (Epic 15 / **15B.2**, **15B.8**).
 * Requires **`QUOTE_LINK_SIGNING_KEY`** (≥32 UTF-8 bytes), same as the Next **`webServer`**.
 */
export function ensureQuoteLinkSigningKeyForRiderTrackE2e(): void {
	const raw = process.env.QUOTE_LINK_SIGNING_KEY?.trim() ?? ''
	if (Buffer.byteLength(raw, 'utf8') < 32) {
		throw new Error(
			'QUOTE_LINK_SIGNING_KEY must be set (≥32 UTF-8 bytes) for rider track token minting in E2E.',
		)
	}
	initQuoteLinkSigningKeyAtStartup()
}

/**
 * Resolves a **`trips.id`** for **`/track/[token]`** happy-path tests.
 * Prefer **`E2E_RIDER_TRACK_TRIP_ID`** when set; otherwise the newest **`trips`** row (if any).
 */
export async function resolveTripIdForRiderTrackE2e(svc: SupabaseClient): Promise<string | null> {
	const fromEnv = process.env.E2E_RIDER_TRACK_TRIP_ID?.trim()
	if (fromEnv) {
		const { data, error } = await svc.from('trips').select('id').eq('id', fromEnv).maybeSingle()
		if (!error && data?.id) return data.id as string
		return null
	}
	const { data, error } = await svc
		.from('trips')
		.select('id')
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (error || !data?.id) return null
	return data.id as string
}

export function mintRiderTrackTokenForTripId(tripId: string): string {
	ensureQuoteLinkSigningKeyForRiderTrackE2e()
	const expMs = Date.now() + 4 * 60 * 60 * 1000
	return signRiderTrackToken({
		trip_id: tripId,
		purpose: 'rider_track',
		exp: expMs,
	})
}
