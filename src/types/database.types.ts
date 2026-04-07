/**
 * Hand-maintained database enums aligned with supabase/migrations (VST-5).
 * Optional full schema dump: `npm run db:types` (requires `supabase link`) → `src/types/supabase.generated.ts` (gitignored). See docs/local-development.md.
 */
export type ProfileRole = 'customer' | 'chauffeur' | 'dispatcher' | 'admin'

export const PROFILE_ROLES: readonly ProfileRole[] = [
  'customer',
  'chauffeur',
  'dispatcher',
  'admin',
] as const

/** Web booking product intent — see migration `20260406120000_vst6_booking_intent_and_payment_audit.sql` */
export type BookingIntentDb =
  | 'point_to_point'
  | 'hourly_hire'
  | 'corporate_pattern'
  | 'experience_package'

/**
 * Booking row lifecycle (business). `payment_status` tracks PayFast separately.
 * Align with `createBooking`, `processPayment`, PayFast webhook, `cancelBooking`.
 */
export type BookingLifecycleStatus = 'pending' | 'paid' | 'cancelled'

export type BookingPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'processing'

/**
 * Fulfilment trip lifecycle labels used by the ops console and Server Actions.
 * Column `public.trips.status` is plain text (no DB CHECK); keep values aligned with this union.
 */
export type TripFulfilmentStatusDb =
  | 'booking'
  | 'assigned'
  | 'en_route'
  | 'completed'
  | 'cancelled'

/** `public.ops_audit_log.actor_role` — migration `20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql` */
export type OpsAuditActorRoleDb = 'dispatcher' | 'admin' | 'chauffeur'

/** `public.notifications.kind` — migration `20260409120000_vst9_realtime_notifications.sql` */
export type NotificationKindDb =
	| 'general'
	| 'assignment'
	| 'change'
	| 'no_show'
	| 'trip_status'

/**
 * `public.experience_packages` — migration `20260410120000_vst10_experience_packages.sql`.
 * Prefer `supabase gen types typescript` when regenerating full Database types.
 */
export type ExperiencePackageRowDb = {
	id: string
	slug: string
	title: string
	description: string | null
	base_price_zar: number
	per_passenger_increment_zar: number
	included_passengers: number
	default_vehicle_category_id: string | null
	itinerary: unknown
	addon_catalog: unknown
	stub_origin: unknown
	stub_destination: unknown
	estimated_duration_minutes: number | null
	is_active: boolean
	created_at: string
	updated_at: string
}

/** `public.close_protection_engagements.status` — migration `20260411120000_vst11_close_protection_engagements.sql` */
export type CloseProtectionEngagementStatusDb =
	| 'draft'
	| 'active'
	| 'completed'
	| 'cancelled'

/** `public.close_protection_engagements` — VST-11 */
export type CloseProtectionEngagementRowDb = {
	id: string
	booking_id: string
	trip_id: string | null
	status: CloseProtectionEngagementStatusDb
	coordination_notes: string | null
	created_at: string
	updated_at: string
	created_by: string
}

/**
 * Optional keys on `bookings.booking_metadata` (jsonb) for close protection (VST-11).
 * Approach B: no `close_protection` `booking_intent`; engagements live in `close_protection_engagements`.
 */
export type BookingMetadataCloseProtectionKeys = {
	close_protection_requested?: boolean
	close_protection_engagement_id?: string
}

/** `public.bookings` invoicing hook columns — migration `20260413130000_vst13_corporate_invoicing_hooks.sql` */
export type CorporateInvoicingBookingColumns = {
	invoice_requested: boolean
	purchase_order_ref: string | null
	billing_entity_ref: string | null
}

/** `public.compliance_incidents.category` — migration `20260412120000_vst12_*` */
export type ComplianceIncidentCategoryDb =
	| 'safety'
	| 'privacy'
	| 'security'
	| 'operational'
	| 'data_handling'
	| 'other'

/** `public.vehicle_compliance_documents.document_type` */
export type VehicleComplianceDocumentTypeDb =
	| 'licence_disc'
	| 'insurance'
	| 'roadworthy'
	| 'registration'
	| 'other'

/** `public.chauffeur_compliance_documents.document_type` */
export type ChauffeurComplianceDocumentTypeDb =
	| 'pdp'
	| 'drivers_licence'
	| 'background_check'
	| 'work_permit'
	| 'other'

/** `profiles.retention_class` / `bookings.retention_class` / compliance tables — VST-12 */
export type RetentionClassDb =
	| 'operational'
	| 'financial'
	| 'compliance_document'
	| 'cp_engagement_related'
	| 'marketing'

/** Minimal JSON DSR export shape (admin-only Server Action). */
export type DsrExportPayloadDb = {
	version: 'vst12_dsr_minimal_v1'
	exported_at: string
	subject_profile_id: string
	profile: {
		id: string
		full_name: string
		phone: string
		email: string
		avatar_url: string | null
		role: ProfileRole
		status: string
		created_at: string
		updated_at: string
		retention_class: string | null
		retention_until: string | null
		data_subject_anonymised_at: string | null
	}
	bookings: Record<string, unknown>[]
	trips: Record<string, unknown>[]
	close_protection_engagements: Record<string, unknown>[]
}

/** `public.compliance_incidents` row (subset for UI lists). */
export type ComplianceIncidentRowDb = {
	id: string
	category: ComplianceIncidentCategoryDb
	summary: string
	occurred_at: string
	reported_by: string
	related_booking_id: string | null
	metadata: Record<string, unknown>
	retention_class: RetentionClassDb | null
	retention_until: string | null
	created_at: string
	updated_at: string
}
