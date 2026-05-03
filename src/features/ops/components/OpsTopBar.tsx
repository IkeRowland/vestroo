'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Menu, Search, Settings } from 'lucide-react'

import { OpsNotificationsBell } from '@/features/ops/components/OpsNotificationsBell'
import { OpsProfileMenu } from '@/features/ops/components/OpsProfileMenu'
import {
	OpsTopBarSearch,
	type OpsTopBarSearchHandle,
} from '@/features/ops/components/OpsTopBarSearch'
import { opsTopBarCopy } from '@/features/ops/copy/ops-top-bar-copy'
import { cn } from '@/lib/utils'
import type { StaffSession } from '@/lib/ops-auth'

type OpsTopBarProps = {
	staff: StaffSession
	onOpenMobileNav: () => void
}

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas'

export function OpsTopBar({ staff, onOpenMobileNav }: OpsTopBarProps) {
	const searchRef = useRef<OpsTopBarSearchHandle>(null)

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
			const t = e.target as HTMLElement | null
			if (!t) return
			const tag = t.tagName
			if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return
			if (t.closest('[role="dialog"]')) return
			e.preventDefault()
			const wide = window.matchMedia('(min-width: 768px)').matches
			if (wide) {
				searchRef.current?.focus()
			} else {
				searchRef.current?.openMobile()
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	return (
		<header className="sticky top-0 z-30 flex h-14 w-full min-w-0 max-w-full shrink-0 items-center gap-2 border-b border-ops-border bg-ops-topbar/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-ops-topbar/80 md:gap-3 md:px-4">
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

			<OpsTopBarSearch ref={searchRef} />

			<div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
				<button
					type="button"
					className={cn(
						'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-ops-border text-ops-muted hover:bg-ops-surface-hover md:hidden',
						focusRing,
					)}
					aria-label={opsTopBarCopy.searchOpenMobileAria}
					onClick={() => searchRef.current?.openMobile()}
				>
					<Search className="h-5 w-5" aria-hidden />
				</button>

				<Link
					href="/ops/settings"
					className={cn(
						'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-ops-border text-ops-muted hover:bg-ops-surface-hover',
						focusRing,
					)}
					aria-label={opsTopBarCopy.settingsNavAria}
				>
					<Settings className="h-5 w-5" aria-hidden />
				</Link>

				<OpsNotificationsBell />

				<div className="hidden h-8 w-px bg-ops-border sm:block" aria-hidden />

				<OpsProfileMenu staff={staff} />
			</div>
		</header>
	)
}
