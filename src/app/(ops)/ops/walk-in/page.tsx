import { redirect } from 'next/navigation'

import { parseOpsWalkInQueueFull, walkInQueueHref } from '@/lib/ops-walk-in-queue-query'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy URL — canonical queue is `/ops/bookings`. */
export default async function OpsWalkInLegacyRedirectPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const parsed = parseOpsWalkInQueueFull(raw)
	redirect(walkInQueueHref(parsed))
}
