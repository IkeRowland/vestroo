import Link from 'next/link'
import type { ReactNode } from 'react'

import { VestrooMark } from '@/components/brand/VestrooMark'

import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'

/** Shared focus + muted styling for footer / secondary links on public account auth routes. */
export const accountPublicAuthSecondaryLinkClassName =
	'text-account-muted underline underline-offset-2 transition-colors hover:text-account-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

export type AccountPublicAuthCardProps = {
	/** **Task 0:** parity with login / signup — mark on invalid invite and unauthorized. */
	showMark?: boolean
	/** Page **`h1`** when set; omit when children supply the sole **`h1`** (e.g. invite panel). */
	title?: string
	description?: ReactNode
	children?: ReactNode
	/** Region after **`children`** (e.g. help mailto) — still inside the card. */
	ancillary?: ReactNode
	footer?: ReactNode
}

/**
 * Centered single-column card shell for **`(public-account)`** routes (**Story 18.11**).
 * Outer **`max-w-md`** + **`border-account-border`** + **`bg-card`** aligns with portal **`Card`** usage.
 */
export function AccountPublicAuthCard({
	showMark = true,
	title,
	description,
	children,
	ancillary,
	footer,
}: AccountPublicAuthCardProps) {
	return (
		<div className="w-full min-w-0 max-w-md">
			{showMark ? (
				<div className="mb-6 flex justify-center">
					<Link
						href="/"
						className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas"
						aria-label={accountAuthSurfacesCopy.brandHomeAria}
					>
						<VestrooMark size="footer" />
					</Link>
				</div>
			) : null}
			<div className="rounded-xl border border-account-border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
				{title ? <h1 className="text-xl font-semibold text-account-foreground">{title}</h1> : null}
				{description ? (
					<div className="mt-1 text-sm leading-relaxed text-account-muted">{description}</div>
				) : null}
				{children ? (
					<div className={title || description ? 'mt-6' : undefined}>{children}</div>
				) : null}
				{ancillary}
				{footer}
			</div>
		</div>
	)
}
