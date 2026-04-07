'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'

import { appendOpsAuditLog } from '@/lib/ops-audit'
import {
	createChauffeurComplianceDocumentSchema,
	createComplianceIncidentSchema,
	createVehicleComplianceDocumentSchema,
	dsrAnonymiseRequestSchema,
	dsrExportRequestSchema,
	listComplianceIncidentsSchema,
	listExpiringComplianceDocumentsSchema,
} from '@/lib/ops-compliance-schemas'
import { getOpsAdminForAction, getOpsStaffForAction } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type {
	ComplianceIncidentCategoryDb,
	ChauffeurComplianceDocumentTypeDb,
	DsrExportPayloadDb,
	ProfileRole,
	VehicleComplianceDocumentTypeDb,
} from '@/types/database.types'

function staffActorRole(role: ProfileRole): 'admin' | 'dispatcher' {
	return role === 'admin' ? 'admin' : 'dispatcher'
}

function dateStr(d: Date): string {
	return d.toISOString().slice(0, 10)
}

export async function listComplianceIncidentsAction(
	raw: z.infer<typeof listComplianceIncidentsSchema>,
) {
	const parsed = listComplianceIncidentsSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload', rows: [] as const }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message, rows: [] as const }
	}

	const supabase = await createUserServerClient()
	const { data, error } = await supabase
		.from('compliance_incidents')
		.select(
			'id, category, summary, occurred_at, reported_by, related_booking_id, metadata, retention_class, retention_until, created_at, updated_at',
		)
		.order('occurred_at', { ascending: false })
		.limit(parsed.data.limit)

	if (error) {
		return { ok: false as const, message: error.message, rows: [] as const }
	}

	return { ok: true as const, rows: data ?? [] }
}

export async function createComplianceIncidentAction(
	raw: z.infer<typeof createComplianceIncidentSchema>,
) {
	const parsed = createComplianceIncidentSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}

	const staff = gate.session
	const supabase = await createUserServerClient()
	const { category, summary, occurredAt, relatedBookingId, metadata } = parsed.data

	const insertRow = {
		category: category as ComplianceIncidentCategoryDb,
		summary,
		occurred_at: occurredAt,
		reported_by: staff.userId,
		related_booking_id: relatedBookingId ?? null,
		metadata: metadata as Record<string, unknown>,
	}

	const { data: row, error: insErr } = await supabase
		.from('compliance_incidents')
		.insert(insertRow)
		.select('id')
		.single()

	if (insErr || !row) {
		return { ok: false as const, message: insErr?.message ?? 'Insert failed' }
	}

	const incidentId = row.id as string

	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'create_compliance_incident',
		entity: 'compliance_incident',
		entityId: incidentId,
		payload: {
			category,
			related_booking_id: relatedBookingId ?? null,
		},
	})

	revalidatePath('/ops/compliance')

	return { ok: true as const, incidentId }
}

export async function listExpiringComplianceDocumentsAction(
	raw: z.infer<typeof listExpiringComplianceDocumentsSchema>,
) {
	const parsed = listExpiringComplianceDocumentsSchema.safeParse(raw)
	if (!parsed.success) {
		return {
			ok: false as const,
			message: 'Invalid payload',
			vehicleRows: [] as const,
			chauffeurRows: [] as const,
		}
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return {
			ok: false as const,
			message: gate.message,
			vehicleRows: [] as const,
			chauffeurRows: [] as const,
		}
	}

	const supabase = await createUserServerClient()
	const horizon = new Date()
	horizon.setDate(horizon.getDate() + parsed.data.daysAhead)
	const horizonStr = dateStr(horizon)

	const vehicleQ = supabase
		.from('vehicle_compliance_documents')
		.select(
			'id, vehicle_id, document_type, expiry_date, storage_bucket, storage_object_path, notes, retention_class, retention_until, created_at, updated_at',
		)
		.not('expiry_date', 'is', null)
		.lte('expiry_date', horizonStr)
		.order('expiry_date', { ascending: true })
		.limit(100)

	const chauffeurQ = supabase
		.from('chauffeur_compliance_documents')
		.select(
			'id, chauffeur_id, document_type, expiry_date, storage_bucket, storage_object_path, notes, retention_class, retention_until, created_at, updated_at',
		)
		.not('expiry_date', 'is', null)
		.lte('expiry_date', horizonStr)
		.order('expiry_date', { ascending: true })
		.limit(100)

	const [{ data: vData, error: vErr }, { data: cData, error: cErr }] = await Promise.all([
		vehicleQ,
		chauffeurQ,
	])

	if (vErr || cErr) {
		return {
			ok: false as const,
			message: vErr?.message ?? cErr?.message ?? 'Query failed',
			vehicleRows: [] as const,
			chauffeurRows: [] as const,
		}
	}

	return {
		ok: true as const,
		vehicleRows: vData ?? [],
		chauffeurRows: cData ?? [],
		daysAhead: parsed.data.daysAhead,
		horizonDate: horizonStr,
	}
}

export async function createVehicleComplianceDocumentAction(
	raw: z.infer<typeof createVehicleComplianceDocumentSchema>,
) {
	const parsed = createVehicleComplianceDocumentSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}

	const staff = gate.session
	const supabase = await createUserServerClient()
	const d = parsed.data

	const { data: row, error } = await supabase
		.from('vehicle_compliance_documents')
		.insert({
			vehicle_id: d.vehicleId,
			document_type: d.documentType as VehicleComplianceDocumentTypeDb,
			expiry_date: d.expiryDate ?? null,
			storage_bucket: d.storageBucket,
			storage_object_path: d.storageObjectPath,
			notes: d.notes ?? null,
		})
		.select('id')
		.single()

	if (error || !row) {
		return { ok: false as const, message: error?.message ?? 'Insert failed' }
	}

	const id = row.id as string
	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'create_vehicle_compliance_document',
		entity: 'vehicle_compliance_document',
		entityId: id,
		payload: { vehicle_id: d.vehicleId, document_type: d.documentType },
	})

	revalidatePath('/ops/compliance')
	return { ok: true as const, documentId: id }
}

export async function createChauffeurComplianceDocumentAction(
	raw: z.infer<typeof createChauffeurComplianceDocumentSchema>,
) {
	const parsed = createChauffeurComplianceDocumentSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false as const, message: gate.message }
	}

	const staff = gate.session
	const supabase = await createUserServerClient()
	const d = parsed.data

	const { data: row, error } = await supabase
		.from('chauffeur_compliance_documents')
		.insert({
			chauffeur_id: d.chauffeurId,
			document_type: d.documentType as ChauffeurComplianceDocumentTypeDb,
			expiry_date: d.expiryDate ?? null,
			storage_bucket: d.storageBucket,
			storage_object_path: d.storageObjectPath,
			notes: d.notes ?? null,
		})
		.select('id')
		.single()

	if (error || !row) {
		return { ok: false as const, message: error?.message ?? 'Insert failed' }
	}

	const id = row.id as string
	await appendOpsAuditLog(supabase, {
		actorId: staff.userId,
		actorRole: staffActorRole(staff.role),
		action: 'create_chauffeur_compliance_document',
		entity: 'chauffeur_compliance_document',
		entityId: id,
		payload: { chauffeur_id: d.chauffeurId, document_type: d.documentType },
	})

	revalidatePath('/ops/compliance')
	return { ok: true as const, documentId: id }
}

export async function exportDataSubjectAction(raw: z.infer<typeof dsrExportRequestSchema>) {
	const parsed = dsrExportRequestSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload', export: null }
	}

	const adminGate = await getOpsAdminForAction()
	if (!adminGate.ok) {
		return { ok: false as const, message: adminGate.message, export: null }
	}

	const admin = adminGate.session
	const supabase = await createUserServerClient()

	let profileQuery = supabase.from('profiles').select(
		'id, full_name, phone, email, avatar_url, role, status, created_at, updated_at, retention_class, retention_until, data_subject_anonymised_at',
	)

	if (parsed.data.profileId) {
		profileQuery = profileQuery.eq('id', parsed.data.profileId)
	} else if (parsed.data.email) {
		profileQuery = profileQuery.eq('email', parsed.data.email.trim().toLowerCase())
	}

	const { data: profile, error: pErr } = await profileQuery.maybeSingle()

	if (pErr || !profile) {
		return { ok: false as const, message: 'Profile not found', export: null }
	}

	const role = profile.role as ProfileRole
	if (role !== 'customer') {
		return {
			ok: false as const,
			message: 'DSR export (MVP) is limited to profiles with role customer',
			export: null,
		}
	}

	const profileId = profile.id as string

	const { data: bookingsByCustomer, error: b1Err } = await supabase
		.from('bookings')
		.select(
			'id, status, payment_status, customer_id, customer_name, customer_email, customer_phone, total_amount, payment_reference, booking_intent, created_at, updated_at, retention_class, retention_until',
		)
		.eq('customer_id', profileId)

	const emailNorm = (profile.email as string).trim().toLowerCase()

	let bookingsByGuestEmail: Record<string, unknown>[] = []
	let b2Err: { message: string } | null = null
	if (emailNorm.length > 0) {
		const g = await supabase
			.from('bookings')
			.select(
				'id, status, payment_status, customer_id, customer_name, customer_email, customer_phone, total_amount, payment_reference, booking_intent, created_at, updated_at, retention_class, retention_until',
			)
			.is('customer_id', null)
			.ilike('customer_email', emailNorm)
		bookingsByGuestEmail = (g.data ?? []) as Record<string, unknown>[]
		b2Err = g.error
	}

	if (b1Err || b2Err) {
		return { ok: false as const, message: b1Err?.message ?? b2Err?.message ?? 'Read failed', export: null }
	}

	const bookingMap = new Map<string, Record<string, unknown>>()
	for (const b of bookingsByCustomer ?? []) {
		bookingMap.set(b.id as string, b as Record<string, unknown>)
	}
	for (const b of bookingsByGuestEmail) {
		bookingMap.set(b.id as string, b)
	}
	const bookings = [...bookingMap.values()]

	const bookingIds = bookings.map((b) => b.id as string)

	const { data: trips, error: tErr } = await supabase
		.from('trips')
		.select(
			'id, status, customer_id, vehicle_id, chauffeur_id, time_start_estimate, time_end_estimate, created_at, updated_at',
		)
		.eq('customer_id', profileId)

	if (tErr) {
		return { ok: false as const, message: tErr.message, export: null }
	}

	let engagements: Record<string, unknown>[] = []
	if (bookingIds.length > 0) {
		const { data: eng, error: eErr } = await supabase
			.from('close_protection_engagements')
			.select('id, booking_id, trip_id, status, created_at, updated_at')
			.in('booking_id', bookingIds)

		if (eErr) {
			return { ok: false as const, message: eErr.message, export: null }
		}
		engagements = (eng ?? []) as Record<string, unknown>[]
	}

	const exportedAt = new Date().toISOString()
	const payload: DsrExportPayloadDb = {
		version: 'vst12_dsr_minimal_v1',
		exported_at: exportedAt,
		subject_profile_id: profileId,
		profile: {
			id: profileId,
			full_name: profile.full_name as string,
			phone: profile.phone as string,
			email: profile.email as string,
			avatar_url: profile.avatar_url as string | null,
			role,
			status: profile.status as string,
			created_at: profile.created_at as string,
			updated_at: profile.updated_at as string,
			retention_class: profile.retention_class as string | null,
			retention_until: profile.retention_until as string | null,
			data_subject_anonymised_at: profile.data_subject_anonymised_at as string | null,
		},
		bookings,
		trips: (trips ?? []) as Record<string, unknown>[],
		close_protection_engagements: engagements,
	}

	await appendOpsAuditLog(supabase, {
		actorId: admin.userId,
		actorRole: 'admin',
		action: 'dsr_export',
		entity: 'data_subject',
		entityId: profileId,
		payload: {
			version: payload.version,
			booking_count: bookings.length,
			trip_count: (trips ?? []).length,
			engagement_count: engagements.length,
		},
	})

	return { ok: true as const, message: 'OK', export: payload }
}

export async function anonymiseDataSubjectAction(raw: z.infer<typeof dsrAnonymiseRequestSchema>) {
	const parsed = dsrAnonymiseRequestSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false as const, message: 'Invalid payload' }
	}

	const adminGate = await getOpsAdminForAction()
	if (!adminGate.ok) {
		return { ok: false as const, message: adminGate.message }
	}

	const admin = adminGate.session
	const supabase = await createUserServerClient()
	const profileId = parsed.data.profileId

	const { data: profile, error: pErr } = await supabase
		.from('profiles')
		.select('id, email, role, data_subject_anonymised_at')
		.eq('id', profileId)
		.maybeSingle()

	if (pErr || !profile) {
		return { ok: false as const, message: 'Profile not found' }
	}

	if ((profile.role as ProfileRole) !== 'customer') {
		return { ok: false as const, message: 'DSR anonymise (MVP) is limited to customer profiles' }
	}

	if (profile.data_subject_anonymised_at) {
		return { ok: false as const, message: 'Profile already anonymised' }
	}

	const priorEmail = (profile.email as string).trim().toLowerCase()
	const placeholderEmail = `redacted+${profileId.slice(0, 8)}@invalid.vestroo.local`

	const { data: bookingsByCustomer } = await supabase
		.from('bookings')
		.select('id')
		.eq('customer_id', profileId)

	let guestBookingRows: { id: string }[] = []
	if (priorEmail.length > 0) {
		const { data: bookingsByGuest } = await supabase
			.from('bookings')
			.select('id')
			.is('customer_id', null)
			.ilike('customer_email', priorEmail)
		guestBookingRows = (bookingsByGuest ?? []) as { id: string }[]
	}

	const bookingIdSet = new Set<string>()
	for (const b of bookingsByCustomer ?? []) {
		bookingIdSet.add(b.id as string)
	}
	for (const b of guestBookingRows) {
		bookingIdSet.add(b.id)
	}
	const bookingIds = [...bookingIdSet]

	const nowIso = new Date().toISOString()

	const { error: profErr } = await supabase
		.from('profiles')
		.update({
			full_name: 'Redacted',
			phone: '',
			email: placeholderEmail,
			avatar_url: null,
			status: 'inactive',
			data_subject_anonymised_at: nowIso,
		})
		.eq('id', profileId)

	if (profErr) {
		return { ok: false as const, message: profErr.message }
	}

	if (bookingIds.length > 0) {
		const { error: bookErr } = await supabase
			.from('bookings')
			.update({
				customer_name: 'Redacted',
				customer_email: placeholderEmail,
				customer_phone: '',
			})
			.in('id', bookingIds)

		if (bookErr) {
			return { ok: false as const, message: bookErr.message }
		}

		const { error: engErr } = await supabase
			.from('close_protection_engagements')
			.update({ coordination_notes: null })
			.in('booking_id', bookingIds)

		if (engErr) {
			return { ok: false as const, message: engErr.message }
		}
	}

	const { error: tripErr } = await supabase.from('trips').update({ customer_id: null }).eq('customer_id', profileId)

	if (tripErr) {
		return { ok: false as const, message: tripErr.message }
	}

	await appendOpsAuditLog(supabase, {
		actorId: admin.userId,
		actorRole: 'admin',
		action: 'dsr_anonymise',
		entity: 'data_subject',
		entityId: profileId,
		payload: {
			bookings_redacted: bookingIds.length,
			auth_users_followup_required: true,
		},
	})

	revalidatePath('/ops/compliance')

	return { ok: true as const, message: 'Anonymised profile and linked booking contact fields' }
}
