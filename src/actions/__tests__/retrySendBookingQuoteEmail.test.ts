import { describe, it, expect, vi, beforeEach } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())
const appendOpsAuditLogMock = vi.hoisted(() => vi.fn())
const loadCommsEmailMatrixGateMock = vi.hoisted(() => vi.fn())
const sendCommsMatrixEmailDispatchesMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/comms', () => ({
	loadCommsEmailMatrixGate: (...a: unknown[]) => loadCommsEmailMatrixGateMock(...a),
	sendCommsMatrixEmailDispatches: (...a: unknown[]) => sendCommsMatrixEmailDispatchesMock(...a),
	auditCommsMatrixPreSendBlocked: vi.fn(),
	getOpsAutomationAuditActorId: () => null,
	OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED: 'comms_no_rule_matched',
	OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE: 'comms_no_active_template',
}))

vi.mock('@/lib/ops-audit', () => ({
	appendOpsAuditLog: (...args: unknown[]) => appendOpsAuditLogMock(...args),
}))

vi.mock('@/lib/ops-action-log', () => ({
	logOpsAction: vi.fn(),
	newOpsCorrelationId: () => 'corr-retry-test',
}))

vi.mock('@/lib/ops-auth', () => ({
	getOpsStaffForAction,
}))

vi.mock('@/lib/supabase/server', () => ({
	createUserServerClient,
	createServiceRoleClient: vi.fn().mockResolvedValue({}),
}))

import {
	abandonBookingQuoteCommsRetry,
	retrySendBookingQuoteEmail,
} from '../retrySendBookingQuoteEmail'

const quoteId = 'a1111111-1111-4111-8111-111111111111'
const bookingId = 'b1111111-1111-4111-8111-111111111111'

describe('retrySendBookingQuoteEmail', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		appendOpsAuditLogMock.mockReset()
		appendOpsAuditLogMock.mockResolvedValue({ ok: true })
		loadCommsEmailMatrixGateMock.mockReset()
		sendCommsMatrixEmailDispatchesMock.mockReset()
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
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})
	})

	it('returns idempotent success when the quote is not in the RPC retry list', async () => {
		const rpcMock = vi.fn().mockResolvedValue({
			data: [],
			error: null,
		})
		createUserServerClient.mockResolvedValue({ rpc: rpcMock })

		const res = await retrySendBookingQuoteEmail(quoteId)
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.idempotent).toBe(true)
		}
		expect(rpcMock).toHaveBeenCalledWith('ops_list_booking_quote_comms_retry_candidates_v1')
		expect(sendCommsMatrixEmailDispatchesMock).not.toHaveBeenCalled()
	})

	it('passes a stable Resend idempotency key for the same failure wave', async () => {
		const failIso = '2026-04-20T12:00:00.000Z'
		const rpcMock = vi.fn().mockResolvedValue({
			data: [
				{
					quote_id: quoteId,
					booking_id: bookingId,
					sent_to_email: 'c@c.co',
					quote_version: 1,
					failure_strike_count: 1,
					last_email_send_failed_at: failIso,
					last_email_sent_at: null,
				},
			],
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					update: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					is: vi.fn().mockResolvedValue({ error: null }),
					maybeSingle: vi.fn().mockResolvedValue({
						data: {
							id: quoteId,
							booking_id: bookingId,
							status: 'sent',
							line_items: [{ label: 'Transfer', qty: 1, unit_zar: 100, total_zar: 100 }],
							total_zar: 100,
							rendered_html: '<p>cached</p>',
							sent_to_email: 'c@c.co',
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
							rider_name: null,
							rider_email: null,
							rider_phone: null,
							payment_reference: 'PR-1',
							pickup_datetime: null,
							origin_name: 'A',
							destination_name: 'B',
							customer_name: 'Walk',
							booking_trips: [],
						},
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})

		createUserServerClient.mockResolvedValue({ rpc: rpcMock, from: fromMock })

		const res = await retrySendBookingQuoteEmail(quoteId)
		expect(res.ok).toBe(true)
		expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledWith(
			expect.objectContaining({
				baseIdempotencyKey: `trip-confirmation-retry:${quoteId}:${failIso}`,
			}),
		)
	})
})

describe('abandonBookingQuoteCommsRetry', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		appendOpsAuditLogMock.mockReset()
		appendOpsAuditLogMock.mockResolvedValue({ ok: true })
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})
	})

	it('rejects when the quote is not on the comms retry queue', async () => {
		const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null })
		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: quoteId, status: 'sent' },
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})
		createUserServerClient.mockResolvedValue({ rpc: rpcMock, from: fromMock })

		const res = await abandonBookingQuoteCommsRetry(quoteId)
		expect(res.ok).toBe(false)
		if (!res.ok) {
			expect(res.error.reasonCode).toBe('QUOTE_NOT_IN_COMMS_RETRY_QUEUE')
		}
		expect(appendOpsAuditLogMock).not.toHaveBeenCalled()
	})

	it('appends email_retry_abandoned when the quote is listed', async () => {
		const rpcMock = vi.fn().mockResolvedValue({
			data: [
				{
					quote_id: quoteId,
					booking_id: bookingId,
					sent_to_email: 'c@c.co',
					quote_version: 1,
					failure_strike_count: 3,
					last_email_send_failed_at: '2026-04-20T12:00:00.000Z',
					last_email_sent_at: null,
				},
			],
			error: null,
		})
		const fromMock = vi.fn((table: string) => {
			if (table === 'booking_quotes') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: quoteId, status: 'sent' },
						error: null,
					}),
				}
			}
			throw new Error(`unexpected ${table}`)
		})
		createUserServerClient.mockResolvedValue({ rpc: rpcMock, from: fromMock })

		const res = await abandonBookingQuoteCommsRetry(quoteId)
		expect(res.ok).toBe(true)
		expect(appendOpsAuditLogMock).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				action: 'email_retry_abandoned',
				entity: 'booking_quotes',
				entityId: quoteId,
				payload: { quote_id: quoteId },
			}),
		)
	})
})
