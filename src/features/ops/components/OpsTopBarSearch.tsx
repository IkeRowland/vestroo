'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { Search } from 'lucide-react'

import {
	getOpsTopBarSearchSuggestionsAction,
	recordOpsTopBarSearchQueryAction,
	type OpsTopBarQuickJump,
} from '@/actions/opsTopBarSearch'
import { Input } from '@/components/ui/input'
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { opsTopBarCopy } from '@/features/ops/copy/ops-top-bar-copy'
import { buildOpsBookingsAdvancedSearchHref } from '@/lib/ops-booking-grid-query'
import { cn } from '@/lib/utils'

export type OpsTopBarSearchHandle = {
	focus: () => void
	openMobile: () => void
}

const inputOpsClass =
	'h-10 rounded-md border-ops-border bg-ops-surface pl-9 pr-3 text-sm font-normal text-ops-foreground placeholder:text-ops-muted placeholder:font-normal shadow-none focus-visible:border-ops-border focus-visible:ring-2 focus-visible:ring-ops'

function SuggestionSections(props: {
	loading: boolean
	recentQueries: string[]
	quickJump: OpsTopBarQuickJump[]
	onPick: () => void
}) {
	const { loading, recentQueries, quickJump, onPick } = props
	return (
		<div className="max-h-[min(60vh,20rem)] space-y-3 overflow-y-auto py-1 text-sm">
			{loading ? (
				<p className="px-2 py-2 text-ops-muted">Loading…</p>
			) : null}
			{recentQueries.length > 0 ? (
				<div>
					<p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ops-muted">
						{opsTopBarCopy.recentHeading}
					</p>
					<ul className="space-y-0.5">
						{recentQueries.map((q) => (
							<li key={q}>
								<Link
									href={buildOpsBookingsAdvancedSearchHref({ q })}
									className="block truncate rounded-sm px-2 py-1.5 text-ops-foreground hover:bg-ops-surface-hover"
									onClick={onPick}
								>
									{q}
								</Link>
							</li>
						))}
					</ul>
				</div>
			) : null}
			{quickJump.length > 0 ? (
				<div>
					<p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ops-muted">
						{opsTopBarCopy.quickJumpHeading}
					</p>
					<ul className="space-y-0.5">
						{quickJump.map((item) => (
							<li key={`${item.href}-${item.label}`}>
								<Link
									href={item.href}
									className="block truncate rounded-sm px-2 py-1.5 text-ops-foreground hover:bg-ops-surface-hover"
									onClick={onPick}
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</div>
			) : null}
			{!loading && recentQueries.length === 0 && quickJump.length === 0 ? (
				<p className="px-2 py-2 text-ops-muted">No suggestions yet.</p>
			) : null}
		</div>
	)
}

export const OpsTopBarSearch = forwardRef<OpsTopBarSearchHandle, { className?: string }>(
	function OpsTopBarSearch({ className }, ref) {
		const router = useRouter()
		const desktopInputRef = useRef<HTMLInputElement>(null)
		const mobileInputRef = useRef<HTMLInputElement>(null)
		const [query, setQuery] = useState('')
		const [popoverOpen, setPopoverOpen] = useState(false)
		const [sheetOpen, setSheetOpen] = useState(false)
		const [recent, setRecent] = useState<string[]>([])
		const [quickJump, setQuickJump] = useState<OpsTopBarQuickJump[]>([])
		const [loading, setLoading] = useState(false)

		const loadSuggestions = useCallback(async () => {
			setLoading(true)
			try {
				const res = await getOpsTopBarSearchSuggestionsAction()
				if (res.ok) {
					setRecent(res.recentQueries)
					setQuickJump(res.quickJump)
				} else {
					setRecent([])
					setQuickJump([])
				}
			} finally {
				setLoading(false)
			}
		}, [])

		useEffect(() => {
			if (popoverOpen || sheetOpen) {
				void loadSuggestions()
			}
		}, [popoverOpen, sheetOpen, loadSuggestions])

		useEffect(() => {
			if (sheetOpen) {
				requestAnimationFrame(() => mobileInputRef.current?.focus())
			}
		}, [sheetOpen])

		const submit = useCallback(async () => {
			const q = query.trim()
			if (!q) return
			await recordOpsTopBarSearchQueryAction({ query: q })
			router.push(buildOpsBookingsAdvancedSearchHref({ q }))
			setPopoverOpen(false)
			setSheetOpen(false)
		}, [query, router])

		useImperativeHandle(ref, () => ({
			focus: () => {
				desktopInputRef.current?.focus()
				setPopoverOpen(true)
			},
			openMobile: () => {
				setSheetOpen(true)
			},
		}))

		const closePick = useCallback(() => {
			setPopoverOpen(false)
			setSheetOpen(false)
		}, [])

		const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				e.preventDefault()
				void submit()
			}
		}

		return (
			<>
				<div className={cn('hidden min-w-0 flex-1 md:flex md:max-w-xl', className)}>
					<Popover modal={false} open={popoverOpen} onOpenChange={setPopoverOpen}>
						<PopoverAnchor asChild>
							<div className="relative w-full min-w-0">
								<Search
									className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ops-muted"
									aria-hidden
								/>
								<Input
									ref={desktopInputRef}
									type="search"
									name="ops-top-search"
									autoComplete="off"
									placeholder={opsTopBarCopy.searchPlaceholder}
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onFocus={() => setPopoverOpen(true)}
									onKeyDown={onKeyDown}
									className={cn(inputOpsClass, 'w-full')}
									aria-label={opsTopBarCopy.searchPlaceholder}
								/>
							</div>
						</PopoverAnchor>
						<PopoverContent
							align="start"
							side="bottom"
							className="p-0"
							onOpenAutoFocus={(e) => e.preventDefault()}
						>
							<SuggestionSections
								loading={loading}
								recentQueries={recent}
								quickJump={quickJump}
								onPick={closePick}
							/>
						</PopoverContent>
					</Popover>
				</div>

				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetContent side="right" className="p-0 pt-12">
						<SheetHeader>
							<SheetTitle>{opsTopBarCopy.searchSheetTitle}</SheetTitle>
						</SheetHeader>
						<div className="flex flex-col gap-3 px-4 pb-4">
							<div className="relative w-full">
								<Search
									className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ops-muted"
									aria-hidden
								/>
								<Input
									ref={mobileInputRef}
									type="search"
									name="ops-top-search-mobile"
									autoComplete="off"
									placeholder={opsTopBarCopy.searchPlaceholder}
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									onKeyDown={onKeyDown}
									className={cn(inputOpsClass, 'w-full')}
									aria-label={opsTopBarCopy.searchPlaceholder}
								/>
							</div>
							<button
								type="button"
								className="inline-flex h-10 items-center justify-center rounded-md bg-ops-accent px-4 text-sm font-medium text-ops-accent-foreground hover:opacity-95"
								onClick={() => void submit()}
							>
								{opsTopBarCopy.searchSubmitButton}
							</button>
							<SuggestionSections
								loading={loading}
								recentQueries={recent}
								quickJump={quickJump}
								onPick={closePick}
							/>
						</div>
					</SheetContent>
				</Sheet>
			</>
		)
	},
)
