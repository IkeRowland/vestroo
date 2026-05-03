import { Suspense } from 'react'

import { AccountShell } from '@/features/account/components/AccountShell'
import { requireAccountMemberPage } from '@/lib/account-portal-auth'

/**
 * Member-only shell for `/account` (not `/account/login` or `/account/unauthorized`).
 * Login / signup / unauthorized use **`(public-account)/layout.tsx`** for **`data-account-theme`** (**Story 18.11**).
 */
export default async function AccountPortalShellLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const session = await requireAccountMemberPage()

	return (
		<div
			data-account-theme="light"
			className="min-h-screen bg-account-canvas text-account-foreground antialiased"
		>
			<a
				href="#account-main"
				className="absolute left-[-10000px] top-auto z-[100] h-px w-px overflow-hidden focus:left-4 focus:top-4 focus:z-[100] focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:border focus:border-account-border focus:bg-account-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-account-foreground focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas"
			>
				Skip to main content
			</a>
			<Suspense
				fallback={
					<div
						className="flex min-h-screen items-center justify-center bg-account-canvas text-sm text-account-muted"
						role="status"
						aria-live="polite"
					>
						Loading…
					</div>
				}
			>
				<AccountShell session={session}>{children}</AccountShell>
			</Suspense>
		</div>
	)
}
