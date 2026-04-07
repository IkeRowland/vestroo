'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ProfileRole } from '@/types/database.types'
import {
	filterOpsNavGroups,
	OPS_NAV_GROUPS,
} from '@/features/ops/ops-nav-config'

type OpsSidebarProps = {
	role: ProfileRole
	collapsed: boolean
	onToggleCollapsed: () => void
	mobileOpen: boolean
	onCloseMobile: () => void
}

export function OpsSidebar({
	role,
	collapsed,
	onToggleCollapsed,
	mobileOpen,
	onCloseMobile,
}: OpsSidebarProps) {
	const pathname = usePathname()
	const groups = filterOpsNavGroups(OPS_NAV_GROUPS, role)

	const linkIsActive = (href: string) => {
		if (pathname === href) return true
		return pathname.startsWith(`${href}/`)
	}

	const focusRing =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops'

	return (
		<nav
			className={cn(
				'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-ops-border bg-ops-surface transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-screen md:shrink-0 md:translate-x-0',
				collapsed ? 'md:w-ops-sidebar-collapsed' : 'md:w-ops-sidebar',
				'w-ops-sidebar max-w-ops-sidebar-drawer',
				mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
			)}
			aria-label="Operations sections"
		>
				<div
					className={cn(
						'flex h-14 shrink-0 items-center gap-2 border-b border-ops-border px-3',
						collapsed && 'md:justify-center md:px-2',
					)}
				>
					<Link
						href="/ops/board"
						className={cn(
							'flex min-h-11 min-w-11 flex-1 items-center gap-2 truncate rounded-md px-2 py-2 text-base font-semibold tracking-tight text-ops-foreground transition hover:bg-ops-surface-hover',
							focusRing,
							collapsed && 'md:flex-none md:justify-center md:gap-0 md:px-1 md:text-sm',
						)}
						aria-label="Vestroo Ops — operations home"
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
						<span className={cn('truncate', collapsed && 'md:sr-only')}>Ops</span>
					</Link>
					<button
						type="button"
						className={cn(
							'hidden min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-ops-border text-ops-foreground hover:bg-ops-surface-hover md:inline-flex',
							focusRing,
						)}
						onClick={onToggleCollapsed}
						aria-expanded={!collapsed}
						aria-controls="ops-sidebar-nav"
						aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
							'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-ops-border text-ops-foreground hover:bg-ops-surface-hover md:hidden',
							focusRing,
						)}
						onClick={onCloseMobile}
						aria-label="Close navigation menu"
					>
						<X className="h-5 w-5" aria-hidden />
					</button>
				</div>

				<div
					id="ops-sidebar-nav"
					className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 py-3"
				>
					{groups.map((group) => (
						<div key={group.id}>
							<div
								className={cn(
									'mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-ops-muted',
									collapsed && 'md:sr-only',
								)}
							>
								{group.title}
							</div>
							<ul className="flex flex-col gap-0.5">
								{group.items.map((item) => {
									const active = linkIsActive(item.href)
									const Icon = item.icon
									return (
										<li key={item.href}>
											<Link
												href={item.href}
												className={cn(
													'flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition',
													focusRing,
													active
														? 'bg-ops-surface-active text-ops-foreground'
														: 'text-ops-muted hover:bg-ops-surface-hover/90 hover:text-ops-foreground',
													collapsed && 'md:justify-center md:gap-0 md:px-0',
												)}
												title={collapsed ? item.label : undefined}
												aria-current={active ? 'page' : undefined}
												aria-label={collapsed ? item.label : undefined}
												onClick={() => onCloseMobile()}
											>
												<Icon
													className="h-5 w-5 shrink-0 opacity-90"
													aria-hidden
												/>
												<span className={cn('truncate', collapsed && 'md:sr-only')}>
													{item.label}
												</span>
											</Link>
										</li>
									)
								})}
							</ul>
						</div>
					))}
				</div>
			</nav>
	)
}
