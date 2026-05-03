'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
	OPS_WALK_IN_STAGE_ORDER,
	type OpsWalkInQueueParsed,
	type OpsWalkInStageKey,
	opsWalkInStageLabel,
	walkInQueueHref,
} from '@/lib/ops-walk-in-queue-query'
import { cn } from '@/lib/utils'

type WalkInQueueViewProps = {
	parsed: OpsWalkInQueueParsed
	counts: Record<OpsWalkInStageKey, number | null>
	countsUnavailable: boolean
	children: React.ReactNode
}

/**
 * Stage tabs (desktop) + **`<select>`** under **768px** — URL is source of truth (`stage`, optional `intent`).
 */
export function WalkInQueueView({
	parsed,
	counts,
	countsUnavailable,
	children,
}: WalkInQueueViewProps) {
	const router = useRouter()
	const hrefForStage = (stage: OpsWalkInStageKey) =>
		walkInQueueHref({ stage, intents: parsed.intents })

	const countLabel = (stage: OpsWalkInStageKey) => {
		if (countsUnavailable) return '—'
		const n = counts[stage]
		return n == null ? '—' : String(n)
	}

	return (
		<div className="space-y-4">
			<div className="hidden flex-wrap gap-2 border-b border-ops-border bg-ops-canvas/30 px-1 py-2 md:flex">
				{OPS_WALK_IN_STAGE_ORDER.map((stage) => {
					const active = parsed.stage === stage
					return (
						<Link
							key={stage}
							href={hrefForStage(stage)}
							data-testid={`ops-walk-in-tab-${stage}`}
							className={cn(
								'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
								active
									? 'border-primary/50 bg-primary/10 text-ops-foreground'
									: 'border-ops-border bg-ops-surface/60 text-ops-foreground hover:border-primary/30 hover:bg-ops-surface',
							)}
							aria-current={active ? 'page' : undefined}
						>
							{opsWalkInStageLabel(stage)}
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
				<label htmlFor="ops-walk-in-stage-select" className="mb-1 block text-xs font-medium text-ops-muted">
					Stage
				</label>
				<select
					id="ops-walk-in-stage-select"
					data-testid="ops-walk-in-stage-select"
					className="w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground"
					value={parsed.stage}
					onChange={(e) => {
						const next = e.target.value as OpsWalkInStageKey
						router.push(hrefForStage(next))
					}}
				>
					{OPS_WALK_IN_STAGE_ORDER.map((stage) => (
						<option key={stage} value={stage}>
							{opsWalkInStageLabel(stage)} ({countLabel(stage)})
						</option>
					))}
				</select>
			</div>

			{children}
		</div>
	)
}
