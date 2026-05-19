/**
 * Canonical status → tone mapping for **`OpsStatusPill`** (FE.17.8 / Story 17.7).
 * Source of truth: **`docs/epic-17.md`** FE.17.8 table + audit notes below.
 *
 * **Unknown policy:** keys not in the map resolve to **`neutral`**. In **`development`** only, a one-line
 * **`console.warn`** helps catch typos; production stays silent (**Reconciliation B + dev hint**).
 */
export type OpsStatusPillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Epic FE.17.8 rows (exact strings). */
export const OPS_STATUS_PILL_EPIC_KEYS = [
	'on_trip',
	'assigned',
	'awaiting_assignment',
	'cancelled',
	'completed',
	'paid',
	'awaiting_payment',
	'overdue',
	'on_duty',
	'off_roster',
] as const

export type OpsStatusPillEpicKey = (typeof OPS_STATUS_PILL_EPIC_KEYS)[number]

/**
 * Extra domain keys aligned with DB / UI (Task 0 audit).
 * `en_route` — `TripFulfilmentStatusDb` (`src/types/database.types.ts`); same operational cue as `on_trip`.
 * `booking` — `TripFulfilmentStatusDb` pre-assignment (Story 17.13 / trips list + rail).
 * `customer_accounts.status` — `active`, `on_hold`, `suspended`, `closed` (Story 17.11).
 */
export const OPS_STATUS_PILL_EXTRA_KEYS = ['en_route', 'booking'] as const

const MAP: Readonly<Record<string, OpsStatusPillTone>> = {
	on_trip: 'info',
	en_route: 'info',
	/** Pre-assignment / intake — same urgency cue as awaiting_assignment for ops scanning */
	booking: 'warning',
	assigned: 'info',
	awaiting_assignment: 'warning',
	cancelled: 'danger',
	completed: 'success',
	paid: 'success',
	awaiting_payment: 'warning',
	overdue: 'danger',
	on_duty: 'info',
	off_roster: 'neutral',
	/** `public.customer_accounts.status` */
	active: 'success',
	on_hold: 'warning',
	suspended: 'danger',
	closed: 'neutral',
	/** Fleet drivers list: available, no active trip */
	fleet_drivers_trip_idle: 'neutral',
	/** Fleet drivers list: active profile with ≥1 non-terminal trip */
	fleet_drivers_trip_busy: 'info',
	/** Fleet drivers list: inactive profile */
	fleet_drivers_trip_unavailable: 'neutral',
	/** Fleet drivers: shift column — active */
	fleet_drivers_shift_active: 'success',
	/** Fleet drivers: shift column — inactive */
	fleet_drivers_shift_inactive: 'neutral',
}

export function normalizeOpsStatusKey(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

export function getOpsStatusPillTone(status: string): OpsStatusPillTone {
	const key = normalizeOpsStatusKey(status)
	const tone = MAP[key]
	if (tone !== undefined) {
		return tone
	}
	if (process.env.NODE_ENV === 'development') {
		console.warn(`[getOpsStatusPillTone] Unknown status key: ${JSON.stringify(status)}`)
	}
	return 'neutral'
}

/** Introspection for tests and docs — includes epic + extras. */
export function opsStatusPillMappedKeys(): string[] {
	return Object.keys(MAP)
}
