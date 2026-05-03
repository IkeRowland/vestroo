/**
 * `/ops/settings/*` strings (Story 17.18 / FE.17.12 rollout item 12) — NFR.17.8.
 * Namespaced object keeps index vs sub-routes obvious for translators.
 */
export const opsSettingsCopy = {
	index: {
		sectionNavLandmark: 'Settings areas',
		sectionHeading: 'Configuration',
		pageTitle: 'Settings',
		pageDescription: 'Configure payouts and customer-facing payment details for the ops console.',
		cardBankTitle: 'Bank account (EFT)',
		cardBankBody: 'Customer-facing bank details for quotes and account invoice EFT blocks.',
		cardBankHref: '/ops/settings/bank-account',
		cardCtaLabel: 'Open',
	},
	bankAccount: {
		pageTitle: 'Bank account (EFT)',
		pageDescriptionLead:
			'Customer-facing bank details for walk-in quote emails and account invoice EFT blocks.',
		descriptionStoredIn: 'Stored in',
		settingsKeyNoteCode: 'ops_settings.bank_account',
		backLinkLabel: '← Invoicing',
		backHref: '/ops/invoicing',
		lastUpdatedPrefix: 'Last updated',
		loadErrorPrefix: 'Could not load settings:',
		noRowWarning:
			'No bank_account row found. Apply migrations (see 20260426220000_ops16_ops_settings_and_payment_columns.sql).',
		sectionBankDetails: 'Bank details',
		sectionBankDetailsHint: 'Displayed on customer-facing documents.',
		sectionReferences: 'Payment references',
		sectionReferencesHint: 'Templates used when generating EFT reference lines.',
		fieldBankName: 'Bank name',
		fieldAccountHolder: 'Account holder',
		fieldAccountNumber: 'Account number',
		fieldBranchCode: 'Branch code',
		fieldReferenceFormat: 'Payment reference format (walk-in / booking EFT)',
		fieldReferenceFormatHintBefore: 'Use placeholders like ',
		fieldReferenceFormatHintAfter: '.',
		fieldInvoiceReferenceFormat: 'Invoice EFT reference format (optional)',
		saveButton: 'Save bank settings',
		savePending: 'Saving…',
		successMessage: 'Saved. Walk-in quote emails will use these details.',
	},
} as const
