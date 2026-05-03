/**
 * Maps integration (VST-13 contract)
 *
 * **Provider:** Google Maps Platform for this codebase (no Mapbox hybrid in MVP).
 * - **Browser:** Places / Autocomplete via Maps JavaScript API using `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
 *   only in client components (e.g. `AddressAutocomplete`). Public rider **`/track`** live map uses the
 *   same browser key with the **Maps Embed API** (read-only view; no polyline/ETA in 15B.5). Restrict this key to **HTTP referrers**
 *   in Google Cloud Console; it must not enable unrestricted Distance Matrix server abuse.
 * - **Server:** Distance Matrix–class calls (`calculateRouteDistance`) use **`GOOGLE_MAPS_SERVER_KEY`**
 *   (server-only env — never `NEXT_PUBLIC_*`). Restrict that key by **server IP** (Vercel egress) or
 *   equivalent. Quote reconciliation and `calculateQuote` use this server key, not the public key.
 * - **Deep links:** `buildGoogleMapsUrl` / `buildAppleMapsUrl` — no keys; used from field tools and
 *   booking UI. Aligns with `Permissions-Policy: geolocation=(self)` in `next.config.ts` (site may
 *   request geolocation; third-party embeds are not implied).
 *
 * **Call sites:** `AddressAutocomplete` (client), `calculateQuote` + `reconcileBookingQuote` →
 * `computePointToPointQuote` / `calculateRouteDistance` (server).
 */

/**
 * Map deep-link builders — no API keys; URLs are opened by the device browser / maps app.
 */

export type MapsTarget =
	| { kind: 'coords'; lat: number; lng: number; label?: string }
	| { kind: 'query'; query: string }

/** Subset of Google Places `PlaceResult` used by `AddressAutocomplete` / booking forms. */
export type PlaceResult = {
	place_id?: string
	formatted_address?: string
	name?: string
	geometry?: {
		location: { lat: () => number; lng: () => number }
	}
	types?: string[]
}

/** Heuristic: airport-type POI or name/address contains “airport”. */
export function isAirport(place: PlaceResult): boolean {
	const types = place.types ?? []
	if (types.includes('airport')) {
		return true
	}
	const label = `${place.name ?? ''} ${place.formatted_address ?? ''}`.toLowerCase()
	return label.includes('airport')
}

function encodeQueryPart(s: string): string {
	return encodeURIComponent(s.trim())
}

/**
 * Google Maps universal link (works on mobile + desktop).
 */
export function buildGoogleMapsUrl(target: MapsTarget): string {
	if (target.kind === 'coords') {
		const dest = `${target.lat},${target.lng}`
		return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`
	}
	return `https://www.google.com/maps/search/?api=1&query=${encodeQueryPart(target.query)}`
}

/**
 * Apple Maps URL scheme / web fallback host.
 */
export function buildAppleMapsUrl(target: MapsTarget): string {
	if (target.kind === 'coords') {
		const label = target.label ? encodeQueryPart(target.label) : ''
		const base = `https://maps.apple.com/?daddr=${target.lat},${target.lng}`
		return label ? `${base}&q=${label}` : base
	}
	return `https://maps.apple.com/?q=${encodeQueryPart(target.query)}`
}

/** Google Distance Matrix element / top-level status (subset). */
export type RouteDistanceStatus =
	| 'OK'
	| 'ZERO_RESULTS'
	| 'NOT_FOUND'
	| 'REQUEST_DENIED'
	| 'UNKNOWN_ERROR'

export type RouteDistanceResult = {
	distance: number
	duration: number
	status: RouteDistanceStatus
	/** Google `error_message` or element status when `status` is not OK */
	detail?: string
}

/**
 * API key for Distance Matrix and other server-side Maps web services.
 * Never use `NEXT_PUBLIC_*` for this path (see `docs/integrations-and-payments.md`).
 */
export function getGoogleMapsServerApiKey(): string | undefined {
	const k = process.env.GOOGLE_MAPS_SERVER_KEY?.trim()
	return k || undefined
}

type DistanceMatrixResponse = {
	status: string
	error_message?: string
	rows?: Array<{
		elements?: Array<{
			status: string
			distance?: { value: number }
			duration?: { value: number }
		}>
	}>
}

/**
 * Road distance and duration via Google Distance Matrix API (server-side; pass key from env).
 */
export async function calculateRouteDistance(
	origin: { lat: number; lng: number; placeId: string },
	destination: { lat: number; lng: number; placeId: string },
	apiKey: string,
): Promise<RouteDistanceResult> {
	try {
		const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
		url.searchParams.set('origins', `${origin.lat},${origin.lng}`)
		url.searchParams.set('destinations', `${destination.lat},${destination.lng}`)
		url.searchParams.set('units', 'metric')
		url.searchParams.set('key', apiKey)
		const res = await fetch(url.toString())
		if (!res.ok) {
			return { distance: 0, duration: 0, status: 'UNKNOWN_ERROR' }
		}
		const data = (await res.json()) as DistanceMatrixResponse
		if (data.status !== 'OK') {
			const st = data.status
			const detail = data.error_message
			if (st === 'ZERO_RESULTS' || st === 'NOT_FOUND' || st === 'REQUEST_DENIED') {
				return {
					distance: 0,
					duration: 0,
					status: st as RouteDistanceStatus,
					detail,
				}
			}
			return {
				distance: 0,
				duration: 0,
				status: 'UNKNOWN_ERROR',
				detail,
			}
		}
		const el = data.rows?.[0]?.elements?.[0]
		if (!el || el.status !== 'OK') {
			const elStatus = el?.status ?? 'UNKNOWN'
			const top: RouteDistanceStatus =
				elStatus === 'NOT_FOUND' || elStatus === 'ZERO_RESULTS'
					? elStatus
					: 'ZERO_RESULTS'
			return { distance: 0, duration: 0, status: top, detail: elStatus }
		}
		const meters = el.distance?.value ?? 0
		const seconds = el.duration?.value ?? 0
		return {
			distance: meters / 1000,
			duration: Math.max(1, Math.ceil(seconds / 60)),
			status: 'OK',
		}
	} catch {
		return { distance: 0, duration: 0, status: 'UNKNOWN_ERROR' }
	}
}

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
	return (deg * Math.PI) / 180
}

/** Great-circle distance between two WGS84 points (kilometres). */
export function haversineDistanceKm(
	a: { lat: number; lng: number },
	b: { lat: number; lng: number },
): number {
	const dLat = toRad(b.lat - a.lat)
	const dLng = toRad(b.lng - a.lng)
	const la = toRad(a.lat)
	const lb = toRad(b.lat)
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Default assumed road speed when Directions/Matrix is not used (km/h). */
export const DEFAULT_ROAD_SPEED_KMH = 35

/**
 * Stub ETA: straight-line distance at {@link DEFAULT_ROAD_SPEED_KMH} (or override).
 * Prefer {@link calculateRouteDistance} when a Maps key is available.
 */
export function estimateTravelMinutesHaversine(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
	speedKmh: number = DEFAULT_ROAD_SPEED_KMH,
): number {
	const km = haversineDistanceKm(from, to)
	if (speedKmh <= 0) {
		return 0
	}
	return Math.max(1, Math.round((km / speedKmh) * 60))
}

export type LocationPrivacyTier = 'vip' | 'corporate' | 'staff'

/**
 * Coarser coordinates for lower-precision tiers (see docs/realtime-and-notifications.md).
 * Staff tier returns inputs unchanged.
 */
export function roundCoordinatesForPrivacyTier(
	lat: number,
	lng: number,
	tier: LocationPrivacyTier,
): { lat: number; lng: number } {
	if (tier === 'staff') {
		return { lat, lng }
	}
	const latDec = tier === 'vip' ? 3 : 4
	const lngDec = tier === 'vip' ? 3 : 4
	const factorLat = 10 ** latDec
	const factorLng = 10 ** lngDec
	return {
		lat: Math.round(lat * factorLat) / factorLat,
		lng: Math.round(lng * factorLng) / factorLng,
	}
}

// --- Client: Maps JavaScript API (Places) — single-flight loader ---

let placesClientLoadPromise: Promise<void> | null = null

async function waitForPlacesLibraryReady(timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		if (typeof window === 'undefined') return
		if (window.google?.maps?.places) return
		const maps = window.google?.maps
		if (maps?.importLibrary) {
			try {
				await maps.importLibrary('places')
				if (window.google?.maps?.places) return
			} catch {
				/* keep polling */
			}
		}
		await new Promise((r) => setTimeout(r, 50))
	}
	if (!window.google?.maps?.places) {
		throw new Error('Google Maps Places API not available after script load')
	}
}

/**
 * Loads the Maps JavaScript API with the Places library once (single-flight across the app).
 *
 * The script URL **must** use Google's `callback` parameter — do **not** add `loading=async` to the
 * loader URL: it makes `onload` fire before the Places library finishes bootstrapping, which caused
 * “Places API not available after script load” in dev.
 */
export function loadGoogleMapsPlacesClient(): Promise<void> {
	if (typeof window === 'undefined') {
		return Promise.resolve()
	}
	if (window.google?.maps?.places) {
		return Promise.resolve()
	}
	if (placesClientLoadPromise) {
		return placesClientLoadPromise
	}

	placesClientLoadPromise = (async (): Promise<void> => {
		const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
		if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
			throw new Error(
				'NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set. Add it to .env and restart the dev server.',
			)
		}

		const existingScript = document.querySelector<HTMLScriptElement>(
			'script[src*="maps.googleapis.com/maps/api/js"]',
		)
		if (existingScript) {
			await waitForPlacesLibraryReady(30_000)
			return
		}

		await new Promise<void>((resolve, reject) => {
			const cbName = `__vestrooGmapsPlacesCb_${Date.now()}_${Math.random().toString(36).slice(2)}`

			const cleanupCallback = () => {
				try {
					delete (window as unknown as Record<string, unknown>)[cbName]
				} catch {
					/* ignore */
				}
			}

			;(window as unknown as Record<string, () => void>)[cbName] = () => {
				cleanupCallback()
				void (async () => {
					try {
						if (window.google?.maps?.places) {
							resolve()
							return
						}
						const maps = window.google?.maps
						if (maps?.importLibrary) {
							await maps.importLibrary('places')
						}
						if (window.google?.maps?.places) {
							resolve()
						} else {
							reject(new Error('Google Maps Places API not available after callback'))
						}
					} catch (e) {
						reject(e instanceof Error ? e : new Error(String(e)))
					}
				})()
			}

			const script = document.createElement('script')
			script.async = true
			script.defer = true
			script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${cbName}`
			script.onerror = () => {
				cleanupCallback()
				reject(new Error('Failed to load Google Maps API script'))
			}
			document.head.appendChild(script)
		})
	})().catch((err: unknown) => {
		placesClientLoadPromise = null
		throw err
	})

	return placesClientLoadPromise
}
