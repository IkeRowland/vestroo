import type { SupabaseClient } from '@supabase/supabase-js'

import type { NotificationKindDb } from '@/types/database.types'

export type OperationalNotificationRow = {
	recipient_id: string
	title: string
	body: string
	kind: NotificationKindDb
	metadata?: Record<string, string | number | boolean | null>
	channel?: string
}

function shortId(uuid: string): string {
	return uuid.slice(0, 8)
}

export function tripRefLabel(tripId: string): string {
	return `Trip ${shortId(tripId)}`
}

export function buildAssignmentNotifications(params: {
	tripId: string
	customerId: string | null
	chauffeurId: string
}): OperationalNotificationRow[] {
	const ref = tripRefLabel(params.tripId)
	const rows: OperationalNotificationRow[] = [
		{
			recipient_id: params.chauffeurId,
			title: 'New assignment',
			body: `${ref} · assigned`,
			kind: 'assignment',
			metadata: { trip_id: params.tripId, status: 'assigned' },
		},
	]
	if (params.customerId) {
		rows.push({
			recipient_id: params.customerId,
			title: 'Trip assigned',
			body: `${ref} · vehicle assigned`,
			kind: 'assignment',
			metadata: { trip_id: params.tripId, status: 'assigned' },
		})
	}
	return rows
}

export function buildTripChangeNotifications(params: {
	tripId: string
	customerId: string | null
	chauffeurId: string | null
	label: string
	kind: NotificationKindDb
	meta?: Record<string, string | number | boolean | null>
}): OperationalNotificationRow[] {
	const ref = tripRefLabel(params.tripId)
	const rows: OperationalNotificationRow[] = []
	if (params.chauffeurId) {
		rows.push({
			recipient_id: params.chauffeurId,
			title: 'Trip update',
			body: `${ref} · ${params.label}`,
			kind: params.kind,
			metadata: { ...params.meta, trip_id: params.tripId },
		})
	}
	if (params.customerId) {
		rows.push({
			recipient_id: params.customerId,
			title: 'Trip update',
			body: `${ref} · ${params.label}`,
			kind: params.kind,
			metadata: { ...params.meta, trip_id: params.tripId },
		})
	}
	return rows
}

export function buildChauffeurTripStatusNotifications(params: {
	tripId: string
	customerId: string | null
	statusLabel: string
}): OperationalNotificationRow[] {
	if (!params.customerId) {
		return []
	}
	const ref = tripRefLabel(params.tripId)
	return [
		{
			recipient_id: params.customerId,
			title: 'Trip status',
			body: `${ref} · ${params.statusLabel}`,
			kind: 'trip_status',
			metadata: { trip_id: params.tripId },
		},
	]
}

export async function insertOperationalNotifications(
	supabase: SupabaseClient,
	rows: OperationalNotificationRow[],
): Promise<{ ok: true } | { ok: false; message: string }> {
	if (rows.length === 0) {
		return { ok: true }
	}
	const payload = rows.map((r) => ({
		recipient_id: r.recipient_id,
		title: r.title,
		body: r.body,
		kind: r.kind,
		metadata: r.metadata ?? {},
		channel: r.channel ?? 'in_app',
		is_read: false,
	}))
	const { error } = await supabase.from('notifications').insert(payload)
	if (error) {
		return { ok: false, message: error.message }
	}
	return { ok: true }
}
