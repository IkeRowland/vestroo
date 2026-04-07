import { describe, expect, it } from 'vitest'

import {
	buildAssignmentNotifications,
	buildChauffeurTripStatusNotifications,
	buildTripChangeNotifications,
	tripRefLabel,
} from '@/lib/operational-notifications'

const tripId = 'a0000000-0000-4000-8000-000000000099'

describe('operational-notifications', () => {
	it('builds trip ref without full uuid', () => {
		expect(tripRefLabel(tripId)).toBe('Trip a0000000')
	})

	it('builds assignment rows for chauffeur and optional customer', () => {
		const chauffeurId = 'b0000000-0000-4000-8000-000000000001'
		const customerId = 'c0000000-0000-4000-8000-000000000002'
		const rows = buildAssignmentNotifications({
			tripId,
			customerId,
			chauffeurId,
		})
		expect(rows).toHaveLength(2)
		expect(rows[0]?.recipient_id).toBe(chauffeurId)
		expect(rows[0]?.kind).toBe('assignment')
		expect(rows[1]?.recipient_id).toBe(customerId)
	})

	it('omits customer when customerId null', () => {
		const rows = buildAssignmentNotifications({
			tripId,
			customerId: null,
			chauffeurId: 'b0000000-0000-4000-8000-000000000001',
		})
		expect(rows).toHaveLength(1)
	})

	it('builds change notifications for parties', () => {
		const rows = buildTripChangeNotifications({
			tripId,
			customerId: 'c0000000-0000-4000-8000-000000000002',
			chauffeurId: 'b0000000-0000-4000-8000-000000000001',
			label: 'delay recorded',
			kind: 'change',
			meta: { flag: true },
		})
		expect(rows).toHaveLength(2)
		expect(rows.every((r) => r.body.includes('delay recorded'))).toBe(true)
		expect(rows[0]?.metadata?.trip_id).toBe(tripId)
	})

	it('builds chauffeur status notifications for customer only', () => {
		const rows = buildChauffeurTripStatusNotifications({
			tripId,
			customerId: 'c0000000-0000-4000-8000-000000000002',
			statusLabel: 'driver en route',
		})
		expect(rows).toHaveLength(1)
		expect(rows[0]?.kind).toBe('trip_status')
	})

	it('returns empty when no customer for chauffeur status', () => {
		const rows = buildChauffeurTripStatusNotifications({
			tripId,
			customerId: null,
			statusLabel: 'x',
		})
		expect(rows).toHaveLength(0)
	})
})
