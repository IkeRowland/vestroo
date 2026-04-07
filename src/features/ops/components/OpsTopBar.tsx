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

	return (
		<header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80 md:px-4">
			<button
				type="button"
				className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-700 text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 md:hidden"
				onClick={onOpenMobileNav}
				aria-label="Open navigation menu"
			>
				<Menu className="h-5 w-5" aria-hidden />
			</button>

			<nav
				className="min-w-0 flex-1 overflow-x-auto"
				aria-label="Breadcrumb"
			>
				<ol className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-400">
					{crumbs.length === 0 ? (
						<li className="font-medium text-zinc-100">Operations</li>
					) : null}
					{crumbs.map((c, i) => {
						const last = i === crumbs.length - 1
						return (
							<li key={`${c.href}-${i}`} className="flex items-center gap-1.5">
								{i > 0 && (
									<span className="text-zinc-600" aria-hidden>
										/
									</span>
								)}
								{last ? (
									<span className="font-medium text-zinc-100">{c.label}</span>
								) : (
									<Link
										href={c.href}
										className="truncate rounded-sm text-zinc-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
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
						'hidden min-h-11 max-w-[200px] flex-1 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 sm:flex',
					)}
					aria-label="Go to staff booking search"
				>
					<Search className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
					<span className="truncate">Search bookings…</span>
				</Link>
				<Link
					href="/ops/search"
					className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 sm:hidden"
					aria-label="Staff booking search"
				>
					<Search className="h-5 w-5" aria-hidden />
				</Link>

				<div
					className="flex min-h-11 items-center gap-1.5 rounded-md border border-dashed border-zinc-700 px-2.5 text-xs text-zinc-500"
					role="status"
					aria-label="Notifications coming soon"
				>
					<Bell className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
					<span className="hidden lg:inline">Soon</span>
				</div>

				<div className="hidden h-8 w-px bg-zinc-800 sm:block" aria-hidden />

				<div className="hidden flex-col items-end text-right text-xs sm:flex">
					<span className="max-w-[160px] truncate font-medium capitalize text-zinc-200">
						{staff.role}
					</span>
					{staff.email ? (
						<span className="max-w-[160px] truncate text-zinc-500" title={staff.email}>
							{staff.email}
						</span>
					) : null}
				</div>

				<OpsSignOutButton />
			</div>
		</header>
	)
}
