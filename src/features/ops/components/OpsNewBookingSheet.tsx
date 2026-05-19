'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { AccountBookingFormLoad } from '@/lib/account-booking-form-load'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import type { ReferrerRow } from '@/lib/referrer-types'
import { formatReferrerLabel } from '@/lib/referrer-types'
import { cn } from '@/lib/utils'

export function OpsNewBookingSheet({
	open,
	onOpenChange,
	formKey,
	bookingFormLoad,
	referrers,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	formKey: number
	bookingFormLoad: AccountBookingFormLoad
	referrers: ReferrerRow[]
}) {
	const router = useRouter()
	const [referrerId, setReferrerId] = React.useState<string>('')

	return (
		<Sheet modal={false} open={open} onOpenChange={onOpenChange}>
			<SheetContent
				data-ops-theme="light"
				side="right"
				aria-describedby="ops-new-booking-sheet-desc"
				showCloseButton
				className={cn(
					'flex w-full max-w-full flex-col border-ops-border bg-ops-surface p-0 text-ops-foreground shadow-lg sm:max-w-xl md:max-w-2xl',
				)}
			>
				<SheetHeader className="shrink-0 border-b border-ops-border px-4 py-4 pr-14 text-left">
					<SheetTitle className="text-lg font-semibold tracking-tight text-ops-foreground">
						New booking
					</SheetTitle>
					<p id="ops-new-booking-sheet-desc" className="mt-1 text-sm text-ops-muted">
						Same trip-request flow as the client portal. Optionally attribute a referrer for compensation.
					</p>
				</SheetHeader>
				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
					<div className="mb-4 max-w-md space-y-2">
						<Label htmlFor="ops-booking-referrer" className="text-ops-foreground">
							Referrer (optional)
						</Label>
						<Select
							id="ops-booking-referrer"
							value={referrerId}
							onChange={(e) => setReferrerId(e.target.value)}
							className="border-ops-border bg-ops-surface text-ops-foreground"
						>
							<option value="">— None —</option>
							{referrers.map((r) => (
								<option key={r.id} value={r.id}>
									{formatReferrerLabel(r)}
								</option>
							))}
						</Select>
					</div>
					<BookingSearchForm
						key={formKey}
						accountBookingsEmbed
						opsBookingsEmbed
						shellTheme="accountPortal"
						bookSearchPrefill={bookingFormLoad.bookSearchPrefill}
						portalRebookBootstrap={bookingFormLoad.portalRebookBootstrap}
						tripRequestPhoneCountryIso2Hint={bookingFormLoad.tripRequestPhoneCountryIso2Hint}
						bookingFunnelBasePath="/book"
						tripRequestBookingSearchHref={OPS_BOOKINGS_PATH}
						opsReferrerId={referrerId || null}
						onOpsSubmitSuccess={() => {
							onOpenChange(false)
							router.refresh()
						}}
					/>
				</div>
			</SheetContent>
		</Sheet>
	)
}

export function OpsNewBookingButton({
	bookingFormLoad,
	referrers,
}: {
	bookingFormLoad: AccountBookingFormLoad
	referrers: ReferrerRow[]
}) {
	const [open, setOpen] = React.useState(false)
	const [formKey, setFormKey] = React.useState(0)

	return (
		<>
			<Button
				type="button"
				size="sm"
				onClick={() => {
					setFormKey((k) => k + 1)
					setOpen(true)
				}}
			>
				New booking
			</Button>
			<OpsNewBookingSheet
				open={open}
				onOpenChange={setOpen}
				formKey={formKey}
				bookingFormLoad={bookingFormLoad}
				referrers={referrers}
			/>
		</>
	)
}
