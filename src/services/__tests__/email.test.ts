import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const loadCommsEmailMatrixGateMock = vi.hoisted(() => vi.fn())
const sendCommsMatrixEmailDispatchesMock = vi.hoisted(() => vi.fn())
const auditCommsMatrixPreSendBlockedMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/comms', () => ({
	loadCommsEmailMatrixGate: (...a: unknown[]) => loadCommsEmailMatrixGateMock(...a),
	sendCommsMatrixEmailDispatches: (...a: unknown[]) => sendCommsMatrixEmailDispatchesMock(...a),
	auditCommsMatrixPreSendBlocked: (...a: unknown[]) => auditCommsMatrixPreSendBlockedMock(...a),
	getOpsAutomationAuditActorId: () => null,
	OPS_AUDIT_ACTION_COMMS_NO_RULE_MATCHED: 'comms_no_rule_matched',
	OPS_AUDIT_ACTION_COMMS_NO_ACTIVE_TEMPLATE: 'comms_no_active_template',
}))

vi.mock('@/lib/supabase/server', () => ({
	createServerClient: vi.fn().mockResolvedValue({}),
}))

import { sendBookingConfirmation, type BookingEmailData } from '../email'

const matrixSnapshot = {
	rules: [
		{
			id: 'd1111111-1111-4111-8111-111111111111',
			event_key: 'payment_received',
			channel: 'email' as const,
			recipient_role: 'customer',
			recipient_filter: {},
			active: true,
			created_at: '',
			updated_at: '',
		},
	],
	template: {
		id: 't1111111-1111-4111-8111-111111111111',
		event_key: 'payment_received',
		channel: 'email' as const,
		subject: null,
		body_html: null,
		body_text: null,
		sms_body: null,
		version: 1,
		active: true,
		created_at: '',
		updated_at: '',
	},
}

describe('Email Service', () => {
	const mockBookingData: BookingEmailData = {
		bookingId: 'test-booking-123',
		customerName: 'John Doe',
		customerEmail: 'john.doe@example.com',
		origin: 'OR Tambo Airport',
		destination: 'Sandton City',
		pickupDateTime: new Date('2024-12-25T10:00:00Z'),
		passengerCount: 2,
		flightNumber: 'SA123',
		totalAmount: 450.0,
		paymentReference: 'PF-123456',
		transactionId: 'TXN-789',
	}

	beforeEach(() => {
		process.env.RESEND_API_KEY = 'test-api-key'
		process.env.RESEND_FROM_EMAIL = 'noreply@vestroo.com'
		loadCommsEmailMatrixGateMock.mockReset()
		sendCommsMatrixEmailDispatchesMock.mockReset()
		auditCommsMatrixPreSendBlockedMock.mockReset()
		loadCommsEmailMatrixGateMock.mockResolvedValue({ ok: true, snapshot: matrixSnapshot })
		sendCommsMatrixEmailDispatchesMock.mockResolvedValue({
			outcome: 'sent',
			sendCount: 1,
			lastMessageId: 'email-123',
		})
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('sendBookingConfirmation', () => {
		it('should send email successfully via comms matrix', async () => {
			const result = await sendBookingConfirmation(mockBookingData)

			expect(result.success).toBe(true)
			expect(result.messageId).toBe('email-123')
			expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledTimes(1)
		})

		it('should succeed with no outbound when comms matrix has no active rules', async () => {
			loadCommsEmailMatrixGateMock.mockResolvedValue({ ok: false, kind: 'no_rules' })

			const result = await sendBookingConfirmation(mockBookingData)

			expect(result.success).toBe(true)
			expect(sendCommsMatrixEmailDispatchesMock).not.toHaveBeenCalled()
			expect(auditCommsMatrixPreSendBlockedMock).toHaveBeenCalled()
		})

		it('should return error for invalid email address', async () => {
			const invalidData = {
				...mockBookingData,
				customerEmail: 'invalid-email',
			}

			const result = await sendBookingConfirmation(invalidData)

			expect(result.success).toBe(false)
			expect(result.error).toContain('Invalid customer email')
		})

		it('should retry on network-like errors from matrix dispatch', async () => {
			const networkErr = 'Network timeout'
			sendCommsMatrixEmailDispatchesMock
				.mockResolvedValueOnce({ outcome: 'failed', message: networkErr })
				.mockResolvedValueOnce({ outcome: 'failed', message: networkErr })
				.mockResolvedValueOnce({
					outcome: 'sent',
					sendCount: 1,
					lastMessageId: 'email-123',
				})

			const result = await sendBookingConfirmation(mockBookingData)

			expect(result.success).toBe(true)
			expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledTimes(3)
		})

		it('should not retry on non-retryable errors', async () => {
			sendCommsMatrixEmailDispatchesMock.mockResolvedValue({
				outcome: 'failed',
				message: 'Invalid API key',
			})

			const result = await sendBookingConfirmation(mockBookingData)

			expect(result.success).toBe(false)
			expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledTimes(1)
		})

		it('should handle missing flight number', async () => {
			const dataWithoutFlight = {
				...mockBookingData,
				flightNumber: null,
			}

			const result = await sendBookingConfirmation(dataWithoutFlight)

			expect(result.success).toBe(true)
			expect(sendCommsMatrixEmailDispatchesMock).toHaveBeenCalledTimes(1)
		})
	})
})
