import {
  calculateRouteDistance,
  estimateTravelMinutesHaversine,
  haversineDistanceKm,
  type RouteDistanceResult,
} from '@/lib/maps'
import { calculatePrice } from '@/lib/calculations'
import { fetchActiveVehicleTypes } from '@/lib/pricing-data'
import { getPricingBasePricePerKm } from '@/lib/pricing-env'
import type {
  PointToPointQuoteResult,
  PointToPointSearchParams,
  QuoteVehicleOption,
} from '@/lib/booking-quote-types'

/** Approximate road distance from straight-line km when Distance Matrix is unavailable. */
const HAVERSINE_ROAD_FACTOR = 1.25

function formatRouteFailureMessage(routeInfo: RouteDistanceResult): string {
  if (routeInfo.status === 'REQUEST_DENIED') {
    const hint =
      routeInfo.detail?.trim() ||
      'Enable the Distance Matrix API, billing, and server key restrictions for GOOGLE_MAPS_SERVER_KEY.'
    return `Route service denied the request: ${hint}`
  }
  if (routeInfo.status === 'NOT_FOUND' || routeInfo.status === 'ZERO_RESULTS') {
    return 'Unable to calculate route. Please check your locations.'
  }
  return 'Unable to calculate route. Please check your locations.'
}

/**
 * When Google Distance Matrix fails but Places gave valid coordinates, estimate road km and ETA.
 * Keeps quotes working when the server key lacks Matrix access (common in local dev).
 */
function tryHaversineRouteEstimate(
  origin: PointToPointSearchParams['origin'],
  destination: PointToPointSearchParams['destination']
): { distanceKm: number; durationMin: number } | null {
  const o = { lat: origin.latitude, lng: origin.longitude }
  const d = { lat: destination.latitude, lng: destination.longitude }
  if (
    !Number.isFinite(o.lat) ||
    !Number.isFinite(o.lng) ||
    !Number.isFinite(d.lat) ||
    !Number.isFinite(d.lng) ||
    (o.lat === 0 && o.lng === 0) ||
    (d.lat === 0 && d.lng === 0)
  ) {
    return null
  }
  const straightKm = haversineDistanceKm(o, d)
  if (straightKm < 0.02) {
    return null
  }
  const distanceKm = straightKm * HAVERSINE_ROAD_FACTOR
  const durationMin = estimateTravelMinutesHaversine(o, d)
  return { distanceKm, durationMin }
}

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

  let distanceKm: number
  let durationMin: number

  if (routeInfo.status === 'OK') {
    distanceKm = routeInfo.distance
    durationMin = routeInfo.duration
  } else {
    const fallback = tryHaversineRouteEstimate(params.origin, params.destination)
    if (fallback) {
      console.warn(
        '[computePointToPointQuote] Distance Matrix status=%s; using haversine estimate (%.2f km). %s',
        routeInfo.status,
        fallback.distanceKm,
        routeInfo.detail ?? ''
      )
      distanceKm = fallback.distanceKm
      durationMin = fallback.durationMin
    } else {
      return {
        ok: false,
        error: formatRouteFailureMessage(routeInfo),
      }
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
            distance_km: distanceKm,
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
            distanceKm * basePricePerKm * vt.price_multiplier
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
  const basePrice = distanceKm * basePricePerKm

  return {
    ok: true,
    data: {
      price: finalPrice,
      basePrice,
      distance: distanceKm,
      estimatedDuration: durationMin,
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
