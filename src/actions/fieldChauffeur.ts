'use server'
// VST-11: Chauffeur/field flows must not read close_protection_engagements (RLS + product policy).

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { appendOpsAuditLog } from '@/lib/ops-audit'
import { assertChauffeurTripTransition } from '@/lib/chauffeur-trip-transitions'
import { getChauffeurForAction } from '@/lib/field-auth'
import { tripStatusAllowsCustomerContact } from '@/lib/field-customer-contact'
import {
	buildChauffeurTripStatusNotifications,
	insertOperationalNotifications,
} from '@/lib/operational-notifications'
import { sendEnRouteRiderTrackSmsIfApplicable } from '@/lib/field-en-route-rider-sms'
import { createUserServerClient } from '@/lib/supabase/server'
import type { TripFulfilmentStatusDb } from '@/types/database.types'

const tripIdSchema = z.object({
	tripId: z.string().uuid(),
})

const nextStatusSchema = z.object({
	tripId: z.string().uuid(),
	nextStatus: z.enum(['en_route', 'completed']),
})

async function loadOwnedTrip(
	supabase: Awaited<ReturnType<typeof createUserServerClient>>,
	tripId: string,
	chauffeurId: string,
) {
	const { data, error } = await supabase
		.from('trips')
		.select('id, status, status_history, chauffeur_id, customer_id')
		.eq('id', tripId)
		.maybeSingle()

	if (error || !data) {
		return { ok: false as const, message: 'Trip not found' }
	}
	if ((data.chauffeur_id as string) !== chauffeurId) {
		return { ok: false as const, message: 'Forbidden' }
	}
	return { ok: true as const, trip: data }
}

function auditActionForTransition(to: TripFulfilmentStatusDb): string {
	if (to === 'en_route') {
		return 'chauffeur_confirm_assignment'
	}
	return 'chauffeur_update_trip_status'
}

/**
 * Chauffeur-only: valid pairs are `assigned → en_route` and `en_route → completed`
 * (see `assertChauffeurTripTransition`).
 */
export async function updateChauffeurTripStatusAction(raw: z.infer<typeof nextStatusSchema>) {
	const parsed = nextStatusSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getChauffeurForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}

	const supabase = await createUserServerClient()
	const loaded = await loadOwnedTrip(supabase, parsed.data.tripId, gate.session.userId)
	if (!loaded.ok) {
		return { ok: false as const, message: loaded.message }
	}

	const prev = loaded.trip.status as TripFulfilmentStatusDb
	const next = parsed.data.nextStatus as TripFulfilmentStatusDb
	const check = assertChauffeurTripTransition(prev, next)
	if (!check.ok) {
		return { ok: false as const, message: check.message }
	}

	const historyRaw = loaded.trip.status_history
	const history = Array.isArray(historyRaw) ? [...historyRaw] : []
	history.push({
		at: new Date().toISOString(),
		from: prev,
		to: next,
		source: 'field_app',
	})

	const { error: uErr } = await supabase
		.from('trips')
		.update({ status: next, status_history: history })
		.eq('id', parsed.data.tripId)

	if (uErr) {
		return { ok: false as const, message: uErr.message }
	}

	const statusLabel = next === 'en_route' ? 'driver en route' : 'trip completed'
	const notifyRows = buildChauffeurTripStatusNotifications({
		tripId: parsed.data.tripId,
		customerId: (loaded.trip.customer_id as string | null) ?? null,
		statusLabel,
	})
	const notify = await insertOperationalNotifications(supabase, notifyRows)
	if (!notify.ok) {
		console.error('operational notification insert failed', notify.message)
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: 'chauffeur',
		action: auditActionForTransition(next),
		entity: 'trip',
		entityId: parsed.data.tripId,
		payload: { from: prev, to: next },
	})
	if (!audit.ok) {
		return { ok: false as const, message: audit.message }
	}

	revalidatePath('/field')
	revalidatePath(`/field/trips/${parsed.data.tripId}`)

	// US-C1 (15B.4): best-effort rider SMS; must not throw after a successful trip update/audit
	if (next === 'en_route') {
		void sendEnRouteRiderTrackSmsIfApplicable(supabase, parsed.data.tripId)
	}

	return { ok: true as const }
}

/** Explicit alias for UX copy (“Confirm assignment”); same transition as `nextStatus: en_route`. */
export async function confirmChauffeurAssignmentAction(raw: z.infer<typeof tripIdSchema>) {
	return updateChauffeurTripStatusAction({ ...raw, nextStatus: 'en_route' })
}

export async function logChauffeurContactIntentAction(raw: z.infer<typeof tripIdSchema>) {
	const parsed = tripIdSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getChauffeurForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}

	const supabase = await createUserServerClient()
	const loaded = await loadOwnedTrip(supabase, parsed.data.tripId, gate.session.userId)
	if (!loaded.ok) {
		return { ok: false as const, message: loaded.message }
	}

	const status = loaded.trip.status as string
	if (!tripStatusAllowsCustomerContact(status)) {
		return {
			ok: false as const,
			message: 'Customer contact is only available for assigned or en_route trips',
		}
	}

	const audit = await appendOpsAuditLog(supabase, {
		actorId: gate.session.userId,
		actorRole: 'chauffeur',
		action: 'chauffeur_contact_intent',
		entity: 'trip',
		entityId: parsed.data.tripId,
		payload: { trip_status: status },
	})
	if (!audit.ok) {
		return { ok: false as const, message: audit.message }
	}

	return { ok: true as const }
}
