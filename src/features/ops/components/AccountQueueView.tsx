'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
	OPS_ACCOUNTS_STAGE_ORDER,
	type OpsAccountsQueueParsed,
	type OpsAccountsStageKey,
	accountsQueueHref,
	opsAccountsStageLabel,
} from '@/lib/ops-accounts-queue-query'
import { cn } from '@/lib/utils'

type AccountQueueViewProps = {
	parsed: OpsAccountsQueueParsed
	counts: Record<OpsAccountsStageKey, number | null>
	countsUnavailable: boolean
	children: React.ReactNode
}

/**
 * Stage tabs (desktop ≥ **768px**) + **`<select>`** under 768px — URL is the source of truth (`stage`,
 * optional `intent`). Mirrors `WalkInQueueView` (Story 16.20) so the two queues stay visually + behaviourally
 * paired without coupling them (Q22).
 */
export function AccountQueueView({
	parsed,
	counts,
	countsUnavailable,
	children,
}: AccountQueueViewProps) {
	const router = useRouter()
	const hrefForStage = (stage: OpsAccountsStageKey) =>
		accountsQueueHref({ stage, intents: parsed.intents })

	const countLabel = (stage: OpsAccountsStageKey) => {
		if (countsUnavailable) return '—'
		const n = counts[stage]
		return n == null ? '—' : String(n)
	}

	return (
		<div className="space-y-4">
			<div className="hidden flex-wrap gap-2 border-b border-ops-border bg-ops-canvas/30 px-1 py-2 md:flex">
				{OPS_ACCOUNTS_STAGE_ORDER.map((stage) => {
					const active = parsed.stage === stage
					return (
						<Link
							key={stage}
							href={hrefForStage(stage)}
							data-testid={`ops-accounts-tab-${stage}`}
							className={cn(
								'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
								active
									? 'border-primary/50 bg-primary/10 text-ops-foreground'
									: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
							)}
							aria-current={active ? 'page' : undefined}
						>
							{opsAccountsStageLabel(stage)}
							<span
								className={cn(
									'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
									active ? 'bg-primary/20 text-ops-foreground' : 'bg-muted/80 text-ops-muted',
								)}
							>
								{countLabel(stage)}
							</span>
						</Link>
					)
				})}
			</div>

			<div className="md:hidden">
				<label
					htmlFor="ops-accounts-stage-select"
					className="mb-1 block text-xs font-medium text-ops-muted"
				>
					Stage
				</label>
				<select
					id="ops-accounts-stage-select"
					data-testid="ops-accounts-stage-select"
					className="w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground"
					value={parsed.stage}
					onChange={(e) => {
						const next = e.target.value as OpsAccountsStageKey
						router.push(hrefForStage(next))
					}}
				>
					{OPS_ACCOUNTS_STAGE_ORDER.map((stage) => (
						<option key={stage} value={stage}>
							{opsAccountsStageLabel(stage)} ({countLabel(stage)})
						</option>
					))}
				</select>
			</div>

			{children}
		</div>
	)
}
