import { describe, it, expect } from 'vitest'

import { renderAccountInvoiceEftAppendHtml } from '@/lib/email/account-invoice-eft-html'

/**
 * **16.16 AC8** — Customer HTML uses **full** digits from **`ops_settings`** assembly, not the
 * dispatcher-masked **`getBankAccountForReader`** shape (**\*\*\***).
 */
describe('renderAccountInvoiceEftAppendHtml', () => {
	it('includes unmasked account number and invoice-style payment reference', () => {
		const html = renderAccountInvoiceEftAppendHtml({
			bankAccount: {
				bank_name: 'Example Bank',
				account_holder: 'Vestroo Pty Ltd',
				account_number: '6241025879012',
				branch_code: '632005',
			},
			paymentReference: 'INV-2026-0042',
			amountZarLabel: 'R 1 234,56',
		})
		expect(html).toContain('6241025879012')
		expect(html).toContain('INV-2026-0042')
		expect(html).toContain('Example Bank')
		expect(html).not.toContain('***')
	})

	it('does not mask digits when account number is long', () => {
		const html = renderAccountInvoiceEftAppendHtml({
			bankAccount: {
				bank_name: 'B',
				account_holder: 'H',
				account_number: '1234567890123456',
				branch_code: '250655',
			},
			paymentReference: '—',
			amountZarLabel: 'R 0,00',
		})
		expect(html).toContain('1234567890123456')
		expect(html).not.toMatch(/\*{3}/)
	})
})
