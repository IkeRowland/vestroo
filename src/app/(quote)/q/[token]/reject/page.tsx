import Link from 'next/link'

import { submitPublicQuoteReject } from '@/actions/publicQuoteReject'
import { runQuoteRejectGet } from '@/lib/quote-reject-public'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ token: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function QuoteRejectPage({ params, searchParams }: PageProps) {
	const { token: rawToken } = await params
	const sp = await searchParams

	if (sp.submitted === '1') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">Thanks — we have your feedback</h1>
				<p className="mt-3 text-sm text-gray-600">
					We will review your response and be in touch if we need anything further. You can close this tab.
				</p>
				<p className="mt-6">
					<Link href="/book/search" className="text-sm font-medium text-gray-900 underline">
						Request a new quote
					</Link>
				</p>
			</article>
		)
	}

	const model = await runQuoteRejectGet(rawToken)

	const errBanner =
		sp.invalid === '1' ? (
			<p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
				We could not process that submission. Please refresh the page and try again.
			</p>
		) : sp.not_sent === '1' ? (
			<p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
				This quote is no longer open for rejection. Use the latest link from your email if you have one.
			</p>
		) : sp.error === '1' ? (
			<p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
				Something went wrong while saving. Please try again in a moment.
			</p>
		) : null

	if (model.kind === 'form') {
		return (
			<div className="mx-auto max-w-lg">
				{errBanner}
				<article className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
					<h1 className="text-xl font-semibold text-gray-900">This isn&apos;t right for me</h1>
					<p className="mt-2 text-sm text-gray-600">
						You can tell us why (optional). We&apos;ll send you a revised quote if we can help — your booking
						stays open for our team.
					</p>
					<form action={submitPublicQuoteReject} className="mt-6 space-y-4">
						<input type="hidden" name="token" value={model.token} />
						<div>
							<label htmlFor="reason" className="block text-sm font-medium text-gray-800">
								Why is this quote not right for you?
							</label>
							<textarea
								id="reason"
								name="reason"
								rows={5}
								maxLength={2000}
								className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
								placeholder="Optional — up to 2000 characters"
							/>
							<p className="mt-1 text-xs text-gray-500">Optional. Maximum 2000 characters.</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<button
								type="submit"
								className="inline-flex justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
							>
								Submit
							</button>
							<Link
								href={model.acceptHref}
								className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
							>
								Actually, I&apos;ll accept
							</Link>
						</div>
					</form>
				</article>
			</div>
		)
	}

	if (model.kind === 'token_expired') {
		return (
			<article className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-8 shadow-sm">
				<h1 className="text-xl font-semibold text-gray-900">This quote has expired</h1>
				<p className="mt-3 text-sm text-gray-700">
					You can start a fresh booking request with the same trip details (no account required).
				</p>
				<p className="mt-6">
					<Link
						href={model.prefillHref}
						className="inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
					>
						Request a new quote
					</Link>
				</p>
			</article>
		)
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
			accepted: {
				title: 'This quote was already accepted',
				body: 'Payment or checkout may already be in progress. Check your email for next steps.',
			},
			rejected: {
				title: 'You already declined this quote',
				body: 'We have your earlier response on file. Our team can send a revised quote when you are ready.',
			},
			superseded: {
				title: 'This quote was replaced',
				body: 'A newer quote exists for this trip. Please use the latest email from us.',
			},
			draft: {
				title: 'This quote is not ready yet',
				body: 'This link is not active yet. Please wait for your formal quote email.',
			},
			db_expired: {
				title: 'This quote has expired',
				body: 'The quote window has closed. You can request a fresh quote for the same trip.',
			},
			not_sent: {
				title: 'This quote is not available',
				body: 'We cannot use this link right now. Please contact us or request a new quote.',
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
				<p className="mt-3 text-sm text-gray-600">Please use the account or ops flow for this booking.</p>
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

	return null
}
