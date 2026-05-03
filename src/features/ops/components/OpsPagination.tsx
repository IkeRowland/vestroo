'use client'

import type { PaginationProps } from '@/components/saas/Pagination'
import { Pagination } from '@/components/saas/Pagination'

export type OpsPaginationProps = Omit<PaginationProps, 'theme'>

/** Thin wrapper — implementation: **`Pagination`**. */
export function OpsPagination(props: OpsPaginationProps) {
	return <Pagination {...props} theme="ops" />
}
