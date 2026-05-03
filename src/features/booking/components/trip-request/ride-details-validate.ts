import { z } from 'zod'

import { quoteLocationSchema } from '@/actions/booking-schemas'
import { isAirport, type PlaceResult } from '@/lib/maps'

import {
  computeDefaultTripRequestRideDateTime,
  johannesburgWallToUtcInstant,
} from '@/features/booking/components/trip-request/trip-request-market-time'

/** Minimum lead time before pickup on slide 1 (FE.19.4): **60 minutes** after “now”. */
export const TRIP_REQUEST_MIN_LEAD_MS = 60 * 60 * 1000

export const PICKUP_SCHEDULE_LEAD_MESSAGE = 'Pickup must be at least 1 hour from now'

/**
 * Trip request Slide 1 — ride details (FE.10.2).
 * **`rideDate` + `rideTime`** are interpreted as **wall clock in `Africa/Johannesburg`** (SAST, UTC+2,
 * no DST) for `combineRideDateAndTime` / future checks — **Story 19.2 / FE.19.2**.
 */
export const tripLocationSchema = quoteLocationSchema.extend({
  types: z.array(z.string()).optional(),
})

export type TripRequestLocation = z.infer<typeof tripLocationSchema>

export type RideDetailsFormValues = {
  pickup: TripRequestLocation | null
  destination: TripRequestLocation | null
  pickupInput: string
  destinationInput: string
  rideDate: string
  rideTime: string
  passengers: number
  specialInstructions: string
  manualAirportPickup: boolean
  flightNumber: string
}

export type DefaultRideDetailsFormValuesOptions = {
  /** Fixed clock for tests (ms since epoch). */
  now?: number
}

/**
 * Empty-bootstrap defaults for trip-request slide 1 (**FE.19.2**): Johannesburg date/time rules,
 * **passengers: 1**, empty addresses / notes / flight.
 */
export function defaultRideDetailsFormValues(opts?: DefaultRideDetailsFormValuesOptions): RideDetailsFormValues {
  const now = opts?.now ?? Date.now()
  const { rideDate, rideTime } = computeDefaultTripRequestRideDateTime(now)
  return {
    pickup: null,
    destination: null,
    pickupInput: '',
    destinationInput: '',
    rideDate,
    rideTime,
    passengers: 1,
    specialInstructions: '',
    manualAirportPickup: false,
    flightNumber: '',
  }
}

export type RideDetailsFieldErrors = Partial<
  Record<
    | 'pickup'
    | 'destination'
    | 'rideDate'
    | 'rideTime'
    | 'schedule'
    | 'passengers'
    | 'flightNumber'
    | 'submit',
    string
  >
>

/** Validated Slide 1 payload (client-only until FE.10.5 persistence). */
export type ValidatedRideDetailsData = {
  pickup: TripRequestLocation
  destination: TripRequestLocation
  rideDate: string
  rideTime: string
  passengers: number
  specialInstructions: string
  manualAirportPickup: boolean
  flightNumber: string
}

/**
 * Parse `rideDate` (`YYYY-MM-DD`) + `rideTime` (`HH:mm`) as **Johannesburg wall clock** (FE.19.2).
 * Returns `null` when either field is empty or the combined string is not a real date
 * (e.g. `2026-02-31` or `25:99`). Centralised so the booking form and trip-request
 * validate function never drift on parsing.
 */
export function combineRideDateAndTime(rideDate: string, rideTime: string): Date | null {
  if (!rideDate?.trim() || !rideTime?.trim()) return null
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(rideDate.trim())
  const tm = /^(\d{1,2}):(\d{2})$/.exec(rideTime.trim())
  if (!dm || !tm) return null
  const y = Number(dm[1])
  const mo = Number(dm[2])
  const d = Number(dm[3])
  const h = Number(tm[1])
  const min = Number(tm[2])
  if (![y, mo, d, h, min].every(Number.isFinite)) return null
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59) return null
  const ms = johannesburgWallToUtcInstant(y, mo, d, h, min)
  if (ms === null) return null
  const out = new Date(ms)
  if (Number.isNaN(out.getTime())) return null
  return out
}

/** True when pickup instant is strictly before `now` (wall-clock comparison on absolute instant). */
export function rideInstantIsStrictlyBeforeNow(date: Date, now: number = Date.now()): boolean {
  return date.getTime() < now
}

/**
 * True when pickup is **not** allowed: before **`now` + {@link TRIP_REQUEST_MIN_LEAD_MS}** (FE.19.4).
 * Legacy name kept for `BookingSearchForm` call sites.
 */
export function rideDateTimeIsInPast(date: Date, now: number = Date.now()): boolean {
  return date.getTime() < now + TRIP_REQUEST_MIN_LEAD_MS
}

export type RideDateTimeFutureCheck =
  | { kind: 'ok' }
  | { kind: 'invalid_format' }
  | { kind: 'insufficient_lead' }

/**
 * Slide 1 pickup must be at least **60 minutes** after **`now`** (FE.19.4).
 * Empty fields return `ok` (callers add required-field errors).
 */
export function rideDateTimeFutureCheck(
  rideDate: string,
  rideTime: string,
  now: number = Date.now(),
): RideDateTimeFutureCheck {
  if (!rideDate?.trim() || !rideTime?.trim()) return { kind: 'ok' }
  const combined = combineRideDateAndTime(rideDate, rideTime)
  if (!combined) return { kind: 'invalid_format' }
  if (combined.getTime() < now + TRIP_REQUEST_MIN_LEAD_MS) return { kind: 'insufficient_lead' }
  return { kind: 'ok' }
}

function toPlaceResult(p: TripRequestLocation): PlaceResult {
  return {
    place_id: p.placeId,
    formatted_address: p.formattedAddress,
    name: p.name,
    types: p.types,
  }
}

/** Airport pickup: manual toggle and/or Places-derived heuristic (see `isAirport`). */
export function effectiveAirportPickup(
  pickup: TripRequestLocation | null,
  manualAirportPickup: boolean,
): boolean {
  if (manualAirportPickup) return true
  if (!pickup) return false
  return isAirport(toPlaceResult(pickup))
}

export function validateRideDetailsStep(values: RideDetailsFormValues):
  | { ok: true; data: ValidatedRideDetailsData }
  | { ok: false; errors: RideDetailsFieldErrors } {
  const errors: RideDetailsFieldErrors = {}

  if (!values.pickup) {
    errors.pickup = 'Select a pickup address from the suggestions'
  }
  if (!values.destination) {
    errors.destination = 'Select a drop-off address from the suggestions'
  }

  if (!values.rideDate?.trim()) {
    errors.rideDate = 'Choose a date'
  }
  if (!values.rideTime?.trim()) {
    errors.rideTime = 'Choose a time'
  }

  if (
    !Number.isFinite(values.passengers) ||
    values.passengers < 1 ||
    values.passengers > 20
  ) {
    errors.passengers = 'Enter a number of passengers between 1 and 20'
  }

  const airport = effectiveAirportPickup(values.pickup, values.manualAirportPickup)
  // Flight is optional in the marketing / search form ("Flight Number (Optional)").
  // Do not block the trip-request funnel or `/book/trip-request` bootstrap when it is empty.

  if (!errors.rideDate && !errors.rideTime) {
    const futureCheck = rideDateTimeFutureCheck(values.rideDate, values.rideTime)
    if (futureCheck.kind === 'invalid_format') {
      errors.schedule = 'Invalid date or time'
    } else if (futureCheck.kind === 'insufficient_lead') {
      errors.schedule = PICKUP_SCHEDULE_LEAD_MESSAGE
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const pickup = tripLocationSchema.parse(values.pickup)
  const destination = tripLocationSchema.parse(values.destination)

  return {
    ok: true,
    data: {
      pickup,
      destination,
      rideDate: values.rideDate,
      rideTime: values.rideTime,
      passengers: values.passengers,
      specialInstructions: values.specialInstructions.trim(),
      manualAirportPickup: values.manualAirportPickup,
      flightNumber: airport ? values.flightNumber.trim() : '',
    },
  }
}
