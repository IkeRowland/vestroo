/**
 * User-visible copy for **`/account/preferences`** — **Story 18.8** / **FE.18.7** (organisation / shuttle B2B vocabulary).
 */

/** Portal display convention for invoicing and booking timestamps (no per-user TZ column yet). */
export const ACCOUNT_PORTAL_PREFERENCES_TIME_ZONE_LABEL = 'Africa/Johannesburg (SAST)'

export const accountPreferencesCopy = {
	pageTitle: 'Preferences',
	loadingLabel: 'Loading preferences…',
	pageDescription: (orgName: string) =>
		`${orgName} — organisation and notification settings for your membership on this account.`,
	signedInAs: (email: string) => `Signed in as ${email}`,
	backToAccount: 'Account home',
	loadErrorTitle: 'Could not load preferences',
	loadErrorBody: 'Try again in a few moments. If the problem continues, contact support.',
	deepLinkHint:
		'Unsubscribe links in emails can open this page with ?category=informational, marketing, or transactional (ignored if unknown).',

	sectionNotificationsTitle: 'Email notifications',
	sectionNotificationsDescription:
		'Choose which non-transactional email we may send for this organisation. Transactional messages (bookings, payments, security) always stay on.',
	sectionBillingTitle: 'Default billing entity',
	sectionBillingDescription:
		'Used as the default billing reference on new account bookings when your team does not pick one explicitly. Values come from billing references already used on bookings for this organisation.',
	sectionCommsTitle: 'Communication preferences',
	sectionCommsDescription:
		'Regional formats and how times are labelled across the account portal. Per-member language selection is not available yet.',

	notificationsSave: 'Save notifications',
	notificationsSavePending: 'Saving…',
	notificationsSuccess: 'Your email notification settings were saved.',
	notificationsError: 'Could not save notification settings.',

	informationalTitle: 'Informational email',
	informationalBody:
		'Operational updates that are not strictly required for a booking (for example reminders and non-critical notices). You can turn these off, but you may miss helpful context.',
	marketingTitle: 'Marketing email',
	marketingBody:
		'Promotional content and offers. Off until you opt in (POPIA).',
	transactionalTitle: 'Transactional email',
	transactionalBody: 'Required messages about bookings, payments, and security. These cannot be disabled.',

	switchInformational: 'Receive informational emails',
	switchMarketing: 'Receive marketing emails',
	switchTransactionalLocked: 'Transactional email is always on',

	billingLabel: 'Default billing reference',
	billingPlaceholderOption: 'Not set',
	billingSave: 'Save billing default',
	billingSavePending: 'Saving…',
	billingSuccess: 'Default billing entity was saved.',
	billingError: 'Could not save the default billing entity.',

	localeLabel: 'Locale',
	localePlaceholder: 'English (South Africa)',
	localeHelp: 'Single locale for now — multi-language selection is not available yet.',
	timezoneLabel: 'Time zone (display)',
	timezoneHelp: (tz: string) =>
		`Dates and times in bookings and invoices are aligned to ${tz} for this product region.`,

	smsFootnote:
		'SMS category preferences are not shown here yet; this page covers email categories for your membership.',

	ariaNotificationsSection: 'Email notification preferences',
	ariaBillingSection: 'Default billing entity for the organisation',
	ariaCommsSection: 'Communication and regional preferences',
} as const
