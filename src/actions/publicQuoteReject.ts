'use server'

import { redirect } from 'next/navigation'

import { runPublicQuoteRejectSubmit } from '@/lib/quote-reject-public'

export async function submitPublicQuoteReject(formData: FormData) {
	const token = String(formData.get('token') ?? '')
	const reason = String(formData.get('reason') ?? '')
	const result = await runPublicQuoteRejectSubmit(token, reason)
	if (!result.ok) {
		const q =
			result.error === 'invalid'
				? 'invalid=1'
				: result.error === 'not_sent'
					? 'not_sent=1'
					: 'error=1'
		redirect(`/q/${encodeURIComponent(token)}/reject?${q}`)
	}
	redirect(`/q/${encodeURIComponent(token)}/reject?submitted=1`)
}
