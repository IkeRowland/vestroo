/** User-visible strings for **`/account/billing/invoices`** — **Story 18.6** / **FE.18.5** (B2B shuttle / chauffeur). */

export const accountInvoicesPageCopy = {
	pageTitle: 'Invoices',
	pageSubtitle: (orgName: string) =>
		`${orgName} — invoice queue and payment status (admin only).`,
	backToAccount: '← Account home',
	loadError: (msg: string) => `Could not load invoices (${msg}).`,
	signedInAs: (email: string) => `Signed in as ${email}`,
}

export const accountQuotesPageCopy = {
	pageTitle: 'Quotes',
	pageSubtitle: (orgName: string) =>
		`${orgName} — sent and historical quotes outside the active invoice queue (admin only).`,
	backToAccount: '← Account home',
	loadError: (msg: string) => `Could not load quotes (${msg}).`,
	signedInAs: (email: string) => `Signed in as ${email}`,
}

export const accountQuotesShellCopy = {
	tableCaption: 'Organisation quotes',
	tableEmpty: 'No quotes on file for this organisation yet.',
	detailSheetTitle: 'Quote details',
}

export const accountInvoicesCopy = {
	kpiPaid90d: 'Paid (last 90 days)',
	kpiAwaiting: 'Awaiting payment',
	kpiOverdue: 'Overdue',
	tableCaption: 'Organisation invoices',
	colReference: 'Reference',
	colIssueDate: 'Issue date',
	colDueDate: 'Due date',
	colAmount: 'Amount',
	colStatus: 'Status',
	colActions: 'Actions',
	actionPay: 'Pay',
	actionDownloadPdf: 'Download PDF',
	actionUnavailable: '—',
	tableEmpty: 'No invoices match these filters.',
	tableEmptyOpen: 'No open invoice-queue items right now.',
	showingRange: (from: number, to: number, total: number) => `Showing ${from}–${to} of ${total}`,
	paginationLabel: 'Invoice list pages',

	detailSheetTitle: 'Invoice details',
	detailClose: 'Close details',
	detailHeaderRef: 'Reference',
	detailHeaderIssue: 'Issue date',
	detailHeaderDue: 'Due date',
	detailHeaderAmount: 'Amount',
	detailLineItems: 'Line items',
	detailLineItemDescription: 'Description',
	detailLineQty: 'Qty',
	detailLineUnit: 'Unit',
	detailLineTotal: 'Line total',
	detailLineItemsEmpty: 'No line items on this quote version.',
	detailTimeline: 'Payment activity',
	detailTimelineEmpty: 'No dated milestones yet for this record.',
	detailPo: 'Purchase order',
	detailPoNotRequired: 'PO not required for this organisation.',
	detailPoMissing: 'Not provided',
	detailViewFullQuote: 'View full quote (HTML)',
	detailCreditTermsNote: (days: number) => `Due dates use your account’s ${days}-day credit terms from the quote issue date.`,

	footerPayNow: 'Pay now',
	footerDownload: 'Download PDF',
	footerDownloadUnavailable: 'PDF is not available for this version.',
	pdfError: 'Could not create a download link. Try again or contact your account team.',

	statusAwaitingPayment: 'Awaiting payment',
}
