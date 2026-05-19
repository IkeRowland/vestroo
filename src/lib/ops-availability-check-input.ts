import { z } from 'zod'

/**
 * Shared input schema for **US-B2** `submitAvailabilityCheckAction`.
 * Lives outside `opsAvailabilityCheck.ts` because Next.js `"use server"` modules may only export async functions.
 */
export const RATIONALE_MAX_LENGTH = 500

export const AVAILABILITY_SCOPE_VALUES = ['walk_in', 'account_client'] as const
export type AvailabilityRouteScope = (typeof AVAILABILITY_SCOPE_VALUES)[number]

export const submitAvailabilityCheckInputSchema = z.object({
	bookingId: z.string().uuid(),
	scope: z.enum(AVAILABILITY_SCOPE_VALUES),
	selectedVehicleId: z.string().uuid(),
	selectedDriverId: z.string().uuid(),
	rationale: z.string().max(RATIONALE_MAX_LENGTH, 'Rationale must be 500 characters or fewer').optional(),
	candidatesConsidered: z.object({
		vehicleIds: z.array(z.string().uuid()),
		driverIds: z.array(z.string().uuid()),
	}),
})

export type SubmitAvailabilityCheckInput = z.infer<typeof submitAvailabilityCheckInputSchema>
