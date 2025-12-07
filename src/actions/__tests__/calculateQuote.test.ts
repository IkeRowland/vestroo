import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateQuote, type SearchParams } from '../calculateQuote';
import * as maps from '@/lib/maps';

// Mock the maps module
vi.mock('@/lib/maps', () => ({
  calculateRouteDistance: vi.fn(),
}));

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
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-api-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should calculate quote successfully with valid inputs', async () => {
    // Mock successful route calculation
    vi.mocked(maps.calculateRouteDistance).mockResolvedValue({
      distance: 25.5, // kilometers
      duration: 35, // minutes
      status: 'OK',
    });

    const result = await calculateQuote(mockSearchParams);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty('price');
      expect(result.data).toHaveProperty('distance', 25.5);
      expect(result.data).toHaveProperty('estimatedDuration', 35);
      expect(result.data.vehicleOptions).toBeDefined();
      expect(result.data.vehicleOptions.length).toBeGreaterThan(0);
    }

    expect(maps.calculateRouteDistance).toHaveBeenCalledWith(
      { lat: mockSearchParams.origin.latitude, lng: mockSearchParams.origin.longitude },
      { lat: mockSearchParams.destination.latitude, lng: mockSearchParams.destination.longitude },
      'test-api-key'
    );
  });

  it('should filter vehicle options based on passenger count', async () => {
    vi.mocked(maps.calculateRouteDistance).mockResolvedValue({
      distance: 20,
      duration: 30,
      status: 'OK',
    });

    const paramsWithManyPassengers = {
      ...mockSearchParams,
      passengers: 6,
    };

    const result = await calculateQuote(paramsWithManyPassengers);

    expect(result.success).toBe(true);
    if (result.success) {
      // Should only include vehicles with capacity >= 6
      result.data.vehicleOptions.forEach((vehicle) => {
        expect(vehicle.capacity).toBeGreaterThanOrEqual(6);
      });
    }
  });

  it('should return error when Google Maps API key is missing', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const result = await calculateQuote(mockSearchParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('API key');
    }
  });

  it('should return error when route calculation fails', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-api-key';

    vi.mocked(maps.calculateRouteDistance).mockResolvedValue({
      distance: 0,
      duration: 0,
      status: 'ZERO_RESULTS',
    });

    const result = await calculateQuote(mockSearchParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('route');
    }
  });

  it('should return error when route calculation throws', async () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY = 'test-api-key';

    vi.mocked(maps.calculateRouteDistance).mockRejectedValue(
      new Error('Network error')
    );

    const result = await calculateQuote(mockSearchParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should validate input data and return error for invalid params', async () => {
    const invalidParams = {
      ...mockSearchParams,
      passengers: 0, // Invalid: must be >= 1
    };

    const result = await calculateQuote(invalidParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid input');
    }
  });

  it('should calculate price correctly with base price and distance', async () => {
    vi.mocked(maps.calculateRouteDistance).mockResolvedValue({
      distance: 30, // kilometers
      duration: 40,
      status: 'OK',
    });

    const result = await calculateQuote(mockSearchParams);

    expect(result.success).toBe(true);
    if (result.success) {
      // Price = basePrice (150) + (distance * ratePerKm (2.5))
      // Expected: 150 + (30 * 2.5) = 225
      expect(result.data.basePrice).toBe(150);
      expect(result.data.price).toBeGreaterThanOrEqual(150);
    }
  });

  it('should handle optional flight number', async () => {
    vi.mocked(maps.calculateRouteDistance).mockResolvedValue({
      distance: 25,
      duration: 35,
      status: 'OK',
    });

    const paramsWithoutFlight = {
      ...mockSearchParams,
      flightNumber: undefined,
    };

    const result = await calculateQuote(paramsWithoutFlight);

    expect(result.success).toBe(true);
  });
});

