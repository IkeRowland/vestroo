/**
 * Copy for `/ops/comms` — NFR.17.8 (Story 17.17).
 */

export const opsCommsCopy = {
	pageTitle: 'Comms registry',
	pageDescription:
		'Admin-only controls for booking communication rules and templates.',
	filterContextAria: 'Comms registry context',
	filterHint: 'Template bodies and subjects are not editable from this page.',

	registryLoadErrorTitle: 'Registry could not be loaded',

	dispatchRulesHeading: 'Dispatch rules',
	dispatchRulesBlurb:
		'Toggles and filters apply to outbound comms as soon as dispatch reads this matrix (**15C.2**).',
	dispatchRulesCaption: 'Comms dispatch rules',

	templatesHeading: 'Templates (metadata)',
	templatesBlurb:
		'Template wording and subjects stay PR-governed (**Q23**). Only the active flag can be changed here.',
	templatesPreviewHint:
		'Use Preview on a row to open read-only rendered HTML / plain text / SMS with deterministic seeded variables (**15C.4**). Unknown {{placeholders}} stay visible.',
	templatesCaption: 'Comms templates',

	activityHeading: 'Recent registry activity',
	activityBlurb:
		'Latest template and dispatch-rule updates from this load, newest first (read-only; not a live audit log).',
	activityLandmark: 'Comms registry activity',
	activityEmpty: 'No registry rows loaded.',

	actionFailedAlert: 'Action failed',

	previewButtonLabel: 'Preview',
	previewButtonAria: (eventKey: string) => `Preview template for ${eventKey}`,

	channelPill: (ch: string) => ch,
	activePillOn: 'Active',
	activePillOff: 'Inactive',
} as const
