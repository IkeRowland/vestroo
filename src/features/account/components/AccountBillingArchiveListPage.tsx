import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AccountInvoicesPageShell } from '@/features/account/components/AccountInvoicesPageShell'
import { accountInvoicesPageCopy, accountQuotesPageCopy } from '@/features/account/copy/account-invoices-copy'
import {
	accountInvoiceArchiveListRowKey,
	computeAccountInvoiceKpis,
	filterAccountArchiveRowsForBillingSection,
	loadAccountInvoiceRailDetail,
	loadAccountInvoicesArchiveRows,
} from '@/lib/account-invoices-archive-query'
import {
	ACCOUNT_BILLING_INVOICES_LIST_PATH,
	ACCOUNT_BILLING_QUOTES_LIST_PATH,
	parseAccountInvoicesListSearchParams,
	sliceAccountInvoiceRowsForPage,
} from '@/lib/account-invoices-list-query'
import { loadActiveCustomerAccountForPortal, requireAccountPortalRoles } from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const ADMIN_ONLY: ReadonlySet<CustomerAccountMemberRoleDb> = new Set(['admin'])

export type AccountBillingArchiveListPageProps = {
	section: 'invoices' | 'quotes'
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function AccountBillingArchiveListPage({ section, searchParams }: AccountBillingArchiveListPageProps) {
	const session = await requireAccountPortalRoles(ADMIN_ONLY)
	const supabase = await createUserServerClient()
	const { rows, error } = await loadAccountInvoicesArchiveRows(supabase, session.activeAccountId)

	const raw = await searchParams
	const parsedRaw = parseAccountInvoicesListSearchParams(raw)
	const parsed = section === 'quotes' ? { ...parsedRaw, openOnly: false } : parsedRaw

	const sectionRows = filterAccountArchiveRowsForBillingSection(rows, section)
	const rowsFiltered =
		section === 'invoices' && parsed.openOnly
			? sectionRows.filter(
					(r) => r.booking_status === 'ready_to_invoice' || r.booking_status === 'invoiced',
				)
			: sectionRows

	if (parsed.selectedInvoiceId) {
		const exists = rowsFiltered.some((r) => accountInvoiceArchiveListRowKey(r) === parsed.selectedInvoiceId)
		if (!exists) {
			notFound()
		}
	}

	const { slice: pageRows, total } = sliceAccountInvoiceRowsForPage(rowsFiltered, parsed.page, parsed.perPage)

	const accountRow = await loadActiveCustomerAccountForPortal(session.activeAccountId)
	const creditTermsDays = accountRow?.credit_terms_days ?? 0
	const accountRequiresPo = Boolean(accountRow?.default_po_required)

	const kpis =
		section === 'invoices'
			? computeAccountInvoiceKpis(rowsFiltered, creditTermsDays)
			: { paid90d: 0, awaitingPayment: 0, overdue: 0 }

	const railDetail =
		parsed.selectedInvoiceId != null
			? await loadAccountInvoiceRailDetail(
					supabase,
					parsed.selectedInvoiceId,
					session.activeAccountId,
					accountRequiresPo,
					creditTermsDays,
				)
			: null

	if (parsed.selectedInvoiceId && !railDetail) {
		notFound()
	}

	const listBasePath =
		section === 'invoices' ? ACCOUNT_BILLING_INVOICES_LIST_PATH : ACCOUNT_BILLING_QUOTES_LIST_PATH
	const pageCopy = section === 'invoices' ? accountInvoicesPageCopy : accountQuotesPageCopy

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-account-foreground">{pageCopy.pageTitle}</h1>
					<p className="mt-1 text-sm text-account-muted">{pageCopy.pageSubtitle(session.activeAccount.name)}</p>
					{session.email ? (
						<p className="mt-1 text-xs text-account-muted">{pageCopy.signedInAs(session.email)}</p>
					) : null}
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{pageCopy.backToAccount}
				</Link>
			</div>

			{error ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
					{pageCopy.loadError(String(error))}
				</div>
			) : (
				<AccountInvoicesPageShell
					parsed={parsed}
					rows={pageRows}
					total={total}
					kpis={kpis}
					railDetail={railDetail}
					creditTermsDays={creditTermsDays}
					listBasePath={listBasePath}
					variant={section}
				/>
			)}
		</div>
	)
}
