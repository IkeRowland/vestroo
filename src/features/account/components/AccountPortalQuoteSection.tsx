import { QuoteRenderedHTMLViewer } from '@/features/account/components/QuoteRenderedHTMLViewer'
import { formatQueueStatusLabel } from '@/lib/account-bookings-list-query'
import type { OpsBookingQuoteDetailRow } from '@/lib/booking-current-quote'
import { parseBookingQuoteLineItems } from '@/types/booking-quote'

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) return '—'
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function formatDateTime(iso: string | null): string {
	if (iso == null || iso === '') return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export function AccountPortalQuoteSection({ quote }: { quote: OpsBookingQuoteDetailRow | null }) {
	if (!quote) {
		return (
			<section className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-labelledby="quote-h">
				<h2 id="quote-h" className="text-lg font-semibold text-foreground">
					Current quote
				</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					No sent or accepted quote is available for this booking yet. When ops sends a quote, it will
					appear here (latest <strong className="text-foreground">sent</strong> or{' '}
					<strong className="text-foreground">accepted</strong> version, or the booking’s{' '}
					<code className="rounded bg-muted px-1 text-xs">current_quote_id</code> when set).
				</p>
			</section>
		)
	}

	const lineItems = parseBookingQuoteLineItems(quote.line_items)
	const html =
		typeof quote.rendered_html === 'string' && quote.rendered_html.trim() !== '' ? quote.rendered_html : null
	const hasPdfPath =
		typeof quote.pdf_storage_path === 'string' && quote.pdf_storage_path.trim() !== ''

	return (
		<section className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-labelledby="quote-h">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 id="quote-h" className="text-lg font-semibold text-foreground">
						Current quote
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Version <span className="font-mono text-foreground">{quote.version}</span>
						{' · '}
						<span className="font-medium text-foreground">Total {formatZar(quote.total_zar)}</span>
					</p>
					<p className="mt-2 text-xs text-muted-foreground">
						Resolution rule matches ops: prefer <code className="rounded bg-muted px-1">current_quote_id</code>{' '}
						when the row exists; otherwise latest <strong className="text-foreground">sent</strong> /{' '}
						<strong className="text-foreground">accepted</strong> from{' '}
						<code className="rounded bg-muted px-1">v_booking_current_quote</code>.
					</p>
				</div>
				<span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
					{formatQueueStatusLabel(quote.status)}
				</span>
			</div>

			<div className="mt-4 space-y-1 text-sm">
				<p>
					<span className="text-muted-foreground">Sent</span>{' '}
					<span className="text-foreground">{formatDateTime(quote.sent_at)}</span>
				</p>
				<p>
					<span className="text-muted-foreground">To</span>{' '}
					<span className="font-mono text-sm text-foreground">{quote.sent_to_email ?? '—'}</span>
				</p>
				<p>
					<span className="text-muted-foreground">Expires</span>{' '}
					<span className="text-foreground">{formatDateTime(quote.expires_at)}</span>
				</p>
			</div>

			{lineItems && lineItems.length > 0 ? (
				<div className="mt-6 overflow-x-auto rounded-lg border border-border">
					<table className="w-full min-w-[32rem] border-collapse text-sm">
						<caption className="border-b border-border bg-muted/30 px-4 py-2 text-left text-xs font-medium text-muted-foreground">
							Line items
						</caption>
						<thead>
							<tr className="border-b border-border bg-muted/20 text-xs font-medium uppercase tracking-wide text-muted-foreground">
								<th scope="col" className="px-4 py-2 text-left">
									Item
								</th>
								<th scope="col" className="px-4 py-2 text-left">
									Qty
								</th>
								<th scope="col" className="px-4 py-2 text-right">
									Unit
								</th>
								<th scope="col" className="px-4 py-2 text-right">
									Line total
								</th>
							</tr>
						</thead>
						<tbody>
							{lineItems.map((row, idx) => (
								<tr key={`${row.label}-${idx}`} className="border-b border-border last:border-0">
									<td className="px-4 py-3">
										<div className="text-foreground">{row.label}</div>
										{row.note ? <div className="mt-0.5 text-xs text-muted-foreground">{row.note}</div> : null}
									</td>
									<td className="px-4 py-3 tabular-nums text-muted-foreground">{row.qty}</td>
									<td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
										{formatZar(row.unit_zar)}
									</td>
									<td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
										{formatZar(row.total_zar)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="mt-4 text-sm text-muted-foreground">Line items could not be parsed from stored JSON.</p>
			)}

			{html ? (
				<div className="mt-6">
					<QuoteRenderedHTMLViewer
						html={html}
						title="Rendered quote email"
						caption="Rendered HTML from the quote row (`rendered_html`)."
					/>
				</div>
			) : null}

			<div className="mt-6 rounded-lg border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
				<p className="font-medium text-foreground">Downloadable artefacts</p>
				{hasPdfPath ? (
					<p className="mt-2">
						A <strong className="text-foreground">PDF storage path</strong> exists on this quote. Signed
						customer downloads from the portal are planned with{' '}
						<strong className="text-foreground">Story 15A.7</strong> (invoice / quote archive); until then,
						contact ops if you need the file.
					</p>
				) : (
					<p className="mt-2">
						No separate attachment URLs are stored for this quote in the current schema — only{' '}
						<code className="rounded bg-muted px-1 text-xs">rendered_html</code> (above) and optional PDF
						paths when present.
					</p>
				)}
			</div>
		</section>
	)
}
