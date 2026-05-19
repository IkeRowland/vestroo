/**
 * Copy for **`/ops/clients`** (Story 17.11 / NFR.17.8).
 * Single export surface for this route.
 */
export const opsClientsCopy = {
	pageTitle: 'Clients',
	pageDescription:
		'All clients on file: account clients you bill on credit terms, and walk-in clients from past bookings.',
	accountSectionHeading: 'Account clients',
	walkInSectionHeading: 'Walk-in clients',
	walkInSectionHint: 'from recent bookings',
	tableCaption: 'Account clients',
	emptyAccountTitle: 'No account clients yet',
	emptyAccountDescription:
		'Use “Create account client” to add a corporate or recurring billing relationship.',
	noWalkInsTitle: 'No walk-in clients yet',
	noWalkInsDescription: 'Walk-in clients appear here once they make a booking.',
	columnSelectAll: 'Select all account clients on this page',
	columnClient: 'Client',
	columnDomains: 'Approved domains',
	columnPhone: 'Phone',
	columnTier: 'Engagement',
	columnCredit: 'Credit terms',
	columnStatus: 'Status',
	columnDocuments: 'Documents',
	columnActions: 'Actions',
	phoneNotOnFile: '—',
	phoneNotOnFileNote: 'Not stored on the account record',
	noDomains: '—',
	documentsPlaceholder: 'None yet',
	engagementTierLabel: 'Corporate account',
	rowCheckboxAria: (name: string) => `Select account client ${name}`,
	openProfileAria: (name: string) => `Open profile for ${name}`,
	searchBookings: 'Search bookings',
	viewBookings: 'View bookings',
	bulkSelectionCount: (n: number) => `${n} selected`,
	bulkActionsDisabledLabel: 'Bulk actions',
	bulkActionsComingSoonTitle:
		'Bulk actions are not available yet. Selection is for a future story.',
	detailEngagementHeading: 'Engagement',
	detailEngagementPlaceholder:
		'Engagement tier labels (for example VIP) will appear here when product ships that data.',
	detailContactHeading: 'Contact',
	detailBillingHeading: 'Billing',
	detailCreditTerms: (days: number) => `${days} day credit window`,
	detailContract: (start: string, end: string) => `Contract: ${start} → ${end}`,
	detailContractOpen: (start: string) => `Contract starts ${start}`,
	detailContractOpenEnd: (end: string) => `Contract ends ${end}`,
	detailRecentHeading: 'Recent bookings',
	noRecentBookings: 'No bookings linked to this account yet.',
	detailDocumentsHeading: 'Documents',
	detailDocumentsPlaceholder:
		'Documents linked to this account will appear here in a future release.',
	detailEditButton: 'Edit account client',
	formDialogCreateTitle: 'Create account client',
	formDialogCreateDescription: 'Set up a corporate or recurring client account.',
	formDialogCreateSuccessTitle: 'Account created',
	formDialogCreateSuccessDescription:
		'The account client is on file. Use the actions below if you added an initial admin.',
	formDialogEditTitle: 'Edit account client',
	formDialogEditDescription: 'Update credit terms, contract dates, status, and other account settings.',
	formDialogSubmitCreate: 'Create account',
	formDialogSubmitEdit: 'Save changes',
	formDialogSavingCreate: 'Creating…',
	formDialogSavingEdit: 'Saving…',
	formDialogEditSuccessTitle: 'Changes saved',
	formDialogEditSuccessDescription:
		'The account was updated. Use the actions below if you added an organisation admin.',
	statusOption: (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
	createInitialAdminHeading: 'Initial organisation admin (optional)',
	createInitialAdminEmailLabel: 'Admin email',
	createSendInviteLabel: 'Send invitation email',
	createSendInviteHint:
		'When unchecked, no email is sent. You can copy the invite link afterward (create or edit).',
	createInviteLinkHeading: 'Invite link (share securely)',
	createInviteLinkCopy: 'Copy link',
	createInviteLinkCopied: 'Copied',
	createInviteEmailWarning: (detail: string) =>
		`Account created, but the invitation email could not be sent: ${detail}`,
	editInviteEmailWarning: (detail: string) =>
		`Changes saved, but the invitation email could not be sent: ${detail}`,
} as const
