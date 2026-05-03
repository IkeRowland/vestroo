'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'

type OpsDataFreshnessBarProps = {
	/** ISO timestamp from server render */
	fetchedAtIso: string
	className?: string
	/** After this many minutes without navigation refresh, show stale hint */
	staleAfterMinutes?: number
}

function formatFetched(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) {
		return 'unknown time'
	}
	return d.toLocaleString()
}

/**
 * Non-realtime ops pages: visible last-fetch time + explicit refresh (AC6).
 */
export function OpsDataFreshnessBar({
	fetchedAtIso,
	className,
	staleAfterMinutes = 15,
}: OpsDataFreshnessBarProps) {
	const router = useRouter()
	const [nowTick, setNowTick] = useState(() => Date.now())

	useEffect(() => {
		const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
		return () => window.clearInterval(id)
	}, [])

	const stale = useMemo(() => {
		const t = Date.parse(fetchedAtIso)
		if (Number.isNaN(t)) return false
		return nowTick - t > staleAfterMinutes * 60_000
	}, [fetchedAtIso, nowTick, staleAfterMinutes])

	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-ops-border bg-muted/40 px-3 py-2 text-xs text-ops-muted ${className ?? ''}`}
			role="status"
		>
			<div>
				<span className="font-medium text-ops-foreground">Last updated:</span>{' '}
				<time dateTime={fetchedAtIso}>{formatFetched(fetchedAtIso)}</time>
				{stale ? (
					<span className="ml-2 text-amber-800 dark:text-amber-200">
						Data may be stale — refresh to reload.
					</span>
				) : null}
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-8 border-ops-border bg-transparent text-ops-foreground hover:bg-ops-surface-hover"
				onClick={() => router.refresh()}
			>
				Refresh
			</Button>
		</div>
	)
}
