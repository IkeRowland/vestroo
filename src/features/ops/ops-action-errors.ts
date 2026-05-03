import type { NotDispatchableAccountDetail, OpsActionFailure } from '@/lib/ops-action-result'

/**
 * Maps raw action / Postgres / network strings to staff-safe copy (no JWTs, keys, stacks, full SQL).
 * Used server-side before returning `OpsClientError.message` and optionally client-side as defense in depth.
 */
const JWT_LIKE = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./
const SERVICE_ROLE = /service_role|service-role|SUPABASE_SERVICE_ROLE/i
const BEARER = /bearer\s+[A-Za-z0-9._-]+/i
const API_KEY = /apikey\s*[:=]\s*[^\s]+/i

export function mapOpsActionErrorToMessage(raw: string | null | undefined): string {
	const s = typeof raw === 'string' ? raw.trim() : ''
	if (!s) {
		return 'Something went wrong. Try again or refresh the page.'
	}
	if (JWT_LIKE.test(s) || s.length > 800) {
		return 'An authentication or configuration error occurred. Contact support if this persists.'
	}
	if (SERVICE_ROLE.test(s) || BEARER.test(s) || API_KEY.test(s)) {
		return 'A secure credential was referenced incorrectly. Try again or contact support.'
	}
	if (/at\s+\w+\s+\([^)]+\)/.test(s) || s.includes('Error:') && s.includes('\n')) {
		return 'An unexpected error occurred. Try again or refresh the page.'
	}
	if (
		/relation\s+"[^"]+"\s+does not exist/i.test(s) ||
		/syntax error at or near/i.test(s) ||
		/violates foreign key constraint/i.test(s) ||
		/violates check constraint/i.test(s) ||
		/duplicate key value/i.test(s)
	) {
		return 'The database could not complete this change. Try again or contact support with your reference id.'
	}
	// Short, already curated app messages pass through
	if (s.length <= 200 && !/[{}[\]]/.test(s)) {
		return s
	}
	return 'Something went wrong. Try again or refresh the page.'
}

export function buildOpsActionFailure(
	code: string,
	rawMessage: string | undefined,
	correlationId: string,
	extras?: { reasonCode?: string; detail?: NotDispatchableAccountDetail },
): OpsActionFailure {
	return {
		ok: false,
		error: {
			code,
			message: mapOpsActionErrorToMessage(rawMessage),
			correlationId,
			...(extras?.reasonCode != null ? { reasonCode: extras.reasonCode } : {}),
			...(extras?.detail != null ? { detail: extras.detail } : {}),
		},
	}
}
