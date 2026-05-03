import { createServerClient } from '@/lib/supabase/server'
import { extractEmailDomain } from '@/lib/email-domain'
import type { AccountDomainCandidateRow } from '@/actions/client-type-resolution'

/**
 * Loads active accounts whose `authorized_email_domains` match the customer email domain.
 * Used by booking server actions after Zod validation (Story 12.5).
 */
export async function loadDomainCandidatesForCustomerEmail(
	email: string,
): Promise<AccountDomainCandidateRow[]> {
	const domain = extractEmailDomain(email.trim())
	if (!domain) {
		return []
	}
	const supabase = await createServerClient()
	const { data, error } = await supabase.rpc('resolve_customer_accounts_for_email_domain', {
		p_domain: domain,
	})
	if (error) {
		console.error('resolve_customer_accounts_for_email_domain:', error)
		throw new Error('Could not verify organisation for this email.')
	}
	return (data ?? []) as AccountDomainCandidateRow[]
}
