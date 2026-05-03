/**
 * Strings for **`OpsPagination`** (Story 17.8 / FE.17.10) — NFR.17.8.
 * Range uses **en dash** (U+2013) between numeric endpoints.
 */
export const opsPaginationCopy = {
	navAriaLabel: 'Pagination',
	prevAriaLabel: 'Previous page',
	nextAriaLabel: 'Next page',
	goToPageAriaLabel: (page: number) => `Go to page ${page}`,
	resultsPerPageLabel: 'Results per page',
	showingNone: 'No results',
	/** En dash between range ends — not ASCII hyphen. */
	showingRange: (start: number, end: number, total: number) =>
		`Showing ${start}\u2013${end} of ${total}`,
} as const
