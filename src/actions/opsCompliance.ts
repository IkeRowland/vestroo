'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'

import { buildOpsActionFailure } from '@/features/ops/ops-action-errors'
import { appendOpsAuditLog } from '@/lib/ops-audit'
import { logOpsAction, newOpsCorrelationId } from '@/lib/ops-action-log'
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
	const correlationId = newOpsCorrelationId()
	const parsed = listComplianceIncidentsSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'listComplianceIncidentsAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return { ...buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId), rows: [] as const }
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'listComplianceIncidentsAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return { ...buildOpsActionFailure('FORBIDDEN', gate.message, correlationId), rows: [] as const }
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
		logOpsAction({
			action: 'listComplianceIncidentsAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error.message,
		})
		return { ...buildOpsActionFailure('DATABASE', error.message, correlationId), rows: [] as const }
	}

	logOpsAction({
		action: 'listComplianceIncidentsAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: { row_count: (data ?? []).length },
	})
	return { ok: true as const, rows: data ?? [] }
}

export async function createComplianceIncidentAction(
	raw: z.infer<typeof createComplianceIncidentSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = createComplianceIncidentSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'createComplianceIncidentAction',
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
			action: 'createComplianceIncidentAction',
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
		logOpsAction({
			action: 'createComplianceIncidentAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: insErr?.message,
			meta: { summary_len: summary.length },
		})
		return buildOpsActionFailure('DATABASE', insErr?.message ?? 'Insert failed', correlationId)
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

	revalidatePath('/ops')

	logOpsAction({
		action: 'createComplianceIncidentAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: incidentId,
		meta: { summary_len: summary.length },
	})
	return { ok: true as const, incidentId }
}

export async function listExpiringComplianceDocumentsAction(
	raw: z.infer<typeof listExpiringComplianceDocumentsSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = listExpiringComplianceDocumentsSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'listExpiringComplianceDocumentsAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return {
			...buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId),
			vehicleRows: [] as const,
			driverComplianceDocRows: [] as const,
		}
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		logOpsAction({
			action: 'listExpiringComplianceDocumentsAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: gate.message,
		})
		return {
			...buildOpsActionFailure('FORBIDDEN', gate.message, correlationId),
			vehicleRows: [] as const,
			driverComplianceDocRows: [] as const,
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
		logOpsAction({
			action: 'listExpiringComplianceDocumentsAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: vErr?.message ?? cErr?.message,
		})
		return {
			...buildOpsActionFailure('DATABASE', vErr?.message ?? cErr?.message ?? 'Query failed', correlationId),
			vehicleRows: [] as const,
			driverComplianceDocRows: [] as const,
		}
	}

	logOpsAction({
		action: 'listExpiringComplianceDocumentsAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		meta: {
			vehicle_row_count: (vData ?? []).length,
			driver_compliance_doc_row_count: (cData ?? []).length,
		},
	})
	return {
		ok: true as const,
		vehicleRows: vData ?? [],
		driverComplianceDocRows: cData ?? [],
		daysAhead: parsed.data.daysAhead,
		horizonDate: horizonStr,
	}
}

export async function createVehicleComplianceDocumentAction(
	raw: z.infer<typeof createVehicleComplianceDocumentSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = createVehicleComplianceDocumentSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'createVehicleComplianceDocumentAction',
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
			action: 'createVehicleComplianceDocumentAction',
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
		logOpsAction({
			action: 'createVehicleComplianceDocumentAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error?.message,
		})
		return buildOpsActionFailure('DATABASE', error?.message ?? 'Insert failed', correlationId)
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

	revalidatePath('/ops')
	logOpsAction({
		action: 'createVehicleComplianceDocumentAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: id,
		meta: { vehicle_id: d.vehicleId },
	})
	return { ok: true as const, documentId: id }
}

export async function createChauffeurComplianceDocumentAction(
	raw: z.infer<typeof createChauffeurComplianceDocumentSchema>,
) {
	const correlationId = newOpsCorrelationId()
	const parsed = createChauffeurComplianceDocumentSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'createChauffeurComplianceDocumentAction',
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
			action: 'createChauffeurComplianceDocumentAction',
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
		logOpsAction({
			action: 'createChauffeurComplianceDocumentAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			hint: error?.message,
		})
		return buildOpsActionFailure('DATABASE', error?.message ?? 'Insert failed', correlationId)
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

	revalidatePath('/ops')
	logOpsAction({
		action: 'createChauffeurComplianceDocumentAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: id,
		meta: { chauffeur_id: d.chauffeurId },
	})
	return { ok: true as const, documentId: id }
}

export async function exportDataSubjectAction(raw: z.infer<typeof dsrExportRequestSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = dsrExportRequestSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'exportDataSubjectAction',
			outcome: 'validation_error',
			level: 'warn',
			correlationId,
			code: 'VALIDATION',
		})
		return { ...buildOpsActionFailure('VALIDATION', 'Invalid payload', correlationId), export: null }
	}

	const adminGate = await getOpsAdminForAction()
	if (!adminGate.ok) {
		logOpsAction({
			action: 'exportDataSubjectAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: adminGate.message,
		})
		return { ...buildOpsActionFailure('FORBIDDEN', adminGate.message, correlationId), export: null }
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
		logOpsAction({
			action: 'exportDataSubjectAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			hint: pErr?.message,
			...(parsed.data.profileId ? { entityId: parsed.data.profileId } : {}),
		})
		return { ...buildOpsActionFailure('NOT_FOUND', 'Profile not found', correlationId), export: null }
	}

	const role = profile.role as ProfileRole
	if (role !== 'customer') {
		logOpsAction({
			action: 'exportDataSubjectAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'ROLE_LIMIT',
		})
		return {
			...buildOpsActionFailure(
				'ROLE_LIMIT',
				'DSR export (MVP) is limited to profiles with role customer',
				correlationId,
			),
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
		logOpsAction({
			action: 'exportDataSubjectAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: profileId,
			hint: b1Err?.message ?? b2Err?.message,
		})
		return {
			...buildOpsActionFailure(
				'DATABASE',
				b1Err?.message ?? b2Err?.message ?? 'Read failed',
				correlationId,
			),
			export: null,
		}
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
		logOpsAction({
			action: 'exportDataSubjectAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: profileId,
			hint: tErr.message,
		})
		return { ...buildOpsActionFailure('DATABASE', tErr.message, correlationId), export: null }
	}

	let engagements: Record<string, unknown>[] = []
	if (bookingIds.length > 0) {
		const { data: eng, error: eErr } = await supabase
			.from('close_protection_engagements')
			.select('id, booking_id, trip_id, status, created_at, updated_at')
			.in('booking_id', bookingIds)

		if (eErr) {
			logOpsAction({
				action: 'exportDataSubjectAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				entityId: profileId,
				hint: eErr.message,
			})
			return { ...buildOpsActionFailure('DATABASE', eErr.message, correlationId), export: null }
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

	logOpsAction({
		action: 'exportDataSubjectAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: profileId,
		meta: {
			booking_count: bookings.length,
			trip_count: (trips ?? []).length,
			engagement_count: engagements.length,
		},
	})
	return { ok: true as const, export: payload }
}

export async function anonymiseDataSubjectAction(raw: z.infer<typeof dsrAnonymiseRequestSchema>) {
	const correlationId = newOpsCorrelationId()
	const parsed = dsrAnonymiseRequestSchema.safeParse(raw)
	if (!parsed.success) {
		logOpsAction({
			action: 'anonymiseDataSubjectAction',
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
			action: 'anonymiseDataSubjectAction',
			outcome: 'forbidden',
			level: 'warn',
			correlationId,
			code: 'FORBIDDEN',
			hint: adminGate.message,
		})
		return buildOpsActionFailure('FORBIDDEN', adminGate.message, correlationId)
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
		logOpsAction({
			action: 'anonymiseDataSubjectAction',
			outcome: 'not_found',
			level: 'warn',
			correlationId,
			code: 'NOT_FOUND',
			entityId: profileId,
		})
		return buildOpsActionFailure('NOT_FOUND', 'Profile not found', correlationId)
	}

	if ((profile.role as ProfileRole) !== 'customer') {
		logOpsAction({
			action: 'anonymiseDataSubjectAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'ROLE_LIMIT',
			entityId: profileId,
		})
		return buildOpsActionFailure(
			'ROLE_LIMIT',
			'DSR anonymise (MVP) is limited to customer profiles',
			correlationId,
		)
	}

	if (profile.data_subject_anonymised_at) {
		logOpsAction({
			action: 'anonymiseDataSubjectAction',
			outcome: 'failure',
			level: 'warn',
			correlationId,
			code: 'ALREADY_ANONYMISED',
			entityId: profileId,
		})
		return buildOpsActionFailure('ALREADY_ANONYMISED', 'Profile already anonymised', correlationId)
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
		logOpsAction({
			action: 'anonymiseDataSubjectAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: profileId,
			hint: profErr.message,
		})
		return buildOpsActionFailure('DATABASE', profErr.message, correlationId)
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
			logOpsAction({
				action: 'anonymiseDataSubjectAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				entityId: profileId,
				hint: bookErr.message,
			})
			return buildOpsActionFailure('DATABASE', bookErr.message, correlationId)
		}

		const { error: engErr } = await supabase
			.from('close_protection_engagements')
			.update({ coordination_notes: null })
			.in('booking_id', bookingIds)

		if (engErr) {
			logOpsAction({
				action: 'anonymiseDataSubjectAction',
				outcome: 'failure',
				level: 'error',
				correlationId,
				code: 'DATABASE',
				entityId: profileId,
				hint: engErr.message,
			})
			return buildOpsActionFailure('DATABASE', engErr.message, correlationId)
		}
	}

	const { error: tripErr } = await supabase.from('trips').update({ customer_id: null }).eq('customer_id', profileId)

	if (tripErr) {
		logOpsAction({
			action: 'anonymiseDataSubjectAction',
			outcome: 'failure',
			level: 'error',
			correlationId,
			code: 'DATABASE',
			entityId: profileId,
			hint: tripErr.message,
		})
		return buildOpsActionFailure('DATABASE', tripErr.message, correlationId)
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

	revalidatePath('/ops')

	logOpsAction({
		action: 'anonymiseDataSubjectAction',
		outcome: 'success',
		level: 'info',
		correlationId,
		entityId: profileId,
		meta: { bookings_redacted: bookingIds.length },
	})
	return { ok: true as const }
}
