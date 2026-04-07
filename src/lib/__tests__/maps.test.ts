import { describe, expect, it } from 'vitest'

import { buildAppleMapsUrl, buildGoogleMapsUrl } from '@/lib/maps'

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
