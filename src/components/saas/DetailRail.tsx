'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { cn } from '@/lib/utils'

export type DetailRailProps = {
	theme?: SaasTheme
	title: React.ReactNode
	children: React.ReactNode
	footer?: React.ReactNode
	onClose?: () => void
	showHeaderClose?: boolean
	/** Defaults differ per wrapper (`OpsDetailRail` passes ops copy). */
	panelAriaLabel?: string
	closeAriaLabel?: string
	className?: string
}

export function DetailRail({
	theme = 'ops',
	title,
	children,
	footer,
	onClose,
	showHeaderClose,
	panelAriaLabel = 'Detail panel',
	closeAriaLabel = 'Close detail',
	className,
}: DetailRailProps) {
	const shell = saasCls(
		theme,
		'flex h-full min-h-0 flex-col overflow-hidden rounded-ops-card border border-ops-border bg-ops-surface shadow-ops-1',
		'flex h-full min-h-0 flex-col overflow-hidden rounded-account-card border border-account-border bg-account-surface shadow-account-1',
	)
	const headerBorder = saasCls(theme, 'border-ops-border', 'border-account-border')
	const titleFg = saasCls(theme, 'text-ops-foreground', 'text-account-foreground')
	const closeBtn = saasCls(
		theme,
		'inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-ops-muted transition hover:bg-ops-surface-hover hover:text-ops-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
		'inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-account-muted transition hover:bg-account-surface-hover hover:text-account-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas',
	)
	const bodyCls = saasCls(
		theme,
		'min-h-0 flex-1 overflow-y-auto px-4 py-3 text-ops-table-body text-ops-foreground',
		'min-h-0 flex-1 overflow-y-auto px-4 py-3 text-account-table-body text-account-foreground',
	)
	const footerBorder = saasCls(theme, 'border-ops-border', 'border-account-border')
	const footerStickyAccount =
		theme === 'account'
			? 'max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:bg-account-surface max-lg:shadow-[0_-6px_16px_-6px_rgba(0,0,0,0.08)] max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]'
			: ''

	return (
		<section className={cn(shell, className)} aria-label={panelAriaLabel}>
			<header className={cn('flex shrink-0 items-start gap-2 border-b px-4 py-3', headerBorder)}>
				<div className={cn('min-w-0 flex-1 text-base font-semibold leading-snug', titleFg)}>{title}</div>
				{onClose ? (
					<button
						type="button"
						className={cn(
							closeBtn,
							showHeaderClose === true ? '' : showHeaderClose === false ? 'hidden' : 'lg:hidden',
						)}
						aria-label={closeAriaLabel}
						onClick={onClose}
					>
						<X className="h-5 w-5" aria-hidden />
					</button>
				) : null}
			</header>
			<div className={bodyCls}>{children}</div>
			{footer ? (
				<footer className={cn('shrink-0 border-t px-4 py-3', footerBorder, footerStickyAccount)}>{footer}</footer>
			) : null}
		</section>
	)
}
