/**
 * Shared types for point-to-point and hourly quote flows (VST-6).
 */

export type QuoteLocation = {
  placeId: string
  formattedAddress: string
  name: string
  latitude: number
  longitude: number
}

/** Input for distance-based (point-to-point) quotes — mirrors Server Action contract */
export type PointToPointSearchParams = {
  origin: QuoteLocation
  destination: QuoteLocation
  date: Date
  passengers: number
  flightNumber?: string
}

export type QuoteVehicleOption = {
  id: string
  name: string
  capacity: number
  price: number
  luggageCapacity?: string
  imageUrl?: string
}

export type PointToPointQuoteResult = {
  price: number
  basePrice: number
  distance: number
  estimatedDuration: number
  vehicleOptions: QuoteVehicleOption[]
  routeDetails: {
    origin: string
    destination: string
  }
}

export type BookingIntent =
  | 'point_to_point'
  | 'hourly_hire'
  | 'corporate_pattern'
  | 'experience_package'
