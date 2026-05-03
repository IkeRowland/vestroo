'use client'

import Link from 'next/link'
import { useId } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { opsPaginationCopy } from '@/features/ops/copy/ops-pagination-copy'
import { buildPaginationWindowItems } from '@/features/ops/lib/ops-pagination-window'
import {
	buildOpsPaginationHref,
	coerceOpsPaginationPerPage,
	type OpsPaginationPerPage,
	OPS_PAGINATION_DEFAULT_PER,
	OPS_PAGINATION_PER_OPTIONS,
	OPS_PAGINATION_PAGE_PARAM,
	OPS_PAGINATION_PER_PARAM,
} from '@/features/ops/lib/ops-pagination-url'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

function paginationNavClass(theme: SaasTheme): string {
	return saasCls(
		theme,
		'flex flex-col gap-3 border-t border-ops-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between',
		'flex flex-col gap-3 border-t border-account-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between',
	)
}

function linkBtnClass(theme: SaasTheme): string {
	return saasCls(
		theme,
		'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-ops-border bg-ops-surface px-2 text-sm font-medium text-ops-foreground shadow-sm transition-colors hover:bg-ops-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
		'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-account-border bg-account-surface px-2 text-sm font-medium text-account-foreground shadow-sm transition-colors hover:bg-account-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas',
	)
}

function pageNumClass(theme: SaasTheme): string {
	return saasCls(
		theme,
		'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-ops-border px-2 text-sm font-medium tabular-nums text-ops-foreground',
		'inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-account-border px-2 text-sm font-medium tabular-nums text-account-foreground',
	)
}

function activePageClass(theme: SaasTheme): string {
	return saasCls(
		theme,
		'border-primary bg-ops-accent-soft font-semibold',
		'border-primary bg-account-accent-soft font-semibold',
	)
}

function mutedText(theme: SaasTheme): string {
	return saasCls(theme, 'text-ops-muted', 'text-account-muted')
}

function selectClass(theme: SaasTheme): string {
	return saasCls(
		theme,
		'h-9 w-[4.25rem] rounded-md border-ops-border bg-ops-surface py-1 text-sm text-ops-foreground focus-visible:ring-primary',
		'h-9 w-[4.25rem] rounded-md border-account-border bg-account-surface py-1 text-sm text-account-foreground focus-visible:ring-primary',
	)
}

function dividerBorder(theme: SaasTheme): string {
	return saasCls(theme, 'border-l border-ops-border/60', 'border-l border-account-border/60')
}

export type PaginationProps = {
	theme?: SaasTheme
	pathname: string
	query?: string
	currentPage: number
	totalPages: number
	totalCount: number
	perPage: OpsPaginationPerPage
	/** When set, **`per`** is omitted from the query when it matches (e.g. account fixed **25**). */
	perOmitDefault?: OpsPaginationPerPage
	/** URL keys for `page` / `per` (e.g. **`acct_page`**, **`acct_per`** for `/account/bookings`). */
	pageParam?: string
	perParam?: string
	/** When **true**, hide the per-page `Select` (read-only list page size). */
	hidePerPageSelect?: boolean
	className?: string
}

export function Pagination({
	theme = 'ops',
	pathname,
	query = '',
	currentPage,
	totalPages,
	totalCount,
	perPage,
	perOmitDefault,
	pageParam = OPS_PAGINATION_PAGE_PARAM,
	perParam = OPS_PAGINATION_PER_PARAM,
	hidePerPageSelect = false,
	className,
}: PaginationProps) {
	const router = useRouter()
	const perSelectId = useId()
	const safePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1))
	const safePer = OPS_PAGINATION_PER_OPTIONS.includes(perPage)
		? perPage
		: OPS_PAGINATION_DEFAULT_PER
	const omitDefault = perOmitDefault ?? OPS_PAGINATION_DEFAULT_PER

	const hrefArgs = (page: number) =>
		buildOpsPaginationHref({
			pathname,
			search: query,
			page,
			per: safePer,
			pageParam,
			perParam,
			defaultPerForOmit: omitDefault,
		})

	const start = totalCount === 0 ? 0 : (safePage - 1) * safePer + 1
	const end = totalCount === 0 ? 0 : Math.min(safePage * safePer, totalCount)

	const windowItems =
		totalPages > 0 ? buildPaginationWindowItems(totalPages, safePage) : []

	const prevHref = hrefArgs(Math.max(safePage - 1, 1))
	const nextHref = hrefArgs(Math.min(safePage + 1, Math.max(totalPages, 1)))

	const statusLine =
		totalCount === 0
			? opsPaginationCopy.showingNone
			: opsPaginationCopy.showingRange(start, end, totalCount)

	const lb = linkBtnClass(theme)
	const pn = pageNumClass(theme)
	const ap = activePageClass(theme)
	const mt = mutedText(theme)

	return (
		<nav aria-label={opsPaginationCopy.navAriaLabel} className={cn(paginationNavClass(theme), className)}>
			<p className={cn('text-sm', mt)} role="status">
				{statusLine}
			</p>

			{totalPages > 0 ? (
				<div className="flex flex-wrap items-center justify-end gap-2 sm:gap-1">
					{safePage <= 1 ? (
						<span className={cn(lb, 'pointer-events-none opacity-40')} aria-label={opsPaginationCopy.prevAriaLabel} aria-disabled="true">
							<ChevronLeft className="h-4 w-4" aria-hidden />
						</span>
					) : (
						<Link href={prevHref} className={lb} aria-label={opsPaginationCopy.prevAriaLabel} scroll={false}>
							<ChevronLeft className="h-4 w-4" aria-hidden />
						</Link>
					)}

					<ul className="flex list-none flex-wrap items-center gap-1 p-0">
						{windowItems.map((item, idx) =>
							item === 'ellipsis' ? (
								<li key={`e-${idx}`} className={cn('px-1', mt)}>
									<span aria-hidden className="select-none">
										…
									</span>
								</li>
							) : (
								<li key={item}>
									{item === safePage ? (
										<span className={cn(pn, ap)} aria-current="page">
											{item}
										</span>
									) : (
										<Link
											href={hrefArgs(item)}
											className={cn(
												pn,
												saasCls(
													theme,
													'hover:bg-ops-surface-hover',
													'hover:bg-account-surface-hover',
												),
											)}
											aria-label={opsPaginationCopy.goToPageAriaLabel(item)}
											scroll={false}
										>
											{item}
										</Link>
									)}
								</li>
							),
						)}
					</ul>

					{safePage >= totalPages ? (
						<span className={cn(lb, 'pointer-events-none opacity-40')} aria-label={opsPaginationCopy.nextAriaLabel} aria-disabled="true">
							<ChevronRight className="h-4 w-4" aria-hidden />
						</span>
					) : (
						<Link href={nextHref} className={lb} aria-label={opsPaginationCopy.nextAriaLabel} scroll={false}>
							<ChevronRight className="h-4 w-4" aria-hidden />
						</Link>
					)}

					{!hidePerPageSelect ? (
						<div className={cn('ml-1 flex items-center gap-2 pl-3', dividerBorder(theme))}>
							<label htmlFor={perSelectId} className={cn('sr-only sm:not-sr-only sm:text-xs', mt)}>
								{opsPaginationCopy.resultsPerPageLabel}
							</label>
							<Select
								id={perSelectId}
								aria-label={opsPaginationCopy.resultsPerPageLabel}
								className={selectClass(theme)}
								value={String(safePer)}
								onChange={(e) => {
									const nextPer = coerceOpsPaginationPerPage(e.target.value)
									const href = buildOpsPaginationHref({
										pathname,
										search: query,
										page: 1,
										per: nextPer,
										pageParam,
										perParam,
										defaultPerForOmit: omitDefault,
									})
									router.push(href)
								}}
							>
								{OPS_PAGINATION_PER_OPTIONS.map((n) => (
									<option key={n} value={String(n)}>
										{n}
									</option>
								))}
							</Select>
						</div>
					) : null}
				</div>
			) : null}
		</nav>
	)
}
