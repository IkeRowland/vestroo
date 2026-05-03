import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import type { CountryCode } from 'libphonenumber-js'

import { quoteLocationSchema, webClientTypeResolutionSchema } from '@/actions/booking-schemas'
import { tripOfferVehicleSchema } from '@/features/booking/components/trip-request/trip-offer-vehicle'

const tripLocationPersistSchema = quoteLocationSchema.extend({
  types: z.array(z.string()).optional(),
})

/** Slide 1 — mirrors {@link ValidatedRideDetailsData} for server/client Zod validation. */
export const validatedTripSlide1Schema = z.object({
  pickup: tripLocationPersistSchema,
  destination: tripLocationPersistSchema,
  rideDate: z.string().min(1),
  rideTime: z.string().min(1),
  passengers: z.number().int().min(1).max(20),
  specialInstructions: z.string(),
  manualAirportPickup: z.boolean(),
  flightNumber: z.string(),
})

export type ValidatedTripSlide1 = z.infer<typeof validatedTripSlide1Schema>

/**
 * Canonical phone shape at the server boundary: E.164 in `customer_phone` and in metadata.
 * National digits are accepted with optional formatting; validation is international (libphonenumber-js).
 */
export function passengerPhoneToE164(
  countryIso2: string,
  phoneNational: string,
): string | null {
  const cc = countryIso2.toUpperCase() as CountryCode
  const trimmed = phoneNational.trim()
  if (!trimmed) return null

  let parsed = parsePhoneNumberFromString(trimmed, cc)
  if (!parsed?.isValid()) {
    parsed = parsePhoneNumberFromString(trimmed)
  }
  if (!parsed?.isValid()) return null
  return parsed.number
}

export const tripRequestPassengerFieldsSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name').max(80),
    lastName: z.string().trim().min(1, 'Enter your last name').max(80),
    email: z.string().trim().email('Enter a valid email address'),
    countryIso2: z
      .string()
      .min(2, 'Select a country')
      .max(2)
      .transform((s) => s.toLowerCase()),
    phoneNational: z.string().trim().min(1, 'Enter your phone number').max(40),
  })
  .superRefine((data, ctx) => {
    const e164 = passengerPhoneToE164(data.countryIso2, data.phoneNational)
    if (!e164) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid phone number for the selected country',
        path: ['phoneNational'],
      })
    }
  })

export type TripRequestPassengerFields = z.infer<typeof tripRequestPassengerFieldsSchema>

/** Optional rider block — rider phone is validated with `libphonenumber-js` using the booker’s country (slide3). */
export const tripRequestRiderFieldsSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.string().trim().optional(),
  phoneNational: z.string().trim().max(40).optional(),
})

export type TripRequestRiderFields = z.infer<typeof tripRequestRiderFieldsSchema>

/**
 * Client-side rider field messages (kept in sync with `tripRequestSubmitPayloadSchema` superRefine).
 * Phone uses the same E.164 path as the booker when a national number is entered.
 */
export function tripRequestRiderFieldErrors(
  bookerCountryIso2: string,
  rider: { name: string; email: string; phoneNational: string },
): Partial<Record<'name' | 'email' | 'phoneNational', string>> {
  const out: Partial<Record<'name' | 'email' | 'phoneNational', string>> = {}
  const name = rider.name.trim()
  const email = rider.email.trim()
  const phone = rider.phoneNational.trim()
  if (name.length > 200) {
    out.name = 'Max 200 characters'
  }
  if (email && !z.string().email().safeParse(email).success) {
    out.email = 'Enter a valid email address'
  }
  if (phone && !passengerPhoneToE164(bookerCountryIso2, phone)) {
    out.phoneNational =
      'Enter a valid phone number for the country selected above (booker country applies to rider phone here)'
  }
  return out
}

/** Persisted `bookings.rider_*` after server re-parse — E.164 for phone when present. */
export function tripRequestRiderToDbColumns(
  rider: TripRequestRiderFields | undefined,
  bookerCountryIso2: string,
): { rider_name: string | null; rider_phone: string | null; rider_email: string | null } {
  if (!rider) {
    return { rider_name: null, rider_phone: null, rider_email: null }
  }
  const name = rider.name?.trim() || null
  const email = rider.email?.trim() || null
  const phoneNat = rider.phoneNational?.trim()
  const phone = phoneNat ? passengerPhoneToE164(bookerCountryIso2, phoneNat) : null
  if (!name && !email && !phone) {
    return { rider_name: null, rider_phone: null, rider_email: null }
  }
  return { rider_name: name, rider_email: email, rider_phone: phone }
}

export const tripRequestSubmitPayloadSchema = z
  .object({
    slide1: validatedTripSlide1Schema,
    slide2: tripOfferVehicleSchema,
    slide3: tripRequestPassengerFieldsSchema,
    rider: tripRequestRiderFieldsSchema.optional(),
    clientTypeResolution: webClientTypeResolutionSchema.optional(),
    /** Epic 12 Q4 — required client-side when account has `default_po_required` (server re-checks live row). */
    purchaseOrderRef: z.string().max(120).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    const combined = new Date(`${data.slide1.rideDate}T${data.slide1.rideTime}:00`)
    if (Number.isNaN(combined.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date or time',
        path: ['slide1', 'rideDate'],
      })
      return
    }
    if (combined.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date and time must be in the future',
        path: ['slide1', 'rideDate'],
      })
    }

    if (data.clientTypeResolution?.clientType === 'account_client') {
      if (data.clientTypeResolution.customerAccountId == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Select an organisation for this booking',
          path: ['clientTypeResolution', 'customerAccountId'],
        })
      }
    }

    const rider = data.rider
    if (rider) {
      const name = rider.name?.trim() ?? ''
      const email = rider.email?.trim() ?? ''
      const phoneNat = rider.phoneNational?.trim() ?? ''
      if (name || email || phoneNat) {
        if (name.length > 200) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Max 200 characters',
            path: ['rider', 'name'],
          })
        }
        if (email && !z.string().email().safeParse(email).success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter a valid email address',
            path: ['rider', 'email'],
          })
        }
        if (phoneNat) {
          const ok = passengerPhoneToE164(data.slide3.countryIso2, phoneNat)
          if (!ok) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'Enter a valid rider phone for the country selected above, or leave rider phone blank',
              path: ['rider', 'phoneNational'],
            })
          }
        }
      }
    }
  })

export type TripRequestSubmitPayload = z.infer<typeof tripRequestSubmitPayloadSchema>
