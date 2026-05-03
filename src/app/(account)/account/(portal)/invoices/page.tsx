import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AccountInvoicesPageShell } from '@/features/account/components/AccountInvoicesPageShell'
import { accountInvoicesPageCopy } from '@/features/account/copy/account-invoices-copy'
import {
	computeAccountInvoiceKpis,
	loadAccountInvoiceRailDetail,
	loadAccountInvoicesArchiveRows,
} from '@/lib/account-invoices-archive-query'
import {
	parseAccountInvoicesListSearchParams,
	sliceAccountInvoiceRowsForPage,
} from '@/lib/account-invoices-list-query'
import { loadActiveCustomerAccountForPortal, requireAccountPortalRoles } from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const ADMIN_ONLY: ReadonlySet<CustomerAccountMemberRoleDb> = new Set(['admin'])

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountInvoicesPage({ searchParams }: PageProps) {
	const session = await requireAccountPortalRoles(ADMIN_ONLY)
	const supabase = await createUserServerClient()
	const { rows, error } = await loadAccountInvoicesArchiveRows(supabase, session.activeAccountId)

	const raw = await searchParams
	const parsed = parseAccountInvoicesListSearchParams(raw)

	const rowsFiltered = parsed.openOnly
		? rows.filter((r) => r.booking_status === 'ready_to_invoice' || r.booking_status === 'invoiced')
		: rows

	const { slice: pageRows, total } = sliceAccountInvoiceRowsForPage(
		rowsFiltered,
		parsed.page,
		parsed.perPage,
	)

	const accountRow = await loadActiveCustomerAccountForPortal(session.activeAccountId)
	const creditTermsDays = accountRow?.credit_terms_days ?? 0
	const accountRequiresPo = Boolean(accountRow?.default_po_required)

	const kpis = computeAccountInvoiceKpis(rows, creditTermsDays)

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

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-account-foreground">
						{accountInvoicesPageCopy.pageTitle}
					</h1>
					<p className="mt-1 text-sm text-account-muted">
						{accountInvoicesPageCopy.pageSubtitle(session.activeAccount.name)}
					</p>
					{session.email ? (
						<p className="mt-1 text-xs text-account-muted">
							{accountInvoicesPageCopy.signedInAs(session.email)}
						</p>
					) : null}
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{accountInvoicesPageCopy.backToAccount}
				</Link>
			</div>

			{error ? (
				<div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
					{accountInvoicesPageCopy.loadError(String(error))}
				</div>
			) : (
				<AccountInvoicesPageShell
					parsed={parsed}
					rows={pageRows}
					total={total}
					kpis={kpis}
					railDetail={railDetail}
					creditTermsDays={creditTermsDays}
				/>
			)}
		</div>
	)
}
