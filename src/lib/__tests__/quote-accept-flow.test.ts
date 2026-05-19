import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loadWalkInQuoteBankContextMock = vi.hoisted(() => vi.fn())
const sendWalkInAcceptanceConfirmationForBookingMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/email/walk-in-quote-bank-context', () => ({
	loadWalkInQuoteBankContext: (...args: unknown[]) => loadWalkInQuoteBankContextMock(...(args as [])),
}))

vi.mock('@/lib/email/send-walk-in-acceptance-confirmation', () => ({
	sendWalkInAcceptanceConfirmationForBooking: (...args: unknown[]) =>
		sendWalkInAcceptanceConfirmationForBookingMock(...(args as [])),
}))

import {
	initQuoteLinkSigningKeyAtStartup,
	resetQuoteLinkSigningKeyForTests,
	signQuoteToken,
} from '@/lib/quote-tokens'

import { runQuoteAcceptCheckout } from '@/lib/quote-accept-flow'
import { createServerClient } from '@/lib/supabase/server'

const TEST_SECRET = '0123456789abcdef0123456789abcdef'

const quoteId = 'a1111111-1111-4111-8111-111111111111'
const bookingId = 'b1111111-1111-4111-8111-111111111111'
const expFuture = new Date(Date.now() + 86_400_000).toISOString()

vi.mock('@/lib/supabase/server', () => ({
	createServerClient: vi.fn(),
}))

describe('runQuoteAcceptCheckout (N6)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		process.env.QUOTE_LINK_SIGNING_KEY = TEST_SECRET
		resetQuoteLinkSigningKeyForTests()
		initQuoteLinkSigningKeyAtStartup()
		sendWalkInAcceptanceConfirmationForBookingMock.mockResolvedValue(undefined)
		loadWalkInQuoteBankContextMock.mockResolvedValue({
			ok: true,
			bankAccount: {
				bank_name: 'Test Bank',
				account_holder: 'Vestroo (Pty) Ltd',
				account_number: '1234567890',
				branch_code: '198765',
			},
			paymentReference: 'VST-REF',
			referenceFormat: 'VST-{booking_ref}',
		})
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		delete process.env.QUOTE_LINK_SIGNING_KEY
		resetQuoteLinkSigningKeyForTests()
	})

	function acceptToken() {
		return signQuoteToken({
			quoteId,
			bookingId,
			purpose: 'accept',
			exp: Date.now() + 120_000,
		})
	}

	it('idempotent reload: accepted + awaiting_payment does not call send or duplicate transition', async () => {
		const quoteUpdate = vi.fn()
		const bookingUpdate = vi.fn()
		const from = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: vi
								.fn()
								.mockResolvedValue({
									data: { id: quoteId, booking_id: bookingId, status: 'accepted', expires_at: expFuture },
									error: null,
								}),
						}),
					}),
					update: quoteUpdate,
				}
			}
			if (table === 'bookings') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: vi.fn().mockResolvedValue({
								data: {
									id: bookingId,
									status: 'awaiting_payment',
									payment_status: 'pending',
									client_type: 'walk_in',
									customer_id: null,
									customer_account_id: null,
									account_snapshot: null,
									payment_reference: 'VST-7',
									quote_accepted_at: '2026-04-20T10:00:00.000Z',
									total_amount: 100,
									customer_name: 'Test',
									customer_email: 'a@b.com',
									customer_phone: null,
									origin_name: 'A',
									destination_name: 'B',
									origin_address: null,
									destination_address: null,
									passenger_count: 1,
									pickup_datetime: null,
									booking_intent: 'point_to_point',
								},
								error: null,
							}),
						}),
					}),
					update: bookingUpdate,
				}
			}
			return {}
		})
		;(createServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from })

		const res = await runQuoteAcceptCheckout(acceptToken())
		expect(res.kind).toBe('quote_accepted_eft')
		expect(sendWalkInAcceptanceConfirmationForBookingMock).not.toHaveBeenCalled()
		expect(quoteUpdate).not.toHaveBeenCalled()
		expect(bookingUpdate).not.toHaveBeenCalled()
	})

	it('first accept: runs DB updates and sends confirmation once', async () => {
		let quoteStatus: 'sent' | 'accepted' = 'sent'
		let bookingStatus: 'quote_sent' | 'awaiting_payment' = 'quote_sent'
		let quoteAcceptedAt: string | null = null

		const from = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: vi.fn().mockImplementation(async () => ({
								data: { id: quoteId, booking_id: bookingId, status: quoteStatus, expires_at: expFuture },
								error: null,
							})),
						}),
					}),
					update: vi.fn((payload: Record<string, unknown>) => {
						if (payload.status === 'accepted') {
							quoteStatus = 'accepted'
						}
						return {
							eq: () => ({
								eq: () => ({
									eq: () => ({
										select: () => ({
											maybeSingle: vi.fn().mockResolvedValue({ data: { id: quoteId }, error: null }),
										}),
									}),
								}),
							}),
						}
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: vi.fn().mockImplementation(async () => ({
								data: {
									id: bookingId,
									status: bookingStatus,
									payment_status: 'pending',
									client_type: 'walk_in',
									customer_id: null,
									customer_account_id: null,
									account_snapshot: null,
									payment_reference: 'VST-7',
									quote_accepted_at: quoteAcceptedAt,
									total_amount: 100,
									customer_name: 'Test',
									customer_email: 'a@b.com',
									customer_phone: null,
									origin_name: 'A',
									destination_name: 'B',
									origin_address: null,
									destination_address: null,
									passenger_count: 1,
									pickup_datetime: null,
									booking_intent: 'point_to_point',
								},
								error: null,
							})),
						}),
					}),
					update: vi.fn((payload: Record<string, unknown>) => {
						if (payload.status === 'awaiting_payment' && (payload as { quote_accepted_at?: string }).quote_accepted_at) {
							bookingStatus = 'awaiting_payment'
							quoteAcceptedAt = (payload as { quote_accepted_at: string }).quote_accepted_at
						}
						return {
							eq: () => ({
								eq: () => ({
									select: () => ({
										maybeSingle: vi.fn().mockResolvedValue({
											data: {
												id: bookingId,
												status: bookingStatus,
												payment_status: 'pending',
												client_type: 'walk_in',
												customer_id: null,
												customer_account_id: null,
												account_snapshot: null,
												payment_reference: 'VST-7',
												quote_accepted_at: quoteAcceptedAt,
												total_amount: 100,
												customer_name: 'Test',
												customer_email: 'a@b.com',
												customer_phone: null,
												origin_name: 'A',
												destination_name: 'B',
												origin_address: null,
												destination_address: null,
												passenger_count: 1,
												pickup_datetime: null,
												booking_intent: 'point_to_point',
											},
											error: null,
										}),
									}),
								}),
							}),
						}
					}),
				}
			}
			return {}
		})
		;(createServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({ from })

		const res = await runQuoteAcceptCheckout(acceptToken())
		expect(res.kind).toBe('quote_accepted_eft')
		expect(quoteStatus).toBe('accepted')
		expect(bookingStatus).toBe('awaiting_payment')
		expect(quoteAcceptedAt).toBeTruthy()
		expect(sendWalkInAcceptanceConfirmationForBookingMock).toHaveBeenCalledTimes(1)
		const call = sendWalkInAcceptanceConfirmationForBookingMock.mock.calls[0]
		expect(call?.[1]).toMatchObject({
			quoteId,
			bookingRefLabel: 'VST-7',
		})
	})
})
