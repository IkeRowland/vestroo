import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { AccountDispatchBlockChip } from '@/features/ops/components/AccountDispatchBlockChip'

/**
 * Render-only contract tests for the per-row dispatch / credit chip (Story 16.21 / AC4).
 * Vitest runs in `node` here (no jsdom) so we use `renderToStaticMarkup` for HTML assertions —
 * good enough to verify reason-code mapping, label copy, and the tooltip `title` attribute.
 */
describe('AccountDispatchBlockChip (Story 16.21 / AC4)', () => {
	it('renders the short label for known reason codes', () => {
		const cases: Array<{ code: string; label: string }> = [
			{ code: 'account_on_hold', label: 'On hold' },
			{ code: 'account_suspended', label: 'Suspended' },
			{ code: 'account_closed', label: 'Closed' },
			{ code: 'contract_expired', label: 'Contract expired' },
			{ code: 'contract_not_yet_active', label: 'Contract not active' },
			{ code: 'po_required_and_missing', label: 'PO required' },
			{ code: 'credit_limit_exceeded', label: 'Over credit limit' },
			{ code: 'overdue_invoices', label: 'Overdue invoices' },
		]
		for (const c of cases) {
			const html = renderToStaticMarkup(<AccountDispatchBlockChip reasonCode={c.code} />)
			expect(html).toContain(`>${c.label}<`)
			expect(html).toContain(`data-reason-code="${c.code}"`)
		}
	})

	it('falls back to "Dispatch blocked" for unknown reason codes', () => {
		const html = renderToStaticMarkup(
			<AccountDispatchBlockChip reasonCode="completely_new_reason" />,
		)
		expect(html).toContain('>Dispatch blocked<')
		expect(html).toContain('data-reason-code="completely_new_reason"')
	})

	it('uses the reason-code-copy vocabulary for the tooltip body', () => {
		const html = renderToStaticMarkup(<AccountDispatchBlockChip reasonCode="account_on_hold" />)
		expect(html).toContain(
			'title="This account is currently on hold. Contact account admin before dispatch."',
		)
	})

	it('embeds structured ZAR detail in the credit-limit tooltip', () => {
		const html = renderToStaticMarkup(
			<AccountDispatchBlockChip
				reasonCode="credit_limit_exceeded"
				detail={{
					outstanding_zar: 1234,
					this_booking_zar: 500,
					credit_limit_zar: 1500,
				}}
			/>,
		)
		expect(html).toContain('Outstanding')
		expect(html).toContain('credit limit')
	})

	it('embeds an overdue invoice count in the overdue tooltip', () => {
		const html = renderToStaticMarkup(
			<AccountDispatchBlockChip
				reasonCode="overdue_invoices"
				detail={{ overdue_invoice_count: 3 }}
			/>,
		)
		expect(html).toContain('3 overdue invoice')
	})

	it('exposes the testid for queue-level assertions', () => {
		const html = renderToStaticMarkup(
			<AccountDispatchBlockChip reasonCode="po_required_and_missing" />,
		)
		expect(html).toContain('data-testid="ops-account-dispatch-block-chip"')
	})
})
