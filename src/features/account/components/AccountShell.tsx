'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { AccountSidebar } from '@/features/account/components/AccountSidebar'
import { AccountTopBar } from '@/features/account/components/AccountTopBar'
import type { AccountPortalMemberSession } from '@/lib/account-portal-auth-shared'
import { getActiveMembershipRole, portalRoleLabel } from '@/lib/account-portal-auth-shared'

type AccountShellProps = {
	session: AccountPortalMemberSession
	/** Presentation-only; wire to account notifications when available (Epic 15+). */
	notificationCount?: number
	children: React.ReactNode
}

function getFocusableInPanel(panel: HTMLElement): HTMLElement[] {
	return Array.from(
		panel.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
		),
	).filter((el) => !el.closest('[aria-hidden="true"]'))
}

export function AccountShell({
	session,
	notificationCount = 0,
	children,
}: AccountShellProps) {
	const [collapsed, setCollapsed] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)
	const lastFocusBeforeMobile = useRef<HTMLElement | null>(null)

	const closeMobile = useCallback(() => setMobileOpen(false), [])

	const role = getActiveMembershipRole(session)

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

		const panel = document.getElementById('account-sidebar-panel')
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

	if (!role) {
		throw new Error('AccountShell: active account missing from memberships')
	}

	return (
		<div className="flex min-h-screen w-full min-w-0">
			{mobileOpen ? (
				<button
					type="button"
					className="fixed inset-0 z-30 cursor-pointer border-0 bg-black/60 md:hidden"
					aria-label="Close navigation menu"
					onClick={closeMobile}
				/>
			) : null}

			<AccountSidebar
				role={role}
				collapsed={collapsed}
				onToggleCollapsed={() => setCollapsed((c) => !c)}
				mobileOpen={mobileOpen}
				onCloseMobile={closeMobile}
			/>

			<div className="flex min-w-0 flex-1 flex-col">
				<AccountTopBar
					session={session}
					roleLabel={portalRoleLabel(role)}
					notificationCount={notificationCount}
					onOpenMobileNav={() => setMobileOpen(true)}
				/>
				<main
					id="account-main"
					className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8"
					tabIndex={-1}
					inert={mobileOpen ? true : undefined}
				>
					{children}
				</main>
			</div>
		</div>
	)
}
