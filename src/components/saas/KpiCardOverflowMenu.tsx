'use client'

import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { opsKpiCardCopy } from '@/features/ops/copy/ops-kpi-card-copy'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type KpiCardOverflowMenuProps = {
	theme?: SaasTheme
	drillHref: string
	metricLabel: string
}

export function KpiCardOverflowMenu({
	theme = 'ops',
	drillHref,
	metricLabel,
}: KpiCardOverflowMenuProps) {
	const btnGhost = saasCls(
		theme,
		'h-8 w-8 shrink-0 p-0 text-ops-muted hover:bg-ops-surface-hover hover:text-ops-foreground',
		'h-8 w-8 shrink-0 p-0 text-account-muted hover:bg-account-surface-hover hover:text-account-foreground',
	)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					className={btnGhost}
					aria-label={opsKpiCardCopy.menuTriggerAria(metricLabel)}
				>
					<MoreHorizontal className="h-4 w-4" aria-hidden />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={4}>
				<DropdownMenuItem asChild>
					<Link href={drillHref}>{opsKpiCardCopy.viewDetails}</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
