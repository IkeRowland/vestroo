'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import {
	ACCOUNT_BOOKINGS_TRIPS_HREF,
	filterAccountNavGroups,
	type AccountNavGroup,
	type AccountNavItem,
} from '@/features/account/account-nav-config'
import { accountSidebarCopy } from '@/features/account/copy/account-sidebar-copy'
import { cn } from '@/lib/utils'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const groupHeadingClass =
	'mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-account-muted'

type AccountSidebarProps = {
	role: CustomerAccountMemberRoleDb
	collapsed: boolean
	onToggleCollapsed: () => void
	mobileOpen: boolean
	onCloseMobile: () => void
}

export function AccountSidebar({
	role,
	collapsed,
	onToggleCollapsed,
	mobileOpen,
	onCloseMobile,
}: AccountSidebarProps) {
	const pathname = usePathname()
	const searchParams = useSearchParams()
	const view = searchParams.get('view')
	const groups = filterAccountNavGroups(role)

	const linkIsActive = (item: AccountNavItem) => {
		const href = item.href
		if (href === '/account') {
			return pathname === '/account'
		}
		if (href === ACCOUNT_BOOKINGS_TRIPS_HREF) {
			return pathname.startsWith('/account/bookings') && view === 'trips'
		}
		if (href === '/account/bookings') {
			return (
				pathname.startsWith('/account/bookings') &&
				view !== 'trips'
			)
		}
		if (pathname === href) return true
		return pathname.startsWith(`${href}/`)
	}

	const focusRing =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

	const renderItems = (items: readonly AccountNavItem[]) => (
		<ul className="flex flex-col gap-0.5">
			{items.map((item) => {
				const active = linkIsActive(item)
				const Icon = item.icon
				return (
					<li key={item.href}>
						<Link
							href={item.href}
							className={cn(
								'relative flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition',
								focusRing,
								active
									? 'bg-account-surface-hover text-account-foreground before:absolute before:inset-y-1 before:left-0 before:z-0 before:w-0.5 before:rounded-full before:bg-account-accent'
									: 'text-account-muted hover:bg-account-surface-hover/90 hover:text-account-foreground',
								collapsed && 'md:justify-center md:gap-0 md:px-0',
							)}
							title={collapsed ? item.label : undefined}
							aria-current={active ? 'page' : undefined}
							aria-label={collapsed ? item.label : undefined}
							onClick={() => onCloseMobile()}
						>
							<Icon
								className={cn(
									'relative z-[1] h-5 w-5 shrink-0 opacity-90',
									collapsed && 'md:mx-auto',
								)}
								aria-hidden
							/>
							<span className={cn('relative z-[1] min-w-0 flex-1 truncate', collapsed && 'md:sr-only')}>
								{item.label}
							</span>
						</Link>
					</li>
				)
			})}
		</ul>
	)

	const renderGroup = (group: AccountNavGroup) => (
		<div key={group.id}>
			<div className={cn(groupHeadingClass, collapsed && 'md:sr-only')}>{group.title}</div>
			{renderItems(group.items)}
		</div>
	)

	return (
		<nav
			id="account-sidebar-panel"
			className={cn(
				'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-account-border bg-account-surface transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-screen md:shrink-0 md:translate-x-0',
				collapsed ? 'md:w-account-sidebar-collapsed' : 'md:w-account-sidebar',
				'w-account-sidebar max-w-[85vw]',
				mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
			)}
			aria-label={accountSidebarCopy.navAriaLabel}
		>
			<div
				className={cn(
					'flex h-14 shrink-0 items-center gap-2 border-b border-account-border px-3',
					collapsed && 'md:justify-center md:px-2',
				)}
			>
				<Link
					href="/account"
					className={cn(
						'flex min-h-11 min-w-11 flex-1 items-center gap-2 truncate rounded-md px-2 py-2 text-base font-semibold tracking-tight text-account-foreground transition hover:bg-account-surface-hover',
						focusRing,
						collapsed && 'md:flex-none md:justify-center md:gap-0 md:px-1 md:text-sm',
					)}
					aria-label={accountSidebarCopy.brandLinkAria}
				>
					<span
						className={cn(
							'relative shrink-0',
							collapsed ? 'h-8 w-[4.5rem]' : 'h-9 w-[7.5rem]',
						)}
					>
						<Image
							src="/images/vestro-logo.png"
							alt=""
							fill
							className={cn(
								'object-contain',
								collapsed ? 'md:object-center' : 'object-left',
							)}
							sizes="120px"
							priority
						/>
					</span>
					<span className={cn('truncate', collapsed && 'md:sr-only')}>Account</span>
				</Link>
				<button
					type="button"
					className={cn(
						'hidden min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-account-border text-account-foreground hover:bg-account-surface-hover md:inline-flex',
						focusRing,
					)}
					onClick={onToggleCollapsed}
					aria-expanded={!collapsed}
					aria-controls="account-sidebar-nav"
					aria-label={collapsed ? accountSidebarCopy.expandSidebar : accountSidebarCopy.collapseSidebar}
				>
					{collapsed ? (
						<ChevronRight className="h-5 w-5" aria-hidden />
					) : (
						<ChevronLeft className="h-5 w-5" aria-hidden />
					)}
				</button>
				<button
					type="button"
					className={cn(
						'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-account-border text-account-foreground hover:bg-account-surface-hover md:hidden',
						focusRing,
					)}
					onClick={onCloseMobile}
					aria-label={accountSidebarCopy.closeMobileNav}
				>
					<X className="h-5 w-5" aria-hidden />
				</button>
			</div>

			<div id="account-sidebar-nav" className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 py-3">
					{groups.map(renderGroup)}
				</div>
			</div>
		</nav>
	)
}
