import { describe, expect, it } from 'vitest'

import {
	getOpsStatusPillTone,
	normalizeOpsStatusKey,
	OPS_STATUS_PILL_EPIC_KEYS,
	type OpsStatusPillTone,
} from '@/features/ops/ops-status-pill-tones'

const EPIC_EXPECTED: Record<(typeof OPS_STATUS_PILL_EPIC_KEYS)[number], OpsStatusPillTone> = {
	on_trip: 'info',
	assigned: 'info',
	awaiting_assignment: 'warning',
	cancelled: 'danger',
	completed: 'success',
	paid: 'success',
	awaiting_payment: 'warning',
	overdue: 'danger',
	on_duty: 'info',
	off_roster: 'neutral',
}

describe('ops-status-pill-tones (Story 17.7 / FE.17.8)', () => {
	it('maps every epic table row', () => {
		for (const key of OPS_STATUS_PILL_EPIC_KEYS) {
			expect(getOpsStatusPillTone(key)).toBe(EPIC_EXPECTED[key])
		}
	})

	it('maps extra DB key en_route → info', () => {
		expect(getOpsStatusPillTone('en_route')).toBe('info')
	})

	it('maps trip fulfilment booking → warning (Story 17.13)', () => {
		expect(getOpsStatusPillTone('booking')).toBe('warning')
	})

	it('maps customer_accounts.status keys (Story 17.11)', () => {
		expect(getOpsStatusPillTone('active')).toBe('success')
		expect(getOpsStatusPillTone('on_hold')).toBe('warning')
		expect(getOpsStatusPillTone('suspended')).toBe('danger')
		expect(getOpsStatusPillTone('closed')).toBe('neutral')
	})

	it('normalizes spacing and case', () => {
		expect(getOpsStatusPillTone('Awaiting Payment')).toBe('warning')
		expect(getOpsStatusPillTone('  COMPLETED  ')).toBe('success')
	})

	it('unknown → neutral', () => {
		expect(getOpsStatusPillTone('totally_unknown_status_xyz')).toBe('neutral')
	})

	it('maps fleet drivers list pill keys', () => {
		expect(getOpsStatusPillTone('fleet_drivers_trip_idle')).toBe('neutral')
		expect(getOpsStatusPillTone('fleet_drivers_trip_busy')).toBe('info')
		expect(getOpsStatusPillTone('fleet_drivers_trip_unavailable')).toBe('neutral')
	})

	it('maps fleet drivers shift status pill keys', () => {
		expect(getOpsStatusPillTone('fleet_drivers_shift_active')).toBe('success')
		expect(getOpsStatusPillTone('fleet_drivers_shift_inactive')).toBe('neutral')
	})

	it('normalizeOpsStatusKey', () => {
		expect(normalizeOpsStatusKey(' Awaiting Payment ')).toBe('awaiting_payment')
	})
})
