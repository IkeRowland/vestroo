'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { appendOpsAuditLog } from '@/lib/ops-audit'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { isBookingDispatchable } from '@/lib/ops-booking'
import {
	findVehicleWindowConflicts,
	rangesOverlap,
	tripTimeWindow,
} from '@/lib/ops-time-windows'
import {
	buildAssignmentNotifications,
	buildTripChangeNotifications,
	insertOperationalNotifications,
} from '@/lib/operational-notifications'
import { createUserServerClient } from '@/lib/supabase/server'
import type { NotificationKindDb } from '@/types/database.types'

const assignSchema = z.object({
	bookingId: z.string().uuid(),
	serviceRunId: z.string().uuid(),
	chauffeurId: z.string().uuid(),
	vehicleId: z.string().uuid(),
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
	const parsed = assignSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}
	const staff = gate.session
	const supabase = await createUserServerClient()
	const { bookingId, serviceRunId, chauffeurId, vehicleId } = parsed.data

	const { data: booking, error: bErr } = await supabase
		.from('bookings')
		.select(
			'id, customer_id, status, payment_status, total_amount, booking_intent, pickup_datetime, trip_date, estimated_duration',
		)
		.eq('id', bookingId)
		.maybeSingle()

	if (bErr || !booking) {
		return { ok: false as const, message: 'Booking not found' }
	}
	if (!isBookingDispatchable(booking)) {
		return { ok: false as const, message: 'Booking must be paid before dispatch' }
	}

	const { data: existingLink } = await supabase
		.from('booking_trips')
		.select('trip_id')
		.eq('booking_id', bookingId)
		.maybeSingle()

	if (existingLink) {
		return { ok: false as const, message: 'Booking already has a trip' }
	}

	const { data: run, error: rErr } = await supabase
		.from('service_runs')
		.select('id, service_route_id, scheduled_start, scheduled_end, trip_number, service_date')
		.eq('id', serviceRunId)
		.maybeSingle()

	if (rErr || !run) {
		return { ok: false as const, message: 'Service run not found' }
	}

	const timeStartEst =
		(booking.pickup_datetime as string | null) ?? (run.scheduled_start as string)
	const timeEndEst =
		booking.estimated_duration && booking.pickup_datetime
			? new Date(
					new Date(booking.pickup_datetime as string).getTime() +
						Number(booking.estimated_duration) * 60_000,
				).toISOString()
			: (run.scheduled_end as string)

	const candidate = tripTimeWindow({
		time_start_estimate: timeStartEst,
		time_end_estimate: timeEndEst,
	})

	const { data: vehicleTrips, error: vtErr } = await supabase
		.from('trips')
		.select('id, vehicle_id, time_start_estimate, time_end_estimate, status')
		.eq('vehicle_id', vehicleId)

	if (vtErr) {
		return { ok: false as const, message: vtErr.message }
	}

	const conflicts = findVehicleWindowConflicts(vehicleTrips ?? [], vehicleId, candidate)
	if (conflicts.length > 0) {
		return {
			ok: false as const,
			message: 'Vehicle already assigned in overlapping window',
			conflictTripId: conflicts[0].id,
		}
	}

	const { data: chauffeurProfile } = await supabase
		.from('profiles')
		.select('role, status')
		.eq('id', chauffeurId)
		.maybeSingle()

	if (
		!chauffeurProfile ||
		chauffeurProfile.role !== 'chauffeur' ||
		chauffeurProfile.status !== 'active'
	) {
		return { ok: false as const, message: 'Select an active chauffeur profile' }
	}

	const workDate = String(run.service_date)
	const sched = await resolveChauffeurScheduleId(supabase, chauffeurId, vehicleId, workDate)
	if (!sched.ok) {
		return { ok: false as const, message: sched.message }
	}

	const tripInsert = {
		customer_id: (booking.customer_id as string | null) ?? null,
		chauffeur_id: chauffeurId,
		time_start: null,
		time_end: null,
		time_start_estimate: timeStartEst,
		time_end_estimate: timeEndEst,
		vehicle_id: vehicleId,
		schedule_id: sched.scheduleId,
		service_type: 'charter',
		trip_coordinates: [] as unknown[],
		service_payload: {
			booking_intent: (booking.booking_intent as string) ?? 'point_to_point',
		},
		amount: (booking.total_amount as number) ?? null,
		status: 'assigned',
		service_run_id: serviceRunId,
	}

	const { data: trip, error: tErr } = await supabase.from('trips').insert(tripInsert).select('id').single()

	if (tErr || !trip) {
		return { ok: false as const, message: tErr?.message ?? 'Trip insert failed' }
	}

	const { error: btErr } = await supabase.from('booking_trips').insert({
		booking_id: bookingId,
		trip_id: trip.id,
		sort_order: 0,
	})

	if (btErr) {
		await supabase.from('trips').delete().eq('id', trip.id)
		return { ok: false as const, message: btErr.message }
	}

	await supabase
		.from('close_protection_engagements')
		.update({ trip_id: trip.id as string })
		.eq('booking_id', bookingId)
		.is('trip_id', null)

	const { error: caErr } = await supabase.from('chauffeur_assignments').insert({
		chauffeur_id: chauffeurId,
		service_route_id: run.service_route_id,
		vehicle_id: vehicleId,
		start_time: run.scheduled_start,
		end_time: run.scheduled_end,
		trip_number: run.trip_number,
		status: 'active',
	})

	if (caErr) {
		await supabase.from('booking_trips').delete().eq('booking_id', bookingId).eq('trip_id', trip.id)
		await supabase.from('trips').delete().eq('id', trip.id)
		return { ok: false as const, message: caErr.message }
	}

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		action: 'assign_booking_to_run',
		entity: 'trip',
		entityId: trip.id as string,
		payload: {
			booking_id: bookingId,
			service_run_id: serviceRunId,
			vehicle_id: vehicleId,
			chauffeur_id: chauffeurId,
		},
	})

	const assignNotes = buildAssignmentNotifications({
		tripId: trip.id as string,
		customerId: (booking.customer_id as string | null) ?? null,
		chauffeurId,
	})
	const nAssign = await insertOperationalNotifications(supabase, assignNotes)
	if (!nAssign.ok) {
		console.error('assign notification insert failed', nAssign.message)
	}

	revalidatePath('/ops/fulfil')
	revalidatePath('/ops/trips')
	revalidatePath('/ops/board')
	revalidatePath('/ops/calendar')
	revalidatePath('/ops/vehicles')

	return { ok: true as const, tripId: trip.id as string }
}

export async function updateTripStatusAction(raw: z.infer<typeof tripStatusSchema>) {
	const parsed = tripStatusSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
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
		return { ok: false as const, message: 'Trip not found' }
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
		return { ok: false as const, message: uErr.message }
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
		chauffeurId: (row.chauffeur_id as string | null) ?? null,
		label: `status · ${status}`,
		kind,
		meta: { to_status: status },
	})
	const nStatus = await insertOperationalNotifications(supabase, statusNotes)
	if (!nStatus.ok) {
		console.error('trip status notification insert failed', nStatus.message)
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/board')
	revalidatePath('/ops/calendar')

	return { ok: true as const }
}

export async function recordTripDelayAction(raw: z.infer<typeof delaySchema>) {
	const parsed = delaySchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const endMs = Date.parse(parsed.data.revisedEndEstimateIso)
	if (Number.isNaN(endMs)) {
		return { ok: false as const, message: 'Invalid revised end time' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
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
		return { ok: false as const, message: uErr.message }
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
		chauffeurId: (delayTrip?.chauffeur_id as string | null) ?? null,
		label: 'delay recorded',
		kind: 'change',
	})
	const nDelay = await insertOperationalNotifications(supabase, delayNotes)
	if (!nDelay.ok) {
		console.error('delay notification insert failed', nDelay.message)
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/board')
	revalidatePath('/ops/calendar')

	return { ok: true as const }
}

export async function swapTripVehicleAction(raw: z.infer<typeof swapVehicleSchema>) {
	const parsed = swapVehicleSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
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
		return { ok: false as const, message: 'Trip not found' }
	}

	const oldVehicleId = trip.vehicle_id as string
	if (oldVehicleId === newVehicleId) {
		return { ok: false as const, message: 'Vehicle unchanged' }
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
		return { ok: false as const, message: vtErr.message }
	}

	const conflicts = findVehicleWindowConflicts(vehicleTrips ?? [], newVehicleId, candidate, tripId)
	if (conflicts.length > 0) {
		return {
			ok: false as const,
			message: 'Target vehicle already booked in overlapping window',
			conflictTripId: conflicts[0].id,
		}
	}

	const { error: uTrip } = await supabase.from('trips').update({ vehicle_id: newVehicleId }).eq('id', tripId)

	if (uTrip) {
		return { ok: false as const, message: uTrip.message }
	}

	const chauffeurId = trip.chauffeur_id as string

	const { data: assignments } = await supabase
		.from('chauffeur_assignments')
		.select('id, vehicle_id, start_time, end_time')
		.eq('chauffeur_id', chauffeurId)
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
		chauffeurId: (trip.chauffeur_id as string | null) ?? null,
		label: 'vehicle updated',
		kind: 'change',
	})
	const nSwap = await insertOperationalNotifications(supabase, swapNotes)
	if (!nSwap.ok) {
		console.error('swap vehicle notification insert failed', nSwap.message)
	}

	revalidatePath('/ops/trips')
	revalidatePath('/ops/board')
	revalidatePath('/ops/calendar')
	revalidatePath('/ops/vehicles')

	return { ok: true as const }
}
