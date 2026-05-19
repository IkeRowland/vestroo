'use client'

import { ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ANCHOR_ID = 'ops-advanced-booking-search'

type Props = {
	children: React.ReactNode
	/** When true, the bordered search panel starts open (e.g. active search in URL). */
	defaultOpen: boolean
	className?: string
}

export function OpsAdvancedBookingSearchFiltersCollapsible({
	children,
	defaultOpen,
	className,
}: Props) {
	const [open, setOpen] = useState(defaultOpen)

	useEffect(() => {
		setOpen(defaultOpen)
	}, [defaultOpen])

	useEffect(() => {
		const syncHash = () => {
			if (window.location.hash !== `#${ANCHOR_ID}`) {
				return
			}
			setOpen(true)
			requestAnimationFrame(() => {
				document.getElementById(ANCHOR_ID)?.scrollIntoView({
					behavior: 'smooth',
					block: 'start',
				})
			})
		}
		syncHash()
		window.addEventListener('hashchange', syncHash)
		return () => window.removeEventListener('hashchange', syncHash)
	}, [])

	return (
		<div className={cn('space-y-3', className)}>
			<div
				id={ANCHOR_ID}
				className="flex flex-wrap items-center gap-2 scroll-mt-20"
				tabIndex={-1}
			>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="h-9 border-ops-border bg-transparent text-ops-foreground hover:bg-ops-surface-hover"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					aria-controls="ops-advanced-booking-search-panel"
				>
					<SlidersHorizontal className="mr-2 h-4 w-4 shrink-0" aria-hidden />
					Advanced booking search
					{open ? (
						<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" aria-hidden />
					) : (
						<ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-70" aria-hidden />
					)}
				</Button>
			</div>
			{open ? (
				<div
					id="ops-advanced-booking-search-panel"
					className="space-y-6 rounded-lg border border-ops-border bg-ops-surface/40 p-4"
				>
					{children}
				</div>
			) : null}
		</div>
	)
}
