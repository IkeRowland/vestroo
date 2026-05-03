'use client'

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

import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { accountTopBarCopy } from '@/features/account/copy/account-top-bar-copy'
import { cn } from '@/lib/utils'

export type AccountTopBarSearchHandle = {
	focus: () => void
	openMobile: () => void
}

const inputClass =
	'h-10 rounded-md border-account-border bg-account-surface pl-9 pr-3 text-sm font-normal text-account-foreground placeholder:text-account-muted placeholder:font-normal shadow-none focus-visible:border-account-border focus-visible:ring-2 focus-visible:ring-account'

export const AccountTopBarSearch = forwardRef<
	AccountTopBarSearchHandle,
	{ className?: string }
>(function AccountTopBarSearch({ className }, ref) {
	const router = useRouter()
	const desktopInputRef = useRef<HTMLInputElement>(null)
	const mobileInputRef = useRef<HTMLInputElement>(null)
	const [query, setQuery] = useState('')
	const [popoverOpen, setPopoverOpen] = useState(false)
	const [sheetOpen, setSheetOpen] = useState(false)

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
			const t = e.target as HTMLElement | null
			if (!t) return
			const tag = t.tagName
			if (tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable) return
			if (t.closest('[role="dialog"]')) return
			e.preventDefault()
			const wide = window.matchMedia('(min-width: 768px)').matches
			if (wide) {
				desktopInputRef.current?.focus()
				setPopoverOpen(true)
			} else {
				setSheetOpen(true)
			}
		}
		window.addEventListener('keydown', onKeyDown)
		return () => window.removeEventListener('keydown', onKeyDown)
	}, [])

	useEffect(() => {
		if (sheetOpen) {
			requestAnimationFrame(() => mobileInputRef.current?.focus())
		}
	}, [sheetOpen])

	const submit = useCallback(() => {
		const q = query.trim()
		if (!q) return
		router.push(`/account/search?q=${encodeURIComponent(q)}`)
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

	const onKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			submit()
		}
	}

	return (
		<>
			<div className={cn('hidden min-w-0 flex-1 md:flex md:max-w-xl', className)}>
				<Popover modal={false} open={popoverOpen} onOpenChange={setPopoverOpen}>
					<PopoverAnchor asChild>
						<div className="relative w-full min-w-0">
							<Search
								className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-account-muted"
								aria-hidden
							/>
							<Input
								ref={desktopInputRef}
								type="search"
								name="account-top-search"
								autoComplete="off"
								placeholder={accountTopBarCopy.searchPlaceholder}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onFocus={() => setPopoverOpen(true)}
								onKeyDown={onKeyDownInput}
								className={cn(inputClass, 'w-full')}
								aria-label={accountTopBarCopy.searchAriaLabel}
							/>
						</div>
					</PopoverAnchor>
					<PopoverContent
						align="start"
						side="bottom"
						className="p-3 text-sm text-account-muted"
						onOpenAutoFocus={(e) => e.preventDefault()}
					>
						<p>{accountTopBarCopy.searchPopoverHint}</p>
					</PopoverContent>
				</Popover>
			</div>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="right" className="p-0 pt-12">
					<SheetHeader>
						<SheetTitle>{accountTopBarCopy.searchSheetTitle}</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col gap-3 px-4 pb-4">
						<div className="relative w-full">
							<Search
								className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-account-muted"
								aria-hidden
							/>
							<Input
								ref={mobileInputRef}
								type="search"
								name="account-top-search-mobile"
								autoComplete="off"
								placeholder={accountTopBarCopy.searchPlaceholder}
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								onKeyDown={onKeyDownInput}
								className={cn(inputClass, 'w-full')}
								aria-label={accountTopBarCopy.searchAriaLabel}
							/>
						</div>
						<button
							type="button"
							className="inline-flex h-10 items-center justify-center rounded-md bg-account-accent px-4 text-sm font-medium text-account-accent-foreground hover:opacity-95"
							onClick={submit}
						>
							{accountTopBarCopy.searchSubmitButton}
						</button>
						<p className="text-sm text-account-muted">{accountTopBarCopy.searchPopoverHint}</p>
					</div>
				</SheetContent>
			</Sheet>
		</>
	)
})
