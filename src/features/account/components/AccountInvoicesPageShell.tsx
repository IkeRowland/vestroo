'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Banknote, Clock } from 'lucide-react'

import { accountPortalInvoicePdfSignedUrl } from '@/actions/accountPortalInvoicePdfSignedUrl'
import { AccountResponsiveTableShell } from '@/features/account/components/account-responsive-table-shell'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DetailRail, KpiCard, Pagination, SplitView, StatusPill } from '@/components/saas'
import { accountInvoicesCopy, accountQuotesShellCopy } from '@/features/account/copy/account-invoices-copy'
import { formatQueueStatusLabel } from '@/lib/account-bookings-list-query'
import {
	formatInvoiceArchiveQuoteStatus,
	accountInvoiceArchiveListRowKey,
	type AccountInvoiceArchiveRow,
	type AccountInvoiceRailDetail,
} from '@/lib/account-invoices-archive-query'
import {
	ACCOUNT_INVOICES_LIST_PAGE_SIZE,
	ACCT_INV_PARAM,
	type AccountBillingArchiveListPath,
	accountInvoicesListHref,
	accountInvoicesListPathWithQuery,
	accountInvoicesListSearchExcludingPage,
	type AccountInvoicesListParsed,
} from '@/lib/account-invoices-list-query'
import type { OpsPaginationPerPage } from '@/features/ops/lib/ops-pagination-url'

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) return '—'
	return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
}

function formatMedium(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(d)
}

function dueDateForRow(row: AccountInvoiceArchiveRow, creditTermsDays: number): string {
	const base = row.sent_at ?? row.accepted_at ?? row.quote_created_at
	if (!base) return '—'
	const d = new Date(base)
	if (Number.isNaN(d.getTime())) return '—'
	d.setUTCDate(d.getUTCDate() + Math.max(0, creditTermsDays))
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(d)
}

function InvoiceArchiveStatusPill({ row }: { row: AccountInvoiceArchiveRow }) {
	const booking = row.booking_status
	const quote = row.quote_status
	const label =
		booking === 'ready_to_invoice' || booking === 'invoiced'
			? booking === 'invoiced' && row.booking_payment_status !== 'paid'
				? accountInvoicesCopy.statusAwaitingPayment
				: formatQueueStatusLabel(booking)
			: quote
				? formatInvoiceArchiveQuoteStatus(quote)
				: booking
					? formatQueueStatusLabel(booking)
					: '—'
	const tone =
		booking === 'paid_invoice'
			? ('success' as const)
			: booking === 'cancelled' || booking === 'expired'
				? ('danger' as const)
				: ('neutral' as const)
	return (
		<StatusPill theme="account" tone={tone} dot={false}>
			{label}
		</StatusPill>
	)
}

type Props = {
	parsed: AccountInvoicesListParsed
	rows: AccountInvoiceArchiveRow[]
	total: number
	kpis: { paid90d: number; awaitingPayment: number; overdue: number }
	railDetail: AccountInvoiceRailDetail | null
	creditTermsDays: number
	listBasePath: AccountBillingArchiveListPath
	variant: 'invoices' | 'quotes'
}

export function AccountInvoicesPageShell({
	parsed,
	rows,
	total,
	kpis,
	railDetail,
	creditTermsDays,
	listBasePath,
	variant,
}: Props) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLDivElement>(null)
	const showRail = Boolean(parsed.selectedInvoiceId && railDetail)
	const d = railDetail
	const [pdfPending, startPdf] = React.useTransition()
	const [pdfError, setPdfError] = React.useState<string | null>(null)

	const tableCaption =
		variant === 'quotes' ? accountQuotesShellCopy.tableCaption : accountInvoicesCopy.tableCaption
	const detailSheetTitle =
		variant === 'quotes' ? accountQuotesShellCopy.detailSheetTitle : accountInvoicesCopy.detailSheetTitle

	const totalPages = Math.max(1, Math.ceil(total / parsed.perPage))

	const onCloseRail = () => {
		router.push(accountInvoicesListPathWithQuery({ ...parsed, selectedInvoiceId: null }, listBasePath))
	}

	const onDownloadPdf = (quoteId: string) => {
		setPdfError(null)
		startPdf(async () => {
			const r = await accountPortalInvoicePdfSignedUrl({ quoteId })
			if (r.ok) {
				window.location.assign(r.url)
			} else {
				setPdfError(r.error)
			}
		})
	}

	const issueDateForRow = (row: AccountInvoiceArchiveRow) => formatMedium(row.sent_at ?? row.quote_created_at)

	return (
		<>
			<SplitView
				theme="account"
				listFocusReturnRef={listFocusReturnRef}
				detailVisible={showRail}
				detailSheetDialogTitle={detailSheetTitle}
				onCloseDetail={onCloseRail}
				list={
					<div ref={listFocusReturnRef} className="min-w-0 space-y-6" tabIndex={-1}>
						{variant === 'invoices' ? (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							<KpiCard
								theme="account"
								scorecardOnly
								label={accountInvoicesCopy.kpiPaid90d}
								icon={Banknote}
								value={kpis.paid90d}
								deltaPercent={null}
								deltaPolarity="neutral"
								shortDefinition="Settled trips in the last 90 days (by payment received timestamp)."
							/>
							<KpiCard
								theme="account"
								scorecardOnly
								label={accountInvoicesCopy.kpiAwaiting}
								icon={Clock}
								value={kpis.awaitingPayment}
								deltaPercent={null}
								deltaPolarity="neutral"
								shortDefinition="Ready to invoice or invoiced and not yet marked paid."
							/>
							<KpiCard
								theme="account"
								scorecardOnly
								label={accountInvoicesCopy.kpiOverdue}
								icon={AlertCircle}
								value={kpis.overdue}
								deltaPercent={null}
								deltaPolarity="neutral"
								shortDefinition={`Invoiced and past due (issue date + ${creditTermsDays} day credit terms).`}
							/>
						</div>
						) : null}

						<div>
							<div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm text-account-muted" role="status">
									{total === 0
										? parsed.openOnly && variant === 'invoices'
											? accountInvoicesCopy.tableEmptyOpen
											: variant === 'quotes'
												? accountQuotesShellCopy.tableEmpty
												: accountInvoicesCopy.tableEmpty
										: (() => {
												const fromIdx = (parsed.page - 1) * parsed.perPage + 1
												const toIdx = Math.min(total, parsed.page * parsed.perPage)
												return accountInvoicesCopy.showingRange(fromIdx, toIdx, total)
											})()}
								</p>
								{variant === 'invoices' ? (
								<div className="flex flex-wrap gap-2">
									{parsed.openOnly ? (
										<Button variant="outline" size="sm" asChild>
											<Link href={accountInvoicesListHref(parsed, { openOnly: false, page: 1 }, listBasePath)}>
												Show all
											</Link>
										</Button>
									) : (
										<Button variant="outline" size="sm" asChild>
											<Link href={accountInvoicesListHref(parsed, { openOnly: true, page: 1 }, listBasePath)}>
												Open items only
											</Link>
										</Button>
									)}
								</div>
								) : null}
							</div>

							<div className="max-h-[min(70vh,800px)] overflow-y-auto rounded-account-card border border-account-border bg-account-surface shadow-account-1 md:overflow-x-auto">
								<AccountResponsiveTableShell
									stackAriaLabel={tableCaption}
									desktop={
										<Table
											className="min-w-[880px] border-collapse text-left"
											aria-label={tableCaption}
										>
									<TableHeader>
										<TableRow className="border-b border-account-border bg-account-surface-hover/80 text-xs font-medium uppercase tracking-wide text-account-muted hover:bg-account-surface-hover/80">
											<TableHead className="px-3 py-2.5 text-left text-account-muted">
												{accountInvoicesCopy.colReference}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-left text-account-muted">
												{accountInvoicesCopy.colIssueDate}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-left text-account-muted">
												{accountInvoicesCopy.colDueDate}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-right tabular-nums text-account-muted">
												{accountInvoicesCopy.colAmount}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-left text-account-muted">
												{accountInvoicesCopy.colStatus}
											</TableHead>
											<TableHead className="px-3 py-2.5 text-right text-account-muted">
												{accountInvoicesCopy.colActions}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.map((row) => {
											const key = accountInvoiceArchiveListRowKey(row)
											const canPay =
												row.booking_status === 'ready_to_invoice' || row.booking_status === 'invoiced'
											const hasPdf =
												Boolean(row.quote_id) &&
												typeof row.pdf_storage_path === 'string' &&
												row.pdf_storage_path.trim() !== ''
											return (
												<TableRow
													key={key}
													className="cursor-pointer border-b border-account-border last:border-0 hover:bg-account-surface-active/30"
													onClick={() =>
														router.push(
															accountInvoicesListHref(
																parsed,
																{
																	selectedInvoiceId: key,
																	page: parsed.page,
																},
																listBasePath,
															),
														)
													}
												>
													<TableCell className="px-3 py-2.5 font-mono text-xs text-account-foreground">
														{row.booking_reference}
														{row.quote_version != null ? (
															<span className="ml-1 text-account-muted">· v{row.quote_version}</span>
														) : null}
													</TableCell>
													<TableCell className="whitespace-nowrap px-3 py-2.5 text-account-muted">
														{issueDateForRow(row)}
													</TableCell>
													<TableCell className="whitespace-nowrap px-3 py-2.5 text-account-muted">
														{dueDateForRow(row, creditTermsDays)}
													</TableCell>
													<TableCell className="px-3 py-2.5 text-right tabular-nums text-account-foreground">
														{formatZar(row.total_zar)}
													</TableCell>
													<TableCell className="px-3 py-2.5">
														<InvoiceArchiveStatusPill row={row} />
													</TableCell>
													<TableCell
														className="px-3 py-2.5 text-right"
														onClick={(e) => e.stopPropagation()}
													>
														<div className="flex flex-wrap justify-end gap-2">
															{canPay ? (
																<Button variant="secondary" size="sm" asChild>
																	<Link
																		href={`/account/bookings?id=${encodeURIComponent(row.booking_id)}`}
																	>
																		{accountInvoicesCopy.actionPay}
																	</Link>
																</Button>
															) : null}
															{hasPdf && row.quote_id ? (
																<Button
																	type="button"
																	variant="outline"
																	size="sm"
																	onClick={() => onDownloadPdf(row.quote_id!)}
																	disabled={pdfPending}
																>
																	{accountInvoicesCopy.actionDownloadPdf}
																</Button>
															) : (
																<span className="text-xs text-account-muted">
																	{accountInvoicesCopy.actionUnavailable}
																</span>
															)}
														</div>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
									}
									mobileStack={
										<ul className="divide-y divide-account-border p-3">
											{rows.map((row) => {
												const key = accountInvoiceArchiveListRowKey(row)
												const canPay =
													row.booking_status === 'ready_to_invoice' || row.booking_status === 'invoiced'
												const hasPdf =
													Boolean(row.quote_id) &&
													typeof row.pdf_storage_path === 'string' &&
													row.pdf_storage_path.trim() !== ''
												const open = () =>
													router.push(
														accountInvoicesListHref(
															parsed,
															{
																selectedInvoiceId: key,
																page: parsed.page,
															},
															listBasePath,
														),
													)
												return (
													<li key={key}>
														<article
															className="cursor-pointer rounded-lg py-3 outline-none transition hover:bg-account-surface-active/30 focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-surface"
															role="button"
															tabIndex={0}
															aria-label={`${accountInvoicesCopy.colReference} ${row.booking_reference}`}
															onClick={open}
															onKeyDown={(e) => {
																if (e.key === 'Enter' || e.key === ' ') {
																	e.preventDefault()
																	open()
																}
															}}
														>
															<div className="space-y-2">
																<div className="flex flex-wrap items-start justify-between gap-2">
																	<div className="min-w-0">
																		<p className="font-mono text-xs text-account-foreground">
																			{row.booking_reference}
																			{row.quote_version != null ? (
																				<span className="ml-1 text-account-muted">· v{row.quote_version}</span>
																			) : null}
																		</p>
																		<div className="mt-1">
																			<InvoiceArchiveStatusPill row={row} />
																		</div>
																	</div>
																	<p className="shrink-0 text-right text-sm font-semibold tabular-nums text-account-foreground">
																		{formatZar(row.total_zar)}
																	</p>
																</div>
																<dl className="grid grid-cols-2 gap-2 text-xs">
																	<div>
																		<dt className="text-account-muted">{accountInvoicesCopy.colIssueDate}</dt>
																		<dd className="text-account-foreground">{issueDateForRow(row)}</dd>
																	</div>
																	<div>
																		<dt className="text-account-muted">{accountInvoicesCopy.colDueDate}</dt>
																		<dd className="text-account-foreground">
																			{dueDateForRow(row, creditTermsDays)}
																		</dd>
																	</div>
																</dl>
																<div
																	className="flex flex-wrap gap-2 pt-1"
																	onClick={(e) => e.stopPropagation()}
																>
																	{canPay ? (
																		<Button variant="secondary" size="sm" className="min-h-11" asChild>
																			<Link
																				href={`/account/bookings?id=${encodeURIComponent(row.booking_id)}`}
																			>
																				{accountInvoicesCopy.actionPay}
																			</Link>
																		</Button>
																	) : null}
																	{hasPdf && row.quote_id ? (
																		<Button
																			type="button"
																			variant="outline"
																			size="sm"
																			className="min-h-11"
																			onClick={() => onDownloadPdf(row.quote_id!)}
																			disabled={pdfPending}
																		>
																			{accountInvoicesCopy.actionDownloadPdf}
																		</Button>
																	) : (
																		<span className="self-center text-xs text-account-muted">
																			{accountInvoicesCopy.actionUnavailable}
																		</span>
																	)}
																</div>
															</div>
														</article>
													</li>
												)
											})}
										</ul>
									}
								/>
							</div>

							{total > 0 ? (
								<div className="pt-2">
									<Pagination
										theme="account"
										pathname={listBasePath}
										query={accountInvoicesListSearchExcludingPage(parsed)}
										currentPage={parsed.page}
										totalPages={totalPages}
										totalCount={total}
										perPage={parsed.perPage as OpsPaginationPerPage}
										perOmitDefault={ACCOUNT_INVOICES_LIST_PAGE_SIZE}
										hidePerPageSelect
										pageParam={ACCT_INV_PARAM.page}
										perParam={ACCT_INV_PARAM.per}
									/>
								</div>
							) : null}
						</div>
					</div>
				}
				detail={
					d ? (
						<DetailRail
							theme="account"
							className="h-full min-h-0 min-w-0 flex-1"
							title={d.booking_reference}
							showHeaderClose
							onClose={onCloseRail}
							closeAriaLabel={accountInvoicesCopy.detailClose}
							footer={
								<div className="flex flex-col gap-2">
									{d.canPay ? (
										<Button asChild>
											<Link href={d.payHref}>{accountInvoicesCopy.footerPayNow}</Link>
										</Button>
									) : null}
									{d.quote_id && d.pdf_storage_path?.trim() ? (
										<Button
											type="button"
											variant="secondary"
											disabled={pdfPending}
											onClick={() => d.quote_id && onDownloadPdf(d.quote_id)}
										>
											{accountInvoicesCopy.footerDownload}
										</Button>
									) : (
										<p className="text-xs text-account-muted">{accountInvoicesCopy.footerDownloadUnavailable}</p>
									)}
									{pdfError ? <p className="text-xs text-destructive">{pdfError}</p> : null}
								</div>
							}
						>
							<AccountInvoiceRailBody d={d} />
						</DetailRail>
					) : null
				}
			/>
		</>
	)
}

function AccountInvoiceRailBody({ d }: { d: AccountInvoiceRailDetail }) {
	return (
		<div className="space-y-6 text-account-foreground">
			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">Summary</h3>
				<dl className="mt-2 space-y-1 text-sm">
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountInvoicesCopy.detailHeaderRef}</dt>
						<dd className="text-right font-mono text-xs">{d.booking_reference}</dd>
					</div>
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountInvoicesCopy.detailHeaderIssue}</dt>
						<dd className="text-right">{d.issueDateLabel}</dd>
					</div>
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountInvoicesCopy.detailHeaderDue}</dt>
						<dd className={d.isOverdue ? 'text-right font-medium text-destructive' : 'text-right'}>
							{d.dueDateLabel ?? '—'}
						</dd>
					</div>
					<div className="flex justify-between gap-2">
						<dt className="text-account-muted">{accountInvoicesCopy.detailHeaderAmount}</dt>
						<dd className="text-right tabular-nums">{formatZar(d.total_zar)}</dd>
					</div>
				</dl>
				<p className="mt-2 text-xs text-account-muted">
					{accountInvoicesCopy.detailCreditTermsNote(d.credit_terms_days)}
				</p>
			</section>

			{d.account_requires_po ? (
				<section>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
						{accountInvoicesCopy.detailPo}
					</h3>
					<p className="mt-1 text-sm text-account-foreground">
						{d.purchase_order_ref?.trim() || accountInvoicesCopy.detailPoMissing}
					</p>
				</section>
			) : (
				<section>
					<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
						{accountInvoicesCopy.detailPo}
					</h3>
					<p className="mt-1 text-sm text-account-muted">{accountInvoicesCopy.detailPoNotRequired}</p>
				</section>
			)}

			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountInvoicesCopy.detailLineItems}
				</h3>
				{d.line_items && d.line_items.length > 0 ? (
					<div className="mt-2 overflow-x-auto rounded-md border border-account-border">
						<table className="w-full min-w-[20rem] border-collapse text-sm">
							<thead>
								<tr className="border-b border-account-border bg-account-surface-hover/80 text-xs text-account-muted">
									<th className="px-3 py-2 text-left">{accountInvoicesCopy.detailLineItemDescription}</th>
									<th className="px-3 py-2 text-left">{accountInvoicesCopy.detailLineQty}</th>
									<th className="px-3 py-2 text-right">{accountInvoicesCopy.detailLineUnit}</th>
									<th className="px-3 py-2 text-right">{accountInvoicesCopy.detailLineTotal}</th>
								</tr>
							</thead>
							<tbody>
								{d.line_items.map((li, idx) => (
									<tr key={`${li.label}-${idx}`} className="border-b border-account-border last:border-0">
										<td className="px-3 py-2">
											<div>{li.label}</div>
											{li.note ? <div className="text-xs text-account-muted">{li.note}</div> : null}
										</td>
										<td className="px-3 py-2 tabular-nums text-account-muted">{li.qty}</td>
										<td className="px-3 py-2 text-right tabular-nums text-account-muted">
											{formatZar(li.unit_zar)}
										</td>
										<td className="px-3 py-2 text-right tabular-nums font-medium">
											{formatZar(li.total_zar)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="mt-1 text-sm text-account-muted">{accountInvoicesCopy.detailLineItemsEmpty}</p>
				)}
			</section>

			<section>
				<h3 className="text-xs font-semibold uppercase tracking-wide text-account-muted">
					{accountInvoicesCopy.detailTimeline}
				</h3>
				{d.timeline.length === 0 ? (
					<p className="mt-1 text-sm text-account-muted">{accountInvoicesCopy.detailTimelineEmpty}</p>
				) : (
					<ol className="relative mt-3 space-y-3 border-l border-account-border pl-4 text-sm">
						{d.timeline.map((ev, i) => (
							<li key={`${ev.label}-${i}-${ev.at}`} className="relative">
								<div
									aria-hidden
									className="absolute -left-[0.5rem] top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border border-account-border bg-primary"
								/>
								<p className="font-medium text-account-foreground">{ev.label}</p>
								<p className="text-xs text-account-muted">
									{new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(
										new Date(ev.at),
									)}
								</p>
							</li>
						))}
					</ol>
				)}
			</section>

			{d.fullQuoteHref ? (
				<p>
					<Link href={d.fullQuoteHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
						{accountInvoicesCopy.detailViewFullQuote}
					</Link>
				</p>
			) : null}
		</div>
	)
}
