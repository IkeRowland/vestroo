'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { OpsBreadcrumbStrip } from '@/features/ops/components/OpsBreadcrumbStrip'
import { OpsSidebar } from '@/features/ops/components/OpsSidebar'
import { OpsTopBar } from '@/features/ops/components/OpsTopBar'
import type { StaffSession } from '@/lib/ops-auth'

type OpsShellClientProps = {
	staff: StaffSession
	children: React.ReactNode
}

function getFocusableInPanel(panel: HTMLElement): HTMLElement[] {
	return Array.from(
		panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
	).filter((el) => !el.closest('[aria-hidden="true"]'))
}

export function OpsShellClient({ staff, children }: OpsShellClientProps) {
	const [collapsed, setCollapsed] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)
	const lastFocusBeforeMobile = useRef<HTMLElement | null>(null)

	const closeMobile = useCallback(() => setMobileOpen(false), [])

	useEffect(() => {
		if (!mobileOpen) {
			const restore = lastFocusBeforeMobile.current
			lastFocusBeforeMobile.current = null
			if (restore && typeof restore.focus === 'function') {
				requestAnimationFrame(() => restore.focus())
			}
			return
		}

		lastFocusBeforeMobile.current = document.activeElement as HTMLElement | null

		const panel = document.getElementById('ops-sidebar-panel')
		if (!panel) return

		const focusables = getFocusableInPanel(panel)
		const first = focusables[0]
		if (first) {
			requestAnimationFrame(() => first.focus())
		}

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				closeMobile()
				return
			}
			if (e.key !== 'Tab') return

			const list = getFocusableInPanel(panel)
			if (list.length === 0) return

			const firstEl = list[0]
			const lastEl = list[list.length - 1]
			const active = document.activeElement as HTMLElement | null

			if (e.shiftKey) {
				if (active === firstEl || !panel.contains(active)) {
					e.preventDefault()
					lastEl.focus()
				}
			} else if (active === lastEl) {
				e.preventDefault()
				firstEl.focus()
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [mobileOpen, closeMobile])

	return (
		<div className="flex min-h-screen w-full min-w-0">
			{mobileOpen ? (
				<div
					className="fixed inset-0 z-30 cursor-pointer bg-black/60 md:hidden"
					aria-hidden
					onClick={closeMobile}
				/>
			) : null}

			<OpsSidebar
				role={staff.role}
				collapsed={collapsed}
				onToggleCollapsed={() => setCollapsed((c) => !c)}
				mobileOpen={mobileOpen}
				onCloseMobile={closeMobile}
			/>

			<div className="flex min-w-0 flex-1 flex-col">
				<OpsTopBar staff={staff} onOpenMobileNav={() => setMobileOpen(true)} />
				<OpsBreadcrumbStrip />
				<main
					id="ops-main"
					className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-4 md:px-6 md:py-6"
					tabIndex={-1}
				>
					{children}
				</main>
			</div>
		</div>
	)
}
