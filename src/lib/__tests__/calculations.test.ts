import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculatePrice,
  calculateHourlyHirePrice,
  type PriceCalculationInput,
} from '../calculations'
import * as pricingData from '../pricing-data'

vi.mock('../pricing-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../pricing-data')>()
  return {
    ...actual,
    fetchVehicleTypeById: vi.fn(),
    fetchRouteById: vi.fn(),
    fetchActivePricingRules: vi.fn(),
  }
})

describe('Pricing Calculation', () => {
  beforeEach(() => {
    vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('calculatePrice', () => {
    const baseInput: PriceCalculationInput = {
      route_id: 'route-1',
      vehicle_type_id: 'vehicle-1',
      pickup_datetime: new Date('2024-12-25T10:00:00Z'),
      passenger_count: 2,
    }

    it('should calculate price with route base price and vehicle multiplier only', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.5,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })

      const result = await calculatePrice(baseInput)

      expect(result.base_price).toBe(100)
      expect(result.vehicle_base_price).toBe(150)
      expect(result.final_price).toBe(150)
      expect(result.applied_rules).toHaveLength(0)
    })

    it('should apply single pricing rule correctly', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Peak Hours',
          route_id: null,
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
      ])

      const result = await calculatePrice(baseInput)

      expect(result.base_price).toBe(100)
      expect(result.vehicle_base_price).toBe(100)
      expect(result.final_price).toBe(120)
      expect(result.applied_rules).toHaveLength(1)
      expect(result.applied_rules[0].rule_name).toBe('Peak Hours')
    })

    it('should apply multiple pricing rules in priority order (cumulative)', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
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
          priority: 50,
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
          priority: 100,
          is_active: true,
        },
      ])

      const input: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-28T10:00:00Z'),
      }

      const result = await calculatePrice(input)

      expect(result.final_price).toBeCloseTo(138, 2)
      expect(result.applied_rules).toHaveLength(2)
    })

    it('should filter rules by route_id when specified', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Route-Specific Rule',
          route_id: 'route-1',
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
          route_id: 'route-2',
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
      ])

      const result = await calculatePrice(baseInput)

      expect(result.final_price).toBeCloseTo(110, 2)
      expect(result.applied_rules).toHaveLength(1)
    })

    it('should filter rules by vehicle_type_id when specified', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Vehicle-Specific Rule',
          route_id: null,
          vehicle_type_id: 'vehicle-1',
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
          vehicle_type_id: 'vehicle-2',
          price_modifier_percent: 20,
          day_of_week: null,
          start_time: null,
          end_time: null,
          start_date: null,
          end_date: null,
          priority: 100,
          is_active: true,
        },
      ])

      const result = await calculatePrice(baseInput)

      expect(result.final_price).toBeCloseTo(110, 2)
      expect(result.applied_rules).toHaveLength(1)
    })

    it('should filter rules by day_of_week', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
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
      ])

      const input: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-23T10:00:00Z'),
      }

      const result = await calculatePrice(input)

      expect(result.applied_rules).toHaveLength(2)
    })

    it('should filter rules by time range', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
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
      ])

      const inputInRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-25T10:00:00Z'),
      }

      const resultInRange = await calculatePrice(inputInRange)
      expect(resultInRange.final_price).toBeCloseTo(120, 2)

      const inputOutOfRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-25T20:00:00Z'),
      }

      const resultOutOfRange = await calculatePrice(inputOutOfRange)
      expect(resultOutOfRange.final_price).toBeCloseTo(100, 2)
    })

    it('should filter rules by date range', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
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
      ])

      const inputInRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-25T10:00:00Z'),
      }

      const resultInRange = await calculatePrice(inputInRange)
      expect(resultInRange.final_price).toBeCloseTo(130, 2)

      const inputOutOfRange: PriceCalculationInput = {
        ...baseInput,
        pickup_datetime: new Date('2024-12-27T10:00:00Z'),
      }

      const resultOutOfRange = await calculatePrice(inputOutOfRange)
      expect(resultOutOfRange.final_price).toBeCloseTo(100, 2)
    })

    it('should handle negative price modifiers (discounts)', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
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
      ])

      const result = await calculatePrice(baseInput)

      expect(result.final_price).toBeCloseTo(90, 2)
      expect(result.applied_rules[0].modifier_percent).toBe(-10)
    })

    it('should throw error if route not found', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue(null)

      await expect(calculatePrice(baseInput)).rejects.toThrow(
        'Route with ID route-1 not found or has no base price'
      )
    })

    it('should throw error if vehicle type not found', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue(null)

      await expect(calculatePrice(baseInput)).rejects.toThrow(
        'Vehicle type with ID vehicle-1 not found or has no price multiplier'
      )
    })

    it('should throw error if vehicle type is inactive', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: false,
      })

      await expect(calculatePrice(baseInput)).rejects.toThrow(
        'Vehicle type with ID vehicle-1 is not active'
      )
    })

    it('should handle relationship fields as objects (populated)', async () => {
      vi.mocked(pricingData.fetchRouteById).mockResolvedValue({
        id: 'route-1',
        base_price: 100,
        is_active: true,
      })
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Van',
        price_multiplier: 1.0,
        passenger_capacity: 8,
        luggage_capacity: 8,
        is_active: true,
      })
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([
        {
          id: 'rule-1',
          name: 'Route-Specific Rule',
          route_id: { id: 'route-1' },
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
      ])

      const result = await calculatePrice(baseInput)

      expect(result.final_price).toBeCloseTo(110, 2)
      expect(result.applied_rules).toHaveLength(1)
    })
  })

  describe('calculateHourlyHirePrice', () => {
    afterEach(() => {
      delete process.env.PRICING_HOURLY_BASE_RATE_ZAR
      delete process.env.PRICING_HOURLY_MINIMUM_HOURS
    })

    it('applies minimum billable hours and vehicle multiplier', async () => {
      vi.mocked(pricingData.fetchActivePricingRules).mockResolvedValue([])
      vi.mocked(pricingData.fetchVehicleTypeById).mockResolvedValue({
        id: 'vehicle-1',
        name: 'Premium Sedan',
        price_multiplier: 1.2,
        passenger_capacity: 4,
        luggage_capacity: 2,
        is_active: true,
      })
      process.env.PRICING_HOURLY_BASE_RATE_ZAR = '500'
      process.env.PRICING_HOURLY_MINIMUM_HOURS = '3'

      const result = await calculateHourlyHirePrice({
        vehicle_type_id: 'vehicle-1',
        pickup_datetime: new Date('2024-12-25T10:00:00Z'),
        duration_hours: 1,
      })

      expect(result.base_price).toBe(1500)
      expect(result.vehicle_base_price).toBe(1800)
      expect(result.final_price).toBe(1800)
    })
  })
})
