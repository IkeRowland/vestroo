'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import {
	addCalendarDaysUtc,
	scheduledWindowForPatternDay,
} from '@/lib/ops-service-run-datetime'
import { createUserServerClient } from '@/lib/supabase/server'

const ACTION = 'seedOpsServiceRuns' as const

const seedSchema = z.object({
	servicePatternId: z.string().uuid(),
	anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	dayCount: z.number().int().min(1).max(30),
})

function ymdBetweenInclusive(ymd: string, start: string | null, end: string | null): boolean {
	if (start && ymd < start) {
		return false
	}
	if (end && ymd > end) {
		return false
	}
	return true
}

/**
 * Creates **`service_runs`** rows for **`trip_number = 1`** across consecutive **`service_date`**
 * values, using the pattern’s daily window. Skips dates outside the pattern’s effective / expiry
 * range and ignores unique conflicts (already seeded).
 */
export async function seedOpsServiceRunsAction(raw: z.infer<typeof seedSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = seedSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: ACTION,
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
	const { servicePatternId, anchorDate, dayCount } = parsed.data

	const { data: pattern, error: pErr } = await supabase
		.from('service_patterns')
		.select(
			'id, service_route_id, daily_start_time, daily_end_time, status, effective_date, expiry_date',
		)
		.eq('id', servicePatternId)
		.maybeSingle()

	if (pErr || !pattern) {
		logOpsAction({
			action: ACTION,
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
		})
		return buildOpsActionFailure('NOT_FOUND', 'Service pattern not found', correlationId)
	}

	if ((pattern.status as string | null) !== 'active') {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'NOT_SEEDABLE',
			meta: { servicePatternId },
		})
		return buildOpsActionFailure(
			'NOT_SEEDABLE',
			'Pattern is not active — activate it in the database or pick another pattern.',
			correlationId,
		)
	}

	const routeId = pattern.service_route_id as string
	const startHm = pattern.daily_start_time as string
	const endHm = pattern.daily_end_time as string
	const effective = (pattern.effective_date as string | null) ?? null
	const expiry = (pattern.expiry_date as string | null) ?? null

	let inserted = 0
	let skipped = 0

	for (let i = 0; i < dayCount; i++) {
		const serviceDate = i === 0 ? anchorDate : addCalendarDaysUtc(anchorDate, i)
		if (!serviceDate) {
			skipped += 1
			continue
		}
		if (!ymdBetweenInclusive(serviceDate, effective, expiry)) {
			skipped += 1
			continue
		}

		const window = scheduledWindowForPatternDay(serviceDate, startHm, endHm)
		if (!window) {
			skipped += 1
			continue
		}

		const { error: insErr } = await supabase.from('service_runs').insert({
			service_pattern_id: servicePatternId,
			service_route_id: routeId,
			service_date: serviceDate,
			trip_number: 1,
			scheduled_start: window.scheduled_start,
			scheduled_end: window.scheduled_end,
			status: 'active',
		})

		if (insErr) {
			if (insErr.code === '23505') {
				skipped += 1
				continue
			}
			logOpsAction({
				action: ACTION,
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				hint: insErr.message,
			})
			return buildOpsActionFailure(
				'DATABASE',
				insErr.message || 'Could not create service runs',
				correlationId,
			)
		}
		inserted += 1
	}

	logOpsAction({
		action: ACTION,
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: { inserted, skipped, servicePatternId },
	})

	revalidatePath('/ops/trips')
	revalidatePath('/ops/settings')
	return { ok: true as const, inserted, skipped }
}
