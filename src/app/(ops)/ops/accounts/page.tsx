import { redirect } from 'next/navigation'

import { accountsQueueHref, parseOpsAccountsQueueFull } from '@/lib/ops-accounts-queue-query'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy URL — canonical queue is `/ops/bookings`. */
export default async function OpsAccountsLegacyRedirectPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const parsed = parseOpsAccountsQueueFull(raw)
	redirect(accountsQueueHref(parsed))
}
