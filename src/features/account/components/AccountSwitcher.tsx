'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { switchActiveAccountAction } from '@/actions/accountPortal'
import { Select } from '@/components/ui/select'

export type AccountSwitcherItem = {
	accountId: string
	accountName: string
}

type AccountSwitcherProps = {
	memberships: AccountSwitcherItem[]
	activeAccountId: string
}

export function AccountSwitcher({ memberships, activeAccountId }: AccountSwitcherProps) {
	const router = useRouter()
	const [pending, setPending] = useState(false)

	async function onChange(accountId: string) {
		if (accountId === activeAccountId) return
		setPending(true)
		try {
			const result = await switchActiveAccountAction(accountId)
			if (result.ok) {
				router.refresh()
			}
		} finally {
			setPending(false)
		}
	}

	return (
		<div className="flex min-w-0 flex-col gap-1 sm:items-end">
			<label htmlFor="account-switcher" className="text-xs font-medium text-muted-foreground">
				Active organisation
			</label>
			<Select
				id="account-switcher"
				value={activeAccountId}
				disabled={pending}
				onChange={(e) => onChange(e.target.value)}
				className="h-10 w-full min-w-[12rem] max-w-[min(100vw-2rem,20rem)] sm:w-auto"
				aria-label="Switch active organisation"
			>
				{memberships.map((m) => (
					<option key={m.accountId} value={m.accountId}>
						{m.accountName}
					</option>
				))}
			</Select>
		</div>
	)
}
