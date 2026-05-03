import {
	auditCommsMatrixPreSendBlocked,
	getOpsAutomationAuditActorId,
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
} from '@/lib/comms'
import { createServerClient } from '@/lib/supabase/server'
import type { ClientTypeDb } from '@/types/database.types'

import { renderBookingConfirmationEmail } from './email-templates'

/**
 * Booking email data interface
 */
export interface BookingEmailData {
	bookingId: string
	customerName: string
	customerEmail: string
	origin: string
	destination: string
	pickupDateTime: Date
	passengerCount: number
	flightNumber?: string | null
	totalAmount: number
	paymentReference: string
	transactionId?: string | null
	/** Epic 15 / **15C.2** — comms recipient resolution (sourced from the `bookings` row). */
	clientType?: ClientTypeDb
	customerId?: string | null
	customerAccountId?: string | null
	accountSnapshot?: unknown | null
	riderEmail?: string | null
}

/**
 * Email sending result
 */
export interface EmailResult {
	success: boolean
	messageId?: string
	error?: string
}

/**
 * Retry configuration for email sending
 */
const RETRY_CONFIG = {
	maxRetries: 3,
	initialDelay: 1000, // 1 second
	maxDelay: 4000, // 4 seconds
	backoffMultiplier: 2,
}

/**
 * Check if error is retryable (network errors, rate limits, etc.)
 */
function isRetryableError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		return (
			message.includes('network') ||
			message.includes('timeout') ||
			message.includes('rate limit') ||
			message.includes('429') ||
			message.includes('503') ||
			message.includes('502')
		)
	}
	return false
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
	const delay = RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt)
	return Math.min(delay, RETRY_CONFIG.maxDelay)
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Send booking confirmation email (Epic 15 / **15C.2** — `payment_received` comms matrix + `sendEmail`).
 * Idempotency: stable key `payment-received:{bookingId}` on the underlying `sendEmail` calls so
 * repeated triggers (e.g. ops re-marking payment) collapse safely.
 */
export async function sendBookingConfirmation(data: BookingEmailData): Promise<EmailResult> {
	if (!data.customerEmail || !isValidEmail(data.customerEmail)) {
		const error = `Invalid customer email: ${data.customerEmail}`
		console.error(`[Email Service] ${error}`)
		return {
			success: false,
			error,
		}
	}

	let serviceSb: Awaited<ReturnType<typeof createServerClient>>
	try {
		serviceSb = await createServerClient()
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e)
		return { success: false, error: msg }
	}

	const gate = await loadCommsEmailMatrixGate(serviceSb, 'payment_received', 'email')
	if (!gate.ok) {
		await auditCommsMatrixPreSendBlocked({
			userSupabase: serviceSb,
			serviceSupabase: serviceSb,
			automationActorId: getOpsAutomationAuditActorId() ?? undefined,
			kind: gate.kind,
			entity: 'booking',
			entityId: data.bookingId,
			eventKey: 'payment_received',
			channel: 'email',
			bookingId: data.bookingId,
			correlationId: data.transactionId ?? undefined,
		})
		console.warn(
			`[Email Service] payment_received comms matrix blocked (${gate.kind}) for booking ${data.bookingId}; no outbound email.`,
		)
		return { success: true }
	}

	const clientType = (data.clientType ?? 'walk_in') as ClientTypeDb
	const idemBase = `payment-received:${data.bookingId}`

	let lastError: Error | null = null

	for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt += 1) {
		const sendResult = await sendCommsMatrixEmailDispatches({
			serviceSupabase: serviceSb,
			userSupabase: serviceSb,
			automationActorId: getOpsAutomationAuditActorId() ?? undefined,
			eventKey: 'payment_received',
			channel: 'email',
			entity: 'booking',
			entityId: data.bookingId,
			correlationId: data.transactionId ?? undefined,
			bookingId: data.bookingId,
			booking: {
				client_type: clientType,
				customer_email: data.customerEmail,
				customer_id: data.customerId ?? null,
				customer_account_id: data.customerAccountId ?? null,
				account_snapshot: data.accountSnapshot ?? null,
				rider_email: data.riderEmail ?? null,
			},
			bookingRefLabel:
				data.paymentReference && data.paymentReference.trim() !== ''
					? data.paymentReference.trim()
					: data.bookingId,
			snapshot: gate.snapshot,
			getFallbackEmail: async () => {
				const { html, subject } = renderBookingConfirmationEmail(data)
				return { subject, html }
			},
			baseIdempotencyKey: idemBase,
		})

		if (sendResult.outcome === 'sent') {
			console.log(
				`[Email Service] Confirmation email sent for booking ${data.bookingId}. Message ID: ${sendResult.lastMessageId ?? 'n/a'}`,
			)
			return {
				success: true,
				messageId: sendResult.lastMessageId,
			}
		}

		if (sendResult.outcome === 'no_recipients') {
			console.warn(
				`[Email Service] payment_received matrix produced no resolvable recipients for booking ${data.bookingId}.`,
			)
			return { success: true }
		}

		const errMsg = sendResult.message
		lastError = new Error(errMsg)
		console.error(
			`[Email Service] Attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1} failed for booking ${data.bookingId}:`,
			errMsg,
		)

		if (!isRetryableError(lastError) || attempt === RETRY_CONFIG.maxRetries) {
			return {
				success: false,
				error: errMsg,
			}
		}

		const delay = calculateBackoffDelay(attempt)
		console.log(`[Email Service] Retrying in ${delay}ms for booking ${data.bookingId}...`)
		await sleep(delay)
	}

	return {
		success: false,
		error: lastError?.message || 'Unknown error occurred',
	}
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
	return emailRegex.test(email)
}
