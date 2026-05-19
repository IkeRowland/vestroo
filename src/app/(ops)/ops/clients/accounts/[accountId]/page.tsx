import { notFound } from 'next/navigation'

import { OpsAccountClientDetailShell } from '@/features/ops/components/OpsAccountClientDetailShell'
import { OpsPagination } from '@/features/ops/components/OpsPagination'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'
import { fetchAccountClientBookings } from '@/lib/ops-account-client-bookings-fetch'
import { opsAccountClientDetailPath } from '@/lib/ops-clients-account-url'
import {
	parseOpsBookingsQueueSearchParams,
	serializeOpsBookingsQueueSearchParams,
} from '@/lib/ops-bookings-queue-query'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ accountId: string }>
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

const ACCOUNT_SELECT =
	'id, name, slug, status, credit_terms_days, credit_limit_zar, authorized_email_domains, created_at, contract_starts_on, contract_ends_on'

export default async function OpsAccountClientDetailPage({ params, searchParams }: PageProps) {
	const { accountId } = await params
	const raw = await searchParams

	const supabase = await createUserServerClient()
	const { data: accountRaw, error: accountErr } = await supabase
		.from('customer_accounts')
		.select(ACCOUNT_SELECT)
		.eq('id', accountId)
		.maybeSingle()

	if (accountErr) {
		return (
			<OpsFetchErrorIsland title="Account client could not be loaded" message={accountErr.message} />
		)
	}

	if (!accountRaw?.id) {
		notFound()
	}

	const account = accountRaw as OpsAccountClientRow
	const queueParsed = parseOpsBookingsQueueSearchParams(raw)
	const detailPath = opsAccountClientDetailPath(accountId)

	const { rows, totalCount, errorMessage } = await fetchAccountClientBookings(
		supabase,
		accountId,
		queueParsed,
	)

	const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / queueParsed.perPage)
	const safePage = Math.min(Math.max(1, queueParsed.page), Math.max(totalPages, 1))
	const paginationQuery = serializeOpsBookingsQueueSearchParams(queueParsed)

	return (
		<div className="min-w-0 max-w-full">
			{errorMessage ? (
				<OpsFetchErrorIsland title="Bookings could not be loaded" message={errorMessage} />
			) : null}

			<OpsAccountClientDetailShell
				account={account}
				bookings={rows}
				queueParsed={queueParsed}
				detailPath={detailPath}
			/>

			{!errorMessage && totalCount > 0 ? (
				<div className="mt-4">
					<OpsPagination
						pathname={detailPath}
						query={paginationQuery}
						currentPage={safePage}
						totalPages={totalPages}
						totalCount={totalCount}
						perPage={queueParsed.perPage}
					/>
				</div>
			) : null}
		</div>
	)
}
