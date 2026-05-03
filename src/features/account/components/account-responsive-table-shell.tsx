'use client'

import type { ReactNode } from 'react'

/**
 * DRY split: tabular **`md`+** vs stacked cards **`< md`** (**FE.18.12** / Story **18.12**).
 * Desktop and mobile regions share one scroll/card container parent from the caller.
 */
export type AccountResponsiveTableShellProps = {
	/** Same text as table `aria-label` so the mobile stack is labelled consistently. */
	stackAriaLabel: string
	desktop: ReactNode
	mobileStack: ReactNode
}

export function AccountResponsiveTableShell({
	stackAriaLabel,
	desktop,
	mobileStack,
}: AccountResponsiveTableShellProps) {
	return (
		<>
			<div className="hidden md:block">{desktop}</div>
			<div className="md:hidden" role="region" aria-label={stackAriaLabel}>
				{mobileStack}
			</div>
		</>
	)
}
