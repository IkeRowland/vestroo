'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'

const transmissionEnum = z.enum(['automatic', 'manual', 'cvt', 'semi_automatic'])
const fuelTypeEnum = z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'])

const vehicleSpecsSchema = {
	make: z.string().trim().min(1).max(80).optional().nullable(),
	model: z.string().trim().min(1).max(120).optional().nullable(),
	model_year: z.number().int().min(1950).max(2100).optional().nullable(),
	mileage_km: z.number().int().nonnegative().optional().nullable(),
	color: z.string().trim().max(40).optional().nullable(),
	seats: z.number().int().min(1).max(80).optional().nullable(),
	transmission: transmissionEnum.optional().nullable(),
	fuel_type: fuelTypeEnum.optional().nullable(),
	description: z.string().trim().max(2000).optional().nullable(),
	primary_image_url: z.string().trim().url().max(2048).optional().nullable(),
	gallery_image_urls: z.array(z.string().trim().url().max(2048)).max(20).optional(),
} as const

const createVehicleSchema = z.object({
	name: z.string().trim().min(1).max(200),
	license_plate: z.string().trim().min(1).max(32),
	category_id: z.string().uuid(),
	operation_status: z.string().trim().min(1).max(64).optional(),
	vehicle_condition: z.string().trim().min(1).max(64).optional(),
	...vehicleSpecsSchema,
})

const updateVehicleSchema = z.object({
	id: z.string().uuid(),
	name: z.string().trim().min(1).max(200).optional(),
	license_plate: z.string().trim().min(1).max(32).optional(),
	category_id: z.string().uuid().optional(),
	operation_status: z.string().trim().min(1).max(64).optional(),
	vehicle_condition: z.string().trim().min(1).max(64).optional(),
	...vehicleSpecsSchema,
})

const archiveVehicleSchema = z.object({
	id: z.string().uuid(),
})

export type OpsVehicleActionSuccess = { ok: true }
export type OpsVehicleActionResult = OpsVehicleActionSuccess | ReturnType<typeof buildOpsActionFailure>

export async function createOpsVehicleAction(
	raw: z.infer<typeof createVehicleSchema>,
): Promise<OpsVehicleActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = createVehicleSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'create_ops_vehicle',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Check required fields', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'create_ops_vehicle',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const p = parsed.data
	const { data, error } = await supabase
		.from('vehicles')
		.insert({
			name: p.name,
			license_plate: p.license_plate,
			category_id: p.category_id,
			image_urls: [],
			operation_status: p.operation_status ?? 'charging',
			vehicle_condition: p.vehicle_condition ?? 'available',
			make: p.make ?? null,
			model: p.model ?? null,
			model_year: p.model_year ?? null,
			mileage_km: p.mileage_km ?? null,
			color: p.color ?? null,
			seats: p.seats ?? null,
			transmission: p.transmission ?? null,
			fuel_type: p.fuel_type ?? null,
			description: p.description ?? null,
			primary_image_url: p.primary_image_url ?? null,
			gallery_image_urls: p.gallery_image_urls ?? [],
		})
		.select('id')
		.single()

	if (error || !data) {
		logOpsAction({
			action: 'create_ops_vehicle',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error?.message,
		})
		return buildOpsActionFailure('DATABASE', error?.message, correlationId)
	}

	logOpsAction({
		action: 'create_ops_vehicle',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: data.id as string,
	})
	revalidatePath('/ops/vehicles')
	return { ok: true }
}

export async function updateOpsVehicleAction(
	raw: z.infer<typeof updateVehicleSchema>,
): Promise<OpsVehicleActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = updateVehicleSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'update_ops_vehicle',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'update_ops_vehicle',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const { id, ...patch } = parsed.data
	const updates: Record<string, unknown> = {}
	if (patch.name !== undefined) updates.name = patch.name
	if (patch.license_plate !== undefined) updates.license_plate = patch.license_plate
	if (patch.category_id !== undefined) updates.category_id = patch.category_id
	if (patch.operation_status !== undefined) updates.operation_status = patch.operation_status
	if (patch.vehicle_condition !== undefined) updates.vehicle_condition = patch.vehicle_condition
	if (patch.make !== undefined) updates.make = patch.make
	if (patch.model !== undefined) updates.model = patch.model
	if (patch.model_year !== undefined) updates.model_year = patch.model_year
	if (patch.mileage_km !== undefined) updates.mileage_km = patch.mileage_km
	if (patch.color !== undefined) updates.color = patch.color
	if (patch.seats !== undefined) updates.seats = patch.seats
	if (patch.transmission !== undefined) updates.transmission = patch.transmission
	if (patch.fuel_type !== undefined) updates.fuel_type = patch.fuel_type
	if (patch.description !== undefined) updates.description = patch.description
	if (patch.primary_image_url !== undefined) updates.primary_image_url = patch.primary_image_url
	if (patch.gallery_image_urls !== undefined) updates.gallery_image_urls = patch.gallery_image_urls

	if (Object.keys(updates).length === 0) {
		return buildOpsActionFailure('VALIDATION', 'No changes to apply', correlationId)
	}

	const supabase = await createUserServerClient()
	const { error } = await supabase.from('vehicles').update(updates).eq('id', id)

	if (error) {
		logOpsAction({
			action: 'update_ops_vehicle',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: id,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	logOpsAction({
		action: 'update_ops_vehicle',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: id,
	})
	revalidatePath('/ops/vehicles')
	return { ok: true }
}

/** Sets `vehicle_condition` to `archived` (soft remove from public catalogue). */
export async function archiveOpsVehicleAction(
	raw: z.infer<typeof archiveVehicleSchema>,
): Promise<OpsVehicleActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = archiveVehicleSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid vehicle id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { error } = await supabase
		.from('vehicles')
		.update({ vehicle_condition: 'archived' })
		.eq('id', parsed.data.id)

	if (error) {
		logOpsAction({
			action: 'archive_ops_vehicle',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: parsed.data.id,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	logOpsAction({
		action: 'archive_ops_vehicle',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: parsed.data.id,
	})
	revalidatePath('/ops/vehicles')
	return { ok: true }
}
