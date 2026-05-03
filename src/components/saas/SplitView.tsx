'use client'

import * as React from 'react'

import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { cn } from '@/lib/utils'

const LG_QUERY = '(min-width: 1024px)'

function subscribeMinLg(onChange: () => void) {
	const mq = window.matchMedia(LG_QUERY)
	const handler = () => onChange()
	mq.addEventListener('change', handler)
	return () => mq.removeEventListener('change', handler)
}

function getMinLgSnapshot() {
	return window.matchMedia(LG_QUERY).matches
}

function getMinLgServerSnapshot() {
	return false
}

export type SplitViewProps = {
	theme?: SaasTheme
	list: React.ReactNode
	detail: React.ReactNode
	detailVisible: boolean
	onCloseDetail?: () => void
	listFocusReturnRef?: React.RefObject<HTMLElement | null>
	/** SR-only title for the mobile sheet (ops copy supplied by `OpsSplitView` wrapper). */
	detailSheetDialogTitle?: string
	className?: string
}

const railAsideClass =
	'flex w-full min-w-[360px] max-w-[420px] shrink-0 flex-col lg:w-[min(420px,38vw)] xl:w-[420px]'

/** List + detail split — FE.17.5 / FE.18.13 */
export function SplitView({
	theme = 'ops',
	list,
	detail,
	detailVisible,
	onCloseDetail,
	listFocusReturnRef,
	detailSheetDialogTitle = 'Detail panel',
	className,
}: SplitViewProps) {
	const isLg = React.useSyncExternalStore(subscribeMinLg, getMinLgSnapshot, getMinLgServerSnapshot)

	const handleSheetOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) onCloseDetail?.()
		},
		[onCloseDetail],
	)

	const handleCloseAutoFocus = React.useCallback(
		(e: Event) => {
			const el = listFocusReturnRef?.current
			if (!el) return
			e.preventDefault()
			queueMicrotask(() => {
				el.focus()
			})
		},
		[listFocusReturnRef],
	)

	if (isLg) {
		return (
			<div
				data-saas-theme={theme}
				className={cn('flex min-h-0 min-w-0 flex-1 flex-row gap-3', className)}
			>
				<div className="min-w-0 flex-1">{list}</div>
				{detailVisible ? (
					<aside
						className={cn(
							railAsideClass,
							'self-start xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)]',
						)}
					>
						<div className="flex max-h-[calc(100vh-6rem)] min-h-0 w-full flex-col">{detail}</div>
					</aside>
				) : null}
			</div>
		)
	}

	return (
		<div data-saas-theme={theme} className={cn('flex min-h-0 min-w-0 flex-1 flex-col', className)}>
			<div className="min-w-0 flex-1">{list}</div>
			<Sheet open={detailVisible} onOpenChange={handleSheetOpenChange}>
				<SheetContent
					side="right"
					showCloseButton={false}
					aria-describedby={undefined}
					className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col border-0 p-0 shadow-xl transition-transform duration-200 ease-out"
					onCloseAutoFocus={handleCloseAutoFocus}
				>
					<SheetTitle className="sr-only">{detailSheetDialogTitle}</SheetTitle>
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
						{detail}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	)
}
