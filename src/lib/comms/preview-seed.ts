/**
 * Epic 15 / **15C.4** — deterministic fake values for **`/ops/comms`** template preview (no production PII).
 *
 * Keys are **lowercase** snake_case so they align with **`substituteCommsTemplatePlaceholders`** lookups.
 * Merge order: **`COMMS_PREVIEW_SEED`** → optional per-**`CommsEventKey`** overrides from **`COMMS_PREVIEW_SEED_BY_EVENT`**.
 *
 * Align variable names with **`15C.2`** / real templates where practical (`booking_ref`, URLs, etc.).
 */
import type { CommsEventKey } from '@/types/comms'
import { COMMS_EVENT_KEYS } from '@/types/comms'

export const COMMS_PREVIEW_SEED: Record<string, string> = {
	booking_ref: 'PREVIEW-REF-9001',
	customer_name: 'Preview Customer',
	quote_total: 'R 1 234,56',
	pickup_label: 'Cape Town CBD — 2026-04-26 10:00',
	dropoff_label: 'Airport (CPT)',
	vehicle_label: 'Executive sedan',
	chauffeur_name: 'Preview Chauffeur',
	support_email: 'preview-support@example.test',
	accept_url: 'https://preview.example.test/accept',
	reject_url: 'https://preview.example.test/reject',
	pay_url: 'https://preview.example.test/pay',
	track_url: 'https://preview.example.test/track/demo-token',
	invoice_number: 'INV-PREVIEW-1001',
	member_email: 'member.preview@example.test',
}

export const COMMS_PREVIEW_SEED_BY_EVENT: Partial<
	Record<CommsEventKey, Record<string, string>>
> = {
	quote_sent_walk_in: {
		expiry_label: 'Preview expiry: 7 days from quote',
	},
	quote_sent_account: {
		expiry_label: 'Preview expiry: 14 days from quote',
	},
	trip_en_route: {
		eta_label: 'Preview ETA: 18 minutes',
	},
}

function isCommsEventKey(value: string): value is CommsEventKey {
	return (COMMS_EVENT_KEYS as readonly string[]).includes(value)
}

/** Merged lowercase-key map used for substitution (deterministic; safe for CI). */
export function buildCommsPreviewVarMap(eventKey: string): Record<string, string> {
	const base = { ...COMMS_PREVIEW_SEED }
	if (!isCommsEventKey(eventKey)) {
		return base
	}
	const extra = COMMS_PREVIEW_SEED_BY_EVENT[eventKey] ?? {}
	return { ...base, ...extra }
}
