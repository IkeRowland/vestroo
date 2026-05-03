import Link from 'next/link'

import { AccountMembersManage } from '@/features/account/components/AccountMembersManage'
import { accountMembersCopy } from '@/features/account/copy/account-members-copy'
import { loadAccountMemberRows } from '@/lib/account-members-admin'
import { parseAccountMembersListSearchParams } from '@/lib/account-members-list-query'
import { requireAccountPortalRoles } from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const ADMIN_ONLY: ReadonlySet<CustomerAccountMemberRoleDb> = new Set(['admin'])

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountMembersPage({ searchParams }: PageProps) {
	const session = await requireAccountPortalRoles(ADMIN_ONLY)
	const supabase = await createUserServerClient()
	const raw = await searchParams
	const parsed = parseAccountMembersListSearchParams(raw)
	const { rows, error, total, currentPage } = await loadAccountMemberRows(supabase, session.activeAccountId, {
		search: parsed.search,
		page: parsed.page,
		perPage: parsed.perPage,
	})

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{accountMembersCopy.pageTitle}</h1>
					<p className="mt-1 text-sm text-account-muted">
						{accountMembersCopy.pageDescription(session.activeAccount.name)}
					</p>
					{session.email ? (
						<p className="mt-1 text-xs text-account-muted">
							{accountMembersCopy.signedInAs(session.email)}
						</p>
					) : null}
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{accountMembersCopy.backToAccount}
				</Link>
			</div>

			{error ? (
				<Alert
					variant="destructive"
					role="alert"
					className="border-destructive/50 bg-destructive/5 text-destructive"
				>
					<AlertDescription>
						<span className="block font-medium">{accountMembersCopy.loadErrorTitle}</span>
						<span className="mt-1 block text-foreground/90">{accountMembersCopy.loadErrorBody}</span>
					</AlertDescription>
				</Alert>
			) : (
				<AccountMembersManage rows={rows} total={total} currentPage={currentPage} parsed={parsed} />
			)}
		</div>
	)
}
