'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { OpsSidebarPromoSlot } from '@/features/ops/components/OpsSidebarPromoSlot'
import { opsSidebarCopy, opsSidebarNavBadgeTitleSuffix } from '@/features/ops/copy/ops-sidebar-copy'
import {
	filterOpsNavGroups,
	OPS_NAV_GROUPS,
	type OpsNavItem,
} from '@/features/ops/ops-nav-config'
import { cn } from '@/lib/utils'
import type { ProfileRole } from '@/types/database.types'

const groupHeadingClass =
	'mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-ops-muted'

type OpsSidebarProps = {
	role: ProfileRole
	collapsed: boolean
	onToggleCollapsed: () => void
	mobileOpen: boolean
	onCloseMobile: () => void
	/**
	 * FE.17.3 — optional count badges keyed by **`href`**. Values **`0`**, **`null`**, or **`undefined`**
	 * hide the badge. Consumer must not surface counts the user could not infer from the linked route (**NFR.17.6**).
	 */
	navBadgeCounts?: Readonly<Record<string, number | null | undefined>>
}

function effectiveBadgeCount(
	item: OpsNavItem,
	navBadgeCounts: Readonly<Record<string, number | null | undefined>> | undefined,
): number | null {
	const fromMap = navBadgeCounts?.[item.href]
	const raw = fromMap !== undefined ? fromMap : item.badgeCount
	if (raw === null || raw === undefined) return null
	const n = typeof raw === 'number' ? raw : Number(raw)
	if (!Number.isFinite(n) || n <= 0) return null
	return Math.min(Math.floor(n), 999)
}

export function OpsSidebar({
	role,
	collapsed,
	onToggleCollapsed,
	mobileOpen,
	onCloseMobile,
	navBadgeCounts,
}: OpsSidebarProps) {
	const pathname = usePathname()
	const groups = filterOpsNavGroups(OPS_NAV_GROUPS, role)

	const linkIsActive = (href: string) => {
		if (pathname === href) return true
		if (href === '/ops') return false
		return pathname.startsWith(`${href}/`)
	}

	const focusRing =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas'

	const renderItems = (
		items: readonly OpsNavItem[],
		density: 'primary' | 'legacy',
	) => (
		<ul className="flex flex-col gap-0.5">
			{items.map((item) => {
				const active = linkIsActive(item.href)
				const Icon = item.icon
				const count = effectiveBadgeCount(item, navBadgeCounts)
				const badgeHiddenWhenCollapsed = collapsed && 'md:hidden'

				const linkTitle =
					collapsed || count == null ? item.label : `${item.label}${opsSidebarNavBadgeTitleSuffix(count)}`

				return (
					<li key={item.href}>
						<Link
							href={item.href}
							className={cn(
								'relative flex min-h-11 items-center gap-2 rounded-md px-2 py-2 transition',
								density === 'primary' ? 'text-sm font-medium' : 'text-xs font-medium',
								focusRing,
								active
									? 'bg-ops-nav-active text-ops-foreground before:absolute before:inset-y-1 before:left-0 before:z-0 before:w-0.5 before:rounded-full before:bg-ops-accent'
									: 'text-ops-muted hover:bg-ops-surface-hover/90 hover:text-ops-foreground',
								collapsed && 'md:justify-center md:gap-0 md:px-0',
							)}
							title={collapsed ? item.label : linkTitle}
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
							{count != null ? (
								<span
									className={cn(
										'relative z-[1] ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-ops-accent px-1.5 text-[11px] font-semibold text-ops-accent-foreground',
										badgeHiddenWhenCollapsed,
									)}
									aria-hidden
								>
									{count > 99 ? '99+' : count}
								</span>
							) : null}
						</Link>
					</li>
				)
			})}
		</ul>
	)

	return (
		<nav
			id="ops-sidebar-panel"
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
					href="/ops"
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
				className="flex min-h-0 flex-1 flex-col overflow-hidden"
			>
				<div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-2 py-3">
					{groups.map((group) => (
						<div key={group.id}>
							<div className={cn(groupHeadingClass, collapsed && 'md:sr-only')}>{group.title}</div>
							{renderItems(group.items, 'primary')}
							{group.legacyItems && group.legacyItems.length > 0 ? (
								<div
									className="mt-2 border-t border-ops-border pt-2"
									aria-label="Legacy navigation"
								>
									<div
										className={cn(
											'mb-1.5 px-2',
											collapsed && 'md:flex md:justify-center md:px-0',
										)}
									>
										<span
											className={cn(
												'inline-flex rounded-full border border-ops-border bg-ops-surface-hover/40 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ops-muted',
												collapsed && 'md:sr-only',
											)}
										>
											{opsSidebarCopy.legacyPill}
										</span>
									</div>
									{renderItems(group.legacyItems, 'legacy')}
								</div>
							) : null}
						</div>
					))}
				</div>
				<div className="shrink-0 px-2 pb-3">
					<OpsSidebarPromoSlot />
				</div>
			</div>
		</nav>
	)
}
