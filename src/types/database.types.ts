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

/** Q34: DB enum value for operational driver (`profiles.role`). Use in Supabase `.eq('role', …)` — not for visible copy (`getRoleDisplayLabel`). Identifier avoids `chauffeur` substring for US-L3 TSX grep gate. */
export const PROFILE_ROLE_OPS_DRIVER_DB: ProfileRole = 'chauffeur'

/** Web booking product intent — see migration `20260406120000_vst6_booking_intent_and_payment_audit.sql` and `20260418200000_fe104_trip_request_booking_intent.sql` */
export type BookingIntentDb =
  | 'point_to_point'
  | 'hourly_hire'
  | 'corporate_pattern'
  | 'experience_package'
  | 'trip_request'

/**
 * Booking row lifecycle (business). `payment_status` is tracked separately and — after
 * Epic 16 / Theme N — is driven by `markBookingPaymentReceived` (US-N3) for EFT settlement.
 * Align with `createBooking` and `cancelBooking`.
 */
export type BookingLifecycleStatus = 'pending' | 'paid' | 'cancelled'

/** Align with `bookings_payment_status_check` (VST-14); `processing` is app-only until persisted. */
export type BookingPaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'processing'
  | 'refunded'
  | 'chargeback'

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

/** `public.ops_audit_log.actor_role` — migrations vst8, epic14.4, epic15 15A.5 */
export type OpsAuditActorRoleDb =
	| 'dispatcher'
	| 'admin'
	| 'chauffeur'
	| 'customer'
	| 'account_portal'

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

/**
 * `bookings.booking_metadata` for `booking_intent = corporate_pattern` (SH.9.5).
 * Persisted by the patterned-checkout server path after Zod `corporatePatternBookingMetadataSchema`
 * validation. (Epic 16 / Theme N — patterned-checkout payment provider work is deferred per
 * `docs/epic-9.md` § SH.9.5.)
 */
export type BookingMetadataCorporatePatternKeys = {
	service_run_id: string
	from_point_id: string
	to_point_id: string
	seats: number
	idempotency_key?: string
}

/**
 * `public.tickets.ticket_inventory_state` — migration `20260418140000_sh93_service_run_capacity_holds.sql` (SH.9.3).
 * `legacy` = rows before SH.9.3 (excluded from capacity sums).
 */
export type TicketInventoryStateDb =
	| 'legacy'
	| 'hold'
	| 'confirmed'
	| 'released'
	| 'expired'
	| 'cancelled'

/** `public.service_run_manifest_entries.entry_source` — migration `20260417120000_sh92_service_run_manifest_entries.sql` (SH.9.2) */
export type ServiceRunManifestEntrySourceDb =
	| 'manual'
	| 'booking'
	| 'ticket_sync'

/** `public.service_run_manifest_entries` — SH.9.2 manifest line (subset for Server Actions). */
export type ServiceRunManifestEntryRowDb = {
	id: string
	service_run_id: string
	sequence_order: number
	booking_id: string | null
	passenger_profile_id: string | null
	guest_display_label: string | null
	entry_source: ServiceRunManifestEntrySourceDb
	created_at: string
	updated_at: string
}

/** `public.bookings` invoicing hook columns — migration `20260413130000_vst13_corporate_invoicing_hooks.sql` */
export type CorporateInvoicingBookingColumns = {
	invoice_requested: boolean
	purchase_order_ref: string | null
	billing_entity_ref: string | null
}

/** `bookings.client_type` — migrations VST-14 + `20260519140000_bookings_client_type_referral.sql` */
export type ClientTypeDb = 'walk_in' | 'account_client' | 'referral'

/** Epic 15 / 15B.1 — optional rider PII on `public.bookings` (`20260426120000_epic15_15b1_*`). */
export type BookingRiderColumnsDb = {
	rider_name: string | null
	rider_phone: string | null
	rider_email: string | null
}

/** Epic 16 / Theme B / US-B1 — availability-check audit on `public.bookings` (`20260426211520_ops16_availability_check_columns.sql`). */
export type BookingAvailabilityCheckColumnsDb = {
	availability_checked_at: string | null
	availability_checked_by: string | null
	availability_check: Record<string, unknown> | null
}

/**
 * `public.bookings.status` — `bookings_status_check` (VST-14 + Epic 13.9 migration
 * `20260420200000_epic13_story139_bookings_invoicing_statuses_v1.sql` + account portal
 * `pending_confirmation` in `20260518120000_account_portal_pending_confirmation_and_rls_v1.sql`).
 */
export type BookingPipelineStatusDb =
	| 'pending'
	| 'pending_confirmation'
	| 'submitted'
	| 'triaged'
	| 'quote_sent'
	| 'quote_accepted'
	| 'quote_rejected'
	| 'awaiting_payment'
	| 'paid'
	| 'assigned'
	| 'in_progress'
	| 'completed'
	| 'ready_to_invoice'
	| 'invoiced'
	| 'paid_invoice'
	| 'cancelled'
	| 'expired'

/** `customer_accounts.status` — VST-14 */
export type CustomerAccountStatusDb =
	| 'active'
	| 'on_hold'
	| 'suspended'
	| 'closed'

/** `customer_account_members.role` — VST-14 */
export type CustomerAccountMemberRoleDb = 'admin' | 'booker' | 'rider'

/** `booking_quotes.status` — VST-14 */
export type BookingQuoteStatusDb =
	| 'draft'
	| 'sent'
	| 'accepted'
	| 'rejected'
	| 'expired'
	| 'superseded'

/**
 * `public.can_dispatch_account_booking(uuid)` second column — VST-14.
 * Non-`ok` reasons when `can_dispatch` is false; account status uses `account_<status>` for on_hold / suspended / closed.
 */
export type CanDispatchAccountBookingReasonDb =
	| 'ok'
	| 'booking_not_found'
	| 'not_an_account_booking'
	| 'account_not_found'
	| 'account_on_hold'
	| 'account_suspended'
	| 'account_closed'
	| 'contract_not_yet_active'
	| 'contract_expired'
	| 'po_required_and_missing'
	| 'credit_limit_exceeded'
	| 'overdue_invoices'

/**
 * Optional shape for `bookings.account_snapshot` (jsonb) — VST-14.
 * Migration comment: { name, credit_terms_days, default_billing_entity_ref, po_required_at_snapshot }.
 */
export type AccountSnapshotJsonDb = {
	name?: string
	credit_terms_days?: number
	default_billing_entity_ref?: string | null
	po_required_at_snapshot?: boolean
}

/** `public.customer_accounts` — VST-14; `live_rider_tracking` — Epic 15 / 15B.5 (Q22) */
export type CustomerAccountRowDb = {
	id: string
	name: string
	slug: string
	status: CustomerAccountStatusDb
	/** Epic 15 / 15B.5: account opt-in for public live map with `RIDER_LIVE_LOCATION_ENABLED`. */
	live_rider_tracking: boolean
	credit_terms_days: number
	credit_limit_zar: number | null
	default_billing_entity_ref: string | null
	default_po_required: boolean
	authorized_email_domains: string[]
	contract_starts_on: string | null
	contract_ends_on: string | null
	created_by: string | null
	created_at: string
	updated_at: string
}

/** `public.customer_account_members` — VST-14; **`comms_preferences`** — Epic 15 / **15C.5** (`src/types/comms-preferences.ts`). */
export type CustomerAccountMemberRowDb = {
	account_id: string
	email: string
	profile_id: string | null
	full_name: string | null
	role: CustomerAccountMemberRoleDb
	invited_at: string
	accepted_at: string | null
	/** Epic 15 / 15C.5 — per-member email category toggles; null until first save (defaults applied in app). */
	comms_preferences: Record<string, unknown> | null
}

/** `public.comms_templates.channel` / `public.comms_dispatch_rules.channel` — Epic 15 / 15C.1 (`src/types/comms.ts` `CommsChannel`). */
export type CommsChannelDb = 'email' | 'sms'

/**
 * `public.comms_templates` — Epic 15 / 15C.1 (`20260426104021_epic15_15c1_*`).
 * `event_key` aligns with **`CommsEventKey`** in **`src/types/comms.ts`** (app-enforced superset).
 */
export type CommsTemplateRowDb = {
	id: string
	event_key: string
	channel: CommsChannelDb
	subject: string | null
	body_html: string | null
	body_text: string | null
	sms_body: string | null
	version: number
	active: boolean
	created_at: string
	updated_at: string
}

/**
 * `public.comms_dispatch_rules` — Epic 15 / 15C.1.
 * `recipient_role` aligns with **`CommsDispatchRecipientRole`** in **`src/types/comms.ts`**.
 */
export type CommsDispatchRuleRowDb = {
	id: string
	event_key: string
	channel: CommsChannelDb
	recipient_role: string
	recipient_filter: Record<string, unknown>
	active: boolean
	created_at: string
	updated_at: string
}

/** Epic 16 Theme G / Q28 — `public.ops_alerts.kind` (`20260426213503_ops16_ops_alerts_table.sql`). */
export type OpsAlertKindDb =
	| 'maintenance_due'
	| 'license_expiring'
	| 'prdp_expiring'
	| 'quote_expiring_soon'
	| 'email_retry_failed'
	| 'delayed_trip'
	| 'overdue_invoice'

export const OPS_ALERT_KINDS_V1: readonly OpsAlertKindDb[] = [
	'maintenance_due',
	'license_expiring',
	'prdp_expiring',
	'quote_expiring_soon',
	'email_retry_failed',
	'delayed_trip',
	'overdue_invoice',
] as const

/** `public.ops_alerts.severity` — Epic 16 / US-G1. */
export type OpsAlertSeverityDb = 'low' | 'medium' | 'high' | 'critical'

/**
 * `public.ops_alerts` — Epic 16 Theme G / US-G1.
 * Inserts use **service_role** (US-G2 generators); **authenticated** has SELECT + UPDATE only.
 */
export type OpsAlertRowDb = {
	id: string
	kind: OpsAlertKindDb
	severity: OpsAlertSeverityDb
	subject_table: string
	subject_id: string | null
	payload: Record<string, unknown>
	created_at: string
	acknowledged_at: string | null
	acknowledged_by: string | null
	dismissed_at: string | null
	dismissed_by: string | null
}

/**
 * `public.ops_settings` — Epic 16 Theme N / US-N1 (`20260426220000_ops16_ops_settings_and_payment_columns.sql`).
 * `key` e.g. `bank_account`; `value` is jsonb (see `getBankAccountForReader` in `src/lib/bank-account-display.ts`).
 */
export type OpsSettingsRowDb = {
	id: string
	key: string
	value: Record<string, unknown>
	updated_at: string
	updated_by: string | null
}

/**
 * `public.driver_assignments` — read-only view over `chauffeur_assignments` (Epic 16 Phase 1 / Q34, `20260426231000_ops16_driver_assignments_view.sql`).
 * `driver_id` duplicates `chauffeur_id` for query ergonomy until Epic 17 renames the base table/column.
 */
export type DriverAssignmentViewRowDb = {
	id: string
	chauffeur_id: string
	service_route_id: string
	vehicle_id: string
	start_time: string
	end_time: string
	trip_number: number
	status: string
	checkin_time: string | null
	checkout_time: string | null
	is_late: boolean
	is_early_checkout: boolean
	current_passengers: number
	total_passengers: number
	current_point_id: string | null
	completed_point_ids: string[]
	created_at: string
	updated_at: string
	/** Same UUID as `chauffeur_id` — `profiles.id` of the field operator. */
	driver_id: string
}

/** Epic 16 Theme N — EFT receipt metadata on `public.bookings` (`20260426220000_ops16_ops_settings_and_payment_columns.sql`). */
export type BookingPaymentReceiptColumnsDb = {
	payment_received_at: string | null
	payment_evidence_ref: string | null
}

/** `public.booking_quotes` — VST-14 */
export type BookingQuoteRowDb = {
	id: string
	booking_id: string
	version: number
	total_zar: number
	line_items: unknown
	rendered_html: string | null
	pdf_storage_path: string | null
	expires_at: string | null
	sent_at: string | null
	sent_to_email: string | null
	sent_by: string | null
	accepted_at: string | null
	rejected_at: string | null
	rejection_reason: string | null
	superseded_at: string | null
	superseded_by_quote_id: string | null
	status: BookingQuoteStatusDb
	idempotency_key: string | null
	created_at: string
}

/** `public.booking_quotes_expiry_job_runs` — migration `20260420210000_epic13_story1311_*` */
export type BookingQuotesExpiryJobRunRowDb = {
	id: string
	run_at: string
	transitioned_count: number
	examined_count: number
	job_version: string | null
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
