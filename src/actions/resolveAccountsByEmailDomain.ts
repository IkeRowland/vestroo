'use server'

import { z } from 'zod'

import { createServerClient } from '@/lib/supabase/server'
import { extractEmailDomain } from '@/lib/email-domain'
import type { AccountDomainCandidateRow } from '@/actions/client-type-resolution'

const emailInputSchema = z.string().trim().email()

/**
 * Domain-scoped lookup for Q6 — returns only accounts whose `authorized_email_domains`
 * match the booker's email domain (case-insensitive). No full `customer_accounts` list.
 */
export async function resolveAccountsByEmailDomain(
	rawEmail: string,
): Promise<
	| { success: true; domain: string | null; accounts: AccountDomainCandidateRow[] }
	| { success: false; error: string }
> {
	try {
		const parsed = emailInputSchema.safeParse(rawEmail)
		if (!parsed.success) {
			return { success: true, domain: null, accounts: [] }
		}

		const domain = extractEmailDomain(parsed.data)
		if (!domain) {
			return { success: true, domain: null, accounts: [] }
		}

		const supabase = await createServerClient()
		const { data, error } = await supabase.rpc('resolve_customer_accounts_for_email_domain', {
			p_domain: domain,
		})

		if (error) {
			console.error('resolve_customer_accounts_for_email_domain:', error)
			return { success: false, error: 'Could not verify organisation for this email.' }
		}

		const rows = (data ?? []) as AccountDomainCandidateRow[]
		return { success: true, domain, accounts: rows }
	} catch (e) {
		console.error('resolveAccountsByEmailDomain:', e)
		return { success: false, error: 'Could not verify organisation for this email.' }
	}
}
