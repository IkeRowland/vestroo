'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

type OpsDataFreshnessBarProps = {
	/** ISO timestamp from server render */
	fetchedAtIso: string
	className?: string
	/** After this many minutes without navigation refresh, show stale hint */
	staleAfterMinutes?: number
}

const VISIBILITY_FOCUS_DEBOUNCE_MS = 2_000

function formatFetched(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) {
		return 'unknown time'
	}
	return d.toLocaleString()
}

function parseMs(iso: string): number {
	const t = Date.parse(iso)
	return Number.isNaN(t) ? 0 : t
}

/**
 * Non-realtime ops pages: last-fetch time + soft refresh when the tab regains focus (no manual refresh control).
 */
export function OpsDataFreshnessBar({
	fetchedAtIso,
	className,
	staleAfterMinutes = 15,
}: OpsDataFreshnessBarProps) {
	const router = useRouter()
	const [nowTick, setNowTick] = useState(() => Date.now())
	const [softCheckIso, setSoftCheckIso] = useState<string | null>(null)

	const displayIso = useMemo(() => {
		if (!softCheckIso) {
			return fetchedAtIso
		}
		return parseMs(softCheckIso) >= parseMs(fetchedAtIso) ? softCheckIso : fetchedAtIso
	}, [fetchedAtIso, softCheckIso])

	useEffect(() => {
		const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
		return () => window.clearInterval(id)
	}, [])

	const bumpAndRefresh = useCallback(() => {
		setSoftCheckIso(new Date().toISOString())
		router.refresh()
	}, [router])

	useEffect(() => {
		let focusTimer: ReturnType<typeof setTimeout> | null = null
		let lastRun = 0

		const run = () => {
			const now = Date.now()
			if (now - lastRun < VISIBILITY_FOCUS_DEBOUNCE_MS) {
				return
			}
			lastRun = now
			bumpAndRefresh()
		}

		const onVisibility = () => {
			if (document.visibilityState === 'visible') {
				run()
			}
		}

		const onFocus = () => {
			if (focusTimer != null) {
				window.clearTimeout(focusTimer)
			}
			focusTimer = window.setTimeout(() => {
				focusTimer = null
				run()
			}, 800)
		}

		document.addEventListener('visibilitychange', onVisibility)
		window.addEventListener('focus', onFocus)
		return () => {
			document.removeEventListener('visibilitychange', onVisibility)
			window.removeEventListener('focus', onFocus)
			if (focusTimer != null) {
				window.clearTimeout(focusTimer)
			}
		}
	}, [bumpAndRefresh])

	const stale = useMemo(() => {
		const t = Date.parse(displayIso)
		if (Number.isNaN(t)) return false
		return nowTick - t > staleAfterMinutes * 60_000
	}, [displayIso, nowTick, staleAfterMinutes])

	return (
		<div
			className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-ops-border bg-muted/40 px-3 py-2 text-xs text-ops-muted ${className ?? ''}`}
			role="status"
		>
			<div>
				<span className="font-medium text-ops-foreground">Last updated:</span>{' '}
				<time dateTime={displayIso}>{formatFetched(displayIso)}</time>
				{stale ? (
					<span className="ml-2 text-amber-800 dark:text-amber-200">
						Data may be stale — returning to this tab reloads the latest view.
					</span>
				) : null}
			</div>
		</div>
	)
}
