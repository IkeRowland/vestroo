'use client'

import * as React from 'react'

import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm'
import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { AccountBookingFormLoad } from '@/lib/account-booking-form-load'
import { ACCOUNT_BOOKINGS_PATH } from '@/lib/account-portal-booking-path'
import { cn } from '@/lib/utils'

export function AccountNewBookingSheet({
	open,
	onOpenChange,
	formKey,
	bookingFormLoad,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	formKey: number
	bookingFormLoad: AccountBookingFormLoad
}) {
	// `modal={false}`: Google Places `.pac-container` is on `body`; modal Radix dialogs set
	// `body { pointer-events: none }`, which blocks clicking autocomplete suggestions.
	return (
		<Sheet modal={false} open={open} onOpenChange={onOpenChange}>
			{/*
				Radix portals to `body`, outside `(portal)/layout`’s `data-account-theme` — without this,
				`bg-account-*` vars are undefined and the panel renders transparent.
			*/}
			<SheetContent
				data-account-theme="light"
				side="right"
				aria-describedby="account-new-booking-sheet-desc"
				showCloseButton
				className={cn(
					'flex w-full max-w-full flex-col border-account-border bg-account-surface p-0 text-account-foreground shadow-account-2 sm:max-w-xl md:max-w-2xl',
				)}
			>
				<SheetHeader
					className={cn(
						'shrink-0 border-account-border bg-account-surface px-4 py-4 pr-14 text-left',
					)}
				>
					<SheetTitle className="text-lg font-semibold tracking-tight text-account-foreground">
						{accountBookingsCopy.bookingFormAsideTitle}
					</SheetTitle>
					<p id="account-new-booking-sheet-desc" className="mt-1 text-sm text-account-muted">
						{accountBookingsCopy.bookingFormAsideSubtitle}
					</p>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto bg-account-surface px-4 py-4">
					<BookingSearchForm
						key={formKey}
						accountBookingsEmbed
						shellTheme="accountPortal"
						bookSearchPrefill={bookingFormLoad.bookSearchPrefill}
						portalRebookBootstrap={bookingFormLoad.portalRebookBootstrap}
						tripRequestPhoneCountryIso2Hint={bookingFormLoad.tripRequestPhoneCountryIso2Hint}
						bookingFunnelBasePath="/book"
						tripRequestBookingSearchHref={ACCOUNT_BOOKINGS_PATH}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}

/** Primary button that opens {@link AccountNewBookingSheet} (dashboard CTA, toolbar, etc.). */
export function AccountNewBookingButton({
	bookingFormLoad,
	className,
	children,
}: {
	bookingFormLoad: AccountBookingFormLoad
	className?: string
	children: React.ReactNode
}) {
	const [open, setOpen] = React.useState(false)
	const [formKey, setFormKey] = React.useState(0)

	return (
		<>
			<button
				type="button"
				className={className}
				onClick={() => {
					setFormKey((k) => k + 1)
					setOpen(true)
				}}
			>
				{children}
			</button>
			<AccountNewBookingSheet
				open={open}
				onOpenChange={setOpen}
				formKey={formKey}
				bookingFormLoad={bookingFormLoad}
			/>
		</>
	)
}
