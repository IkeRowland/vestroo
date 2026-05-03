'use client'

import { useTransition } from 'react'

import { setBookAgainPortalHandoffCookieAction } from '@/actions/bookAgainPortalHandoff'
import { Button } from '@/components/ui/button'

type BookThisAgainButtonProps = {
	searchHref: string
}

export function BookThisAgainButton({ searchHref }: BookThisAgainButtonProps) {
	const [pending, startTransition] = useTransition()

	return (
		<Button
			type="button"
			className="bg-vest-rust hover:bg-vest-rust-dark"
			disabled={pending}
			onClick={() => {
				startTransition(async () => {
					const r = await setBookAgainPortalHandoffCookieAction()
					if (!r.ok) return
					window.location.assign(searchHref)
				})
			}}
		>
			{pending ? 'Opening…' : 'Book this again'}
		</Button>
	)
}
