/**
 * Optional structured fields for **`NOT_DISPATCHABLE_ACCOUNT`** (Epic 13 / **13.2** fulfil block panel).
 * Populated server-side for templates (Q11 credit line, contract dates, overdue count).
 */
export type NotDispatchableAccountDetail = {
	contract_starts_on?: string | null
	contract_ends_on?: string | null
	outstanding_zar?: number
	this_booking_zar?: number
	credit_limit_zar?: number | null
	overdue_invoice_count?: number
}

/**
 * Stable client-visible error payload for ops server actions (Theme B / US-B1).
 * Never include stack traces or raw DB internals in `message` — sanitize before building.
 */
export type OpsClientError = {
	code: string
	message: string
	correlationId?: string
	/** Machine-stable guardrail code when `code` is `NOT_DISPATCHABLE_ACCOUNT` (Epic 13 / US-A1). */
	reasonCode?: string
	/** When `code` is `NOT_DISPATCHABLE_ACCOUNT`, optional display fields for **13.2** copy templates. */
	detail?: NotDispatchableAccountDetail
}

export type OpsActionFailure = {
	ok: false
	error: OpsClientError
}

export function isOpsActionFailure(
	res: { ok: boolean },
): res is OpsActionFailure {
	return res.ok === false && 'error' in res && (res as OpsActionFailure).error != null
}

export function opsActionErrorMessage(res: OpsActionFailure): string {
	return res.error.message
}

export function opsActionCorrelationId(res: OpsActionFailure): string | undefined {
	return res.error.correlationId
}
