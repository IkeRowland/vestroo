/**
 * User-visible copy for **`/account/help`** — **Story 18.10** / **FE.18.9** (B2B shuttle / organisation account portal).
 *
 * **Task 0:** MVP FAQ = static curated array in this module (no DB/CMS). Display capped at **`ACCOUNT_HELP_FAQ_MAX_DISPLAY`** (5).
 * Optional status URL: **`NEXT_PUBLIC_STATUS_PAGE_URL`** (trimmed; omitted when unset).
 * Empty FAQ: reuse **`EmptyState`** `theme="account"` with **`emptyFaqTitle`** / **`emptyFaqBody`**.
 */

export const ACCOUNT_HELP_FAQ_MAX_DISPLAY = 5

export type AccountHelpFaqEntry = {
	id: string
	question: string
	answer: string
}

/**
 * Curated FAQ entries (ops-authored). When this array is empty, the page shows **`emptyFaq*`** copy only (no broken list).
 * Ship MVP with 3–5 items; additional entries beyond **`ACCOUNT_HELP_FAQ_MAX_DISPLAY`** are not shown.
 */
export const ACCOUNT_HELP_FAQ_ENTRIES: readonly AccountHelpFaqEntry[] = [
	{
		id: 'bookings-changes',
		question: 'How do I request a new shuttle booking or change an existing one?',
		answer:
			'Use the booking flow from your organisation’s link or the account home shortcuts. For changes to timing, passenger count, or route, contact your coordinator or reach out to support with your booking reference so we can adjust the trip safely.',
	},
	{
		id: 'who-sees-billing',
		question: 'Who in my organisation can see invoices and billing?',
		answer:
			'Organisation administrators can open the invoices area and related billing views in this portal. Other members see bookings and trips according to their role. If you need access adjusted, ask an admin on your account or contact support.',
	},
	{
		id: 'notifications',
		question: 'How do I change email notifications?',
		answer:
			'Open Preferences in the account sidebar. Under email notifications you can opt in or out of informational and marketing messages. Transactional emails (bookings, payments, security) stay on so your team does not miss critical updates.',
	},
	{
		id: 'upcoming-trips',
		question: 'Where can I see upcoming trips for my organisation?',
		answer:
			'Your Account home dashboard highlights upcoming trips, and Bookings lists full history and filters. Pickup times are shown in the portal time zone noted in Preferences.',
	},
]

export const accountHelpCopy = {
	pageTitle: 'Help & contact',
	pageDescription:
		'Answers to common questions about your organisation’s shuttle account, how to reach operations, and where to check service status.',

	faqSectionTitle: 'Common questions',
	faqSectionDescription:
		'Quick answers for organisation members using this portal. For anything specific to a booking, include your reference when you contact us.',

	emptyFaqTitle: 'No frequently asked questions yet',
	emptyFaqBody:
		'Self-service answers will appear here when they are published. In the meantime, use the contact section below to reach the operations team.',

	contactSectionTitle: 'Contact operations',
	contactSectionDescription:
		'Reach the team that supports your organisation’s shuttle bookings and account settings.',
	contactEmailCtaPrefix: 'Email',
	/** Shown after **`resolveSupportContactLine()`** — practical guidance without guaranteed response times. */
	supportGuidanceBody:
		'Include your organisation name and, if relevant, a booking or invoice reference in your message so we can help without extra back-and-forth.',

	statusSectionTitle: 'Service status',
	statusLinkLabel: 'Open status page in a new tab',
	statusExternalHint: '(opens in a new tab)',
} as const

export function getDisplayedAccountHelpFaqEntries(): readonly AccountHelpFaqEntry[] {
	return ACCOUNT_HELP_FAQ_ENTRIES.slice(0, ACCOUNT_HELP_FAQ_MAX_DISPLAY)
}
