'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Menu, Search } from 'lucide-react'

import { OpsSignOutButton } from '@/features/ops/components/OpsSignOutButton'
import { getOpsBreadcrumbs } from '@/features/ops/ops-nav-config'
import { cn } from '@/lib/utils'
import type { StaffSession } from '@/lib/ops-auth'

type OpsTopBarProps = {
	staff: StaffSession
	onOpenMobileNav: () => void
}

export function OpsTopBar({ staff, onOpenMobileNav }: OpsTopBarProps) {
	const pathname = usePathname() ?? ''
	const crumbs = getOpsBreadcrumbs(pathname)
	const focusRing =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops'

	return (
		<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ops-border bg-ops-topbar/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-ops-topbar/80 md:px-4">
			<button
				type="button"
				className={cn(
					'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-ops-border text-ops-foreground hover:bg-ops-surface-hover md:hidden',
					focusRing,
				)}
				onClick={onOpenMobileNav}
				aria-label="Open navigation menu"
			>
				<Menu className="h-5 w-5" aria-hidden />
			</button>

			<nav
				className="min-w-0 flex-1 overflow-x-auto"
				aria-label="Breadcrumb"
			>
				<ol className="flex flex-wrap items-center gap-1.5 text-sm text-ops-muted">
					{crumbs.length === 0 ? (
						<li className="font-medium text-ops-foreground">Operations</li>
					) : null}
					{crumbs.map((c, i) => {
						const last = i === crumbs.length - 1
						return (
							<li key={`${c.href}-${i}`} className="flex items-center gap-1.5">
								{i > 0 && (
									<span className="text-ops-muted/60" aria-hidden>
										/
									</span>
								)}
								{last ? (
									<span className="font-medium text-ops-foreground">{c.label}</span>
								) : (
									<Link
										href={c.href}
										className={cn(
											'truncate rounded-sm text-ops-muted underline-offset-4 hover:text-ops-foreground hover:underline',
											focusRing,
										)}
									>
										{c.label}
									</Link>
								)}
							</li>
						)
					})}
				</ol>
			</nav>

			<div className="flex shrink-0 items-center gap-2 md:gap-3">
				<Link
					href="/ops/search"
					className={cn(
						'hidden min-h-11 max-w-[200px] flex-1 items-center gap-2 rounded-md border border-ops-border bg-ops-surface px-3 text-sm text-ops-muted transition hover:border-ops-border hover:text-ops-foreground sm:flex',
						focusRing,
					)}
					aria-label="Go to staff booking search"
				>
					<Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
					<span className="truncate">Search bookings…</span>
				</Link>
				<Link
					href="/ops/search"
					className={cn(
						'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-ops-border text-ops-muted hover:bg-ops-surface-hover sm:hidden',
						focusRing,
					)}
					aria-label="Staff booking search"
				>
					<Search className="h-5 w-5" aria-hidden />
				</Link>

				<div
					className="flex min-h-11 items-center gap-1.5 rounded-md border border-dashed border-ops-border px-2.5 text-xs text-ops-muted"
					role="status"
					aria-label="Notifications coming soon"
				>
					<Bell className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
					<span className="hidden lg:inline">Soon</span>
				</div>

				<div className="hidden h-8 w-px bg-ops-border sm:block" aria-hidden />

				<div className="hidden flex-col items-end text-right text-xs sm:flex">
					<span className="max-w-[160px] truncate font-medium capitalize text-ops-foreground">
						{staff.role}
					</span>
					{staff.email ? (
						<span className="max-w-[160px] truncate text-ops-muted" title={staff.email}>
							{staff.email}
						</span>
					) : null}
				</div>

				<OpsSignOutButton />
			</div>
		</header>
	)
}
