'use server'

import { revalidatePath } from 'next/cache'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'

const ACTION = 'ensureVst6ServicePatternsSeed' as const

/** Same fixed UUIDs as `20260406121000_vst6_seed_corporate_and_experience_patterns.sql` (idempotent). */
const CORP_ROUTE_ID = 'a0000001-0000-4000-8000-000000000001'
const EXP_ROUTE_ID = 'a0000001-0000-4000-8000-000000000002'
const CORP_PATTERN_ID = 'b0000001-0000-4000-8000-000000000001'
const EXP_PATTERN_ID = 'b0000001-0000-4000-8000-000000000002'

/**
 * Installs **VST-6** fixture routes + active patterns for ops scheduling.
 * **`vehicle_pricings` is optional** — routes may use `pricing_config_id = null` (fulfilment is separate from catalog quotes).
 */
export async function ensureVst6ServicePatternsSeedAction() {
	const correlationId = newOpsCorrelationId()
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: ACTION,
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', gate.message, correlationId)
	}

	const supabase = await createUserServerClient()

	const [{ data: vp, error: vpErr }, { data: cat, error: catErr }] = await Promise.all([
		supabase.from('vehicle_pricings').select('id, vehicle_category_id').limit(1).maybeSingle(),
		supabase.from('vehicle_categories').select('id').order('name').limit(1).maybeSingle(),
	])

	if (vpErr || catErr) {
		const msg = vpErr?.message ?? catErr?.message ?? 'Lookup failed'
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: msg,
		})
		return buildOpsActionFailure('DATABASE', msg, correlationId)
	}

	const vpId = (vp?.id as string | undefined) ?? null
	const vcFromPricing = (vp?.vehicle_category_id as string | null) ?? null
	const vcFromCatalog = (cat?.id as string | undefined) ?? null
	const vcId = vcFromPricing ?? vcFromCatalog
	if (!vcId) {
		return buildOpsActionFailure(
			'NO_VEHICLE_CATEGORY',
			'Add at least one vehicle category (fleet bootstrap) so default routes can be labelled.',
			correlationId,
		)
	}

	const effectiveDate = new Date().toISOString().slice(0, 10)

	const routes = [
		{
			id: CORP_ROUTE_ID,
			name: 'VST-6 Seed — Corporate Sandton circuit',
			description:
				'Demonstrates corporate contracted service route vocabulary (not a public-transit fare).',
			route_coordinates: [] as unknown[],
			total_distance: 12.5,
			estimated_duration: 28,
			vehicle_category_id: vcId,
			pricing_config_id: vpId,
			status: 'active',
		},
		{
			id: EXP_ROUTE_ID,
			name: 'VST-6 Seed — Winelands experience template',
			description: 'Stub template for curated experience / tour packages (VST-10 expands this).',
			route_coordinates: [] as unknown[],
			total_distance: 85,
			estimated_duration: 480,
			vehicle_category_id: vcId,
			pricing_config_id: vpId,
			status: 'active',
		},
	]

	const { error: rUpsertErr } = await supabase.from('service_routes').upsert(routes, { onConflict: 'id' })
	if (rUpsertErr) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: rUpsertErr.message,
		})
		return buildOpsActionFailure('DATABASE', rUpsertErr.message, correlationId)
	}

	const patterns = [
		{
			id: CORP_PATTERN_ID,
			service_route_id: CORP_ROUTE_ID,
			vehicle_ids: [] as string[],
			chauffeur_ids: [] as string[],
			trips_per_day: 4,
			daily_start_time: '06:00',
			daily_end_time: '22:00',
			status: 'active',
			effective_date: effectiveDate,
			expiry_date: null as string | null,
			driver_assignments: [] as unknown[],
		},
		{
			id: EXP_PATTERN_ID,
			service_route_id: EXP_ROUTE_ID,
			vehicle_ids: [] as string[],
			chauffeur_ids: [] as string[],
			trips_per_day: 1,
			daily_start_time: '08:00',
			daily_end_time: '18:00',
			status: 'active',
			effective_date: effectiveDate,
			expiry_date: null as string | null,
			driver_assignments: [] as unknown[],
		},
	]

	const { error: pUpsertErr } = await supabase.from('service_patterns').upsert(patterns, { onConflict: 'id' })
	if (pUpsertErr) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: pUpsertErr.message,
		})
		return buildOpsActionFailure('DATABASE', pUpsertErr.message, correlationId)
	}

	logOpsAction({
		action: ACTION,
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: {
			routes: routes.length,
			patterns: patterns.length,
			linkedVehiclePricing: vpId != null,
		},
	})

	revalidatePath('/ops/settings')
	revalidatePath('/ops/trips')
	return { ok: true as const }
}
