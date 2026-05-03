'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { createUserServerClient } from '@/lib/supabase/server'

/** Defaults for new rows — valid quote stubs until staff edits JSON in a follow-up. */
const DEFAULT_STUB_ORIGIN = {
	placeId: 'vestroo-ops-new-pkg-origin',
	formattedAddress: 'Cape Town, Western Cape, South Africa',
	name: 'Pickup (update in package edit)',
	latitude: -33.9249,
	longitude: 18.4241,
} as const

const DEFAULT_STUB_DESTINATION = {
	placeId: 'vestroo-ops-new-pkg-dest',
	formattedAddress: 'Stellenbosch, Western Cape, South Africa',
	name: 'Experience area (update in package edit)',
	latitude: -33.9326,
	longitude: 18.8602,
} as const

const createPackageSchema = z.object({
	slug: z
		.string()
		.trim()
		.min(2)
		.max(120)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: lowercase letters, numbers, hyphens only'),
	title: z.string().trim().min(1).max(200),
	description: z.string().trim().max(4000).nullable().optional(),
	base_price_zar: z.coerce.number().min(0).max(99999999),
	per_passenger_increment_zar: z.coerce.number().min(0).max(99999999).optional(),
	included_passengers: z.coerce.number().int().min(1).max(50).optional(),
	default_vehicle_category_id: z.string().uuid().nullable().optional(),
	estimated_duration_minutes: z.coerce.number().int().min(0).max(24 * 60).nullable().optional(),
})

const updatePackageSchema = z.object({
	id: z.string().uuid(),
	slug: z
		.string()
		.trim()
		.min(2)
		.max(120)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
		.optional(),
	title: z.string().trim().min(1).max(200).optional(),
	description: z.string().trim().max(4000).nullable().optional(),
	base_price_zar: z.coerce.number().min(0).max(99999999).optional(),
	per_passenger_increment_zar: z.coerce.number().min(0).max(99999999).optional(),
	included_passengers: z.coerce.number().int().min(1).max(50).optional(),
	default_vehicle_category_id: z.string().uuid().nullable().optional(),
	estimated_duration_minutes: z.coerce.number().int().min(0).max(24 * 60).nullable().optional(),
	is_active: z.boolean().optional(),
})

const deactivatePackageSchema = z.object({
	id: z.string().uuid(),
})

export type OpsExperiencePackageActionSuccess = { ok: true }
export type OpsExperiencePackageActionResult =
	| OpsExperiencePackageActionSuccess
	| ReturnType<typeof buildOpsActionFailure>

function revalidateTourSurfaces(slug?: string | null) {
	revalidatePath('/ops/experiences')
	revalidatePath('/tours')
	if (slug) {
		revalidatePath(`/tours/${slug}`)
	}
}

export async function createOpsExperiencePackageAction(
	raw: z.infer<typeof createPackageSchema>,
): Promise<OpsExperiencePackageActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = createPackageSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'create_ops_experience_package',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Check slug, title, and pricing fields', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'create_ops_experience_package',
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
		.from('experience_packages')
		.insert({
			slug: p.slug,
			title: p.title,
			description: p.description ?? null,
			base_price_zar: p.base_price_zar,
			per_passenger_increment_zar: p.per_passenger_increment_zar ?? 0,
			included_passengers: p.included_passengers ?? 2,
			default_vehicle_category_id: p.default_vehicle_category_id ?? null,
			itinerary: [],
			addon_catalog: [],
			stub_origin: DEFAULT_STUB_ORIGIN,
			stub_destination: DEFAULT_STUB_DESTINATION,
			estimated_duration_minutes: p.estimated_duration_minutes ?? null,
			is_active: true,
		})
		.select('id, slug')
		.single()

	if (error || !data) {
		logOpsAction({
			action: 'create_ops_experience_package',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error?.message,
		})
		return buildOpsActionFailure(
			'DATABASE',
			error?.message ?? 'Could not create package',
			correlationId,
		)
	}

	logOpsAction({
		action: 'create_ops_experience_package',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: data.id as string,
		meta: { slug: data.slug as string },
	})
	revalidateTourSurfaces(data.slug as string)
	return { ok: true }
}

export async function updateOpsExperiencePackageAction(
	raw: z.infer<typeof updatePackageSchema>,
): Promise<OpsExperiencePackageActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = updatePackageSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'update_ops_experience_package',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid update payload', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'update_ops_experience_package',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const { id, ...patch } = parsed.data

	const supabase = await createUserServerClient()
	const { data: before } = await supabase
		.from('experience_packages')
		.select('slug')
		.eq('id', id)
		.maybeSingle()

	const updates: Record<string, unknown> = {}
	if (patch.slug !== undefined) updates.slug = patch.slug
	if (patch.title !== undefined) updates.title = patch.title
	if (patch.description !== undefined) updates.description = patch.description
	if (patch.base_price_zar !== undefined) updates.base_price_zar = patch.base_price_zar
	if (patch.per_passenger_increment_zar !== undefined) {
		updates.per_passenger_increment_zar = patch.per_passenger_increment_zar
	}
	if (patch.included_passengers !== undefined) updates.included_passengers = patch.included_passengers
	if (patch.default_vehicle_category_id !== undefined) {
		updates.default_vehicle_category_id = patch.default_vehicle_category_id
	}
	if (patch.estimated_duration_minutes !== undefined) {
		updates.estimated_duration_minutes = patch.estimated_duration_minutes
	}
	if (patch.is_active !== undefined) updates.is_active = patch.is_active

	if (Object.keys(updates).length === 0) {
		return buildOpsActionFailure('VALIDATION', 'No changes to apply', correlationId)
	}

	const { error } = await supabase.from('experience_packages').update(updates).eq('id', id)

	if (error) {
		logOpsAction({
			action: 'update_ops_experience_package',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: id,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	const oldSlug = before?.slug != null ? String(before.slug) : null
	const newSlug = patch.slug !== undefined ? patch.slug : oldSlug

	logOpsAction({
		action: 'update_ops_experience_package',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: id,
		meta: newSlug != null ? { slug: newSlug } : undefined,
	})
	revalidateTourSurfaces(oldSlug)
	if (newSlug && newSlug !== oldSlug) {
		revalidateTourSurfaces(newSlug)
	}
	return { ok: true }
}

export async function deactivateOpsExperiencePackageAction(
	raw: z.infer<typeof deactivatePackageSchema>,
): Promise<OpsExperiencePackageActionResult> {
	const correlationId = newOpsCorrelationId()
	const parsed = deactivatePackageSchema.safeParse(raw)
	if (!parsed.success) {
		return buildOpsActionFailure('VALIDATION', 'Invalid package id', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()
	const { data: before } = await supabase
		.from('experience_packages')
		.select('slug')
		.eq('id', parsed.data.id)
		.maybeSingle()

	const { error } = await supabase
		.from('experience_packages')
		.update({ is_active: false })
		.eq('id', parsed.data.id)

	if (error) {
		logOpsAction({
			action: 'deactivate_ops_experience_package',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: parsed.data.id,
			hint: error.message,
		})
		return buildOpsActionFailure('DATABASE', error.message, correlationId)
	}

	const slug = before?.slug != null ? String(before.slug) : null
	logOpsAction({
		action: 'deactivate_ops_experience_package',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: parsed.data.id,
		meta: slug != null ? { slug } : undefined,
	})
	revalidateTourSurfaces(slug)
	return { ok: true }
}
