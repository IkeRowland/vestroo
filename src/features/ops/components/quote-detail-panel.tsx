import { AccountQuoteSendForm } from '@/features/ops/components/account-quote-send-form'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { ResendBookingQuoteButton } from '@/features/ops/components/resend-booking-quote-button'
import { WalkInQuoteSendForm } from '@/features/ops/components/walk-in-quote-send-form'
import {
	type OpsBookingQuoteDetailRow,
	quoteStatusAllowsResend,
} from '@/lib/booking-current-quote'
import { parseBookingQuoteLineItems } from '@/types/booking-quote'

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) {
		return '—'
	}
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(amount)
}

function formatDateTime(iso: string | null): string {
	if (iso == null || iso === '') {
		return '—'
	}
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) {
		return '—'
	}
	return new Intl.DateTimeFormat('en-ZA', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(d)
}

type QuoteDetailPanelProps = {
	bookingId: string
	clientType: string | null
	bookingStatus: string | null
	quote: OpsBookingQuoteDetailRow | null
	/** Prefilled first line label for walk-in quote form (e.g. route summary). */
	defaultQuoteLineLabel: string
}

function canSendWalkInQuote(clientType: string | null, bookingStatus: string | null): boolean {
	if (clientType !== 'walk_in') {
		return false
	}
	const s = bookingStatus ?? ''
	return s === 'submitted' || s === 'triaged' || s === 'quote_sent'
}

function canSendAccountClientQuote(clientType: string | null, bookingStatus: string | null): boolean {
	if (clientType !== 'account_client') {
		return false
	}
	const s = bookingStatus ?? ''
	return (
		s === 'submitted' ||
		s === 'triaged' ||
		s === 'quote_sent' ||
		s === 'pending_confirmation'
	)
}

/**
 * Ops booking detail — current quote summary (Story 13.5 / US-B2).
 */
export function QuoteDetailPanel({
	bookingId,
	clientType,
	bookingStatus,
	quote,
	defaultQuoteLineLabel,
}: QuoteDetailPanelProps) {
	const walkInSend = canSendWalkInQuote(clientType, bookingStatus)
	const accountSend = canSendAccountClientQuote(clientType, bookingStatus)

	if (!quote) {
		return (
			<section
				id="ops-booking-quote"
				className="rounded-lg border border-ops-border bg-ops-surface/20 p-4 text-sm text-ops-muted"
				aria-labelledby="quote-heading"
			>
				<h2 id="quote-heading" className="mb-2 text-base font-semibold text-ops-foreground">
					Quote
				</h2>
				<p>No quote sent yet.</p>
				{walkInSend ? (
					<WalkInQuoteSendForm
						bookingId={bookingId}
						defaultFirstLineLabel={defaultQuoteLineLabel}
					/>
				) : null}
				{accountSend ? (
					<AccountQuoteSendForm
						bookingId={bookingId}
						bookingStatus={bookingStatus}
						defaultFirstLineLabel={defaultQuoteLineLabel}
					/>
				) : null}
			</section>
		)
	}

	const lineItems = parseBookingQuoteLineItems(quote.line_items)
	const canResend = clientType !== 'walk_in' && quoteStatusAllowsResend(quote.status)
	const showExpiredBadge = quote.status === 'expired'
	const sentEmailHtml =
		typeof quote.rendered_html === 'string' && quote.rendered_html.trim() !== ''
			? quote.rendered_html
			: null

	return (
		<section
			id="ops-booking-quote"
			className="rounded-lg border border-ops-border bg-ops-surface/20 p-4"
			aria-labelledby="quote-heading"
		>
			<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 id="quote-heading" className="text-base font-semibold text-ops-foreground">
						Quote
					</h2>
					<p className="mt-1 text-sm text-ops-muted">
						Version <span className="font-mono text-ops-foreground">{quote.version}</span>
						{' · '}
						<span className="font-medium text-ops-foreground">
							Total {formatZar(quote.total_zar)}
						</span>
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{showExpiredBadge ? (
						<span className="rounded-full border border-amber-600/50 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
							Quote expired
						</span>
					) : null}
					<span className="rounded-full border border-ops-border bg-ops-canvas px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-ops-foreground">
						{quote.status}
					</span>
				</div>
			</div>

			<div className="mb-4 space-y-1 text-sm">
				<p>
					<span className="text-ops-muted">Sent</span>{' '}
					<span className="text-ops-foreground">{formatDateTime(quote.sent_at)}</span>
				</p>
				<p>
					<span className="text-ops-muted">To</span>{' '}
					<span className="font-mono text-ops-foreground">
						{quote.sent_to_email ?? '—'}
					</span>
				</p>
				<p>
					<span className="text-ops-muted">Expires</span>{' '}
					<span className="text-ops-foreground">{formatDateTime(quote.expires_at)}</span>
				</p>
			</div>

			{lineItems && lineItems.length > 0 ? (
				<OpsTableShell caption="Quote line items" className="mb-4">
					<thead>
						<tr className="border-b border-ops-border bg-ops-canvas/40 text-ops-table-head">
							<th scope="col" className="px-3 py-2 font-medium">
								Item
							</th>
							<th scope="col" className="px-3 py-2 font-medium">
								Qty
							</th>
							<th scope="col" className="px-3 py-2 text-right font-medium">
								Unit
							</th>
							<th scope="col" className="px-3 py-2 text-right font-medium">
								Line total
							</th>
						</tr>
					</thead>
					<tbody>
						{lineItems.map((row, idx) => (
							<tr key={`${row.label}-${idx}`} className="border-b border-ops-border/80">
								<td className="px-3 py-2">
									<div className="text-ops-foreground">{row.label}</div>
									{row.note ? (
										<div className="mt-0.5 text-xs text-ops-muted">{row.note}</div>
									) : null}
								</td>
								<td className="px-3 py-2 tabular-nums">{row.qty}</td>
								<td className="px-3 py-2 text-right tabular-nums">{formatZar(row.unit_zar)}</td>
								<td className="px-3 py-2 text-right tabular-nums font-medium">
									{formatZar(row.total_zar)}
								</td>
							</tr>
						))}
					</tbody>
				</OpsTableShell>
			) : (
				<p className="mb-4 text-sm text-ops-muted">Line items could not be parsed.</p>
			)}

			{sentEmailHtml ? (
				<details className="mb-4 rounded-md border border-ops-border bg-ops-canvas/30">
					<summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-ops-foreground">
						View sent email
					</summary>
					<div className="border-t border-ops-border p-3">
						<p className="mb-2 text-xs text-ops-muted">
							Stored HTML as sent — same artifact used for audits (not re-rendered).
						</p>
						<iframe
							title="Sent trip confirmation email"
							sandbox=""
							srcDoc={sentEmailHtml}
							className="h-[min(28rem,70vh)] w-full rounded border border-ops-border bg-white"
						/>
					</div>
				</details>
			) : null}

			{canResend ? <ResendBookingQuoteButton priorQuoteId={quote.id} /> : null}

			{walkInSend ? (
				<div className="mt-6 rounded-md border border-ops-border border-dashed bg-ops-canvas/20 p-4">
					<p className="text-sm font-medium text-ops-foreground">Send an updated quote</p>
					<p className="mt-1 text-xs text-ops-muted">
						Creates a new quote version and emails the customer (same flow as first send).
					</p>
					<WalkInQuoteSendForm
						bookingId={bookingId}
						defaultFirstLineLabel={defaultQuoteLineLabel}
					/>
				</div>
			) : null}
		</section>
	)
}
