import { z } from 'zod'

export const closeProtectionEngagementStatusSchema = z.enum([
	'draft',
	'active',
	'completed',
	'cancelled',
])

export const createCloseProtectionEngagementSchema = z.object({
	bookingId: z.string().uuid(),
	status: closeProtectionEngagementStatusSchema.optional(),
	coordinationNotes: z.string().max(20_000).optional(),
})

export const updateCloseProtectionEngagementSchema = z.object({
	engagementId: z.string().uuid(),
	status: closeProtectionEngagementStatusSchema.optional(),
	coordinationNotes: z.string().max(20_000).nullable().optional(),
	tripId: z.string().uuid().nullable().optional(),
})

export const listCloseProtectionEngagementsSchema = z.object({
	limit: z.number().int().min(1).max(100).optional().default(50),
	bookingId: z.string().uuid().optional(),
	tripId: z.string().uuid().optional(),
})

export const closeProtectionEngagementIdSchema = z.object({
	engagementId: z.string().uuid(),
})

export const closeProtectionBookingIdSchema = z.object({
	bookingId: z.string().uuid(),
})
