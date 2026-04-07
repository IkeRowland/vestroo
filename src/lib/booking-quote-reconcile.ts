import { calculateHourlyHirePrice } from '@/lib/calculations'
import type { BookingIntent, PointToPointSearchParams } from '@/lib/booking-quote-types'
import { QUOTE_RECONCILE_TOLERANCE_ZAR } from '@/lib/pricing-env'
import {
  computePointToPointQuote,
  findVehicleOptionPrice,
} from '@/lib/quote-engine'
import type { QuoteLocation } from '@/lib/booking-quote-types'
import { computeExperiencePackageQuote, parseAddonCatalog } from '@/lib/experience-package-quote'
import {
  fetchExperiencePackageById,
  resolveExperiencePackageVehicleCategoryId,
} from '@/lib/experience-package-data'
import type { ExperiencePackageBookingMetadata } from '@/actions/booking-schemas'
import { getGoogleMapsServerApiKey } from '@/lib/maps'

export type ReconcileBookingQuoteInput = {
  bookingIntent: BookingIntent
  clientQuoteZar: number
  origin: QuoteLocation
  /** Required for point_to_point / corporate_pattern web flows; optional for hourly_hire */
  destination: QuoteLocation | null
  date: Date
  passengers: number
  selectedVehicleId: string
  hourlyDurationHours?: number | null
  /** Required when bookingIntent is experience_package (parsed booking_metadata). */
  experiencePackage?: ExperiencePackageBookingMetadata | null
}

export type ReconcileBookingQuoteResult = {
  serverTotalZar: number
  distanceKm: number | null
  estimatedDurationMinutes: number | null
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Recalculates authoritative quote server-side; throws if client total does not match.
 */
export async function reconcileBookingQuote(
  input: ReconcileBookingQuoteInput
): Promise<ReconcileBookingQuoteResult> {
  const { bookingIntent } = input

  if (bookingIntent === 'hourly_hire') {
    const hours = input.hourlyDurationHours
    if (hours == null || hours < 0.5) {
      throw new Error('Invalid hourly duration')
    }
    const calc = await calculateHourlyHirePrice({
      vehicle_type_id: input.selectedVehicleId,
      pickup_datetime: input.date,
      duration_hours: hours,
    })
    const serverTotalZar = roundMoney(calc.final_price)
    if (
      Math.abs(serverTotalZar - input.clientQuoteZar) >
      QUOTE_RECONCILE_TOLERANCE_ZAR
    ) {
      throw new Error(
        'Quote amount is out of date. Please refresh your quote and try again.'
      )
    }
    return {
      serverTotalZar,
      distanceKm: null,
      estimatedDurationMinutes: null,
    }
  }

  if (bookingIntent === 'experience_package') {
    const xp = input.experiencePackage
    if (!xp) {
      throw new Error('Experience package booking metadata is required')
    }
    const pkg = await fetchExperiencePackageById(xp.experience_package_id)
    if (!pkg) {
      throw new Error('Experience package not found or inactive')
    }
    const addons = parseAddonCatalog(pkg.addon_catalog)
    const { total_zar } = computeExperiencePackageQuote(
      {
        base_price_zar: pkg.base_price_zar,
        per_passenger_increment_zar: pkg.per_passenger_increment_zar,
        included_passengers: pkg.included_passengers,
        addon_catalog: addons,
      },
      xp.group_size,
      xp.selected_addon_ids
    )
    const expectedVehicleId = await resolveExperiencePackageVehicleCategoryId(
      pkg,
      xp.group_size
    )
    if (expectedVehicleId !== input.selectedVehicleId) {
      throw new Error(
        'Selected vehicle does not match this experience package. Please refresh your quote.'
      )
    }
    const serverTotalZar = roundMoney(total_zar)
    if (
      Math.abs(serverTotalZar - input.clientQuoteZar) >
      QUOTE_RECONCILE_TOLERANCE_ZAR
    ) {
      throw new Error(
        'Quote amount is out of date. Please refresh your quote and try again.'
      )
    }
    return {
      serverTotalZar,
      distanceKm: null,
      estimatedDurationMinutes: pkg.estimated_duration_minutes,
    }
  }

  if (
    bookingIntent === 'point_to_point' ||
    bookingIntent === 'corporate_pattern'
  ) {
    if (!input.destination) {
      throw new Error('Destination is required for this booking type')
    }
    const apiKey = getGoogleMapsServerApiKey()
    if (!apiKey) {
      throw new Error(
        'Google Maps server API key not configured (set GOOGLE_MAPS_SERVER_KEY for Distance Matrix on the server).'
      )
    }
    const p2p: PointToPointSearchParams = {
      origin: input.origin,
      destination: input.destination,
      date: input.date,
      passengers: input.passengers,
    }
    const computed = await computePointToPointQuote(p2p, apiKey)
    if (!computed.ok) {
      throw new Error(computed.error)
    }
    const price = findVehicleOptionPrice(
      computed.data.vehicleOptions,
      input.selectedVehicleId
    )
    if (price == null) {
      throw new Error(
        'Selected vehicle is not available for this trip. Please choose another option.'
      )
    }
    const serverTotalZar = roundMoney(price)
    if (
      Math.abs(serverTotalZar - input.clientQuoteZar) >
      QUOTE_RECONCILE_TOLERANCE_ZAR
    ) {
      throw new Error(
        'Quote amount is out of date. Please refresh your quote and try again.'
      )
    }
    return {
      serverTotalZar,
      distanceKm: computed.data.distance,
      estimatedDurationMinutes: computed.data.estimatedDuration,
    }
  }

  throw new Error('Unsupported booking intent')
}
