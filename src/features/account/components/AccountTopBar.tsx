'use client'

import { useRef } from 'react'
import { Menu, Search } from 'lucide-react'

import { AccountNotificationsBell } from '@/features/account/components/AccountNotificationsBell'
import { AccountProfileMenu } from '@/features/account/components/AccountProfileMenu'
import {
	AccountTopBarSearch,
	type AccountTopBarSearchHandle,
} from '@/features/account/components/AccountTopBarSearch'
import { accountTopBarCopy } from '@/features/account/copy/account-top-bar-copy'
import type { AccountPortalMemberSession } from '@/lib/account-portal-auth-shared'
import { cn } from '@/lib/utils'

type AccountTopBarProps = {
	session: AccountPortalMemberSession
	roleLabel: string
	notificationCount?: number
	onOpenMobileNav: () => void
}

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

export function AccountTopBar({
	session,
	roleLabel,
	notificationCount = 0,
	onOpenMobileNav,
}: AccountTopBarProps) {
	const searchRef = useRef<AccountTopBarSearchHandle>(null)

	const memberships = session.memberships.map((m) => ({
		accountId: m.accountId,
		accountName: m.account.name,
	}))

	return (
		<header
			role="banner"
			className="sticky top-0 z-30 flex h-14 w-full min-w-0 max-w-full shrink-0 items-center gap-2 border-b border-account-border bg-account-topbar/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-account-topbar/80 md:gap-3 md:px-4"
		>
			<button
				type="button"
				className={cn(
					'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-account-border text-account-foreground hover:bg-account-surface-hover md:hidden',
					focusRing,
				)}
				onClick={onOpenMobileNav}
				aria-label={accountTopBarCopy.openMobileNavAria}
			>
				<Menu className="h-5 w-5" aria-hidden />
			</button>

			<AccountTopBarSearch ref={searchRef} />

			<div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
				<button
					type="button"
					className={cn(
						'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-account-border text-account-muted hover:bg-account-surface-hover md:hidden',
						focusRing,
					)}
					aria-label={accountTopBarCopy.openSearchMobileAria}
					onClick={() => searchRef.current?.openMobile()}
				>
					<Search className="h-5 w-5" aria-hidden />
				</button>

				<AccountNotificationsBell count={notificationCount} />

				<div className="hidden h-8 w-px bg-account-border sm:block" aria-hidden />

				<AccountProfileMenu
					email={session.email}
					roleLabel={roleLabel}
					memberships={memberships}
					activeAccountId={session.activeAccountId}
				/>
			</div>
		</header>
	)
}
