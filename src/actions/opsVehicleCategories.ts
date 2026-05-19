'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'

const categoryBase = {
	name: z.string().trim().min(1).max(120),
	description: z.string().trim().max(2000).optional().nullable(),
	number_of_seat: z.number().int().min(1).max(80),
	image_url: z.string().trim().url().max(2048).optional().nullable(),
	is_active: z.boolean().optional(),
}

const createCategorySchema = z.object(categoryBase)

const updateCategorySchema = z.object({
	id: z.string().uuid(),
	...categoryBase,
})

const deleteCategorySchema = z.object({
	id: z.string().uuid(),
})

export type OpsVehicleCategoryActionResult =
	| { ok: true }
	| ReturnType<typeof buildOpsActionFailure>

export async function createOpsVehicleCategoryAction(
	raw: z.infer<typeof createCategorySchema>,
): Promise<OpsVehicleCategoryActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = createCategorySchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'create_ops_vehicle_category',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Check required fields', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const p = parsed.data
	const { data, error } = await supabase
		.from('vehicle_categories')
		.insert({
			name: p.name,
			description: p.description?.trim() ?? '',
			number_of_seat: p.number_of_seat,
			image_url: p.image_url?.trim() ? p.image_url.trim() : null,
			is_active: p.is_active ?? true,
		})
		.select('id')
		.single()

	if (error || !data) {
		logOpsAction({
			action: 'create_ops_vehicle_category',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error?.message,
		})
		const msg = error?.message?.includes('unique') ? 'A category with this name already exists.' : error?.message
		return buildOpsActionFailure('DATABASE', msg ?? 'Could not create category', correlationId)
	}

	logOpsAction({
		action: 'create_ops_vehicle_category',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: data.id as string,
	})
	revalidatePath('/ops/fleet/categories')
	revalidatePath('/ops/fleet')
	revalidatePath('/ops/fleet/vehicles')
	return { ok: true }
}

export async function updateOpsVehicleCategoryAction(
	raw: z.infer<typeof updateCategorySchema>,
): Promise<OpsVehicleCategoryActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = updateCategorySchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const { id, ...rest } = parsed.data
	const supabase = await createUserServerClient()
	const { error } = await supabase
		.from('vehicle_categories')
		.update({
			name: rest.name,
			description: rest.description?.trim() ?? '',
			number_of_seat: rest.number_of_seat,
			image_url: rest.image_url?.trim() ? rest.image_url.trim() : null,
			is_active: rest.is_active ?? true,
		})
		.eq('id', id)

	if (error) {
		const msg = error.message?.includes('unique') ? 'A category with this name already exists.' : error.message
		return buildOpsActionFailure('DATABASE', msg, correlationId)
	}

	revalidatePath('/ops/fleet/categories')
	revalidatePath('/ops/fleet')
	revalidatePath('/ops/fleet/vehicles')
	return { ok: true }
}

export async function deleteOpsVehicleCategoryAction(
	raw: z.infer<typeof deleteCategorySchema>,
): Promise<OpsVehicleCategoryActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = deleteCategorySchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { error } = await supabase.from('vehicle_categories').delete().eq('id', parsed.data.id)

	if (error) {
		const hint =
			error.code === '23503' || error.message.includes('foreign key')
				? 'Remove or reassign vehicles that use this category before deleting it.'
				: error.message
		return buildOpsActionFailure('DATABASE', hint, correlationId)
	}

	revalidatePath('/ops/fleet/categories')
	revalidatePath('/ops/fleet')
	revalidatePath('/ops/fleet/vehicles')
	return { ok: true }
}
