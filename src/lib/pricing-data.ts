import { createServerClient } from '@/lib/supabase/server'
import { getPricingBasePricePerKm } from '@/lib/pricing-env'

/** Tier multiplier when DB has no separate multiplier column (see vehicle_categories). */
function defaultMultiplierForCategoryName(name: string): number {
  const n = name.toLowerCase()
  if (n.includes('mini') || n.includes('bus')) return 1.6
  if (n.includes('van') || n.includes('mpv')) return 1.35
  return 1
}

export type VehicleTypeRow = {
  id: string
  name: string
  price_multiplier: number
  passenger_capacity: number
  luggage_capacity: number
  image_url?: string | null
  is_active?: boolean | null
}

export type PricingRuleRow = {
  id: string
  name: string
  route_id: string | number | null | { id: string | number }
  vehicle_type_id: string | number | null | { id: string | number }
  price_modifier_percent: number
  day_of_week: string | null
  start_time: string | null
  end_time: string | null
  start_date: string | null
  end_date: string | null
  priority: number
  is_active?: boolean | null
}

export type RouteRow = {
  id: string
  base_price: number
  is_active?: boolean | null
}

/** Used when Postgres has no vehicle_types rows yet (e.g. fresh env). */
const DEFAULT_VEHICLE_TYPES: VehicleTypeRow[] = [
  {
    id: '1',
    name: 'Premium Sedan',
    price_multiplier: 1,
    passenger_capacity: 4,
    luggage_capacity: 2,
    is_active: true,
  },
  {
    id: '2',
    name: 'Premium Van',
    price_multiplier: 1.35,
    passenger_capacity: 8,
    luggage_capacity: 8,
    is_active: true,
  },
  {
    id: '3',
    name: 'Luxury Minibus',
    price_multiplier: 1.6,
    passenger_capacity: 13,
    luggage_capacity: 12,
    is_active: true,
  },
]

function mapVehicleCategoryRow(row: Record<string, unknown>): VehicleTypeRow {
  const name = String(row.name)
  const seats = Number(row.number_of_seat)
  return {
    id: String(row.id),
    name,
    price_multiplier: defaultMultiplierForCategoryName(name),
    passenger_capacity: Number.isFinite(seats) ? seats : 4,
    luggage_capacity: Number.isFinite(seats)
      ? Math.max(0, Math.floor(seats / 2))
      : 2,
    image_url: null,
    is_active: true,
  }
}

/**
 * Fleet categories from `vehicle_categories` (Supabase core schema).
 */
export async function fetchActiveVehicleTypes(): Promise<VehicleTypeRow[]> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('vehicle_categories')
      .select('id,name,number_of_seat')
      .order('name')

    if (error || !data?.length) {
      if (error) {
        console.warn('[pricing-data] vehicle_categories:', error.message)
      }
      return DEFAULT_VEHICLE_TYPES
    }

    return data.map((row) => mapVehicleCategoryRow(row as Record<string, unknown>))
  } catch (e) {
    console.warn('[pricing-data] vehicle_categories exception', e)
    return DEFAULT_VEHICLE_TYPES
  }
}

export async function fetchVehicleTypeById(id: string): Promise<VehicleTypeRow | null> {
  const fallback = DEFAULT_VEHICLE_TYPES.find((v) => v.id === id) ?? null

  try {
    const supabase = await createServerClient()
    const { data: cat, error: catErr } = await supabase
      .from('vehicle_categories')
      .select('id,name,number_of_seat')
      .eq('id', id)
      .maybeSingle()

    if (!catErr && cat) {
      return mapVehicleCategoryRow(cat as Record<string, unknown>)
    }

    /** Trip-request Slide 2 stores `public.vehicles.id`; resolve pricing tier via category. */
    const { data: veh, error: vehErr } = await supabase
      .from('vehicles')
      .select('category_id')
      .eq('id', id)
      .maybeSingle()

    if (vehErr || !veh?.category_id) {
      return fallback
    }

    const { data: cat2, error: cat2Err } = await supabase
      .from('vehicle_categories')
      .select('id,name,number_of_seat')
      .eq('id', veh.category_id as string)
      .maybeSingle()

    if (cat2Err || !cat2) {
      return fallback
    }

    return mapVehicleCategoryRow(cat2 as Record<string, unknown>)
  } catch {
    return fallback
  }
}

export async function fetchRouteById(id: string): Promise<RouteRow | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('service_routes')
      .select('id,total_distance,status')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    const row = data as Record<string, unknown>
    const perKm = getPricingBasePricePerKm()
    const distance = Number(row.total_distance)
    const basePrice = Number.isFinite(distance) ? distance * perKm : 0
    return {
      id: String(row.id),
      base_price: basePrice,
      is_active: String(row.status) === 'active',
    }
  } catch {
    return null
  }
}

export async function fetchActivePricingRules(): Promise<PricingRuleRow[]> {
  // No `pricing_rules` table in current Supabase schema; modifiers deferred (VST-6+).
  return []
}
