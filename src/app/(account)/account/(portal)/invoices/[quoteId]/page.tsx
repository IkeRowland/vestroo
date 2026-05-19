import { permanentRedirect } from 'next/navigation'

import { accountBillingQuoteViewerPath } from '@/lib/account-invoices-archive-query'

type PageProps = {
	params: Promise<{ quoteId: string }>
}

/** Legacy **`/account/invoices/[quoteId]`** → **`/account/billing/quotes/[quoteId]`**. */
export default async function LegacyAccountInvoiceQuoteViewerRedirect({ params }: PageProps) {
	const { quoteId } = await params
	permanentRedirect(accountBillingQuoteViewerPath(quoteId))
}
