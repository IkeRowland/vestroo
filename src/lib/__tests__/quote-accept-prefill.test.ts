import { describe, expect, it } from 'vitest'

import {
	buildBookAgainSearchPrefillHrefFromBooking,
	buildBookSearchPrefillHrefFromBooking,
	pickVehicleIdFromServiceTypeHint,
} from '@/lib/quote-accept-prefill'

describe('buildBookSearchPrefillHrefFromBooking', () => {
	it('builds /book/search with safe trip hints (Q17)', () => {
		const href = buildBookSearchPrefillHrefFromBooking({
			origin_address: 'Cape Town CBD',
			destination_address: 'Stellenbosch',
			passenger_count: 3,
			pickup_datetime: '2026-05-01T10:00:00.000Z',
			booking_intent: 'point_to_point',
		})
		expect(href.startsWith('/book/search?')).toBe(true)
		expect(href).toContain('originHint=')
		expect(href).toContain('destinationHint=')
		expect(href).toContain('passengers=3')
		expect(href).toContain('intent=point_to_point')
	})

	it('falls back to plain /book/search when no hints', () => {
		expect(
			buildBookSearchPrefillHrefFromBooking({
				origin_address: null,
				destination_address: null,
				passenger_count: null,
				pickup_datetime: null,
				booking_intent: null,
			}),
		).toBe('/book/search')
	})
})

describe('buildBookAgainSearchPrefillHrefFromBooking', () => {
	it('includes trip hints and omitTripDate; never tripDate (Story 15.8)', () => {
		const href = buildBookAgainSearchPrefillHrefFromBooking({
			origin_address: 'Cape Town',
			destination_address: 'Paarl',
			passenger_count: 2,
			booking_intent: 'point_to_point',
			service_type: 'luxury_van',
		})
		expect(href.startsWith('/book/search?')).toBe(true)
		expect(href).toContain('originHint=')
		expect(href).toContain('destinationHint=')
		expect(href).toContain('passengers=2')
		expect(href).toContain('intent=point_to_point')
		expect(href).toContain('serviceTypeHint=luxury_van')
		expect(href).toContain('omitTripDate=1')
		expect(href).not.toContain('tripDate=')
	})

	it('still adds omitTripDate when no other hints', () => {
		expect(
			buildBookAgainSearchPrefillHrefFromBooking({
				origin_address: null,
				destination_address: null,
				passenger_count: null,
				booking_intent: null,
				service_type: null,
			}),
		).toBe('/book/search?omitTripDate=1')
	})

	it('honours custom book search path (account portal)', () => {
		expect(
			buildBookAgainSearchPrefillHrefFromBooking(
				{
					origin_address: 'Cape Town',
					destination_address: null,
					passenger_count: null,
					booking_intent: null,
					service_type: null,
				},
				'/account/bookings',
			),
		).toBe('/account/bookings?originHint=Cape+Town&omitTripDate=1')
	})
})

describe('pickVehicleIdFromServiceTypeHint', () => {
	it('matches vehicle id when hint is a UUID', () => {
		expect(
			pickVehicleIdFromServiceTypeHint('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', [
				{ id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'Van' },
				{ id: 'other', name: 'Sedan' },
			]),
		).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
	})

	it('matches by name substring', () => {
		expect(
			pickVehicleIdFromServiceTypeHint('van', [
				{ id: 'v1', name: 'Premium Van' },
				{ id: 'v2', name: 'Sedan' },
			]),
		).toBe('v1')
	})
})
