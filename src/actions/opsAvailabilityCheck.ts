'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { availabilityWindowFromBooking } from '@/lib/ops-availability-window'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import {
	findChauffeurWindowConflicts,
	findVehicleWindowConflicts,
} from '@/lib/ops-time-windows'
import {
	submitAvailabilityCheckInputSchema,
	type AvailabilityRouteScope,
} from '@/lib/ops-availability-check-input'
import { createUserServerClient } from '@/lib/supabase/server'
import type { ClientTypeDb } from '@/types/database.types'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

/**
 * Epic 16 / Theme B / **US-B2** — staff submits a vehicle + driver availability check.
 *
 * - Persists `availability_checked_at`, `availability_checked_by`, and a snake-case
 *   `availability_check` jsonb snapshot on the booking.
 * - Conflicts are recomputed **server-side** over the union of `candidatesConsidered` —
 *   client `hasConflict` flags are not trusted (epic Reconciliation row "Conflict definition").
 * - On success, `redirect('/ops/bookings/[id]')` (canonical detail page; segment is `id`).
 *
 * Out of scope: **US-B3** (`availability_check_required` rejection on send-quote / assign)
 * and **US-B4** (admin override).
 */

const ACTION = 'submitAvailabilityCheck' as const

type BookingRow = {
	id: string
	client_type: ClientTypeDb | string | null
	pickup_datetime: string | null
	estimated_duration: number | null
	passenger_count: number | null
}

function expectedClientTypeFromScope(scope: AvailabilityRouteScope): ClientTypeDb {
	return scope === 'walk_in' ? 'walk_in' : 'account_client'
}

export async function submitAvailabilityCheckAction(
	raw: unknown,
): Promise<ReturnType<typeof buildOpsActionFailure> | void> {
	const correlationId = newOpsCorrelationId()
	const parsed = submitAvailabilityCheckInputSchema.safeParse(raw)
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
	const input = parsed.data
	const scope = input.scope

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
	const staff = gate.session
	const supabase = await createUserServerClient()

	const { bookingId, selectedVehicleId, selectedDriverId, candidatesConsidered } = input
	const rationaleTrimmed = (input.rationale ?? '').trim()

	if (!candidatesConsidered.vehicleIds.includes(selectedVehicleId)) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'SELECTED_VEHICLE_NOT_CONSIDERED',
			bookingId,
		})
		return buildOpsActionFailure(
			'SELECTED_VEHICLE_NOT_CONSIDERED',
			'Selected vehicle is not in the considered candidates list.',
			correlationId,
		)
	}
	if (!candidatesConsidered.driverIds.includes(selectedDriverId)) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'SELECTED_DRIVER_NOT_CONSIDERED',
			bookingId,
		})
		return buildOpsActionFailure(
			'SELECTED_DRIVER_NOT_CONSIDERED',
			'Selected driver is not in the considered candidates list.',
			correlationId,
		)
	}

	const { data: bookingRow, error: bErr } = await supabase
		.from('bookings')
		.select('id, client_type, pickup_datetime, estimated_duration, passenger_count')
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || !bookingRow?.id) {
		logOpsAction({
			action: ACTION,
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
			hint: bErr?.message,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const booking = bookingRow as unknown as BookingRow
	const expectedType = expectedClientTypeFromScope(scope)
	if (booking.client_type !== expectedType) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_CLIENT_TYPE',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_CLIENT_TYPE',
			`Booking client_type does not match this route (${scope}).`,
			correlationId,
		)
	}

	const window = availabilityWindowFromBooking({
		pickup_datetime: booking.pickup_datetime,
		estimated_duration: booking.estimated_duration,
	})
	if (!window) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'MISSING_PICKUP_WINDOW',
			bookingId,
		})
		return buildOpsActionFailure(
			'MISSING_PICKUP_WINDOW',
			'Booking has no pickup datetime; cannot compute availability window.',
			correlationId,
		)
	}

	const candidateVehicleIds = candidatesConsidered.vehicleIds
	const candidateDriverIds = candidatesConsidered.driverIds

	const [
		{ data: tripRowsForVehicles, error: vtErr },
		{ data: tripRowsForDrivers, error: dtErr },
		{ data: chauffeurAssignmentsForDrivers, error: caErr },
	] = await Promise.all([
		candidateVehicleIds.length === 0
			? Promise.resolve({ data: [], error: null })
			: supabase
				.from('trips')
				.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
				.in('vehicle_id', candidateVehicleIds)
				.lt('time_start_estimate', window.endIso)
				.gt('time_end_estimate', window.startIso),
		candidateDriverIds.length === 0
			? Promise.resolve({ data: [], error: null })
			: supabase
				.from('trips')
				.select('id, chauffeur_id, time_start_estimate, time_end_estimate, status')
				.in('chauffeur_id', candidateDriverIds)
				.lt('time_start_estimate', window.endIso)
				.gt('time_end_estimate', window.startIso),
		candidateDriverIds.length === 0
			? Promise.resolve({ data: [], error: null })
			: supabase
				.from('chauffeur_assignments')
				.select('id, chauffeur_id, start_time, end_time, status')
				.in('chauffeur_id', candidateDriverIds)
				.lt('start_time', window.endIso)
				.gt('end_time', window.startIso),
	])

	if (vtErr || dtErr || caErr) {
		const hint = vtErr?.message ?? dtErr?.message ?? caErr?.message
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not load existing trips or assignments for conflict check.',
			correlationId,
		)
	}

	const candidateTimeWindow = { startMs: window.startMs, endMs: window.endMs }

	let hasConflict = false
	for (const vid of candidateVehicleIds) {
		const conflicts = findVehicleWindowConflicts(
			(tripRowsForVehicles ?? []) as Parameters<typeof findVehicleWindowConflicts>[0],
			vid,
			candidateTimeWindow,
		)
		if (conflicts.length > 0) {
			hasConflict = true
			break
		}
	}
	if (!hasConflict) {
		for (const did of candidateDriverIds) {
			const tripConflicts = findChauffeurWindowConflicts(
				(tripRowsForDrivers ?? []) as Parameters<typeof findChauffeurWindowConflicts>[0],
				did,
				candidateTimeWindow,
			)
			if (tripConflicts.length > 0) {
				hasConflict = true
				break
			}
			const assignmentRows = (chauffeurAssignmentsForDrivers ?? []) as Array<{
				id: string
				chauffeur_id: string
				start_time: string
				end_time: string
				status: string | null
			}>
			const mappedAssignments = assignmentRows.map((row) => ({
				id: row.id,
				chauffeur_id: row.chauffeur_id,
				time_start_estimate: row.start_time,
				time_end_estimate: row.end_time,
				status: row.status,
			}))
			const assignmentConflicts = findChauffeurWindowConflicts(
				mappedAssignments,
				did,
				candidateTimeWindow,
			)
			if (assignmentConflicts.length > 0) {
				hasConflict = true
				break
			}
		}
	}

	if (hasConflict && rationaleTrimmed.length === 0) {
		logOpsAction({
			action: ACTION,
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'RATIONALE_REQUIRED',
			bookingId,
		})
		return buildOpsActionFailure(
			'RATIONALE_REQUIRED',
			'A rationale is required when any considered vehicle or driver has a conflicting commitment in the window.',
			correlationId,
		)
	}

	const { data: vehicleProfile, error: vpErr } = await supabase
		.from('vehicles')
		.select('id, is_fleet_active')
		.eq('id', selectedVehicleId)
		.maybeSingle()
	if (vpErr || !vehicleProfile?.id || vehicleProfile.is_fleet_active === false) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_VEHICLE',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_VEHICLE',
			'Selected vehicle could not be verified or is inactive for assignment.',
			correlationId,
		)
	}

	const { data: driverProfile, error: dpErr } = await supabase
		.from('profiles')
		.select('id, role, status')
		.eq('id', selectedDriverId)
		.maybeSingle()
	if (
		dpErr ||
		!driverProfile?.id ||
		driverProfile.role !== PROFILE_ROLE_OPS_DRIVER_DB ||
		driverProfile.status !== 'active'
	) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_DRIVER',
			bookingId,
		})
		return buildOpsActionFailure(
			'INVALID_DRIVER',
			'Selected driver is not an active driver profile.',
			correlationId,
		)
	}

	const checkedAtIso = new Date().toISOString()
	const snapshot = {
		selected_vehicle_id: selectedVehicleId,
		selected_driver_id: selectedDriverId,
		candidates_considered: {
			vehicle_ids: candidateVehicleIds,
			driver_ids: candidateDriverIds,
		},
		rationale: hasConflict && rationaleTrimmed.length > 0 ? rationaleTrimmed : null,
		has_conflict: hasConflict,
		window: {
			start: window.startIso,
			end: window.endIso,
		},
	}

	const { data: updatedRow, error: uErr } = await supabase
		.from('bookings')
		.update({
			availability_checked_at: checkedAtIso,
			availability_checked_by: staff.userId,
			availability_check: snapshot,
		})
		.eq('id', bookingId)
		.eq('client_type', expectedType)
		.select('id')
		.maybeSingle()

	if (uErr || !updatedRow?.id) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: uErr?.message,
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Could not save availability check. Try again.',
			correlationId,
		)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staff.role === 'admin' ? 'admin' : 'dispatcher',
		action: 'submit_availability_check',
		entity: 'booking',
		entityId: bookingId,
		payload: {
			...snapshot,
			client_type: expectedType,
		},
	})
	if (!audit.ok) {
		logOpsAction({
			action: ACTION,
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'AUDIT',
			bookingId,
			hint: audit.message,
		})
		return buildOpsActionFailure('AUDIT', audit.message, correlationId)
	}

	logOpsAction({
		action: ACTION,
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId,
		meta: { has_conflict: hasConflict },
	})

	revalidatePath('/ops/bookings')
	revalidatePath(`/ops/bookings/${bookingId}`)

	redirect(`/ops/bookings/${bookingId}`)
}
