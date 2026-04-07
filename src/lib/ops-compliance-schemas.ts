import { z } from 'zod'

export const complianceIncidentCategorySchema = z.enum([
	'safety',
	'privacy',
	'security',
	'operational',
	'data_handling',
	'other',
])

export const vehicleComplianceDocumentTypeSchema = z.enum([
	'licence_disc',
	'insurance',
	'roadworthy',
	'registration',
	'other',
])

export const chauffeurComplianceDocumentTypeSchema = z.enum([
	'pdp',
	'drivers_licence',
	'background_check',
	'work_permit',
	'other',
])

export const createComplianceIncidentSchema = z.object({
	category: complianceIncidentCategorySchema,
	summary: z.string().min(1).max(20_000),
	/** ISO-8601 timestamptz string (browser `datetime-local` + offset or full ISO). */
	occurredAt: z.string().min(1).max(40),
	relatedBookingId: z.string().uuid().optional(),
	metadata: z.record(z.string(), z.unknown()).optional().default({}),
})

export const listComplianceIncidentsSchema = z.object({
	limit: z.number().int().min(1).max(100).optional().default(50),
})

export const listExpiringComplianceDocumentsSchema = z.object({
	daysAhead: z.number().int().min(1).max(365).optional().default(30),
})

export const createVehicleComplianceDocumentSchema = z.object({
	vehicleId: z.string().uuid(),
	documentType: vehicleComplianceDocumentTypeSchema,
	expiryDate: z.string().date().optional(),
	storageBucket: z.string().min(1).max(200),
	storageObjectPath: z.string().min(1).max(1024),
	notes: z.string().max(10_000).optional(),
})

export const createChauffeurComplianceDocumentSchema = z.object({
	chauffeurId: z.string().uuid(),
	documentType: chauffeurComplianceDocumentTypeSchema,
	expiryDate: z.string().date().optional(),
	storageBucket: z.string().min(1).max(200),
	storageObjectPath: z.string().min(1).max(1024),
	notes: z.string().max(10_000).optional(),
})

export const dsrExportRequestSchema = z
	.object({
		profileId: z.string().uuid().optional(),
		email: z.string().email().optional(),
	})
	.refine((v) => Boolean(v.profileId || v.email), {
		message: 'Provide profileId or email',
	})

export const dsrAnonymiseRequestSchema = z.object({
	profileId: z.string().uuid(),
	confirmPhrase: z.literal('ANONYMISE'),
})
