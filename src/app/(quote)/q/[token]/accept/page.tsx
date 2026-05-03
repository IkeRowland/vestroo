import { QuoteLinkCheckoutOutcome } from '@/features/quote-link/components/QuoteLinkCheckoutOutcome'
import { runQuoteAcceptCheckout } from '@/lib/quote-accept-flow'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ token: string }>
}

/**
 * Epic 14 / Story 14.3 — public quote **accept** landing (`/q/[token]/accept`).
 * Epic 16 / **US-N6** — EFT confirmation + bank details (no payment gateway).
 * Route group **`(quote)`** keeps quote-link pages out of **`(app)`** / marketing shells (**epic §1**).
 */
export default async function QuoteAcceptPage({ params }: PageProps) {
	const { token: rawToken } = await params
	const model = await runQuoteAcceptCheckout(rawToken)
	return <QuoteLinkCheckoutOutcome model={model} />
}
