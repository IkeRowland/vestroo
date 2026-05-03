import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { OpsInvoicingTabId } from '@/lib/ops-invoicing-queue'

type OpsInvoicingTabNavProps = {
	active: OpsInvoicingTabId
}

const TABS: { id: OpsInvoicingTabId; label: string; href: string }[] = [
	{ id: 'ready', label: 'Ready to invoice', href: '/ops/invoicing' },
	{ id: 'invoiced', label: 'Invoiced (awaiting payment)', href: '/ops/invoicing?tab=invoiced' },
	{ id: 'hooks', label: 'Corporate hooks', href: '/ops/invoicing?tab=hooks' },
]

export function OpsInvoicingTabNav({ active }: OpsInvoicingTabNavProps) {
	return (
		<nav
			className="flex flex-wrap gap-2 border-b border-ops-border pb-2"
			aria-label="Invoicing sections"
		>
			{TABS.map((t) => (
				<Link
					key={t.id}
					href={t.href}
					className={cn(
						'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
						active === t.id ?
							'border-primary bg-primary text-primary-foreground shadow-sm'
						:	'border-transparent text-ops-muted hover:border-ops-border hover:bg-ops-surface hover:text-ops-foreground',
					)}
				>
					{t.label}
				</Link>
			))}
		</nav>
	)
}
