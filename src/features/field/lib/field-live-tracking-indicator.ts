/**
 * Pure logic for Epic 15 / 15B.6 chauffeur field trip “live tracking” indicator.
 * Account flag is authoritative for primary copy; deploy env only adds secondary line (AC3).
 */
export type FieldLiveTrackingIndicatorModel = {
	show: boolean
	showEnvDisabledSubcopy: boolean
}

export function buildFieldLiveTrackingIndicatorModel(args: {
	customerAccountId: string | null | undefined
	accountLiveRiderTracking: boolean
	envEnabled: boolean
}): FieldLiveTrackingIndicatorModel {
	const hasAccount = args.customerAccountId != null && args.customerAccountId !== ''
	if (!hasAccount || !args.accountLiveRiderTracking) {
		return { show: false, showEnvDisabledSubcopy: false }
	}
	return {
		show: true,
		showEnvDisabledSubcopy: !args.envEnabled,
	}
}
