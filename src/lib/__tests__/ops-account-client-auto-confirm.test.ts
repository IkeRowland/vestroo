import { describe, expect, it, vi } from 'vitest'

import { tryAutoConfirmAccountClientBooking } from '@/lib/ops-account-client-auto-confirm'

vi.mock('@/lib/ops-account-client-confirmation-trip-gate', () => ({
	evaluateAccountClientConfirmationTripGate: vi.fn(),
}))

import { evaluateAccountClientConfirmationTripGate } from '@/lib/ops-account-client-confirmation-trip-gate'

describe('tryAutoConfirmAccountClientBooking', () => {
	it('returns not_applicable for walk-in bookings', async () => {
		const supabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: vi.fn(() => ({
						maybeSingle: vi.fn(async () => ({
							data: { id: 'b1', client_type: 'walk_in', status: 'pending_confirmation' },
							error: null,
						})),
					})),
				})),
			})),
		}

		const res = await tryAutoConfirmAccountClientBooking(supabase as never, 'b1')
		expect(res).toEqual({ confirmed: false, reason: 'not_applicable' })
	})

	it('confirms when quote and trip gate pass', async () => {
		vi.mocked(evaluateAccountClientConfirmationTripGate).mockResolvedValue({ ok: true })

		const updateEqStatus = vi.fn().mockResolvedValue({ error: null })
		const updateEqId = vi.fn(() => ({ eq: updateEqStatus }))
		const update = vi.fn(() => ({ eq: updateEqId }))

		const supabase = {
			from: vi.fn((table: string) => {
				if (table === 'bookings') {
					return {
						select: vi.fn(() => ({
							eq: vi.fn(() => ({
								maybeSingle: vi.fn(async () => ({
									data: {
										id: 'b1',
										client_type: 'account_client',
										status: 'pending_confirmation',
										status_history: [],
									},
									error: null,
								})),
							})),
						})),
						update,
					}
				}
				if (table === 'booking_quotes') {
					return {
						select: vi.fn(() => ({
							eq: vi.fn(() => ({
								order: vi.fn(() => ({
									limit: vi.fn(() => ({
										maybeSingle: vi.fn(async () => ({
											data: { id: 'q1', status: 'draft' },
											error: null,
										})),
									})),
								})),
							})),
						})),
					}
				}
				throw new Error(`unexpected table ${table}`)
			}),
		}

		const res = await tryAutoConfirmAccountClientBooking(supabase as never, 'b1')
		expect(res).toEqual({ confirmed: true, quoteId: 'q1' })
		expect(update).toHaveBeenCalled()
	})
})
