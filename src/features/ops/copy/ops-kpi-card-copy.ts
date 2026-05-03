/**
 * Copy for ops KPI scorecards (`OpsKpiCard`) — NFR.17.8.
 * Menu strings and default period label for delta row.
 */
export const opsKpiCardCopy = {
	viewDetails: 'View details',
	menuTriggerAria: (metricLabel: string) => `More actions for ${metricLabel}`,
	/** Default trailing phrase after delta percentage (epic / Wheelzie-style scorecards). */
	defaultPeriodLabel: 'from last week',
	/** Shown when WoW comparison is not available yet (loader deferred). */
	deltaUnavailable: '—',
	cardLinkAria: (title: string, valueSummary: string) =>
		`${title}, ${valueSummary}. View details.`,
	sparklinePlaceholderAria: 'Trend comparison chart; coming soon',
} as const
