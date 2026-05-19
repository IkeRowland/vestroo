'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { accountSidebarCopy } from '@/features/account/copy/account-sidebar-copy'
import {
	ACCOUNT_BILLING_INVOICES_LIST_PATH,
	ACCOUNT_BILLING_QUOTES_LIST_PATH,
} from '@/lib/account-invoices-list-query'
import { cn } from '@/lib/utils'

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

export function AccountBillingSubNav() {
	const pathname = usePathname()
	const onInvoices = pathname === ACCOUNT_BILLING_INVOICES_LIST_PATH
	const onQuotes = pathname.startsWith(ACCOUNT_BILLING_QUOTES_LIST_PATH)

	return (
		<nav
			aria-label={accountSidebarCopy.billingSubNavAria}
			className="flex flex-wrap gap-2 border-b border-account-border pb-3"
		>
			<Link
				href={ACCOUNT_BILLING_INVOICES_LIST_PATH}
				className={cn(
					'rounded-md px-3 py-2 text-sm font-medium transition',
					focusRing,
					onInvoices
						? 'bg-account-surface-hover text-account-foreground'
						: 'text-account-muted hover:bg-account-surface-hover/80 hover:text-account-foreground',
				)}
				aria-current={onInvoices ? 'page' : undefined}
			>
				{accountSidebarCopy.itemInvoices}
			</Link>
			<Link
				href={ACCOUNT_BILLING_QUOTES_LIST_PATH}
				className={cn(
					'rounded-md px-3 py-2 text-sm font-medium transition',
					focusRing,
					onQuotes
						? 'bg-account-surface-hover text-account-foreground'
						: 'text-account-muted hover:bg-account-surface-hover/80 hover:text-account-foreground',
				)}
				aria-current={onQuotes ? 'page' : undefined}
			>
				{accountSidebarCopy.itemQuotes}
			</Link>
		</nav>
	)
}
