'use client'

/**
 * Read-only Google Maps **Embed API** view (marker-free center) — see `src/lib/maps.ts` for key roles.
 * No polyline / ETA (Epic 15 / 15B.5). Uses `NEXT_PUBLIC_GOOGLE_MAPS_KEY` (HTTP referrer–restricted browser key).
 */
import { useEffect, useState } from 'react'

import { riderTrackLastUpdatedStaleLabel } from '../lib/rider-live-location-gate'

type Props = {
	lat: number
	lng: number
	updatedAtIso: string
}

export function LiveLocationMap({ lat, lng, updatedAtIso }: Props) {
	const [nowMs, setNowMs] = useState(() => Date.now())
	useEffect(() => {
		const id = window.setInterval(() => setNowMs(Date.now()), 15_000)
		return () => window.clearInterval(id)
	}, [])

	const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY?.trim()
	const stale = riderTrackLastUpdatedStaleLabel(updatedAtIso, nowMs)
	const src =
		mapKey != null && mapKey !== ''
			? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(mapKey)}&center=${lat},${lng}&zoom=15`
			: null

	return (
		<div className="space-y-2">
			<p className="text-xs font-medium uppercase tracking-wide text-gray-500">Live location</p>
			{stale != null ? (
				<p className="text-sm text-amber-800" role="status" aria-live="polite">
					{stale}
				</p>
			) : null}
			{src != null ? (
				<iframe
					title="Driver approximate map location"
					className="h-64 w-full max-w-full rounded-lg border border-gray-200"
					loading="lazy"
					referrerPolicy="no-referrer-when-downgrade"
					allowFullScreen={false}
					src={src}
				/>
			) : (
				<p className="text-sm text-gray-600">Map preview is unavailable.</p>
			)}
		</div>
	)
}
