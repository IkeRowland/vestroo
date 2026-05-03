import { getAccountDispatchBlockMessage } from '@/features/ops/reason-code-copy'
import type { NotDispatchableAccountDetail } from '@/lib/ops-action-result'

export type AccountDispatchBlockChipProps = {
	reasonCode: string
	detail?: NotDispatchableAccountDetail
}

const SHORT_LABELS: Record<string, string> = {
	account_on_hold: 'On hold',
	account_suspended: 'Suspended',
	account_closed: 'Closed',
	account_not_found: 'Account missing',
	booking_not_found: 'Booking missing',
	contract_expired: 'Contract expired',
	contract_not_yet_active: 'Contract not active',
	po_required_and_missing: 'PO required',
	credit_limit_exceeded: 'Over credit limit',
	overdue_invoices: 'Overdue invoices',
	not_an_account_booking: 'Not an account booking',
}

function shortLabelFor(reasonCode: string): string {
	return SHORT_LABELS[reasonCode] ?? 'Dispatch blocked'
}

/**
 * Per-row dispatch / credit guardrail chip for **account-client** bookings (Story 16.21 / AC4).
 * Renders a short label + a `title` tooltip with the full reason-code message and structured detail.
 *
 * **Display contract:**
 * - Short label = stable account-friendly summary (e.g. "PO required", "Over credit limit").
 * - Tooltip = full sentence from {@link getAccountDispatchBlockMessage} (reuses the **13.2** vocabulary).
 * - When `can_dispatch_account_booking` returns `ok`, callers should not render the chip at all — there is
 *   no "ok" branch here. The component never displays a success badge (epic AC4 explicitly: "When ok, no chip").
 */
export function AccountDispatchBlockChip({
	reasonCode,
	detail,
}: AccountDispatchBlockChipProps) {
	const fullMessage = getAccountDispatchBlockMessage(reasonCode, detail)
	const label = shortLabelFor(reasonCode)
	return (
		<span
			className="inline-flex items-center rounded border border-amber-500/50 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-950 dark:text-amber-100"
			title={fullMessage}
			data-testid="ops-account-dispatch-block-chip"
			data-reason-code={reasonCode}
		>
			{label}
		</span>
	)
}
