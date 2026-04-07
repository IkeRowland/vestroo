import { z } from 'zod'
import type { BookingIntent } from '@/lib/booking-quote-types'

/** Persisted under bookings.booking_metadata for booking_intent = experience_package (VST-10). */
export const experiencePackageBookingMetadataSchema = z.object({
  experience_package_id: z.string().uuid(),
  experience_date: z.string().min(1),
  group_size: z.number().int().min(1).max(20),
  selected_addon_ids: z.array(z.string().min(1)).default([]),
})

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

/** VST-13 corporate invoicing hooks — references only; columns on `public.bookings`. */
export const corporateInvoicingFieldsSchema = z.object({
  invoiceRequested: z.boolean().optional(),
  purchaseOrderRef: z.string().max(120).nullable().optional(),
  billingEntityRef: z.string().max(120).nullable().optional(),
})

export type CorporateInvoicingFields = z.infer<typeof corporateInvoicingFieldsSchema>

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

    const needsDestination =
      data.bookingIntent === 'point_to_point' ||
      data.bookingIntent === 'corporate_pattern'
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
  })

export type WebBookingPayload = z.infer<typeof webBookingPayloadSchema>
