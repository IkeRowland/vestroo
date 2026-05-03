'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

import { getOpsBreadcrumbs } from '@/features/ops/ops-nav-config'
import { cn } from '@/lib/utils'

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas'

export function OpsBreadcrumbStrip() {
	const pathname = usePathname() ?? ''
	const router = useRouter()
	const crumbs = getOpsBreadcrumbs(pathname)
	const current = crumbs.length > 0 ? crumbs[crumbs.length - 1] : null
	const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null
	const showMobileBack = Boolean(parent && current)

	return (
		<div className="flex h-8 w-full min-w-0 shrink-0 items-center border-b border-ops-border bg-ops-topbar/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-ops-topbar/80 md:px-4">
			{/* Mobile: current title + back when a parent crumb exists */}
			<div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
				{showMobileBack ? (
					<button
						type="button"
						className={cn(
							'inline-flex shrink-0 items-center justify-center rounded-md p-1 text-ops-foreground hover:bg-ops-surface-hover',
							focusRing,
						)}
						aria-label={`Back to ${parent!.label}`}
						onClick={() => router.push(parent!.href)}
					>
						<ChevronLeft className="h-5 w-5" aria-hidden />
					</button>
				) : (
					<span className="w-7 shrink-0" aria-hidden />
				)}
				<span className="min-w-0 truncate text-sm font-medium text-ops-foreground">
					{current?.label ?? 'Operations'}
				</span>
			</div>

			{/* md+: horizontal crumbs */}
			<nav className="hidden min-w-0 flex-1 overflow-x-auto md:block" aria-label="Breadcrumb trail">
				<ol className="flex flex-wrap items-center gap-1.5 text-xs text-ops-muted">
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
		</div>
	)
}
