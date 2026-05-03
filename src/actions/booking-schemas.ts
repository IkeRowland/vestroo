import { z } from 'zod'
import type { BookingIntent } from '@/lib/booking-quote-types'

/** Persisted under bookings.booking_metadata for booking_intent = experience_package (VST-10). */
export const experiencePackageBookingMetadataSchema = z.object({
  experience_package_id: z.string().uuid(),
  experience_date: z.string().min(1),
  group_size: z.number().int().min(1).max(20),
  selected_addon_ids: z.array(z.string().min(1)).default([]),
})

/** Persisted under bookings.booking_metadata for booking_intent = corporate_pattern (SH.9.5). */
export const corporatePatternBookingMetadataSchema = z.object({
  service_run_id: z.string().uuid(),
  from_point_id: z.string().uuid(),
  to_point_id: z.string().uuid(),
  seats: z.number().int().min(1),
  idempotency_key: z.string().min(1).optional(),
})

export type CorporatePatternBookingMetadata = z.infer<
  typeof corporatePatternBookingMetadataSchema
>

export type ExperiencePackageBookingMetadata = z.infer<
  typeof experiencePackageBookingMetadataSchema
>

export const quoteLocationSchema = z.object({
  placeId: z.string().min(1),
  formattedAddress: z.string().min(1),
  name: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
})

export const bookingIntentSchema = z.enum([
  'point_to_point',
  'hourly_hire',
  'corporate_pattern',
  'experience_package',
]) satisfies z.ZodType<BookingIntent>

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
})

/** South African mobile/landline as used on the web wizard booker phone (optional rider aligns here). */
const ZA_BOOKING_PHONE_RE = /^(\+27|0)[0-9]{9}$/

/**
 * Epic 15 / 15B.1 — optional rider on the same payload as `customer` (point-to-point / wizard).
 * All fields optional; empty strings normalise to null at insert. Phone uses the same ZA rule as `ContactDetailsForm`.
 */
export const webBookingRiderSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
  })
  .superRefine((r, ctx) => {
    const name = r.name?.trim() ?? ''
    const email = r.email?.trim() ?? ''
    const phone = r.phone?.trim() ?? ''
    if (!name && !email && !phone) return
    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid email address',
        path: ['email'],
      })
    }
    if (phone && !ZA_BOOKING_PHONE_RE.test(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid South African phone number',
        path: ['phone'],
      })
    }
  })
  .optional()

export type WebBookingRiderPayload = z.infer<typeof webBookingRiderSchema>

/** Maps validated optional `rider` object to `bookings.rider_*` columns (null when absent or all blank). */
export function webBookingRiderToDbColumns(
  rider: WebBookingRiderPayload,
): { rider_name: string | null; rider_phone: string | null; rider_email: string | null } {
  if (!rider) {
    return { rider_name: null, rider_phone: null, rider_email: null }
  }
  const name = rider.name?.trim() || null
  const email = rider.email?.trim() || null
  const phone = rider.phone?.trim() || null
  if (!name && !email && !phone) {
    return { rider_name: null, rider_phone: null, rider_email: null }
  }
  return { rider_name: name, rider_email: email, rider_phone: phone }
}

/** VST-13 corporate invoicing hooks — references only; columns on `public.bookings`. */
export const corporateInvoicingFieldsSchema = z.object({
  invoiceRequested: z.boolean().optional(),
  /**
   * Maps to `bookings.purchase_order_ref`. Epic 12 Q4: when the enriched booking is `account_client`
   * and live `customer_accounts.default_po_required` is true, `assertPurchaseOrderForAccountBookingInsert`
   * rejects blank values — the public contact / trip-request forms also require the field client-side.
   */
  purchaseOrderRef: z.string().max(120).nullable().optional(),
  billingEntityRef: z.string().max(120).nullable().optional(),
})

export type CorporateInvoicingFields = z.infer<typeof corporateInvoicingFieldsSchema>

/** Story 12.5 — Q6 client typing from public booking flows (`ops_manual` is staff-only, not accepted here). */
export const webClientTypeResolutionSchema = z.object({
	clientType: z.enum(['walk_in', 'account_client']),
	customerAccountId: z.string().uuid().nullable(),
	clientTypeSource: z.enum([
		'user_confirmed_domain_match',
		'user_declined_domain_match',
		'no_match',
		/** Verified via portal “Book this again” cookie + membership (Story 15.8); not from URL account id. */
		'portal_active_account_session',
	]),
})

export type WebClientTypeResolution = z.infer<typeof webClientTypeResolutionSchema>

/**
 * Persisted booking payload from the web wizard (create / pay).
 * Server actions must reconcile quoteAmount before insert.
 */
export const webBookingPayloadSchema = z
  .object({
    bookingIntent: bookingIntentSchema.default('point_to_point'),
    origin: quoteLocationSchema,
    destination: quoteLocationSchema.nullable().optional(),
    date: z.coerce.date(),
    passengers: z.number().min(1).max(20),
    flightNumber: z.string().nullable().optional(),
    selectedVehicleId: z.string().min(1),
    quoteAmount: z.number().positive(),
    estimatedDuration: z.number().nullable().optional(),
    distance: z.number().nullable().optional(),
    hourlyDurationHours: z.number().min(0.5).max(72).nullable().optional(),
    hourlyServiceAreaNotes: z.string().max(2000).nullable().optional(),
    servicePatternId: z.string().uuid().nullable().optional(),
    bookingMetadata: z.record(z.unknown()).optional(),
    customer: customerSchema,
    rider: webBookingRiderSchema,
    clientTypeResolution: webClientTypeResolutionSchema.optional(),
  })
  .merge(corporateInvoicingFieldsSchema)
  .superRefine((data, ctx) => {
    if (data.bookingIntent === 'experience_package') {
      const metaResult = experiencePackageBookingMetadataSchema.safeParse(
        data.bookingMetadata
      )
      if (!metaResult.success) {
        for (const err of metaResult.error.errors) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['bookingMetadata', ...err.path],
          })
        }
        return
      }
      if (metaResult.data.group_size !== data.passengers) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Group size must match passenger count',
          path: ['passengers'],
        })
      }
      const expDate = new Date(metaResult.data.experience_date)
      if (Number.isNaN(expDate.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid experience_date',
          path: ['bookingMetadata', 'experience_date'],
        })
        return
      }
      if (expDate.toISOString().slice(0, 10) !== data.date.toISOString().slice(0, 10)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Experience date must match the selected trip date',
          path: ['date'],
        })
      }
      return
    }

    if (data.bookingIntent === 'corporate_pattern') {
      const metaResult = corporatePatternBookingMetadataSchema.safeParse(
        data.bookingMetadata
      )
      if (!metaResult.success) {
        for (const err of metaResult.error.errors) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: err.message,
            path: ['bookingMetadata', ...err.path],
          })
        }
        return
      }
      if (metaResult.data.seats !== data.passengers) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Seat count must match passenger count',
          path: ['passengers'],
        })
      }
      return
    }

    const needsDestination = data.bookingIntent === 'point_to_point'
    if (needsDestination && !data.destination) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Destination is required',
        path: ['destination'],
      })
    }
    if (data.bookingIntent === 'hourly_hire') {
      if (data.hourlyDurationHours == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duration is required for hourly hire',
          path: ['hourlyDurationHours'],
        })
      }
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
  })

export type WebBookingPayload = z.infer<typeof webBookingPayloadSchema>
