import { describe, it, expect } from 'vitest'

import {
	bookingQuoteIsCommsRetryCandidateFromAudits,
	buildTripConfirmationRetryResendIdempotencyKey,
	countEmailSendFailedSinceLastEmailSent,
	COMMS_RETRY_MANUAL_EXIT_STRIKE_THRESHOLD,
	shouldShowCommsRetryStrikeWarning,
	type QuoteCommsAuditEvent,
} from '@/lib/booking-quote-comms-retry'

function ev(action: string, createdAt: string): QuoteCommsAuditEvent {
	return { action, createdAt }
}

describe('bookingQuoteIsCommsRetryCandidateFromAudits', () => {
	it('includes when rendered_html is missing even without failures', () => {
		expect(
			bookingQuoteIsCommsRetryCandidateFromAudits({
				renderedHtmlMissing: true,
				events: [],
			}),
		).toBe(true)
	})

	it('includes when last failure is newer than last email_sent', () => {
		const events: QuoteCommsAuditEvent[] = [
			ev('email_sent', '2026-01-01T10:00:00.000Z'),
			ev('email_send_failed', '2026-01-01T11:00:00.000Z'),
		]
		expect(
			bookingQuoteIsCommsRetryCandidateFromAudits({
				renderedHtmlMissing: false,
				events,
			}),
		).toBe(true)
	})

	it('excludes when last email_sent is newer than last failure and html present', () => {
		const events: QuoteCommsAuditEvent[] = [
			ev('email_send_failed', '2026-01-01T10:00:00.000Z'),
			ev('email_sent', '2026-01-01T11:00:00.000Z'),
		]
		expect(
			bookingQuoteIsCommsRetryCandidateFromAudits({
				renderedHtmlMissing: false,
				events,
			}),
		).toBe(false)
	})

	it('excludes when email_retry_abandoned is after the last failure', () => {
		const events: QuoteCommsAuditEvent[] = [
			ev('email_send_failed', '2026-01-01T10:00:00.000Z'),
			ev('email_retry_abandoned', '2026-01-01T11:00:00.000Z'),
		]
		expect(
			bookingQuoteIsCommsRetryCandidateFromAudits({
				renderedHtmlMissing: true,
				events,
			}),
		).toBe(false)
	})

	it('includes again when a new failure occurs after abandon', () => {
		const events: QuoteCommsAuditEvent[] = [
			ev('email_send_failed', '2026-01-01T10:00:00.000Z'),
			ev('email_retry_abandoned', '2026-01-01T11:00:00.000Z'),
			ev('email_send_failed', '2026-01-01T12:00:00.000Z'),
		]
		expect(
			bookingQuoteIsCommsRetryCandidateFromAudits({
				renderedHtmlMissing: false,
				events,
			}),
		).toBe(true)
	})
})

describe('countEmailSendFailedSinceLastEmailSent', () => {
	it('counts all failures when there is no email_sent', () => {
		const events = [
			ev('email_send_failed', '2026-01-01T10:00:00.000Z'),
			ev('email_send_failed', '2026-01-01T11:00:00.000Z'),
		]
		expect(countEmailSendFailedSinceLastEmailSent(events)).toBe(2)
	})

	it('counts only failures after the latest email_sent', () => {
		const events = [
			ev('email_send_failed', '2026-01-01T09:00:00.000Z'),
			ev('email_sent', '2026-01-01T10:00:00.000Z'),
			ev('email_send_failed', '2026-01-01T11:00:00.000Z'),
		]
		expect(countEmailSendFailedSinceLastEmailSent(events)).toBe(1)
	})
})

describe('buildTripConfirmationRetryResendIdempotencyKey', () => {
	it('is stable for the same quote and failure wave', () => {
		const iso = '2026-01-01T12:34:56.789Z'
		const q = 'a1111111-1111-4111-8111-111111111111'
		expect(buildTripConfirmationRetryResendIdempotencyKey({ quoteId: q, latestEmailSendFailedAt: iso })).toBe(
			`trip-confirmation-retry:${q}:${iso}`,
		)
	})

	it('uses a sentinel when there is no failure audit yet', () => {
		const q = 'a1111111-1111-4111-8111-111111111111'
		expect(buildTripConfirmationRetryResendIdempotencyKey({ quoteId: q, latestEmailSendFailedAt: null })).toBe(
			`trip-confirmation-retry:${q}:no-email-send-failed`,
		)
	})
})

describe('shouldShowCommsRetryStrikeWarning', () => {
	it(`is false below ${COMMS_RETRY_MANUAL_EXIT_STRIKE_THRESHOLD} strikes`, () => {
		expect(shouldShowCommsRetryStrikeWarning(2)).toBe(false)
	})

	it(`is true at ${COMMS_RETRY_MANUAL_EXIT_STRIKE_THRESHOLD}+ strikes`, () => {
		expect(shouldShowCommsRetryStrikeWarning(3)).toBe(true)
		expect(shouldShowCommsRetryStrikeWarning(5)).toBe(true)
	})
})
