import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())
const logOpsActionMock = vi.hoisted(() => vi.fn())
const appendOpsAuditLogMock = vi.hoisted(() => vi.fn())
const computeNextEmailFailureAttemptCountForQuoteMock = vi.hoisted(() => vi.fn())
const loadCommsEmailMatrixGateMock = vi.hoisted(() => vi.fn())
const sendCommsMatrixEmailDispatchesMock = vi.hoisted(() => vi.fn())
const auditCommsMatrixPreSendBlockedMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/booking-quote-comms-retry', () => ({
	computeNextEmailFailureAttemptCountForQuote: (...args: unknown[]) =>
		computeNextEmailFailureAttemptCountForQuoteMock(...args),
}))

vi.mock('@/lib/comms', () => ({
	loadCommsEmailMatrixGate: (...args: unknown[]) => loadCommsEmailMatrixGateMock(...args),
	sendCommsMatrixEmailDispatches: (...args: unknown[]) =>
		sendCommsMatrixEmailDispatchesMock(...args),
	auditCommsMatrixPreSendBlocked: (...args: unknown[]) =>
		auditCommsMatrixPreSendBlockedMock(...args),
	getOpsAutomationAuditActorId: () => null,
	OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED: 'comms_no_rule_matched',
	OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE: 'comms_no_active_template',
}))

vi.mock('@/lib/ops-audit', () => ({
	appendOpsAuditLog: (...args: unknown[]) => appendOpsAuditLogMock(...args),
}))

vi.mock('@/lib/ops-action-log', () => ({
	logOpsAction: (...args: unknown[]) => {
		logOpsActionMock(...args)
	},
	newOpsCorrelationId: () => 'corr-test-id',
}))

vi.mock('@/lib/ops-auth', () => ({
	getOpsStaffForAction,
}))

vi.mock('@/lib/supabase/server', () => ({
	createUserServerClient,
	createServiceRoleClient: vi.fn().mockResolvedValue({}),
}))

import {
	initQuoteLinkSigningKeyAtStartup,
	resetQuoteLinkSigningKeyForTests,
} from '@/lib/quote-tokens'

import { createBookingQuote, resendBookingQuote, sendBookingQuote } from '../bookingQuoteOps'

const bookingId = 'b1111111-1111-4111-8111-111111111111'
const quoteId = 'a1111111-1111-4111-8111-111111111111'

const lineOk = [
	{ label: 'Transfer', qty: 1, unit_zar: 100, total_zar: 100 },
]

describe('createBookingQuote', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		logOpsActionMock.mockClear()
	})

	it('returns FORBIDDEN when not staff', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Forbidden' })
		const res = await createBookingQuote(bookingId, lineOk, 100)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.code).toBe('FORBIDDEN')
		}
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('returns VALIDATION when line totals do not match total_zar', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})
		createUserServerClient.mockResolvedValue({
			from: vi.fn(() => ({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: { id: bookingId, client_type: 'account_client' },
					error: null,
				}),
			})),
		})
		const res = await createBookingQuote(bookingId, lineOk, 999)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.code).toBe('VALIDATION')
			expect(res.error.reasonCode).toBe('QUOTE_LINE_TOTAL_MISMATCH')
		}
	})

	it('allocates version 1 when no prior quotes exist', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const insertMock = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: { id: quoteId, version: 1 },
				error: null,
			}),
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: bookingId, client_type: 'walk_in' },
						error: null,
					}),
				}
			}
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					order: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
					insert: insertMock,
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock })

		const res = await createBookingQuote(bookingId, lineOk, 100)
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.version).toBe(1)
		}
		expect(insertMock).toHaveBeenCalledWith(
			expect.objectContaining({
				booking_id: bookingId,
				version: 1,
				idempotency_key: `${bookingId}:1`,
				status: 'draft',
			}),
		)
	})

	it('inserts next version after max query and retries on unique violation', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		let insertCalls = 0
		const insertMock = vi.fn().mockImplementation(() => {
			insertCalls += 1
			if (insertCalls === 1) {
				return {
					select: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'duplicate key value violates unique constraint', code: '23505' },
					}),
				}
			}
			return {
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { id: quoteId, version: 3 },
					error: null,
				}),
			}
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: bookingId, client_type: 'account_client' },
						error: null,
					}),
				}
			}
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					order: vi.fn().mockReturnThis(),
					limit: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { version: 2 },
						error: null,
					}),
					insert: insertMock,
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock })

		const res = await createBookingQuote(bookingId, lineOk, 100)
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.version).toBe(3)
			expect(res.quoteId).toBe(quoteId)
		}
		expect(insertMock).toHaveBeenCalledTimes(2)
	})
})

describe('sendBookingQuote', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		logOpsActionMock.mockClear()
		appendOpsAuditLogMock.mockReset()
		computeNextEmailFailureAttemptCountForQuoteMock.mockReset()
		computeNextEmailFailureAttemptCountForQuoteMock.mockResolvedValue({ ok: true, attemptCount: 1 })
		appendOpsAuditLogMock.mockResolvedValue({ ok: true })
		loadCommsEmailMatrixGateMock.mockReset()
		sendCommsMatrixEmailDispatchesMock.mockReset()
		auditCommsMatrixPreSendBlockedMock.mockReset()
		loadCommsEmailMatrixGateMock.mockResolvedValue({
			ok: true,
			snapshot: {
				rules: [
					{
						id: 'd1111111-1111-4111-8111-111111111111',
						event_key: 'quote_sent_walk_in',
						channel: 'email',
						recipient_role: 'customer',
						recipient_filter: {},
						active: true,
						created_at: '',
						updated_at: '',
					},
				],
				template: {
					id: 't1111111-1111-4111-8111-111111111111',
					event_key: 'quote_sent_walk_in',
					channel: 'email',
					subject: null,
					body_html: null,
					body_text: null,
					sms_body: null,
					version: 1,
					active: true,
					created_at: '',
					updated_at: '',
				},
			},
		})
		sendCommsMatrixEmailDispatchesMock.mockResolvedValue({
			outcome: 'sent',
			sendCount: 1,
			lastMessageId: 're_1',
		})
		process.env.QUOTE_LINK_SIGNING_KEY = '0123456789abcdef0123456789abcdef'
		process.env.NEXT_PUBLIC_APP_URL = 'https://vestroo.test'
		resetQuoteLinkSigningKeyForTests()
		initQuoteLinkSigningKeyAtStartup()
	})

	afterEach(() => {
		delete process.env.QUOTE_LINK_SIGNING_KEY
		delete process.env.NEXT_PUBLIC_APP_URL
		resetQuoteLinkSigningKeyForTests()
	})

	it('returns VALIDATION with BOOKING_NOT_SENDABLE when RPC reports booking_not_sendable', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: false, error: 'booking_not_sendable' },
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'draft',
							line_items: lineOk,
							total_zar: 100,
							rendered_html: null,
							idempotency_key: `${bookingId}:1`,
						},
						error: null,
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: bookingId,
							status: 'cancelled',
							client_type: 'walk_in',
							customer_email: 'a@b.co',
							customer_id: null,
							customer_account_id: null,
							account_snapshot: null,
							payment_reference: null,
							pickup_datetime: null,
							origin_name: null,
							destination_name: null,
							customer_name: null,
							booking_trips: [],
						},
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock, rpc: rpcMock })

		const res = await sendBookingQuote(quoteId)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.reasonCode).toBe('BOOKING_NOT_SENDABLE')
		}
		expect(sendCommsMatrixEmailDispatchesMock).not.toHaveBeenCalled()
	})

	it('is idempotent: skips email resolution when quote already sent and does not log email stub', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: true, idempotent: true },
			error: null,
		})

		const membersFrom = vi.fn()
		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'sent',
							line_items: lineOk,
							total_zar: 100,
							rendered_html: '<p>stored-email</p>',
							idempotency_key: `${bookingId}:1`,
						},
						error: null,
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: bookingId,
							status: 'cancelled',
							client_type: 'walk_in',
							customer_email: null,
							customer_id: null,
							customer_account_id: null,
							account_snapshot: null,
							payment_reference: null,
							pickup_datetime: null,
							origin_name: null,
							destination_name: null,
							customer_name: null,
							booking_trips: [],
						},
						error: null,
					}),
				}
			}
			if (table === 'customer_account_members') {
				return membersFrom()
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock, rpc: rpcMock })

		const res = await sendBookingQuote(quoteId)
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.idempotent).toBe(true)
		}
		expect(membersFrom).not.toHaveBeenCalled()
		expect(sendCommsMatrixEmailDispatchesMock).not.toHaveBeenCalled()
		expect(rpcMock).toHaveBeenCalledWith('ops_send_booking_quote_v1', {
			p_quote_id: quoteId,
			p_sent_to_email: 'idempotent@invalid',
		})
	})

	it('calls sendEmail on first send and passes rendered_html into RPC', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: true },
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'draft',
							line_items: lineOk,
							total_zar: 100,
							rendered_html: null,
							idempotency_key: `${bookingId}:1`,
						},
						error: null,
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: bookingId,
							status: 'submitted',
							client_type: 'walk_in',
							customer_email: 'c@c.co',
							customer_id: null,
							customer_account_id: null,
							account_snapshot: null,
							payment_reference: 'PR-99',
							pickup_datetime: null,
							origin_name: 'Origin',
							destination_name: 'Destination',
							customer_name: 'Walk-in',
							booking_trips: [],
						},
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock, rpc: rpcMock })

		const res = await sendBookingQuote(quoteId)
		expect(res.ok).toBe(true)
		const stubCalls = logOpsActionMock.mock.calls.filter(
			(c) => (c[0] as { action?: string }).action === 'sendBookingQuote_email_stub',
		)
		expect(stubCalls).toHaveLength(0)
		expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledTimes(1)
		expect(rpcMock).toHaveBeenCalledWith(
			'ops_send_booking_quote_v1',
			expect.objectContaining({
				p_quote_id: quoteId,
				p_sent_to_email: 'c@c.co',
				p_rendered_html: expect.stringContaining('Trip confirmation'),
			}),
		)
		expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledWith(
			expect.objectContaining({
				baseIdempotencyKey: `trip-confirmation-send:${bookingId}:1`,
			}),
		)
		expect(appendOpsAuditLogMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: 'email_sent',
				entity: 'booking_quotes',
				entityId: quoteId,
				payload: expect.objectContaining({
					quote_id: quoteId,
					mode: 'sent',
				}),
			}),
		)
	})

	it('trip confirmation HTML includes rider /track/ link when primary trip has time_end_estimate', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: true },
			error: null,
		})

		const tripId = 't1111111-1111-4111-8111-111111111111'
		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'draft',
							line_items: lineOk,
							total_zar: 100,
							rendered_html: null,
							idempotency_key: `${bookingId}:1`,
						},
						error: null,
					}),
				}
			}
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({ data: { full_name: 'Chauffeur' }, error: null }),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: bookingId,
							status: 'submitted',
							client_type: 'walk_in',
							customer_email: 'c@c.co',
							customer_id: null,
							customer_account_id: null,
							account_snapshot: null,
							payment_reference: 'PR-99',
							pickup_datetime: null,
							origin_name: 'Origin',
							destination_name: 'Destination',
							customer_name: 'Walk-in',
							rider_email: 'rider@example.test',
							rider_name: 'Rider',
							rider_phone: null,
							booking_trips: [
								{
									sort_order: 0,
									trips: {
										id: tripId,
										time_start_estimate: '2026-07-01T08:00:00.000Z',
										time_end_estimate: '2026-07-01T10:00:00.000Z',
										chauffeur_id: null,
										vehicles: {
											name: 'Van',
											vehicle_categories: { name: 'Standard' },
										},
									},
								},
							],
						},
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock, rpc: rpcMock })

		const res = await sendBookingQuote(quoteId)
		expect(res.ok).toBe(true)
		expect(rpcMock).toHaveBeenCalledWith(
			'ops_send_booking_quote_v1',
			expect.objectContaining({
				p_rendered_html: expect.stringMatching(/\/track\/[A-Za-z0-9_-]+/),
			}),
		)
		expect(rpcMock.mock.calls[0][1].p_rendered_html as string).toContain('Rider tracking')
		expect(rpcMock.mock.calls[0][1].p_rendered_html as string).toContain('https://vestroo.test/track/')
		expect(rpcMock.mock.calls[0][1].p_rendered_html as string).toContain('rider@example.test')
	})

	it('comms matrix dispatch success logs email_sent audit (no email_send_failed)', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})
		sendCommsMatrixEmailDispatchesMock.mockResolvedValue({
			outcome: 'sent',
			sendCount: 1,
			lastMessageId: 're_test',
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: true },
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'draft',
							line_items: lineOk,
							total_zar: 100,
							rendered_html: null,
							idempotency_key: `${bookingId}:1`,
						},
						error: null,
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: bookingId,
							status: 'submitted',
							client_type: 'walk_in',
							customer_email: 'c@c.co',
							customer_id: null,
							customer_account_id: null,
							account_snapshot: null,
							payment_reference: null,
							pickup_datetime: null,
							origin_name: null,
							destination_name: null,
							customer_name: null,
							booking_trips: [],
						},
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock, rpc: rpcMock })

		const res = await sendBookingQuote(quoteId)
		expect(res.ok).toBe(true)
		expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledTimes(1)
		expect(appendOpsAuditLogMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: 'email_sent',
				payload: expect.objectContaining({ quote_id: quoteId, mode: 'sent', comms_send_count: 1 }),
			}),
		)
	})

	it('comms matrix dispatch failure: audit email_send_failed, quote send not rolled back (RPC ok first)', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})
		sendCommsMatrixEmailDispatchesMock.mockResolvedValue({
			outcome: 'failed',
			message: 'Resend unavailable',
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: true },
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'draft',
							line_items: lineOk,
							total_zar: 100,
							rendered_html: null,
							idempotency_key: `${bookingId}:1`,
						},
						error: null,
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: bookingId,
							status: 'submitted',
							client_type: 'walk_in',
							customer_email: 'c@c.co',
							customer_id: null,
							customer_account_id: null,
							account_snapshot: null,
							payment_reference: null,
							pickup_datetime: null,
							origin_name: null,
							destination_name: null,
							customer_name: null,
							booking_trips: [],
						},
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock, rpc: rpcMock })

		const res = await sendBookingQuote(quoteId)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.reasonCode).toBe('EMAIL_SEND_FAILED')
			expect(res.error.code).toBe('EMAIL')
		}
		expect(rpcMock).toHaveBeenCalled()
		expect(computeNextEmailFailureAttemptCountForQuoteMock).toHaveBeenCalled()
		expect(appendOpsAuditLogMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: 'email_send_failed',
				entity: 'booking_quotes',
				entityId: quoteId,
				payload: expect.objectContaining({
					quote_id: quoteId,
					error_message: 'Resend unavailable',
					attempt_count: 1,
				}),
			}),
		)
	})
})

describe('resendBookingQuote', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		logOpsActionMock.mockClear()
	})

	it('returns FORBIDDEN when not staff', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Forbidden' })
		const res = await resendBookingQuote(quoteId)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.code).toBe('FORBIDDEN')
		}
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('returns success with new quote id when RPC succeeds', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const newId = 'c2222222-2222-4222-8222-222222222222'
		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: true, new_quote_id: newId, new_version: 4 },
			error: null,
		})

		createUserServerClient.mockResolvedValue({ rpc: rpcMock })

		const res = await resendBookingQuote(quoteId)
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.newQuoteId).toBe(newId)
			expect(res.newVersion).toBe(4)
		}
		expect(rpcMock).toHaveBeenCalledWith('ops_resend_booking_quote_v1', {
			p_prior_quote_id: quoteId,
		})
	})

	it('maps invalid_quote_state to QUOTE_NOT_RESENDABLE', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const rpcMock = vi.fn().mockResolvedValue({
			data: { ok: false, error: 'invalid_quote_state' },
			error: null,
		})

		createUserServerClient.mockResolvedValue({ rpc: rpcMock })

		const res = await resendBookingQuote(quoteId)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.reasonCode).toBe('QUOTE_NOT_RESENDABLE')
		}
	})
})
