import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { calculateQuote, type SearchParams } from '../calculateQuote'
import * as quoteEngine from '@/lib/quote-engine'

vi.mock('@/lib/quote-engine', () => ({
	computePointToPointQuote: vi.fn(),
}))

describe('calculateQuote', () => {
	const mockSearchParams: SearchParams = {
		origin: {
			placeId: 'place_1',
			formattedAddress: 'OR Tambo Airport, Johannesburg',
			name: 'OR Tambo Airport',
			latitude: -26.1367,
			longitude: 28.2411,
		},
		destination: {
			placeId: 'place_2',
			formattedAddress: 'Sandton City, Sandton',
			name: 'Sandton City',
			latitude: -26.1076,
			longitude: 28.0567,
		},
		date: new Date('2024-12-25'),
		passengers: 2,
		flightNumber: 'SA123',
	}

	beforeEach(() => {
		process.env.GOOGLE_MAPS_SERVER_KEY = 'test-api-key'
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should calculate quote successfully with valid inputs', async () => {
		vi.mocked(quoteEngine.computePointToPointQuote).mockResolvedValue({
			ok: true,
			data: {
				price: 120,
				basePrice: 561,
				distance: 25.5,
				estimatedDuration: 35,
				vehicleOptions: [
					{
						id: 'v1',
						name: 'Sedan',
						capacity: 4,
						price: 120,
					},
				],
				routeDetails: {
					origin: mockSearchParams.origin.formattedAddress,
					destination: mockSearchParams.destination.formattedAddress,
				},
			},
		})

		const result = await calculateQuote(mockSearchParams)

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data).toHaveProperty('price')
			expect(result.data).toHaveProperty('distance', 25.5)
			expect(result.data).toHaveProperty('estimatedDuration', 35)
			expect(result.data.vehicleOptions).toBeDefined()
			expect(result.data.vehicleOptions.length).toBeGreaterThan(0)
		}

		expect(quoteEngine.computePointToPointQuote).toHaveBeenCalledWith(
			expect.objectContaining({
				passengers: 2,
				origin: expect.objectContaining({ placeId: 'place_1' }),
			}),
			'test-api-key',
		)
	})

	it('should filter vehicle options based on passenger count', async () => {
		vi.mocked(quoteEngine.computePointToPointQuote).mockResolvedValue({
			ok: true,
			data: {
				price: 200,
				basePrice: 440,
				distance: 20,
				estimatedDuration: 30,
				vehicleOptions: [
					{ id: 'a', name: 'Van', capacity: 8, price: 200 },
				],
				routeDetails: { origin: 'a', destination: 'b' },
			},
		})

		const paramsWithManyPassengers = {
			...mockSearchParams,
			passengers: 6,
		}

		const result = await calculateQuote(paramsWithManyPassengers)

		expect(result.success).toBe(true)
		if (result.success) {
			result.data.vehicleOptions.forEach((vehicle) => {
				expect(vehicle.capacity).toBeGreaterThanOrEqual(6)
			})
		}
	})

	it('should return error when Google Maps server API key is missing', async () => {
		delete process.env.GOOGLE_MAPS_SERVER_KEY

		const result = await calculateQuote(mockSearchParams)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error).toContain('GOOGLE_MAPS_SERVER_KEY')
		}
	})

	it('should return error when route calculation fails', async () => {
		process.env.GOOGLE_MAPS_SERVER_KEY = 'test-api-key'

		vi.mocked(quoteEngine.computePointToPointQuote).mockResolvedValue({
			ok: false,
			error: 'Unable to calculate route. Please check your locations.',
		})

		const result = await calculateQuote(mockSearchParams)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error).toContain('route')
		}
	})

	it('should return error when route calculation throws inside engine', async () => {
		process.env.GOOGLE_MAPS_SERVER_KEY = 'test-api-key'

		vi.mocked(quoteEngine.computePointToPointQuote).mockRejectedValue(new Error('Network error'))

		const result = await calculateQuote(mockSearchParams)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error).toBeDefined()
		}
	})

	it('should validate input data and return error for invalid params', async () => {
		const invalidParams = {
			...mockSearchParams,
			passengers: 0,
		}

		const result = await calculateQuote(invalidParams)

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error).toContain('Invalid input')
		}
	})

	it('should calculate price correctly with base price and distance', async () => {
		vi.mocked(quoteEngine.computePointToPointQuote).mockResolvedValue({
			ok: true,
			data: {
				price: 150,
				basePrice: 30 * 22,
				distance: 30,
				estimatedDuration: 40,
				vehicleOptions: [{ id: 'x', name: 'Car', capacity: 4, price: 150 }],
				routeDetails: { origin: 'a', destination: 'b' },
			},
		})

		const result = await calculateQuote(mockSearchParams)

		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.data.basePrice).toBe(30 * 22)
			expect(result.data.price).toBeGreaterThan(0)
		}
	})

	it('should handle optional flight number', async () => {
		vi.mocked(quoteEngine.computePointToPointQuote).mockResolvedValue({
			ok: true,
			data: {
				price: 100,
				basePrice: 550,
				distance: 25,
				estimatedDuration: 35,
				vehicleOptions: [{ id: 'y', name: 'Car', capacity: 4, price: 100 }],
				routeDetails: { origin: 'a', destination: 'b' },
			},
		})

		const paramsWithoutFlight = {
			...mockSearchParams,
			flightNumber: undefined,
		}

		const result = await calculateQuote(paramsWithoutFlight)

		expect(result.success).toBe(true)
	})
})
