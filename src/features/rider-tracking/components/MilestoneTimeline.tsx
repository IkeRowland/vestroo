import type { RiderTrackMilestoneUi } from '../lib/milestones'

type Props = {
	milestones: RiderTrackMilestoneUi[]
}

function ringClass(state: RiderTrackMilestoneUi['state']) {
	if (state === 'cancelled') return 'border-gray-300 bg-gray-100 text-gray-500'
	if (state === 'past') return 'border-emerald-600 bg-emerald-600 text-white'
	if (state === 'current') return 'border-amber-500 bg-amber-500 text-white ring-2 ring-amber-200'
	return 'border-gray-200 bg-white text-gray-400'
}

function textClass(state: RiderTrackMilestoneUi['state']) {
	if (state === 'cancelled') return 'text-gray-500 line-through decoration-gray-400'
	if (state === 'past') return 'text-gray-800'
	if (state === 'current') return 'text-gray-900 font-medium'
	return 'text-gray-400'
}

export function MilestoneTimeline({ milestones }: Props) {
	return (
		<section aria-label="Trip progress">
			<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Progress</h2>
			<ol className="mt-4 space-y-0">
				{milestones.map((m, idx) => (
					<li key={m.key} className="relative flex gap-4 pb-8 last:pb-0">
						{idx < milestones.length - 1 ? (
							<div
								className="absolute left-[11px] top-6 h-[calc(100%-0.5rem)] w-px bg-gray-200"
								aria-hidden
							/>
						) : null}
						<div
							className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${ringClass(m.state)}`}
							aria-hidden
						>
							{idx + 1}
						</div>
						<div className="min-w-0 pt-0.5">
							<p className={`text-sm ${textClass(m.state)}`}>{m.title}</p>
							{m.timestampLabel ? (
								<p className="mt-0.5 text-xs text-gray-500">{m.timestampLabel}</p>
							) : null}
							{m.subline ? <p className="mt-1 text-xs text-gray-600">{m.subline}</p> : null}
						</div>
					</li>
				))}
			</ol>
		</section>
	)
}
