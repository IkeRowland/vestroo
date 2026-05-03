'use client'

import { Bell } from 'lucide-react'

import { accountNotificationsAria } from '@/features/account/copy/account-top-bar-copy'
import { cn } from '@/lib/utils'

type AccountNotificationsBellProps = {
	/** In-app / quote-ready count when wired; default 0. */
	count?: number
	className?: string
}

/**
 * Presentation-only until account notification feed ships; keeps aria contract for Epic 15+.
 */
export function AccountNotificationsBell({ count = 0, className }: AccountNotificationsBellProps) {
	return (
		<button
			type="button"
			className={cn(
				'relative inline-flex cursor-default rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-topbar',
				className,
			)}
			aria-label={accountNotificationsAria(count)}
			onClick={(e) => e.preventDefault()}
		>
			<span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-account-border text-account-muted">
				<Bell className="h-5 w-5" aria-hidden />
			</span>
			{count > 0 ? (
				<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-account-accent px-1 text-[10px] font-semibold leading-none text-account-accent-foreground">
					{count > 99 ? '99+' : count}
				</span>
			) : null}
		</button>
	)
}
