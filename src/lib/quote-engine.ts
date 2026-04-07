import { calculateRouteDistance } from '@/lib/maps'
import { calculatePrice } from '@/lib/calculations'
import { fetchActiveVehicleTypes } from '@/lib/pricing-data'
import { getPricingBasePricePerKm } from '@/lib/pricing-env'
import type {
  PointToPointQuoteResult,
  PointToPointSearchParams,
  QuoteVehicleOption,
} from '@/lib/booking-quote-types'

/**
 * Server-only: compute point-to-point quote (maps + vehicle tiers + pricing rules path).
 */
export async function computePointToPointQuote(
  params: PointToPointSearchParams,
  mapsApiKey: string
): Promise<
  { ok: true; data: PointToPointQuoteResult } | { ok: false; error: string }
> {
  const routeInfo = await calculateRouteDistance(
    {
      lat: params.origin.latitude,
      lng: params.origin.longitude,
      placeId: params.origin.placeId,
    },
    {
      lat: params.destination.latitude,
      lng: params.destination.longitude,
      placeId: params.destination.placeId,
    },
    mapsApiKey
  )

  if (routeInfo.status !== 'OK') {
    return {
      ok: false,
      error: 'Unable to calculate route. Please check your locations.',
    }
  }

  const vehicleTypes = await fetchActiveVehicleTypes()
  if (vehicleTypes.length === 0) {
    return {
      ok: false,
      error: 'No vehicle types available. Please contact support.',
    }
  }

  const basePricePerKm = getPricingBasePricePerKm()

  const vehicleOptions: QuoteVehicleOption[] = await Promise.all(
    vehicleTypes
      .filter((vt) => vt.passenger_capacity >= params.passengers)
      .map(async (vt) => {
        try {
          const priceResult = await calculatePrice({
            vehicle_type_id: vt.id,
            pickup_datetime: params.date,
            passenger_count: params.passengers,
            distance_km: routeInfo.distance,
            base_price_per_km: basePricePerKm,
          })
          return {
            id: vt.id,
            name: vt.name,
            capacity: vt.passenger_capacity,
            price: Math.round(priceResult.final_price * 100) / 100,
            luggageCapacity: vt.luggage_capacity
              ? String(vt.luggage_capacity)
              : undefined,
            imageUrl: vt.image_url || undefined,
          }
        } catch (error) {
          console.error(`Error calculating price for vehicle type ${vt.id}:`, error)
          const fallbackPrice =
            routeInfo.distance * basePricePerKm * vt.price_multiplier
          return {
            id: vt.id,
            name: vt.name,
            capacity: vt.passenger_capacity,
            price: Math.round(fallbackPrice * 100) / 100,
            luggageCapacity: vt.luggage_capacity
              ? String(vt.luggage_capacity)
              : undefined,
            imageUrl: vt.image_url || undefined,
          }
        }
      })
  )

  if (vehicleOptions.length === 0) {
    return {
      ok: false,
      error: `No vehicles available for ${params.passengers} passenger(s). Please select fewer passengers or contact support.`,
    }
  }

  vehicleOptions.sort((a, b) => a.price - b.price)

  const finalPrice = vehicleOptions[0]?.price ?? 0
  const basePrice = routeInfo.distance * basePricePerKm

  return {
    ok: true,
    data: {
      price: finalPrice,
      basePrice,
      distance: routeInfo.distance,
      estimatedDuration: routeInfo.duration,
      vehicleOptions,
      routeDetails: {
        origin: params.origin.formattedAddress,
        destination: params.destination.formattedAddress,
      },
    },
  }
}

export function findVehicleOptionPrice(
  options: QuoteVehicleOption[],
  vehicleId: string
): number | null {
  const v = options.find((o) => o.id === vehicleId)
  return v ? v.price : null
}
