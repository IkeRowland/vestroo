import { permanentRedirect } from 'next/navigation'

import { ACCOUNT_BILLING_INVOICES_LIST_PATH } from '@/lib/account-invoices-list-query'

function searchParamsToQueryString(raw: Record<string, string | string[] | undefined>): string {
	const sp = new URLSearchParams()
	for (const [key, val] of Object.entries(raw)) {
		if (val === undefined) continue
		if (Array.isArray(val)) {
			for (const v of val) {
				if (v) sp.append(key, v)
			}
		} else if (val) {
			sp.set(key, val)
		}
	}
	return sp.toString()
}

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy **`/account/invoices`** → **`/account/billing/invoices`**. */
export default async function LegacyAccountInvoicesRedirect({ searchParams }: PageProps) {
	const raw = await searchParams
	const qs = searchParamsToQueryString(raw)
	permanentRedirect(qs ? `${ACCOUNT_BILLING_INVOICES_LIST_PATH}?${qs}` : ACCOUNT_BILLING_INVOICES_LIST_PATH)
}
