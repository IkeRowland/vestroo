import { z } from 'zod'

/**
 * FE.10.3 — Vehicle options for the public trip-request funnel (Slide 2).
 *
 * **No-price contract:** This type intentionally excludes monetary fields. Any server DTO that
 * includes pricing must be mapped through {@link mapVehicleTypeRowToTripOffer} (or equivalent) so
 * price-like keys never reach React props. See `docs/trip-request-vehicle-offers.md`.
 */
export const tripOfferVehicleSchema = z.object({
  id: z.string().min(1),
  /** Display name / model line */
  name: z.string().min(1),
  /** Class or category label (product-facing, non-monetary) */
  classification: z.string().min(1),
  passengerCapacity: z.number().int().positive(),
  /** Human-readable luggage fact (no pricing) */
  luggageCapacityLabel: z.string().min(1),
  /** HTTPS URL or site-relative path; empty omitted in UI (placeholder image). */
  imageUrl: z.string().min(1).nullable().optional(),
})

export type TripOfferVehicle = z.infer<typeof tripOfferVehicleSchema>

/** Keys that must never appear on Slide 2 props (defence-in-depth; strip at boundary). */
export const FORBIDDEN_TRIP_OFFER_KEYS = [
  'price',
  'amount',
  'total',
  'quote',
  'fare',
  'estimate',
  'subtotal',
  'tax',
  'zar',
  'cents',
  'payment',
] as const

export function classificationFromCapacity(passengerCapacity: number): string {
  if (passengerCapacity <= 4) return 'Sedan class'
  if (passengerCapacity <= 8) return 'MPV class'
  return 'Minibus class'
}

/**
 * Prefer the ops fleet category name (e.g. Sedan, SUV, MPV, Minibus) for Slide 2.
 * Falls back to {@link classificationFromCapacity} when the category name is missing.
 */
export function classificationFromFleetCategoryName(
  categoryName: string | null | undefined,
  passengerCapacity: number,
): string {
  const n = (categoryName ?? '').trim()
  if (n.length > 0) {
    return `${n} class`
  }
  return classificationFromCapacity(passengerCapacity)
}

/**
 * Fail-closed: if unknown JSON contains forbidden price-like keys at top level, return null.
 * (Nested structures are rejected for simplicity — extend when a real API shape exists.)
 */
export function parseTripOfferVehicleFromUnknown(raw: unknown): TripOfferVehicle | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  for (const k of FORBIDDEN_TRIP_OFFER_KEYS) {
    if (k in o) return null
  }
  const parsed = tripOfferVehicleSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}
