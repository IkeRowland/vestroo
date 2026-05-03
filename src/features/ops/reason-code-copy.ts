import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'

/** ZAR display for fulfil reason-code panel (Epic 13 / US-A2 / Q11). */
export function formatZarForReasonCopy(amount: number | null | undefined): string {
	if (amount == null || Number.isNaN(amount)) {
		return '—'
	}
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(amount)
}

export function formatReasonCodeDate(isoDate: string | null | undefined): string {
	if (!isoDate?.trim()) {
		return '—'
	}
	const d = new Date(isoDate)
	if (Number.isNaN(d.getTime())) {
		return '—'
	}
	return d.toLocaleDateString('en-ZA', { dateStyle: 'medium' })
}

/**
 * Primary body copy for the **Assign** step block panel when dispatch is blocked (**NOT_DISPATCHABLE_ACCOUNT**).
 * All seven guardrail codes + generic fallback — keep in sync with `can_dispatch_account_booking` vocabulary.
 */
export function getAccountDispatchBlockMessage(
	reasonCode: string,
	detail?: NotDispatchableAccountDetail,
): string {
	switch (reasonCode) {
		case 'account_on_hold':
			return 'This account is currently on hold. Contact account admin before dispatch.'
		case 'account_suspended':
			return 'This account is suspended. Dispatch is not permitted.'
		case 'contract_expired': {
			const end = formatReasonCodeDate(detail?.contract_ends_on ?? null)
			return `The account's contract expired on ${end}. Renew before dispatch.`
		}
		case 'contract_not_yet_active': {
			const start = formatReasonCodeDate(detail?.contract_starts_on ?? null)
			return `The account's contract starts on ${start}. Dispatch is not permitted yet.`
		}
		case 'po_required_and_missing':
			return 'This account requires a purchase order reference. Add one to the booking before dispatch.'
		case 'credit_limit_exceeded': {
			const o = formatZarForReasonCopy(detail?.outstanding_zar ?? null)
			const t = formatZarForReasonCopy(detail?.this_booking_zar ?? null)
			const c = formatZarForReasonCopy(detail?.credit_limit_zar ?? null)
			return `Outstanding ${o} + this booking ${t} exceeds credit limit ${c}.`
		}
		case 'overdue_invoices': {
			const n = detail?.overdue_invoice_count ?? 0
			return `This account has ${n} overdue invoice(s). Resolve before dispatch.`
		}
		default:
			return `Dispatch is blocked for this account booking (reason: ${reasonCode}). Check account health, contract, and billing details, then try again.`
	}
}
