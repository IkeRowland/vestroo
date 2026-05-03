'use server';

import { z } from 'zod';
import { createServerClient, createUserServerClient } from '@/lib/supabase/server';

const uuid = z.string().uuid();

const reserveParams = z.object({
	serviceRunId: uuid,
	passengerId: uuid,
	seats: z.number().int().min(1),
	fromPointId: uuid,
	toPointId: uuid,
	idempotencyKey: z.string().min(1).max(256).optional().nullable(),
	bookingId: uuid.optional().nullable(),
	fare: z.number().nonnegative().optional(),
	boardingTime: z.string().optional(),
	holdTtlSeconds: z.number().int().min(60).max(86400).optional(),
});

export type ReserveServiceRunCapacityInput = z.infer<typeof reserveParams>;

export type ServiceRunCapacityActionResult<T> =
	| { ok: true; data: T }
	| { ok: false; message: string; code?: string };

/**
 * Transactional hold on a service run (JWT required — uses user Supabase client).
 * See ADR 0003 and `reserve_service_run_capacity` migration.
 */
export async function reserveServiceRunCapacity(
	raw: ReserveServiceRunCapacityInput,
): Promise<ServiceRunCapacityActionResult<{ ticketId: string }>> {
	const parsed = reserveParams.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, message: parsed.error.message };
	}
	const p = parsed.data;
	const supabase = await createUserServerClient();
	const { data, error } = await supabase.rpc('reserve_service_run_capacity', {
		p_service_run_id: p.serviceRunId,
		p_passenger_id: p.passengerId,
		p_seats: p.seats,
		p_from_point_id: p.fromPointId,
		p_to_point_id: p.toPointId,
		p_idempotency_key: p.idempotencyKey ?? null,
		p_booking_id: p.bookingId ?? null,
		p_fare: p.fare ?? 0,
		p_boarding_time: p.boardingTime ?? new Date().toISOString(),
		p_hold_ttl_seconds: p.holdTtlSeconds ?? 900,
	});
	if (error) {
		return { ok: false, message: error.message, code: error.code };
	}
	if (typeof data !== 'string') {
		return { ok: false, message: 'unexpected_rpc_payload' };
	}
	return { ok: true, data: { ticketId: data } };
}

const ticketIdParam = z.object({ ticketId: uuid });

export async function releaseServiceRunTicketHold(
	raw: z.infer<typeof ticketIdParam>,
): Promise<ServiceRunCapacityActionResult<null>> {
	const parsed = ticketIdParam.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, message: parsed.error.message };
	}
	const supabase = await createUserServerClient();
	const { error } = await supabase.rpc('release_service_run_ticket_hold', {
		p_ticket_id: parsed.data.ticketId,
	});
	if (error) {
		return { ok: false, message: error.message, code: error.code };
	}
	return { ok: true, data: null };
}

export async function cancelServiceRunTicketHold(
	raw: z.infer<typeof ticketIdParam>,
): Promise<ServiceRunCapacityActionResult<null>> {
	const parsed = ticketIdParam.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, message: parsed.error.message };
	}
	const supabase = await createUserServerClient();
	const { error } = await supabase.rpc('cancel_service_run_ticket_hold', {
		p_ticket_id: parsed.data.ticketId,
	});
	if (error) {
		return { ok: false, message: error.message, code: error.code };
	}
	return { ok: true, data: null };
}

export async function confirmServiceRunTicketHold(
	raw: z.infer<typeof ticketIdParam>,
): Promise<ServiceRunCapacityActionResult<null>> {
	const parsed = ticketIdParam.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, message: parsed.error.message };
	}
	const supabase = await createUserServerClient();
	const { error } = await supabase.rpc('confirm_service_run_ticket_hold', {
		p_ticket_id: parsed.data.ticketId,
	});
	if (error) {
		return { ok: false, message: error.message, code: error.code };
	}
	return { ok: true, data: null };
}

/**
 * Batch expire holds past `hold_expires_at`. Callable from cron via service role (no JWT).
 */
export async function expireOutdatedServiceRunHolds(): Promise<
	ServiceRunCapacityActionResult<{ expiredCount: number }>
> {
	const supabase = await createServerClient();
	const { data, error } = await supabase.rpc('expire_outdated_service_run_holds');
	if (error) {
		return { ok: false, message: error.message, code: error.code };
	}
	if (typeof data !== 'number') {
		return { ok: false, message: 'unexpected_rpc_payload' };
	}
	return { ok: true, data: { expiredCount: data } };
}
