'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { resendBookingQuote } from '@/actions/bookingQuoteOps'
import { Button } from '@/components/ui/button'

type ResendBookingQuoteButtonProps = {
	priorQuoteId: string
}

export function ResendBookingQuoteButton({ priorQuoteId }: ResendBookingQuoteButtonProps) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	return (
		<div className="space-y-2">
			<Button
				type="button"
				variant="secondary"
				size="sm"
				disabled={pending}
				onClick={() => {
					setErrorMessage(null)
					startTransition(async () => {
						const res = await resendBookingQuote(priorQuoteId)
						if (res.ok) {
							router.refresh()
							return
						}
						setErrorMessage(res.error.message)
					})
				}}
			>
				{pending ? 'Re-sending…' : 'Re-send quote'}
			</Button>
			{errorMessage ? (
				<p className="text-sm text-destructive" role="alert">
					{errorMessage}
				</p>
			) : null}
		</div>
	)
}
