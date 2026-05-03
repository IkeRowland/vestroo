import type { ReactNode } from 'react'

import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { cn } from '@/lib/utils'

function toneClasses(theme: SaasTheme): Record<OpsStatusPillTone, string> {
	if (theme === 'ops') {
		return {
			success: 'bg-ops-success/10 text-ops-success',
			warning: 'bg-ops-warning/10 text-ops-warning',
			danger: 'bg-ops-danger/10 text-ops-danger',
			info: 'bg-ops-info/10 text-ops-info',
			neutral: 'bg-ops-muted/15 text-ops-muted',
		}
	}
	return {
		success: 'bg-account-success/10 text-account-success',
		warning: 'bg-account-warning/10 text-account-warning',
		danger: 'bg-account-danger/10 text-account-danger',
		info: 'bg-account-info/10 text-account-info',
		neutral: 'bg-account-muted/15 text-account-muted',
	}
}

export type StatusPillProps = {
	theme?: SaasTheme
	tone: OpsStatusPillTone
	dot?: boolean
	children: ReactNode
	className?: string
}

export function StatusPill({
	theme = 'ops',
	tone,
	dot = true,
	children,
	className,
}: StatusPillProps) {
	const TONE = toneClasses(theme)
	return (
		<span
			className={cn(
				'inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
				TONE[tone],
				className,
			)}
		>
			{dot ? (
				<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
			) : null}
			<span className="min-w-0 truncate">{children}</span>
		</span>
	)
}
