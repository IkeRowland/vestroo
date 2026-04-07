'use client'

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

	return (
		<nav
				className={cn(
					'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 md:sticky md:top-0 md:z-0 md:h-screen md:shrink-0 md:translate-x-0',
					collapsed ? 'md:w-[4.5rem]' : 'md:w-56',
					'w-56 max-w-[85vw]',
					mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
				)}
				aria-label="Operations sections"
			>
				<div
					className={cn(
						'flex h-14 shrink-0 items-center gap-2 border-b border-zinc-800 px-3',
						collapsed && 'md:justify-center md:px-2',
					)}
				>
					<Link
						href="/ops/board"
						className={cn(
							'min-h-11 min-w-11 flex-1 truncate rounded-md px-2 py-2 text-base font-semibold tracking-tight text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500',
							collapsed && 'md:flex-none md:px-0 md:text-center md:text-sm',
						)}
						aria-label="Vestroo Ops — operations home"
					>
						<span className={cn(collapsed && 'md:sr-only')}>Vestroo Ops</span>
						<span className={cn('hidden font-bold', collapsed && 'md:inline')}>
							VO
						</span>
					</Link>
					<button
						type="button"
						className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 md:inline-flex"
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
						className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 md:hidden"
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
									'mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500',
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
													'flex min-h-11 items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500',
													active
														? 'bg-zinc-800 text-white'
														: 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white',
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
