'use client'

import Link from 'next/link'
import { useState } from 'react'

import { IdentifyClientDialog } from '@/features/ops/components/IdentifyClientDialog'
import { Button } from '@/components/ui/button'

type Props = {
	bookingId: string
	paymentStatus: string | null
	clientType: string | null
	linkedAccountName: string | null
}

/** Stops row-level navigation when using secondary links (Story 12.3). */
export function BookingsQueueRowSecondaryLinks({
	bookingId,
	paymentStatus,
	clientType,
	linkedAccountName,
}: Props) {
	const [identifyOpen, setIdentifyOpen] = useState(false)
	const paid = paymentStatus === 'paid'
	const identifyTitle = paid
		? "Paid walk-ins can't be retro-linked. Reason: finance reconciliation."
		: 'Correct client type and account linkage (unpaid bookings only).'

	return (
		<ul className="flex flex-col gap-1 text-xs">
			<li>
				<Link
					href={`/confirmation?id=${encodeURIComponent(bookingId)}`}
					className="text-primary underline-offset-2 hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					Confirmation
				</Link>
			</li>
			<li>
				<Link
					href={`/ops/close-protection?bookingId=${encodeURIComponent(bookingId)}`}
					className="text-primary underline-offset-2 hover:underline"
					onClick={(e) => e.stopPropagation()}
				>
					Close protection
				</Link>
			</li>
			<li>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					data-testid="ops-identify-client-button"
					className="h-auto min-h-0 px-0 py-0 text-xs font-normal text-primary underline-offset-2 hover:bg-transparent hover:text-primary hover:underline"
					disabled={paid}
					title={identifyTitle}
					onClick={(e) => {
						e.stopPropagation()
						if (!paid) {
							setIdentifyOpen(true)
						}
					}}
				>
					Identify client
				</Button>
			</li>
			<IdentifyClientDialog
				bookingId={bookingId}
				paymentStatus={paymentStatus}
				clientType={clientType}
				linkedAccountName={linkedAccountName}
				open={identifyOpen}
				onOpenChange={setIdentifyOpen}
			/>
		</ul>
	)
}
