'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsAdminForAction, getOpsStaffForAction } from '@/lib/ops-auth'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
import {
	resolveAccountDisplayNameForBookingRow,
	staffMessageForCanDispatchAccountReason,
} from '@/lib/account-po-policy'
import { fetchNotDispatchableAccountDetail } from '@/lib/account-dispatch-block-detail'
import {
	DISPATCH_OVERRIDE_TTL_MS,
	encodeDispatchOverrideToken,
	getDispatchOverrideSecret,
	isOverridableAccountDispatchReason,
	verifyDispatchOverrideToken,
	type DispatchOverridePayloadV1,
} from '@/lib/dispatch-override-token'
import { tryAutoConfirmAccountClientBooking } from '@/lib/ops-account-client-auto-confirm'
import { isBookingDispatchable } from '@/lib/ops-booking'
import {
	findChauffeurWindowConflicts,
	findVehicleWindowConflicts,
	rangesOverlap,
	tripTimeWindow,
} from '@/lib/ops-time-windows'
import {
	buildAssignmentNotifications,
	buildTripChangeNotifications,
	insertOperationalNotifications,
} from '@/lib/operational-notifications'
import {
	appendBookingStatusHistoryEntry,
	BOOKING_STATUSES_TERMINAL_FOR_TRIP_COMPLETE_HOOK,
	shouldSetBookingReadyToInvoiceOnTripCompleted,
} from '@/lib/ops-trip-complete-booking-invoice-hook'
import { extractOpsBookingVehicleCategoryNameForDetail } from '@/lib/ops-booking-detail'
import { fleetVehicleMatchesBookingVehicleClass } from '@/lib/ops-booking-vehicle-class-match'
import { suggestVehiclesForBooking, type Suggestion } from '@/lib/dispatch-suggestions'
import { createDispatchSuggestionsDeps } from '@/lib/dispatch-suggestions-supabase-deps'
import { isDispatchSuggestionsEnabled } from '@/lib/dispatch-suggestions-env'
import { resolveAssignmentCalibrationAudit } from '@/lib/ops-assign-booking-audit-path'
import { createUserServerClient } from '@/lib/supabase/server'
import type { NotificationKindDb } from '@/types/database.types'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'

export type { AssignFromSuggestionHints } from '@/lib/ops-assign-booking-audit-path'

const suggestionRankSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

const fromSuggestionSchema = z.object({
	vehicleId: z.string().uuid(),
	/** Hint only — server re-binds from `suggestVehiclesForBooking` top-3 for audit. */
	score: z.number().finite(),
	/** Optional hint — audit uses server-bound rank when suggestion path validates. */
	rank: suggestionRankSchema.optional(),
})

const assignSchema = z.object({
	bookingId: z.string().uuid(),
	/** Profile id for the assigned driver (DB `trips.chauffeur_id` until Epic 17). */
	driverProfileId: z.string().uuid(),
	/** When omitted, server uses `profiles.default_vehicle_id` for the driver (Fleet → Drivers). */
	vehicleId: z.string().uuid().optional(),
	overrideToken: z.string().min(1).optional(),
	fromSuggestion: fromSuggestionSchema.optional(),
})

const signDispatchOverrideSchema = z.object({
	bookingId: z.string().uuid(),
	reasonCode: z.enum(['credit_limit_exceeded', 'overdue_invoices']),
	overrideReason: z.string().min(10).max(2000),
})

const tripStatusSchema = z.object({
	tripId: z.string().uuid(),
	status: z.enum(['booking', 'assigned', 'en_route', 'completed', 'cancelled']),
})

const delaySchema = z.object({
	tripId: z.string().uuid(),
	note: z.string().min(1).max(2000),
	revisedEndEstimateIso: z.string().min(1),
})

const swapVehicleSchema = z.object({
	tripId: z.string().uuid(),
	newVehicleId: z.string().uuid(),
})

async function resolveChauffeurScheduleId(
	supabase: SupabaseClient,
	chauffeurId: string,
	vehicleId: string,
	workDate: string,
): Promise<{ ok: true; scheduleId: string } | { ok: false; message: string }> {
	const { data: row } = await supabase
		.from('chauffeur_schedules')
		.select('id')
		.eq('chauffeur_id', chauffeurId)
		.eq('vehicle_id', vehicleId)
		.eq('work_date', workDate)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (row?.id) {
		return { ok: true, scheduleId: row.id as string }
	}

	const { data: created, error } = await supabase
		.from('chauffeur_schedules')
		.insert({
			chauffeur_id: chauffeurId,
			work_date: workDate,
			vehicle_id: vehicleId,
			total_working_hours: 8,
			actual_working_hours: 0,
			status: 'not_started',
			task_type: 'general',
		})
		.select('id')
		.single()

	if (error || !created) {
		return { ok: false, message: error?.message ?? 'Could not create chauffeur schedule' }
	}
	return { ok: true, scheduleId: created.id as string }
}

export async function assignBookingToRun(raw: z.infer<typeof assignSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = assignSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'assignBookingToRun',
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
			action: 'assignBookingToRun',
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
	const {
		bookingId,
		driverProfileId,
		vehicleId: vehicleIdRaw,
		overrideToken: rawOverrideToken,
		fromSuggestion: fromSuggestionRaw,
	} = parsed.data
	const overrideToken = rawOverrideToken?.trim() || undefined

	const { data: driverRow, error: dRowErr } = await supabase
		.from('profiles')
		.select('default_vehicle_id, role, status')
		.eq('id', driverProfileId)
		.maybeSingle()

	if (dRowErr) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: dRowErr.message,
		})
		return buildOpsActionFailure('DATABASE', dRowErr.message, correlationId)
	}

	if (!driverRow || driverRow.role !== PROFILE_ROLE_OPS_DRIVER_DB) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_CHAUFFEUR',
		})
		return buildOpsActionFailure('INVALID_CHAUFFEUR', 'Select an active driver profile', correlationId)
	}

	const driverStatusKey = String(driverRow.status ?? '')
		.trim()
		.toLowerCase()
	if (driverStatusKey === 'inactive' || driverStatusKey === 'unavailable') {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'INVALID_CHAUFFEUR',
		})
		return buildOpsActionFailure(
			'INVALID_CHAUFFEUR',
			'This driver is marked unavailable and cannot be assigned.',
			correlationId,
		)
	}

	let resolvedVehicleId: string | undefined =
		vehicleIdRaw && vehicleIdRaw.length > 0 ? vehicleIdRaw : undefined
	if (!resolvedVehicleId) {
		const dv = driverRow.default_vehicle_id as string | null | undefined
		resolvedVehicleId = dv && dv.length > 0 ? dv : undefined
	}
	if (!resolvedVehicleId) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Choose a vehicle for this assignment, or set a default vehicle on the driver in Fleet → Drivers.',
			correlationId,
		)
	}

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select(
			'id, customer_id, client_type, status, status_history, payment_status, total_amount, booking_intent, pickup_datetime, trip_date, estimated_duration, customer_account_id, account_snapshot, booking_metadata, booking_trips(sort_order,trips(vehicles(vehicle_categories(name))))',
		)
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			bookingId,
			hint: bErr?.message,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Booking not found', correlationId)
	}

	const { data: assignVehicleRow, error: assignVehErr } = await supabase
		.from('vehicles')
		.select('id, seats, vehicle_categories(name)')
		.eq('id', resolvedVehicleId)
		.maybeSingle()

	if (assignVehErr || !assignVehicleRow) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: assignVehErr?.message,
		})
		return buildOpsActionFailure(
			'DATABASE',
			assignVehErr?.message ?? 'Could not load vehicle for assignment',
			correlationId,
		)
	}

	const catRaw = assignVehicleRow.vehicle_categories as unknown
	const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw
	const vehicleCategoryName =
		cat && typeof cat === 'object' && 'name' in cat
			? String((cat as { name: unknown }).name ?? '').trim() || null
			: null
	const vehicleSeats =
		typeof assignVehicleRow.seats === 'number' ? assignVehicleRow.seats : null

	const requestedClass = extractOpsBookingVehicleCategoryNameForDetail({
		booking_trips: booking.booking_trips,
		booking_metadata: booking.booking_metadata,
	})

	if (
		!fleetVehicleMatchesBookingVehicleClass(requestedClass, vehicleCategoryName, vehicleSeats)
	) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
			bookingId,
		})
		return buildOpsActionFailure(
			'VALIDATION',
			"The selected driver's default vehicle does not match this booking's requested vehicle class. Update the driver's default vehicle in Fleet → Drivers.",
			correlationId,
		)
	}

	if (overrideToken && !getDispatchOverrideSecret()) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'DATABASE',
			bookingId,
			hint: 'DISPATCH_OVERRIDE_SECRET not configured',
		})
		return buildOpsActionFailure(
			'DATABASE',
			'Dispatch override is not configured on this environment',
			correlationId,
		)
	}

	const clientType = (booking.client_type as string | null) === 'account_client' ? 'account_client' : 'walk_in'
	const dispatch = await isBookingDispatchable(supabase, {
		id: bookingId,
		client_type: clientType,
		status: booking.status as string | null,
		payment_status: booking.payment_status as string | null,
		booking_intent: (booking.booking_intent as string | null) ?? null,
	})

	type PendingOverrideAudit = {
		original_reason_code: string
		override_reason: string
		overridden_by_profile_id: string
	}
	let pendingOverrideAudit: PendingOverrideAudit | null = null

	if (!dispatch.ok) {
		if (dispatch.kind === 'walk_in_unpaid') {
			if (overrideToken) {
				return buildOpsActionFailure(
					'VALIDATION',
					'Override does not apply to this booking',
					correlationId,
				)
			}
			logOpsAction({
				action: 'assignBookingToRun',
				outcome: 'failure',
				level: 'warn',
				correlationId,
				code: 'NOT_DISPATCHABLE',
				bookingId,
			})
			return buildOpsActionFailure('NOT_DISPATCHABLE', 'Booking must be paid before dispatch', correlationId)
		}
		if (dispatch.kind === 'rpc_error') {
			if (overrideToken) {
				return buildOpsActionFailure(
					'VALIDATION',
					'Override does not apply to this booking',
					correlationId,
				)
			}
			logOpsAction({
				action: 'assignBookingToRun',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				bookingId,
				hint: dispatch.message,
			})
			return buildOpsActionFailure('DATABASE', dispatch.message, correlationId)
		}
		const reasonCode = dispatch.reasonCode
		if (overrideToken) {
			const adminGate = await getOpsAdminForAction()
			if (!adminGate.ok) {
				logOpsAction({
					action: 'assignBookingToRun',
					outcome: 'forbidden',
					level: 'warn',
					correlationId,
					code: 'FORBIDDEN',
					bookingId,
					hint: adminGate.message,
				})
				return buildOpsActionFailure('FORBIDDEN', adminGate.message, correlationId)
			}
			const secret = getDispatchOverrideSecret()
			if (!secret) {
				return buildOpsActionFailure(
					'DATABASE',
					'Dispatch override is not configured on this environment',
					correlationId,
				)
			}
			const verified = verifyDispatchOverrideToken(overrideToken, secret)
			if (!verified.ok) {
				logOpsAction({
					action: 'assignBookingToRun',
					outcome: 'failure',
					level: 'warn',
					correlationId,
					code: 'VALIDATION',
					bookingId,
					meta: { override: true, verify: verified.error },
				})
				return buildOpsActionFailure(
					'VALIDATION',
					'Invalid or expired override authorization',
					correlationId,
				)
			}
			const p = verified.payload
			if (p.profile_id !== adminGate.session.userId) {
				return buildOpsActionFailure(
					'FORBIDDEN',
					'Override token was issued for a different user',
					correlationId,
				)
			}
			if (p.booking_id !== bookingId) {
				return buildOpsActionFailure(
					'VALIDATION',
					'Override booking does not match this assignment',
					correlationId,
				)
			}
			if (p.reason_code !== reasonCode) {
				return buildOpsActionFailure(
					'VALIDATION',
					'Override does not match the active dispatch block',
					correlationId,
				)
			}
			if (!isOverridableAccountDispatchReason(reasonCode)) {
				logOpsAction({
					action: 'assignBookingToRun',
					outcome: 'forbidden',
					level: 'warn',
					correlationId,
					code: 'FORBIDDEN',
					bookingId,
					meta: { reasonCode, overrideRejected: true },
				})
				return buildOpsActionFailure(
					'FORBIDDEN',
					'Dispatch cannot be overridden for this reason',
					correlationId,
				)
			}
			pendingOverrideAudit = {
				original_reason_code: reasonCode,
				override_reason: p.override_reason,
				overridden_by_profile_id: p.profile_id,
			}
		} else {
			const accountName = await resolveAccountDisplayNameForBookingRow(supabase, {
				customer_account_id: (booking.customer_account_id as string | null) ?? null,
				account_snapshot: booking.account_snapshot,
			})
			const msg = staffMessageForCanDispatchAccountReason(reasonCode, accountName)
			const detail = await fetchNotDispatchableAccountDetail(supabase, {
				customerAccountId: (booking.customer_account_id as string | null) ?? null,
				reasonCode,
				bookingTotalAmount: (booking.total_amount as number | null) ?? null,
			})
			logOpsAction({
				action: 'assignBookingToRun',
				outcome: 'failure',
				level: 'warn',
				correlationId,
				code: 'NOT_DISPATCHABLE_ACCOUNT',
				bookingId,
				meta: { reasonCode, accountDispatchGate: true },
			})
			return buildOpsActionFailure('NOT_DISPATCHABLE_ACCOUNT', msg, correlationId, {
				reasonCode,
				...(detail != null ? { detail } : {}),
			})
		}
	}

	const { data: existingLink } = await supabase
		.from('booking_trips')
		.select('trip_id')
		.eq('booking_id', bookingId)
		.maybeSingle()

	if (existingLink) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'conflict',
			level: 'warn',
			correlationId,
			code: 'CONFLICT',
			bookingId,
		})
		return buildOpsActionFailure('CONFLICT', 'Booking already has a trip', correlationId)
	}

	const pickupIso = (booking.pickup_datetime as string | null)?.trim() ?? ''
	if (!pickupIso) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
			bookingId,
		})
		return buildOpsActionFailure(
			'VALIDATION',
			'Booking must have a pickup time before assigning a trip.',
			correlationId,
		)
	}

	const timeStartEst = pickupIso
	const estMinutesRaw = booking.estimated_duration as number | null | undefined
	const estMinutes =
		typeof estMinutesRaw === 'number' && Number.isFinite(estMinutesRaw) && estMinutesRaw > 0
			? estMinutesRaw
			: 240
	const timeEndEst = new Date(
		new Date(pickupIso).getTime() + estMinutes * 60_000,
	).toISOString()

	const candidate = tripTimeWindow({
		time_start_estimate: timeStartEst,
		time_end_estimate: timeEndEst,
	})

	const { data: vehicleTrips, error: vtErr } = await supabase
		.from('trips')
		.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
		.eq('vehicle_id', resolvedVehicleId)

	if (vtErr) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: vtErr.message,
		})
		return buildOpsActionFailure('DATABASE', vtErr.message, correlationId)
	}

	const conflicts = findVehicleWindowConflicts(vehicleTrips ?? [], resolvedVehicleId, candidate)
	if (conflicts.length > 0) {
		const conflictTripId = conflicts[0].id as string
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'conflict',
			level: 'warn',
			correlationId,
			code: 'CONFLICT',
			tripId: conflictTripId,
		})
		return {
			...buildOpsActionFailure(
				'CONFLICT',
				'Vehicle already assigned in overlapping window',
				correlationId,
			),
			conflictTripId,
		}
	}

	const { data: assignedDriverTrips, error: ctErr } = await supabase
		.from('trips')
		.select('id, chauffeur_id, time_start_estimate, time_end_estimate, status')
		.eq('chauffeur_id', driverProfileId)

	if (ctErr) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: ctErr.message,
		})
		return buildOpsActionFailure('DATABASE', ctErr.message, correlationId)
	}

	const driverTripConflicts = findChauffeurWindowConflicts(
		assignedDriverTrips ?? [],
		driverProfileId,
		candidate,
	)
	if (driverTripConflicts.length > 0) {
		const conflictTripId = driverTripConflicts[0].id as string
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'conflict',
			level: 'warn',
			correlationId,
			code: 'CONFLICT',
			tripId: conflictTripId,
		})
		return {
			...buildOpsActionFailure(
				'CONFLICT',
				'Driver already assigned in overlapping window',
				correlationId,
			),
			conflictTripId,
		}
	}

	const workDate = pickupIso.slice(0, 10)
	const sched = await resolveChauffeurScheduleId(supabase, driverProfileId, resolvedVehicleId, workDate)
	if (!sched.ok) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: sched.message,
		})
		return buildOpsActionFailure('DATABASE', sched.message, correlationId)
	}

	const tripInsert = {
		customer_id: (booking.customer_id as string | null) ?? null,
		chauffeur_id: driverProfileId,
		schedule_id: sched.scheduleId,
		time_start: null,
		time_end: null,
		time_start_estimate: timeStartEst,
		time_end_estimate: timeEndEst,
		vehicle_id: resolvedVehicleId,
		service_type: 'charter',
		trip_coordinates: [] as unknown[],
		service_payload: {
			booking_intent: (booking.booking_intent as string) ?? 'point_to_point',
		},
		amount: (booking.total_amount as number) ?? null,
		status: 'assigned',
	}

	const { data: trip, error: tErr } = await supabase.from('trips').insert(tripInsert).select('id').single()

	if (tErr || !trip) {
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: tErr?.message,
		})
		return buildOpsActionFailure('DATABASE', tErr?.message ?? 'Trip insert failed', correlationId)
	}

	const { error: btErr } = await supabase.from('booking_trips').insert({
		booking_id: bookingId,
		trip_id: trip.id,
		sort_order: 0,
	})

	if (btErr) {
		await supabase.from('trips').delete().eq('id', trip.id)
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: btErr.message,
		})
		return buildOpsActionFailure('DATABASE', btErr.message, correlationId)
	}

	const { error: caErr } = await supabase.from('chauffeur_assignments').insert({
		chauffeur_id: driverProfileId,
		service_route_id: null,
		vehicle_id: resolvedVehicleId,
		start_time: timeStartEst,
		end_time: timeEndEst,
		trip_number: 1,
		status: 'active',
		trip_id: trip.id as string,
	})

	if (caErr) {
		await supabase.from('booking_trips').delete().eq('booking_id', bookingId).eq('trip_id', trip.id)
		await supabase.from('trips').delete().eq('id', trip.id)
		logOpsAction({
			action: 'assignBookingToRun',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: caErr.message,
		})
		return buildOpsActionFailure('DATABASE', caErr.message, correlationId)
	}

	if (pendingOverrideAudit) {
		const overrideAudit = await appendOpsAuditLog(supabase, {
			actorId: staff.userId,
			action: 'dispatch_override',
			entity: 'booking',
			entityId: bookingId,
			payload: {
				booking_id: bookingId,
				original_reason_code: pendingOverrideAudit.original_reason_code,
				override_reason: pendingOverrideAudit.override_reason,
				overridden_by_profile_id: pendingOverrideAudit.overridden_by_profile_id,
			},
		})
		if (!overrideAudit.ok) {
			await supabase.from('chauffeur_assignments').delete().eq('trip_id', trip.id as string)
			await supabase.from('booking_trips').delete().eq('booking_id', bookingId).eq('trip_id', trip.id)
			await supabase.from('trips').delete().eq('id', trip.id)
			logOpsAction({
				action: 'assignBookingToRun',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'AUDIT',
				bookingId,
				hint: overrideAudit.message,
			})
			return buildOpsActionFailure('AUDIT', overrideAudit.message, correlationId)
		}
	}

	const hintsEnabled = isDispatchSuggestionsEnabled()
	let suggestionsAtAssign: Suggestion[] = []
	if (hintsEnabled && fromSuggestionRaw && fromSuggestionRaw.vehicleId === resolvedVehicleId) {
		try {
			const suggestionDeps = createDispatchSuggestionsDeps(supabase)
			suggestionsAtAssign = await suggestVehiclesForBooking(bookingId, suggestionDeps)
		} catch {
			suggestionsAtAssign = []
		}
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'assign_booking_to_run',
		entity: 'trip',
		entityId: trip.id as string,
		payload: {
			booking_id: bookingId,
			vehicle_id: resolvedVehicleId,
		},
	})

	const calibration = resolveAssignmentCalibrationAudit({
		dispatchSuggestionsEnabled: hintsEnabled,
		fromSuggestion: hintsEnabled ? fromSuggestionRaw : undefined,
		assignedVehicleId: resolvedVehicleId,
		bookingId,
		tripId: trip.id as string,
		driverProfileId,
		suggestionsAtAssign,
	})
	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: calibration.action,
		entity: 'trip',
		entityId: trip.id as string,
		payload: calibration.payload,
	})

	const prevBookingStatus = (booking.status as string) ?? ''
	if (prevBookingStatus === 'ready_to_assign') {
		const nextHistory = appendBookingStatusHistoryEntry(
			(booking as { status_history?: unknown }).status_history,
			prevBookingStatus,
			'assigned',
			'ops_assign_booking_to_run',
		)
		const { error: bumpBookErr } = await supabase
			.from('bookings')
			.update({
				status: 'assigned',
				status_history: nextHistory,
			})
			.eq('id', bookingId)
			.eq('status', 'ready_to_assign')

		if (bumpBookErr) {
			logOpsAction({
				action: 'assignBookingToRun',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				bookingId,
				hint: bumpBookErr.message,
			})
			return buildOpsActionFailure(
				'DATABASE',
				`Trip created but booking status could not move to assigned: ${bumpBookErr.message}`,
				correlationId,
			)
		}
	}

	const assignNotes = buildAssignmentNotifications({
		tripId: trip.id as string,
		customerId: (booking.customer_id as string | null) ?? null,
		driverProfileId,
	})
	const nAssign = await insertOperationalNotifications(supabase, assignNotes)
	if (!nAssign.ok) {
		console.error('assign notification insert failed', nAssign.message)
	}

	if (
		(booking.client_type as string | null) === 'account_client' &&
		(booking.status as string | null) === 'pending_confirmation'
	) {
		const auto = await tryAutoConfirmAccountClientBooking(supabase, bookingId)
		if (auto.confirmed) {
			revalidatePath('/account/bookings')
		}
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/calendar')
	revalidatePath('/ops/fleet')
	revalidatePath('/ops/fleet/vehicles')
	revalidatePath('/ops/bookings')
	revalidatePath(`/ops/bookings/${bookingId}`)

	logOpsAction({
		action: 'assignBookingToRun',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: trip.id as string,
		bookingId,
		tripId: trip.id as string,
		meta: { vehicle_id: resolvedVehicleId },
	})
	return { ok: true as const, tripId: trip.id as string }
}

export async function signDispatchOverrideToken(raw: unknown) {
	const correlationId = newOpsCorrelationId()
	const parsed = signDispatchOverrideSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'signDispatchOverrideToken',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const adminGate = await getOpsAdminForAction()
	if (!adminGate.ok) {
		logOpsAction({
			action: 'signDispatchOverrideToken',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: adminGate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', adminGate.message, correlationId)
	}

	const secret = getDispatchOverrideSecret()
	if (!secret) {
		return buildOpsActionFailure(
			'DATABASE',
			'Dispatch override is not configured on this environment',
			correlationId,
		)
	}

	const payload: DispatchOverridePayloadV1 = {
		v: 1,
		booking_id: parsed.data.bookingId,
		reason_code: parsed.data.reasonCode,
		override_reason: parsed.data.overrideReason,
		profile_id: adminGate.session.userId,
		exp: Date.now() + DISPATCH_OVERRIDE_TTL_MS,
	}
	const token = encodeDispatchOverrideToken(payload, secret)

	logOpsAction({
		action: 'signDispatchOverrideToken',
		outcome: 'success',
		level: 'info',
		correlationId,
		bookingId: parsed.data.bookingId,
		meta: { reason_code: parsed.data.reasonCode },
	})

	return { ok: true as const, token, correlationId }
}

export async function updateTripStatusAction(raw: z.infer<typeof tripStatusSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = tripStatusSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'updateTripStatusAction',
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
			action: 'updateTripStatusAction',
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
	const { tripId, status } = parsed.data

	const { data: row, error: gErr } = await supabase
		.from('trips')
		.select('id, status, status_history, customer_id, chauffeur_id')
		.eq('id', tripId)
		.maybeSingle()

	if (gErr || !row) {
		logOpsAction({
			action: 'updateTripStatusAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			tripId,
			hint: gErr?.message,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Trip not found', correlationId)
	}

	const prev = row.status as string
	const historyRaw = row.status_history
	const history = Array.isArray(historyRaw) ? [...historyRaw] : []
	history.push({
		at: new Date().toISOString(),
		from: prev,
		to: status,
		source: 'ops_console',
	})

	const { error: uErr } = await supabase
		.from('trips')
		.update({ status, status_history: history })
		.eq('id', tripId)

	if (uErr) {
		logOpsAction({
			action: 'updateTripStatusAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			tripId,
			hint: uErr.message,
		})
		return buildOpsActionFailure('DATABASE', uErr.message, correlationId)
	}

	if (status === 'completed' || status === 'cancelled') {
		const { data: links, error: linkErr } = await supabase
			.from('booking_trips')
			.select('booking_id')
			.eq('trip_id', tripId)

		if (!linkErr && links?.length) {
			const bookingIds = [...new Set(links.map((l) => l.booking_id as string))]
			for (const bookingId of bookingIds) {
				const { data: bookingRow, error: bErr } = await supabase
					.from('bookings')
					.select('id, client_type, status, status_history')
					.eq('id', bookingId)
					.maybeSingle()

				if (bErr || !bookingRow) {
					continue
				}

				const clientType = bookingRow.client_type as string | null
				const bs = ((bookingRow.status as string | null) ?? '').trim()

				if (status === 'completed') {
					if (
						shouldSetBookingReadyToInvoiceOnTripCompleted({
							clientType,
							bookingStatus: bookingRow.status as string | null,
						})
					) {
						const prevBookingStatus = bs
						const nextHistory = appendBookingStatusHistoryEntry(
							bookingRow.status_history,
							prevBookingStatus,
							'ready_to_invoice',
							'ops_trip_completed',
						)

						const { error: bookErr } = await supabase
							.from('bookings')
							.update({
								status: 'ready_to_invoice',
								status_history: nextHistory,
							})
							.eq('id', bookingId)

						if (bookErr) {
							logOpsAction({
								action: 'updateTripStatusAction',
								outcome: 'failure',
								level: 'error',
								correlationId,
								code: 'DATABASE',
								tripId,
								bookingId,
								hint: bookErr.message,
							})
							return buildOpsActionFailure(
								'DATABASE',
								`Trip updated but booking invoicing hook failed: ${bookErr.message}`,
								correlationId,
							)
						}
						continue
					}

					if (clientType === 'walk_in') {
						const skipWalkInBump =
							BOOKING_STATUSES_TERMINAL_FOR_TRIP_COMPLETE_HOOK.has(bs) ||
							bs === 'completed' ||
							bs === 'ready_to_invoice'
						if (!skipWalkInBump) {
							const nextHistory = appendBookingStatusHistoryEntry(
								bookingRow.status_history,
								bs,
								'completed',
								'ops_trip_completed',
							)
							const { error: bookErr } = await supabase
								.from('bookings')
								.update({
									status: 'completed',
									status_history: nextHistory,
								})
								.eq('id', bookingId)
							if (bookErr) {
								logOpsAction({
									action: 'updateTripStatusAction',
									outcome: 'failure',
									level: 'error',
									correlationId,
									code: 'DATABASE',
									tripId,
									bookingId,
									hint: bookErr.message,
								})
								return buildOpsActionFailure(
									'DATABASE',
									`Trip updated but walk-in booking completion sync failed: ${bookErr.message}`,
									correlationId,
								)
							}
						}
					}
					continue
				}

				// status === 'cancelled'
				if (clientType === 'walk_in' && bs !== 'cancelled' && bs !== 'expired') {
					const nextHistory = appendBookingStatusHistoryEntry(
						bookingRow.status_history,
						bs,
						'cancelled',
						'ops_trip_cancelled',
					)
					const { error: bookErr } = await supabase
						.from('bookings')
						.update({
							status: 'cancelled',
							status_history: nextHistory,
						})
						.eq('id', bookingId)
					if (bookErr) {
						logOpsAction({
							action: 'updateTripStatusAction',
							outcome: 'failure',
							level: 'error',
							correlationId,
							code: 'DATABASE',
							tripId,
							bookingId,
							hint: bookErr.message,
						})
						return buildOpsActionFailure(
							'DATABASE',
							`Trip cancelled but booking cancellation sync failed: ${bookErr.message}`,
							correlationId,
						)
					}
				}
			}
		}
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'update_trip_status',
		entity: 'trip',
		entityId: tripId,
		payload: { from: prev, to: status },
	})

	const kind: NotificationKindDb = status === 'cancelled' ? 'no_show' : 'trip_status'
	const statusNotes = buildTripChangeNotifications({
		tripId,
		customerId: (row.customer_id as string | null) ?? null,
		driverProfileId: (row.chauffeur_id as string | null) ?? null,
		label: `status · ${status}`,
		kind,
		meta: { to_status: status },
	})
	const nStatus = await insertOperationalNotifications(supabase, statusNotes)
	if (!nStatus.ok) {
		console.error('trip status notification insert failed', nStatus.message)
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/calendar')
	revalidatePath('/ops/bookings')

	logOpsAction({
		action: 'updateTripStatusAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		tripId,
		meta: { to_status: status },
	})
	return { ok: true as const }
}

export async function recordTripDelayAction(raw: z.infer<typeof delaySchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = delaySchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'recordTripDelayAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId)
	}

	const endMs = Date.parse(parsed.data.revisedEndEstimateIso)
	if (Number.isNaN(endMs)) {
		logOpsAction({
			action: 'recordTripDelayAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return buildOpsActionFailure('VALIDATION', 'Invalid revised end time', correlationId)
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'recordTripDelayAction',
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
	const { tripId, note, revisedEndEstimateIso } = parsed.data

	const { data: delayTrip } = await supabase
		.from('trips')
		.select('customer_id, chauffeur_id')
		.eq('id', tripId)
		.maybeSingle()

	const { error: uErr } = await supabase
		.from('trips')
		.update({
			ops_delay_note: note,
			ops_revised_time_end_estimate: revisedEndEstimateIso,
		})
		.eq('id', tripId)

	if (uErr) {
		logOpsAction({
			action: 'recordTripDelayAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			tripId,
			hint: uErr.message,
		})
		return buildOpsActionFailure('DATABASE', uErr.message, correlationId)
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'record_trip_delay',
		entity: 'trip',
		entityId: tripId,
		payload: { revised_end_estimate: revisedEndEstimateIso },
	})

	const delayNotes = buildTripChangeNotifications({
		tripId,
		customerId: (delayTrip?.customer_id as string | null) ?? null,
		driverProfileId: (delayTrip?.chauffeur_id as string | null) ?? null,
		label: 'delay recorded',
		kind: 'change',
	})
	const nDelay = await insertOperationalNotifications(supabase, delayNotes)
	if (!nDelay.ok) {
		console.error('delay notification insert failed', nDelay.message)
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/trips')
	revalidatePath('/ops/calendar')

	logOpsAction({
		action: 'recordTripDelayAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		tripId,
		meta: { note_len: note.length },
	})
	return { ok: true as const }
}

export async function swapTripVehicleAction(raw: z.infer<typeof swapVehicleSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = swapVehicleSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'swapTripVehicleAction',
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
			action: 'swapTripVehicleAction',
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
	const { tripId, newVehicleId } = parsed.data

	const { data: trip, error: gErr } = await supabase
		.from('trips')
		.select(
			'id, vehicle_id, chauffeur_id, customer_id, time_start_estimate, time_end_estimate, status',
		)
		.eq('id', tripId)
		.maybeSingle()

	if (gErr || !trip) {
		logOpsAction({
			action: 'swapTripVehicleAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			tripId,
			hint: gErr?.message,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Trip not found', correlationId)
	}

	const oldVehicleId = trip.vehicle_id as string
	if (oldVehicleId === newVehicleId) {
		logOpsAction({
			action: 'swapTripVehicleAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'NO_CHANGE',
			tripId,
		})
		return buildOpsActionFailure('NO_CHANGE', 'Vehicle unchanged', correlationId)
	}

	const candidate = tripTimeWindow({
		time_start_estimate: trip.time_start_estimate as string,
		time_end_estimate: trip.time_end_estimate as string,
	})

	const { data: vehicleTrips, error: vtErr } = await supabase
		.from('trips')
		.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
		.eq('vehicle_id', newVehicleId)

	if (vtErr) {
		logOpsAction({
			action: 'swapTripVehicleAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			tripId,
			hint: vtErr.message,
		})
		return buildOpsActionFailure('DATABASE', vtErr.message, correlationId)
	}

	const conflicts = findVehicleWindowConflicts(vehicleTrips ?? [], newVehicleId, candidate, tripId)
	if (conflicts.length > 0) {
		const conflictTripId = conflicts[0].id as string
		logOpsAction({
			action: 'swapTripVehicleAction',
			outcome: 'conflict',
			level: 'warn',
			correlationId,
			code: 'CONFLICT',
			tripId,
		})
		return {
			...buildOpsActionFailure(
				'CONFLICT',
				'Target vehicle already booked in overlapping window',
				correlationId,
			),
			conflictTripId,
		}
	}

	const { error: uTrip } = await supabase.from('trips').update({ vehicle_id: newVehicleId }).eq('id', tripId)

	if (uTrip) {
		logOpsAction({
			action: 'swapTripVehicleAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			tripId,
			hint: uTrip.message,
		})
		return buildOpsActionFailure('DATABASE', uTrip.message, correlationId)
	}

	const assignedDriverProfileId = trip.chauffeur_id as string

	const { data: assignments } = await supabase
		.from('chauffeur_assignments')
		.select('id, vehicle_id, start_time, end_time')
		.eq('chauffeur_id', assignedDriverProfileId)
		.eq('vehicle_id', oldVehicleId)

	const toPatch =
		assignments?.filter((a) => {
			try {
				const w = tripTimeWindow({
					time_start_estimate: a.start_time as string,
					time_end_estimate: a.end_time as string,
				})
				return rangesOverlap(candidate, w)
			} catch {
				return false
			}
		}) ?? []

	for (const a of toPatch) {
		await supabase.from('chauffeur_assignments').update({ vehicle_id: newVehicleId }).eq('id', a.id as string)
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'swap_trip_vehicle',
		entity: 'trip',
		entityId: tripId,
		payload: { prior_vehicle_id: oldVehicleId, new_vehicle_id: newVehicleId },
	})

	const swapNotes = buildTripChangeNotifications({
		tripId,
		customerId: (trip.customer_id as string | null) ?? null,
		driverProfileId: (trip.chauffeur_id as string | null) ?? null,
		label: 'vehicle updated',
		kind: 'change',
	})
	const nSwap = await insertOperationalNotifications(supabase, swapNotes)
	if (!nSwap.ok) {
		console.error('swap vehicle notification insert failed', nSwap.message)
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/trips')
	revalidatePath('/ops/calendar')
	revalidatePath('/ops/fleet')
	revalidatePath('/ops/fleet/vehicles')

	logOpsAction({
		action: 'swapTripVehicleAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		tripId,
		meta: { new_vehicle_id: newVehicleId },
	})
	return { ok: true as const }
}
