/**
 * Q34: Supabase select / table fragments that still use legacy DB identifiers until Epic 17.
 * Centralised here so TSX under the US-L3 grep gate stays free of the `chauffeur` substring.
 */

export const TRIPS_BOARD_SELECT_COLUMNS =
	'id, status, time_start_estimate, time_end_estimate, vehicle_id, chauffeur_id, ops_delay_note' as const

/** Ops `/ops/trips` live list — flat trip columns plus booking embed for queue parity with Bookings. */
export const TRIPS_OPS_LIST_SELECT_COLUMNS =
	'id, status, time_start_estimate, time_end_estimate, vehicle_id, chauffeur_id, ops_delay_note, ops_revised_time_end_estimate, booking_trips(bookings(id, payment_reference, pickup_datetime, customer_name, customer_email, client_type, origin_name, destination_name, customer_accounts(id, name)))' as const

/** Ops calendar week: nested reads only where existing RLS already allows staff (`/ops/calendar`). */
export const TRIPS_CALENDAR_SELECT_COLUMNS =
	'id, status, time_start_estimate, time_end_estimate, vehicle_id, chauffeur_id, ops_delay_note, service_type, vehicles(name), booking_trips(bookings(customer_name, rider_name, origin_name, destination_name))' as const

export const FIELD_TRIP_DETAIL_SELECT_COLUMNS =
	'id, status, chauffeur_id, time_start_estimate, time_end_estimate, service_type, vehicle_id' as const

/** Fleet drivers page **Trip status** (in-window busy) — flat columns only. */
export const TRIPS_FLEET_DRIVERS_STATUS_COLUMNS =
	'id, status, chauffeur_id, time_start_estimate, time_end_estimate, ops_revised_time_end_estimate' as const

export const DRIVER_SHIFT_SCHEDULE_TABLE = 'chauffeur_schedules' as const

export const DRIVER_SHIFT_SCHEDULE_SELECT_COLUMNS =
	'id, chauffeur_id, work_date, shift, vehicle_id, status, total_working_hours' as const

/** FK column on `chauffeur_compliance_documents` rows (DB name unchanged until Epic 17). */
export const DRIVER_COMPLIANCE_DOC_PROFILE_FK = 'chauffeur_id' as const

/** FK on `trips` / `chauffeur_schedules` linking to `profiles.id` (DB name unchanged until Epic 17). */
export const TRIP_DRIVER_PROFILE_FK_COLUMN = 'chauffeur_id' as const
