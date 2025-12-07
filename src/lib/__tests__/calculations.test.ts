import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculatePrice, type PriceCalculationInput } from '../calculations';
import { getPayload } from 'payload';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import config from '@payload-config';

// Mock PayloadCMS
vi.mock('payload', () => ({
  getPayload: vi.fn(),
}));

// Mock config with default export
vi.mock('@payload-config', () => ({
  default: {},
}));

describe('Pricing Calculation', () => {
  const mockPayload = {
    findByID: vi.fn(),
    find: vi.fn(),
  };

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getPayload).mockResolvedValue(mockPayload as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('calculatePrice', () => {
    const baseInput: PriceCalculationInput = {
      route_id: 'route-1',
      vehicle_type_id: 'vehicle-1',
      pickup_datetime: new Date('2024-12-25T10:00:00Z'),
      passenger_count: 2,
    };

    it('should calculate price with route base price and vehicle multiplier only', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.5,
        is_active: true,
      });

      // Mock pricing rules (empty - no matching rules)
      mockPayload.find.mockResolvedValueOnce({
        docs: [],
      });

      const result = await calculatePrice(baseInput);

      expect(result.base_price).toBe(100);
      expect(result.vehicle_base_price).toBe(150); // 100 * 1.5
      expect(result.final_price).toBe(150);
      expect(result.applied_rules).toHaveLength(0);
    });

    it('should apply single pricing rule correctly', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (one matching rule with +20% modifier)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Peak Hours',
            route_id: null, // Applies to all routes
            vehicle_type_id: null, // Applies to all vehicle types
            price_modifier_percent: 20,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const result = await calculatePrice(baseInput);

      expect(result.base_price).toBe(100);
      expect(result.vehicle_base_price).toBe(100); // 100 * 1.0
      expect(result.final_price).toBe(120); // 100 * 1.2
      expect(result.applied_rules).toHaveLength(1);
      expect(result.applied_rules[0].rule_name).toBe('Peak Hours');
      expect(result.applied_rules[0].modifier_percent).toBe(20);
      expect(result.applied_rules[0].price_before).toBe(100);
      expect(result.applied_rules[0].price_after).toBe(120);
    });

    it('should apply multiple pricing rules in priority order (cumulative)', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (two matching rules)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Weekend Surcharge',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 15,
            day_of_week: 'saturday',
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 50, // Higher priority (lower number)
            is_active: true,
          },
          {
            id: 'rule-2',
            name: 'Peak Hours',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 20,
            day_of_week: null,
            start_time: '08:00',
            end_time: '18:00',
            start_date: null,
            end_date: null,
            priority: 100, // Lower priority (higher number)
            is_active: true,
          },
        ],
      });

      // Pickup datetime: Saturday 10:00 (matches both rules)
      const input: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-28T10:00:00Z'), // Saturday
      };

      const result = await calculatePrice(input);

      expect(result.base_price).toBe(100);
      expect(result.vehicle_base_price).toBe(100);
      // First apply Weekend Surcharge (+15%): 100 * 1.15 = 115
      // Then apply Peak Hours (+20%): 115 * 1.20 = 138
      expect(result.final_price).toBeCloseTo(138, 2);
      expect(result.applied_rules).toHaveLength(2);
      expect(result.applied_rules[0].rule_name).toBe('Weekend Surcharge'); // Applied first (priority 50)
      expect(result.applied_rules[1].rule_name).toBe('Peak Hours'); // Applied second (priority 100)
    });

    it('should filter rules by route_id when specified', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (one route-specific, one general)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Route-Specific Rule',
            route_id: 'route-1', // Matches
            vehicle_type_id: null,
            price_modifier_percent: 10,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
          {
            id: 'rule-2',
            name: 'Other Route Rule',
            route_id: 'route-2', // Doesn't match
            vehicle_type_id: null,
            price_modifier_percent: 20,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const result = await calculatePrice(baseInput);

      expect(result.final_price).toBeCloseTo(110, 2); // Only route-specific rule applied
      expect(result.applied_rules).toHaveLength(1);
      expect(result.applied_rules[0].rule_name).toBe('Route-Specific Rule');
    });

    it('should filter rules by vehicle_type_id when specified', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (one vehicle-specific, one general)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Vehicle-Specific Rule',
            route_id: null,
            vehicle_type_id: 'vehicle-1', // Matches
            price_modifier_percent: 10,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
          {
            id: 'rule-2',
            name: 'Other Vehicle Rule',
            route_id: null,
            vehicle_type_id: 'vehicle-2', // Doesn't match
            price_modifier_percent: 20,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const result = await calculatePrice(baseInput);

      expect(result.final_price).toBeCloseTo(110, 2); // Only vehicle-specific rule applied
      expect(result.applied_rules).toHaveLength(1);
      expect(result.applied_rules[0].rule_name).toBe('Vehicle-Specific Rule');
    });

    it('should filter rules by day_of_week', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (one for Monday, one for all days)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Monday Rule',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 10,
            day_of_week: 'monday',
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
          {
            id: 'rule-2',
            name: 'All Days Rule',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 5,
            day_of_week: 'all',
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      // Pickup datetime: Monday
      const input: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-23T10:00:00Z'), // Monday
      };

      const result = await calculatePrice(input);

      // Both rules should match (Monday matches 'monday' and 'all')
      expect(result.applied_rules).toHaveLength(2);
    });

    it('should filter rules by time range', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (peak hours: 08:00-18:00)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Peak Hours',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 20,
            day_of_week: null,
            start_time: '08:00',
            end_time: '18:00',
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      // Pickup datetime: 10:00 (within peak hours)
      const inputInRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-25T10:00:00Z'),
      };

      const resultInRange = await calculatePrice(inputInRange);
      expect(resultInRange.final_price).toBeCloseTo(120, 2); // Rule applied

      // Mock for second call - Pickup datetime: 20:00 (outside peak hours)
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Peak Hours',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 20,
            day_of_week: null,
            start_time: '08:00',
            end_time: '18:00',
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const inputOutOfRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-25T20:00:00Z'),
      };

      const resultOutOfRange = await calculatePrice(inputOutOfRange);
      expect(resultOutOfRange.final_price).toBeCloseTo(100, 2); // Rule not applied
    });

    it('should filter rules by date range', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (holiday pricing: Dec 24-26)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Holiday Pricing',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 30,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: '2024-12-24',
            end_date: '2024-12-26',
            priority: 100,
            is_active: true,
          },
        ],
      });

      // Pickup datetime: Dec 25 (within date range)
      const inputInRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-25T10:00:00Z'),
      };

      const resultInRange = await calculatePrice(inputInRange);
      expect(resultInRange.final_price).toBeCloseTo(130, 2); // Rule applied

      // Mock for second call - Pickup datetime: Dec 27 (outside date range)
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Holiday Pricing',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: 30,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: '2024-12-24',
            end_date: '2024-12-26',
            priority: 100,
            is_active: true,
          },
        ],
      });

      const inputOutOfRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-27T10:00:00Z'),
      };

      const resultOutOfRange = await calculatePrice(inputOutOfRange);
      expect(resultOutOfRange.final_price).toBeCloseTo(100, 2); // Rule not applied
    });

    it('should handle negative price modifiers (discounts)', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules (off-peak discount: -10%)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Off-Peak Discount',
            route_id: null,
            vehicle_type_id: null,
            price_modifier_percent: -10,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const result = await calculatePrice(baseInput);

      expect(result.final_price).toBeCloseTo(90, 2); // 100 * (1 - 0.10) = 90
      expect(result.applied_rules[0].modifier_percent).toBe(-10);
    });

    it('should throw error if route not found', async () => {
      mockPayload.findByID.mockResolvedValueOnce(null);

      await expect(calculatePrice(baseInput)).rejects.toThrow(
        'Route with ID route-1 not found or has no base price'
      );
    });

    it('should throw error if vehicle type not found', async () => {
      mockPayload.findByID
        .mockResolvedValueOnce({
          id: 'route-1',
          base_price: 100,
        })
        .mockResolvedValueOnce(null);

      await expect(calculatePrice(baseInput)).rejects.toThrow(
        'Vehicle type with ID vehicle-1 not found or has no price multiplier'
      );
    });

    it('should throw error if vehicle type is inactive', async () => {
      mockPayload.findByID
        .mockResolvedValueOnce({
          id: 'route-1',
          base_price: 100,
        })
        .mockResolvedValueOnce({
          id: 'vehicle-1',
          price_multiplier: 1.0,
          is_active: false,
        });

      await expect(calculatePrice(baseInput)).rejects.toThrow(
        'Vehicle type with ID vehicle-1 is not active'
      );
    });

    it('should handle relationship fields as objects (populated)', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules with populated relationship (object with id)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Route-Specific Rule',
            route_id: { id: 'route-1' }, // Populated relationship
            vehicle_type_id: null,
            price_modifier_percent: 10,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const result = await calculatePrice(baseInput);

      expect(result.final_price).toBeCloseTo(110, 2);
      expect(result.applied_rules).toHaveLength(1);
    });

    it('should handle relationship fields as strings (unpopulated)', async () => {
      // Mock route
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'route-1',
        base_price: 100,
      });

      // Mock vehicle type
      mockPayload.findByID.mockResolvedValueOnce({
        id: 'vehicle-1',
        price_multiplier: 1.0,
        is_active: true,
      });

      // Mock pricing rules with unpopulated relationship (string ID)
      mockPayload.find.mockResolvedValueOnce({
        docs: [
          {
            id: 'rule-1',
            name: 'Route-Specific Rule',
            route_id: 'route-1', // Unpopulated relationship
            vehicle_type_id: null,
            price_modifier_percent: 10,
            day_of_week: null,
            start_time: null,
            end_time: null,
            start_date: null,
            end_date: null,
            priority: 100,
            is_active: true,
          },
        ],
      });

      const result = await calculatePrice(baseInput);

      expect(result.final_price).toBeCloseTo(110, 2);
      expect(result.applied_rules).toHaveLength(1);
    });
  });
});

