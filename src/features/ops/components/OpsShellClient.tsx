'use client'

import { useCallback, useState } from 'react'

import { OpsSidebar } from '@/features/ops/components/OpsSidebar'
import { OpsTopBar } from '@/features/ops/components/OpsTopBar'
import type { StaffSession } from '@/lib/ops-auth'

type OpsShellClientProps = {
	staff: StaffSession
	children: React.ReactNode
}

export function OpsShellClient({ staff, children }: OpsShellClientProps) {
	const [collapsed, setCollapsed] = useState(false)
	const [mobileOpen, setMobileOpen] = useState(false)

	const closeMobile = useCallback(() => setMobileOpen(false), [])

	return (
		<div className="flex min-h-screen">
			{mobileOpen ? (
				<button
					type="button"
					className="fixed inset-0 z-30 bg-black/60 md:hidden"
					aria-label="Close navigation menu"
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
				<main
					id="ops-main"
					className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 md:px-6 md:py-6"
					tabIndex={-1}
				>
					{children}
				</main>
			</div>
		</div>
	)
}
