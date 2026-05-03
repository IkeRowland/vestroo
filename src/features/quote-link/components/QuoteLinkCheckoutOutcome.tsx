import Link from 'next/link'

import { QuoteExpiredExperience } from '@/features/quote-link/components/QuoteExpiredExperience'
import type { QuoteAcceptViewModel } from '@/lib/quote-accept-flow'

type QuoteLinkCheckoutOutcomeProps = {
	model: QuoteAcceptViewModel
}

const NEXT_STEPS_COPY =
	"We'll confirm receipt of your EFT within 1 business day. You'll receive a confirmation email shortly."

/**
 * Shared server-rendered outcomes for **`/q/[token]/accept`** (Epic 14 / **US-N6** EFT landing).
 */
export function QuoteLinkCheckoutOutcome({ model }: QuoteLinkCheckoutOutcomeProps) {
	if (model.kind === 'quote_accepted_eft') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">Quote accepted</h1>
				<p className="mt-3 text-sm text-gray-600">
					Your reference:{' '}
					<strong className="font-mono text-gray-900">{model.bookingReferenceLabel}</strong>
				</p>
				{model.eft.load === 'ok' ? (
					<div className="mt-6 rounded-md border border-gray-200 bg-stone-50 p-4 text-sm text-gray-800">
						<p className="font-semibold text-gray-900">Pay by EFT</p>
						<dl className="mt-3 space-y-2">
							<div className="grid grid-cols-[8.5rem_1fr] gap-1">
								<dt className="text-gray-500">Bank</dt>
								<dd>{model.eft.bankAccount.bank_name}</dd>
							</div>
							<div className="grid grid-cols-[8.5rem_1fr] gap-1">
								<dt className="text-gray-500">Account holder</dt>
								<dd>{model.eft.bankAccount.account_holder}</dd>
							</div>
							<div className="grid grid-cols-[8.5rem_1fr] gap-1">
								<dt className="text-gray-500">Account number</dt>
								<dd className="font-mono font-medium">{model.eft.bankAccount.account_number}</dd>
							</div>
							<div className="grid grid-cols-[8.5rem_1fr] gap-1">
								<dt className="text-gray-500">Branch / sort code</dt>
								<dd className="font-mono">{model.eft.bankAccount.branch_code}</dd>
							</div>
							<div className="grid grid-cols-[8.5rem_1fr] gap-1">
								<dt className="text-gray-500">EFT reference</dt>
								<dd className="font-mono font-medium">{model.eft.paymentReference}</dd>
							</div>
						</dl>
					</div>
				) : (
					<p className="mt-4 text-sm text-amber-800" role="alert">
						{model.eft.message}
					</p>
				)}
				<p className="mt-5 text-sm text-gray-600">{NEXT_STEPS_COPY}</p>
				<p className="mt-2 text-sm text-gray-600">{model.supportContactLine}</p>
				<p className="mt-6">
					<Link href="/contact" className="text-sm font-medium text-gray-900 underline">
						Contact us
					</Link>
				</p>
			</article>
		)
	}

	if (model.kind === 'already_accepted') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">Quote already accepted</h1>
				<p className="mt-3 text-sm text-gray-600">
					You have already accepted this quote. Check your email for the payment instructions or your
					booking confirmation. If you need help, contact our team.
				</p>
				<p className="mt-6">
					<Link href="/book/search" className="text-sm font-medium text-gray-900 underline">
						Request a new quote
					</Link>
				</p>
			</article>
		)
	}

	if (model.kind === 'already_paid') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">Payment already recorded</h1>
				<p className="mt-3 text-sm text-gray-600">
					We already have a payment on file for this booking. Check your email for confirmation or next
					steps.
				</p>
			</article>
		)
	}

	if (model.kind === 'token_expired') {
		return <QuoteExpiredExperience prefillHref={model.prefillHref} tripSummary={model.tripSummary} />
	}

	if (model.kind === 'token') {
		const title =
			model.reason === 'invalid_signature' ? 'Invalid or tampered link' : 'This link is not valid'
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">{title}</h1>
				<p className="mt-3 text-sm text-gray-700">
					Please open the latest link from your email, or request a new quote below.
				</p>
				<p className="mt-6">
					<Link href="/book/search" className="text-sm font-medium text-gray-900 underline">
						Request a new quote
					</Link>
				</p>
			</article>
		)
	}

	if (model.kind === 'quote_state') {
		const copy: Record<typeof model.variant, { title: string; body: string }> = {
			rejected: {
				title: 'This quote was declined',
				body: 'This quote is no longer available. If this was a mistake, contact us and we can send a revised quote.',
			},
			superseded: {
				title: 'This quote was replaced',
				body: 'A newer quote is on file for this trip. Please use the latest email from us — older links cannot be used.',
			},
			draft: {
				title: 'This quote is not ready yet',
				body: 'This link is not active. Please wait for us to send your formal quote by email.',
			},
			db_expired: {
				title: 'This quote has expired',
				body: 'The quote window has closed. You can request a fresh quote for the same trip.',
			},
			not_sent: {
				title: 'This quote is not available',
				body: 'We cannot accept this link. Please use the latest email we sent you or contact support.',
			},
		}
		const c = copy[model.variant]
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">{c.title}</h1>
				<p className="mt-3 text-sm text-gray-600">{c.body}</p>
				<p className="mt-6">
					<Link href="/book/search" className="text-sm font-medium text-gray-900 underline">
						Request a new quote
					</Link>
				</p>
			</article>
		)
	}

	if (model.kind === 'wrong_client_type') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">This link cannot be used here</h1>
				<p className="mt-3 text-sm text-gray-600">Please sign in or use the link provided for your account booking.</p>
			</article>
		)
	}

	if (model.kind === 'not_found' || model.kind === 'booking_status_mismatch') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">We could not find this quote</h1>
				<p className="mt-3 text-sm text-gray-600">
					The link may be out of date. Request a new quote or contact support with your booking reference.
				</p>
				<p className="mt-6">
					<Link href="/book/search" className="text-sm font-medium text-gray-900 underline">
						Request a new quote
					</Link>
				</p>
			</article>
		)
	}

	if (model.kind === 'transition_failed') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
				<p className="mt-3 text-sm text-gray-600">{model.detail}</p>
				<p className="mt-6">
					<Link href="/book/search" className="text-sm font-medium text-gray-900 underline">
						Back to booking search
					</Link>
				</p>
			</article>
		)
	}

	return null
}
