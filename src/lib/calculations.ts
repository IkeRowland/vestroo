import type { PricingRuleRow } from '@/lib/pricing-data'
import {
  fetchActivePricingRules,
  fetchRouteById,
  fetchVehicleTypeById,
} from '@/lib/pricing-data'
import {
  getPricingBasePricePerKm,
  getPricingHourlyBaseRateZar,
  getPricingHourlyMinimumHours,
} from '@/lib/pricing-env'

/**
 * Input parameters for price calculation
 */
export type PriceCalculationInput = {
  route_id?: string // Optional for distance-based pricing
  vehicle_type_id: string
  pickup_datetime: Date
  passenger_count?: number
  distance_km?: number // Distance in kilometers for distance-based pricing
  base_price_per_km?: number // Base price per kilometer (if not using route)
}

/**
 * Result of price calculation
 */
export type PriceCalculationResult = {
  base_price: number
  vehicle_base_price: number
  final_price: number
  applied_rules: Array<{
    rule_id: string
    rule_name: string
    modifier_percent: number
    price_before: number
    price_after: number
  }>
}

/**
 * Get day of week name from Date
 */
function getDayOfWeek(date: Date): string {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return days[date.getDay()]
}

/**
 * Check if a time falls within a time range
 */
function isTimeInRange(
  time: string,
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) {
    return true // If no time range specified, rule applies to all times
  }

  const [timeHours, timeMinutes] = time.split(':').map(Number)
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)

  const timeMinutesTotal = timeHours * 60 + timeMinutes
  const startMinutesTotal = startHours * 60 + startMinutes
  const endMinutesTotal = endHours * 60 + endMinutes

  // Handle time ranges that span midnight
  if (startMinutesTotal > endMinutesTotal) {
    return (
      timeMinutesTotal >= startMinutesTotal ||
      timeMinutesTotal <= endMinutesTotal
    )
  }

  return (
    timeMinutesTotal >= startMinutesTotal &&
    timeMinutesTotal <= endMinutesTotal
  )
}

/**
 * Check if a date falls within a date range
 */
function isDateInRange(
  date: Date,
  startDate: string | null,
  endDate: string | null
): boolean {
  if (!startDate && !endDate) {
    return true // If no date range specified, rule applies to all dates
  }

  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  if (startDate) {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    if (checkDate < start) {
      return false
    }
  }

  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    if (checkDate > end) {
      return false
    }
  }

  return true
}

function relationId(
  value: string | number | null | { id: string | number } | undefined
): string | null {
  if (value == null) {
    return null
  }
  if (typeof value === 'object' && 'id' in value) {
    return String(value.id)
  }
  return String(value)
}

/**
 * Get matching pricing rules based on criteria
 */
function filterMatchingPricingRules(
  rules: PricingRuleRow[],
  routeId: string | null,
  vehicleTypeId: string,
  pickupDatetime: Date
): Array<{
  id: string
  name: string
  price_modifier_percent: number
  priority: number
}> {
  const matchingRules: Array<{
    id: string
    name: string
    price_modifier_percent: number
    priority: number
  }> = []

  const pickupTime = `${pickupDatetime.getHours().toString().padStart(2, '0')}:${pickupDatetime.getMinutes().toString().padStart(2, '0')}`
  const dayOfWeek = getDayOfWeek(pickupDatetime)

  for (const rule of rules) {
    // Check route match (null means applies to all routes)
    // Skip route check if routeId is null (distance-based pricing)
    const ruleRouteId = relationId(rule.route_id ?? undefined)
    if (ruleRouteId && routeId) {
      if (ruleRouteId !== routeId) {
        continue
      }
    }

    const ruleVehicleId = relationId(rule.vehicle_type_id ?? undefined)
    if (ruleVehicleId) {
      if (ruleVehicleId !== vehicleTypeId) {
        continue
      }
    }

    if (
      rule.day_of_week &&
      rule.day_of_week !== 'all' &&
      rule.day_of_week !== dayOfWeek
    ) {
      continue
    }

    if (
      !isTimeInRange(
        pickupTime,
        rule.start_time || null,
        rule.end_time || null
      )
    ) {
      continue
    }

    if (
      !isDateInRange(
        pickupDatetime,
        rule.start_date || null,
        rule.end_date || null
      )
    ) {
      continue
    }

    matchingRules.push({
      id: String(rule.id),
      name: rule.name,
      price_modifier_percent: rule.price_modifier_percent,
      priority: rule.priority,
    })
  }

  matchingRules.sort((a, b) => a.priority - b.priority)

  return matchingRules
}

/**
 * Apply price modifiers in order
 */
function applyPriceModifiers(
  basePrice: number,
  rules: Array<{
    id: string
    name: string
    price_modifier_percent: number
    priority: number
  }>
): {
  finalPrice: number
  appliedRules: Array<{
    rule_id: string
    rule_name: string
    modifier_percent: number
    price_before: number
    price_after: number
  }>
} {
  let currentPrice = basePrice
  const appliedRules: Array<{
    rule_id: string
    rule_name: string
    modifier_percent: number
    price_before: number
    price_after: number
  }> = []

  for (const rule of rules) {
    const priceBefore = currentPrice
    const modifier = rule.price_modifier_percent / 100
    currentPrice = currentPrice * (1 + modifier)
    const priceAfter = currentPrice

    appliedRules.push({
      rule_id: String(rule.id),
      rule_name: rule.name,
      modifier_percent: rule.price_modifier_percent,
      price_before: priceBefore,
      price_after: priceAfter,
    })
  }

  return {
    finalPrice: currentPrice,
    appliedRules,
  }
}

/**
 * Calculate price based on route OR distance, vehicle type, and pricing rules
 */
export async function calculatePrice(
  input: PriceCalculationInput
): Promise<PriceCalculationResult> {
  let basePrice: number

  if (input.distance_km !== undefined && input.distance_km !== null) {
    const basePricePerKm =
      input.base_price_per_km ?? getPricingBasePricePerKm()
    basePrice = input.distance_km * basePricePerKm
  } else if (input.route_id) {
    const route = await fetchRouteById(input.route_id)

    if (!route || route.base_price == null) {
      throw new Error(
        `Route with ID ${input.route_id} not found or has no base price`
      )
    }

    basePrice = route.base_price
  } else {
    throw new Error('Either route_id or distance_km must be provided')
  }

  const vehicleType = await fetchVehicleTypeById(input.vehicle_type_id)

  if (!vehicleType || vehicleType.price_multiplier == null) {
    throw new Error(
      `Vehicle type with ID ${input.vehicle_type_id} not found or has no price multiplier`
    )
  }

  if (vehicleType.is_active === false) {
    throw new Error(
      `Vehicle type with ID ${input.vehicle_type_id} is not active`
    )
  }

  const vehicleBasePrice = basePrice * vehicleType.price_multiplier

  const allRules = await fetchActivePricingRules()
  const matchingRules = filterMatchingPricingRules(
    allRules,
    input.route_id || null,
    input.vehicle_type_id,
    input.pickup_datetime
  )

  const { finalPrice, appliedRules } = applyPriceModifiers(
    vehicleBasePrice,
    matchingRules
  )

  return {
    base_price: basePrice,
    vehicle_base_price: vehicleBasePrice,
    final_price: finalPrice,
    applied_rules: appliedRules,
  }
}

export type HourlyHireCalculationInput = {
  vehicle_type_id: string
  pickup_datetime: Date
  duration_hours: number
}

/**
 * Premium hourly / dedicated hire: billable hours = max(requested, minimum floor) × hourly rate × vehicle multiplier,
 * then pricing rules (when present) apply to that subtotal.
 */
export async function calculateHourlyHirePrice(
  input: HourlyHireCalculationInput
): Promise<PriceCalculationResult> {
  const minHours = getPricingHourlyMinimumHours()
  const hourlyRate = getPricingHourlyBaseRateZar()
  const billableHours = Math.max(input.duration_hours, minHours)
  const basePrice = billableHours * hourlyRate

  const vehicleType = await fetchVehicleTypeById(input.vehicle_type_id)

  if (!vehicleType || vehicleType.price_multiplier == null) {
    throw new Error(
      `Vehicle type with ID ${input.vehicle_type_id} not found or has no price multiplier`
    )
  }

  if (vehicleType.is_active === false) {
    throw new Error(
      `Vehicle type with ID ${input.vehicle_type_id} is not active`
    )
  }

  const vehicleBasePrice = basePrice * vehicleType.price_multiplier

  const allRules = await fetchActivePricingRules()
  const matchingRules = filterMatchingPricingRules(
    allRules,
    null,
    input.vehicle_type_id,
    input.pickup_datetime
  )

  const { finalPrice, appliedRules } = applyPriceModifiers(
    vehicleBasePrice,
    matchingRules
  )

  return {
    base_price: basePrice,
    vehicle_base_price: vehicleBasePrice,
    final_price: finalPrice,
    applied_rules: appliedRules,
  }
}
