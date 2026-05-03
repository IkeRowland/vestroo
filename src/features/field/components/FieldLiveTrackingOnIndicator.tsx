type Props = {
	show: boolean
	showEnvDisabledSubcopy: boolean
}

/**
 * Read-only driver awareness (Epic 15 / 15B.6, US-C4): no toggle, no per-trip opt-out.
 */
export function FieldLiveTrackingOnIndicator({ show, showEnvDisabledSubcopy }: Props) {
	if (!show) {
		return null
	}

	return (
		<div
			className="rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-3 py-2.5 text-sm shadow-sm"
			role="status"
			aria-live="polite"
			aria-label="Live rider tracking status"
		>
			<p className="font-semibold text-emerald-300">Live tracking: ON</p>
			{showEnvDisabledSubcopy ? (
				<p className="mt-1.5 text-xs leading-snug text-slate-500">
					Rider live map disabled in this deployment
				</p>
			) : null}
			<p className="mt-1.5 text-xs leading-snug text-slate-500">
				Account settings control whether riders may see live location. You cannot change this here.
			</p>
		</div>
	)
}
