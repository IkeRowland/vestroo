import { afterEach, describe, expect, it, vi } from 'vitest'

import {
	buildAppleMapsUrl,
	buildGoogleMapsUrl,
	calculateRouteDistance,
} from '@/lib/maps'

describe('maps deep links', () => {
	it('builds Google Maps dir URL for coordinates', () => {
		const u = buildGoogleMapsUrl({ kind: 'coords', lat: -33.9, lng: 18.4 })
		expect(u).toContain('google.com/maps/dir/')
		expect(u).toContain(encodeURIComponent('-33.9,18.4'))
	})

	it('builds Google Maps search URL for query', () => {
		const u = buildGoogleMapsUrl({ kind: 'query', query: 'Cape Town CBD' })
		expect(u).toContain('google.com/maps/search/')
		expect(u).toContain(encodeURIComponent('Cape Town CBD'))
	})

	it('builds Apple Maps URL for coordinates', () => {
		const u = buildAppleMapsUrl({ kind: 'coords', lat: -33.9, lng: 18.4 })
		expect(u).toContain('maps.apple.com')
		expect(u).toContain('-33.9')
		expect(u).toContain('18.4')
	})

	it('builds Apple Maps URL for query', () => {
		const u = buildAppleMapsUrl({ kind: 'query', query: 'V&A Waterfront' })
		expect(u).toContain('maps.apple.com')
		expect(u).toContain(encodeURIComponent('V&A Waterfront'))
	})
})

describe('calculateRouteDistance', () => {
	const origin = { lat: -26.1, lng: 28.0, placeId: 'a' }
	const dest = { lat: -26.2, lng: 28.1, placeId: 'b' }

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('parses OK element into km and minutes', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						status: 'OK',
						rows: [
							{
								elements: [
									{
										status: 'OK',
										distance: { value: 10_000 },
										duration: { value: 900 },
									},
								],
							},
						],
					}),
			}),
		)

		const r = await calculateRouteDistance(origin, dest, 'key')
		expect(r.status).toBe('OK')
		expect(r.distance).toBe(10)
		expect(r.duration).toBe(15)
	})

	it('returns REQUEST_DENIED with Google error_message', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						status: 'REQUEST_DENIED',
						error_message: 'The provided API key is invalid.',
					}),
			}),
		)

		const r = await calculateRouteDistance(origin, dest, 'key')
		expect(r.status).toBe('REQUEST_DENIED')
		expect(r.detail).toBe('The provided API key is invalid.')
	})

	it('maps element NOT_FOUND to status NOT_FOUND', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						status: 'OK',
						rows: [{ elements: [{ status: 'NOT_FOUND' }] }],
					}),
			}),
		)

		const r = await calculateRouteDistance(origin, dest, 'key')
		expect(r.status).toBe('NOT_FOUND')
		expect(r.detail).toBe('NOT_FOUND')
	})
})
