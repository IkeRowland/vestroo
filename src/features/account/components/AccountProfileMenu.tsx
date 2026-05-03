'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { switchActiveAccountAction } from '@/actions/accountPortal'
import { createClientClient } from '@/lib/supabase/client'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { accountTopBarCopy } from '@/features/account/copy/account-top-bar-copy'
import type { AccountSwitcherItem } from '@/features/account/components/AccountSwitcher'
import { cn } from '@/lib/utils'

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

function userInitials(email?: string, fallbackName?: string): string {
	const n = fallbackName?.trim() || email?.split('@')[0] || '?'
	const parts = n.split(/\s+/).filter(Boolean)
	if (parts.length >= 2) {
		return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
	}
	return n.slice(0, 2).toUpperCase()
}

function displayLine(email?: string): string {
	if (email?.trim()) return email.trim()
	return accountTopBarCopy.brandFallbackName
}

type AccountProfileMenuProps = {
	email?: string
	roleLabel: string
	memberships: AccountSwitcherItem[]
	activeAccountId: string
}

export function AccountProfileMenu({ email, roleLabel, memberships, activeAccountId }: AccountProfileMenuProps) {
	const router = useRouter()
	const [pendingAccountId, setPendingAccountId] = useState<string | null>(null)
	const multi = memberships.length > 1
	const initials = userInitials(email)
	const line = displayLine(email)

	async function onSelectAccount(accountId: string) {
		if (accountId === activeAccountId) return
		setPendingAccountId(accountId)
		try {
			const result = await switchActiveAccountAction(accountId)
			if (result.ok) {
				router.refresh()
			}
		} finally {
			setPendingAccountId(null)
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						'flex min-h-11 max-w-[min(100%,14rem)] min-w-0 items-center gap-2 rounded-md border border-account-border bg-account-topbar px-2 py-1.5 text-left hover:bg-account-surface-hover sm:px-2.5',
						focusRing,
					)}
					aria-label={accountTopBarCopy.profileMenuAria}
				>
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-account-accent-soft text-xs font-semibold text-account-accent">
						{initials}
					</span>
					<span className="hidden min-w-0 flex-1 flex-col sm:flex">
						<span className="truncate text-sm font-medium text-account-foreground">{line}</span>
						<span className="truncate text-xs text-account-muted">{roleLabel}</span>
					</span>
					<ChevronDown className="hidden h-4 w-4 shrink-0 text-account-muted sm:block" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem asChild>
					<Link href="/account/profile" className="cursor-pointer">
						{accountTopBarCopy.menuProfile}
					</Link>
				</DropdownMenuItem>
				{multi ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuLabel className="text-xs font-normal text-account-muted">
							{accountTopBarCopy.menuSwitchOrganisation}
						</DropdownMenuLabel>
						{memberships.map((m) => (
							<DropdownMenuItem
								key={m.accountId}
								disabled={pendingAccountId !== null}
								className={cn(m.accountId === activeAccountId && 'bg-account-surface-hover')}
								onSelect={(e) => {
									e.preventDefault()
									void onSelectAccount(m.accountId)
								}}
							>
								{m.accountName}
								{m.accountId === activeAccountId ? ' ✓' : ''}
							</DropdownMenuItem>
						))}
					</>
				) : null}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-account-danger focus:bg-account-danger/10 focus:text-account-danger"
					onSelect={(e) => {
						e.preventDefault()
						void (async () => {
							const supabase = createClientClient()
							await supabase.auth.signOut()
							router.push('/account/login')
							router.refresh()
						})()
					}}
				>
					{accountTopBarCopy.menuSignOut}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
