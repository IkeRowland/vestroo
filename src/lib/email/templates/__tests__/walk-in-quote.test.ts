import { describe, expect, it } from 'vitest'

import { resolveSupportContactLine } from '@/lib/email/email-copy'
import {
	buildWalkInQuotePlaintext,
	renderWalkInQuoteHtml,
	type WalkInQuoteEmailProps,
} from '@/lib/email/templates/walk-in-quote'
import type { BookingQuoteLineItem } from '@/types/booking-quote'

const lineItems: BookingQuoteLineItem[] = [
	{ label: 'Cape Town → Airport', qty: 1, unit_zar: 1200, total_zar: 1200 },
]

const baseProps: WalkInQuoteEmailProps = {
	customerName: 'Alex',
	bookingReference: 'VST-123',
	pickupDateTimeLabel: '1 May 2026, 10:00',
	originLabel: 'Cape Town',
	destinationLabel: 'Airport',
	vehicleCategoryLabel: 'SUV',
	passengerCount: 2,
	totalZarLabel: 'R 1 200,00',
	lineItems,
	expiryFriendly: 'Fri 4 May 2026 at 18:00 SAST',
	acceptUrl: 'https://app.example.com/q/TOKENACCEPT/accept',
	rejectUrl: 'https://app.example.com/q/TOKENREJECT/reject',
	bankAccount: {
		bank_name: 'Acme Bank of Southern Africa',
		account_holder: 'Vestroo (Pty) Ltd',
		account_number: '1234567890',
		branch_code: '250655',
	},
	paymentReference: 'VST-VST-123',
	supportContactLine: resolveSupportContactLine(),
}

describe('walk-in-quote email template — HTML', () => {
	it('embeds opaque /q/ URLs without query-string PII and surfaces the accept CTA', () => {
		const html = renderWalkInQuoteHtml(baseProps)
		expect(html).toContain('/q/TOKENACCEPT/accept')
		expect(html).toContain('/q/TOKENREJECT/reject')
		expect(html).not.toMatch(/\?[^\s"']*email=/i)
		expect(html).not.toMatch(/\?[^\s"']*phone=/i)
		expect(html).toContain('Accept quote')
		expect(html).toContain("This isn't right for me")
	})

	it('drops the legacy /q/.../pay PayFast CTA per Theme N / US-N2 coherence', () => {
		const html = renderWalkInQuoteHtml(baseProps)
		expect(html).not.toMatch(/\/q\/[^/"']+\/pay/)
		expect(html.toLowerCase()).not.toContain('payfast')
		expect(html).not.toContain('Pay now')
	})

	it('renders the bank-account block with full unmasked account details from ops_settings', () => {
		const html = renderWalkInQuoteHtml(baseProps)
		expect(html).toContain('Acme Bank of Southern Africa')
		expect(html).toContain('Vestroo (Pty) Ltd')
		expect(html).toContain('1234567890')
		expect(html).toContain('250655')
		expect(html).toContain('Pay by EFT')
	})

	it('embeds the substituted payment reference (post `{booking_ref}` replacement) in the bank block', () => {
		const html = renderWalkInQuoteHtml(baseProps)
		expect(html).toContain('VST-VST-123')
		expect(html).not.toContain('{booking_ref}')
	})

	it('escapes ampersands and angle brackets in bank-account fields', () => {
		const props: WalkInQuoteEmailProps = {
			...baseProps,
			bankAccount: {
				...baseProps.bankAccount,
				account_holder: 'Vestroo & Co <Pty>',
			},
		}
		const html = renderWalkInQuoteHtml(props)
		expect(html).toContain('Vestroo &amp; Co &lt;Pty&gt;')
		expect(html).not.toContain('Vestroo & Co <Pty>')
	})
})

describe('walk-in-quote email template — plaintext parity helper', () => {
	it('repeats every fact from HTML in readable plaintext (bank + reference + accept URL)', () => {
		const text = buildWalkInQuotePlaintext(baseProps)
		expect(text).toContain('Acme Bank of Southern Africa')
		expect(text).toContain('Vestroo (Pty) Ltd')
		expect(text).toContain('1234567890')
		expect(text).toContain('250655')
		expect(text).toContain('VST-VST-123')
		expect(text).toContain('https://app.example.com/q/TOKENACCEPT/accept')
		expect(text).toContain('R 1 200,00')
		expect(text).toContain('PAY BY EFT')
		expect(text).toContain('Booking reference: VST-123')
	})

	it('does not embed PII query strings in plaintext URLs', () => {
		const text = buildWalkInQuotePlaintext(baseProps)
		expect(text).not.toMatch(/\?[^\s]*email=/i)
		expect(text).not.toMatch(/\?[^\s]*phone=/i)
	})

	it('omits passenger / vehicle lines when those fields are absent', () => {
		const text = buildWalkInQuotePlaintext({
			...baseProps,
			vehicleCategoryLabel: null,
			passengerCount: null,
		})
		expect(text).not.toContain('Vehicle class:')
		expect(text).not.toContain('Passengers:')
	})
})
