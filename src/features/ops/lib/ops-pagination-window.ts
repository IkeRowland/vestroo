/**
 * Page number window for **`OpsPagination`** (Story 17.8 / FE.17.10).
 * When **`totalPages ≤ 7`**, all page numbers are shown with **no** ellipsis.
 */
export type OpsPaginationWindowItem = number | 'ellipsis'

export function buildPaginationWindowItems(
	totalPages: number,
	currentPage: number,
): OpsPaginationWindowItem[] {
	if (totalPages < 1) {
		return []
	}
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, i) => i + 1)
	}

	const cp = Math.min(Math.max(currentPage, 1), totalPages)
	const pages = new Set<number>()
	pages.add(1)
	pages.add(totalPages)
	for (let p = cp - 2; p <= cp + 2; p++) {
		if (p >= 1 && p <= totalPages) {
			pages.add(p)
		}
	}

	const sorted = [...pages].sort((a, b) => a - b)
	const out: OpsPaginationWindowItem[] = []
	for (let i = 0; i < sorted.length; i++) {
		if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
			out.push('ellipsis')
		}
		out.push(sorted[i])
	}
	return out
}
