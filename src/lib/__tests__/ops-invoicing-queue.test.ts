import { describe, expect, it } from 'vitest'

import {
	buildInvoicingQueueCsv,
	dueDateYmdFromTripCompletedAndCreditDays,
	escapeCsvCell,
	tripCompletedAtIsoFromBookingTripsEmbed,
} from '@/lib/ops-invoicing-queue'

describe('dueDateYmdFromTripCompletedAndCreditDays', () => {
	it('adds whole UTC calendar days from trip completion instant', () => {
		expect(dueDateYmdFromTripCompletedAndCreditDays('2026-04-20T15:00:00.000Z', 0)).toBe('2026-04-20')
		expect(dueDateYmdFromTripCompletedAndCreditDays('2026-04-20T15:00:00.000Z', 14)).toBe('2026-05-04')
	})
	it('returns null when trip time missing', () => {
		expect(dueDateYmdFromTripCompletedAndCreditDays(null, 7)).toBeNull()
	})
})

describe('tripCompletedAtIsoFromBookingTripsEmbed', () => {
	it('prefers last completed transition from status_history', () => {
		const iso = tripCompletedAtIsoFromBookingTripsEmbed([
			{
				trips: {
					status: 'completed',
					status_history: [
						{ at: '2026-01-01T00:00:00.000Z', from: 'in_progress', to: 'completed' },
						{ at: '2026-02-02T12:00:00.000Z', from: 'in_progress', to: 'completed' },
					],
					updated_at: '2026-03-03T00:00:00.000Z',
				},
			},
		])
		expect(iso).toBe('2026-02-02T12:00:00.000Z')
	})
	it('falls back to updated_at when no history entry', () => {
		const iso = tripCompletedAtIsoFromBookingTripsEmbed([
			{
				trips: {
					status: 'completed',
					status_history: [],
					updated_at: '2026-04-01T08:00:00.000Z',
				},
			},
		])
		expect(iso).toBe('2026-04-01T08:00:00.000Z')
	})
})

describe('escapeCsvCell', () => {
	it('quotes cells with commas', () => {
		expect(escapeCsvCell('a,b')).toBe('"a,b"')
	})
})

describe('buildInvoicingQueueCsv', () => {
	it('uses stable header order', () => {
		const csv = buildInvoicingQueueCsv([
			{
				bookingId: '00000000-0000-4000-8000-000000000001',
				bookingReference: 'REF-1',
				customerAccountDisplayName: 'Acme',
				totalAmount: 100,
				tripCompletedAtIso: '2026-04-20T10:00:00.000Z',
				purchaseOrderRef: 'PO-9',
				creditTermsDays: 30,
				dueDateYmd: '2026-05-20',
				externalInvoiceRef: null,
			},
		])
		const lines = csv.split('\n')
		expect(lines[0]).toContain('booking_reference')
		expect(lines[0].startsWith('booking_reference')).toBe(true)
		expect(lines[1]).toContain('REF-1')
	})
})
