import { describe, expect, it } from 'vitest'

import { resolveSupportContactLine } from '@/lib/email/email-copy'
import {
	buildWalkInAcceptanceConfirmationPlaintext,
	buildWalkInAcceptanceConfirmationSubject,
	renderWalkInAcceptanceConfirmationHtml,
} from '@/lib/email/templates/walk-in-acceptance-confirmation'

const base = {
	customerName: 'Alex',
	bookingReference: 'VST-123',
	paymentReference: 'VST-VST-123',
	bankAccount: {
		bank_name: 'Acme Bank',
		account_holder: 'Vestroo (Pty) Ltd',
		account_number: '1234567890',
		branch_code: '250655',
	},
	supportContactLine: resolveSupportContactLine(),
}

describe('walk-in-acceptance-confirmation template', () => {
	it('renders HTML with bank block and reference (N4-aligned)', () => {
		const html = renderWalkInAcceptanceConfirmationHtml(base)
		expect(html).toContain('your quote is accepted')
		expect(html).toContain('VST-123')
		expect(html).toContain('Acme Bank')
		expect(html).toContain('1234567890')
		expect(html).toContain('VST-VST-123')
		expect(html).toContain('1 business day')
	})

	it('builds a distinct subject with booking reference', () => {
		expect(buildWalkInAcceptanceConfirmationSubject('VST-99')).toBe('Quote accepted — VST-99 — EFT details')
	})

	it('plaintext includes bank + reference for future Resend text plumbing', () => {
		const text = buildWalkInAcceptanceConfirmationPlaintext(base)
		expect(text).toContain('PAY BY EFT')
		expect(text).toContain('VST-VST-123')
		expect(text).toContain('1234567890')
	})
})
